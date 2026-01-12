---
sidebar_position: 3
title: tell, ask, and Work-Stealing Pool
---

# tell, ask, and Work-Stealing Pool

The `tell()` and `ask()` methods are the primary communication mechanisms in POJO-actor. They provide type-safe, asynchronous message passing using Java lambdas, allowing you to invoke methods on actors while maintaining the thread-safety guarantees of the actor model. This page explains how these methods work, when to use each one, and how to leverage work-stealing pools for CPU-intensive operations.

## tell() - Fire and Forget

The `tell()` method sends a message to an actor without expecting a return value. It's called "fire and forget" because the caller can continue executing immediately after sending the message, without waiting for the actor to process it. The message is added to the actor's queue and will be processed when the actor's virtual thread gets to it.

Even though `tell()` doesn't return a value from the actor, it does return a `CompletableFuture<Void>` that you can use to track when the message has been processed. This is useful when you need to ensure a message has been handled before proceeding with subsequent operations.

### Basic Usage

In the simplest case, you call `tell()` with a lambda that specifies what method to invoke on the actor. The lambda receives the actor's POJO as its parameter, and you call whatever method you need on it.

```java
ActorRef<Counter> counter = system.actorOf("counter", new Counter());

// Send a message and continue immediately without waiting.
// The increment will happen eventually when the actor processes this message.
counter.tell(c -> c.increment());
```

### Waiting for Completion

If you need to ensure that a message has been processed before continuing, you can call `join()` on the returned CompletableFuture. This blocks the current thread until the actor finishes processing the message.

```java
// Send a message and wait for it to be processed before continuing.
// This is useful when you need to ensure ordering with subsequent operations.
counter.tell(c -> c.increment()).join();
```

### Chaining with Callbacks

The CompletableFuture returned by `tell()` supports all the standard CompletableFuture operations. You can use `thenRun()` to execute code after the message is processed, without blocking the current thread.

```java
// Execute a callback after the message is processed.
// This is non-blocking - the current thread continues immediately.
counter.tell(c -> c.increment())
       .thenRun(() -> System.out.println("Increment completed"));
```

### Method Signature

The `tell()` method accepts a Consumer that takes the actor's POJO type as its parameter. It returns a CompletableFuture that completes when the action finishes executing.

```java
public CompletableFuture<Void> tell(Consumer<T> action)
```

## ask() - Request/Response

The `ask()` method sends a message to an actor and returns a value from the operation. Use this when you need to retrieve data from an actor or when you need the result of a computation performed by the actor.

Like `tell()`, `ask()` adds the message to the actor's queue and processes it asynchronously. The difference is that `ask()` returns a `CompletableFuture<R>` containing the result of the operation, where R is whatever type your method returns.

### Basic Usage

When you call `ask()`, you provide a lambda that returns a value. The returned CompletableFuture will eventually contain that value once the actor processes the message.

```java
ActorRef<Counter> counter = system.actorOf("counter", new Counter());

// Ask for the current value and block until we get it.
// The join() call waits for the actor to process this message.
int value = counter.ask(c -> c.getValue()).join();
```

### Asynchronous Result Handling

Instead of blocking with `join()`, you can handle the result asynchronously using `thenAccept()` or other CompletableFuture methods. This keeps your code non-blocking.

```java
// Handle the result asynchronously without blocking.
// This is more efficient when you don't need the result immediately.
counter.ask(c -> c.getValue())
       .thenAccept(v -> System.out.println("Current value: " + v));
```

### Transforming Results

You can transform the result within the lambda itself, rather than doing it in a callback. This is useful for formatting or computing derived values.

```java
// Transform the result inside the actor's context.
// The string is created while accessing the actor's state.
String status = counter.ask(c -> "Counter is at " + c.getValue()).join();
```

### Method Signature

The `ask()` method accepts a Function that takes the actor's POJO type and returns a result. The CompletableFuture will contain the returned value.

```java
public <R> CompletableFuture<R> ask(Function<T, R> action)
```

## Message Ordering Guarantee

One of the most important properties of `tell()` and `ask()` is that messages are processed in the order they are sent (FIFO - First In, First Out). This guarantee makes reasoning about actor behavior straightforward and eliminates a whole class of concurrency bugs.

When you send multiple messages to an actor, each message will see the effects of all messages that were sent before it. This is because the actor processes messages sequentially on a single virtual thread.

```java
counter.tell(c -> c.setValue(10));  // Processed first
counter.tell(c -> c.increment());    // Processed second, sees value 10
int v = counter.ask(c -> c.getValue()).join();  // Processed third, sees value 11
// v == 11
```

The following diagram illustrates how messages flow through the actor's queue and are processed sequentially by the actor's virtual thread:

```
Time ──────────────────────────────────────────►

tell(setValue)    tell(increment)    ask(getValue)
     │                  │                  │
     ▼                  ▼                  ▼
┌────────────────────────────────────────────────┐
│  Message Queue: [setValue] [increment] [get]   │
└────────────────────────────────────────────────┘
                        │
                        ▼
              Actor's Virtual Thread
              (processes sequentially)
```

## Using Work-Stealing Pool for CPU-Intensive Tasks

While the actor's virtual thread is excellent for coordination and state management, it's not ideal for CPU-intensive operations. If an actor performs a heavy computation, it blocks its message queue, preventing other messages from being processed until the computation completes.

To solve this problem, POJO-actor provides work-stealing pools that can execute heavy operations without blocking the actor's message queue. When you pass a pool to `tell()` or `ask()`, the operation is executed on the pool's threads instead of the actor's virtual thread.

### When to Use Work-Stealing Pool

Use the work-stealing pool when your actor needs to perform operations that take significant CPU time or might block. The table below provides guidance for common scenarios.

| Scenario | Use Regular tell/ask | Use Work-Stealing Pool |
|----------|---------------------|----------------------|
| Simple state updates (e.g., incrementing a counter) | Yes | No |
| Quick queries (e.g., getting a value) | Yes | No |
| Heavy computation (e.g., matrix multiplication) | No | Yes |
| Blocking I/O (e.g., reading a file) | No | Yes |
| Long-running tasks (e.g., data processing) | No | Yes |

### Getting the Pool

The work-stealing pool is accessed through the ActorSystem. Each system has at least one pool created by default.

```java
ExecutorService pool = system.getWorkStealingPool();
```

### Using the Pool with tell() and ask()

Both `tell()` and `ask()` have overloaded versions that accept an ExecutorService as a second parameter. When you use these versions, the operation runs on the pool instead of the actor's virtual thread.

```java
// Execute a CPU-intensive operation on the work-stealing pool.
// This frees up the actor's message queue to process other messages.
counter.tell(c -> c.heavyComputation(), pool);

// Ask with pool execution for expensive calculations.
// Other messages can be processed while this runs on the pool.
String result = counter.ask(c -> c.expensiveCalculation(), pool).join();
```

### Example: Matrix Multiplication

Here's a concrete example showing when to use the work-stealing pool. Matrix multiplication is CPU-intensive and can take significant time, so it should be offloaded to the pool.

```java
class MatrixActor {
    private double[][] matrix;

    public double[][] multiply(double[][] other) {
        // This is a CPU-intensive operation that may take seconds
        // for large matrices. Running it on the actor's virtual thread
        // would block all other messages to this actor.
        return MatrixMath.multiply(matrix, other);
    }
}

ActorRef<MatrixActor> actor = system.actorOf("matrix", new MatrixActor());
ExecutorService pool = system.getWorkStealingPool();

// By passing the pool, the multiplication runs on a pool thread
// while the actor can continue processing other messages.
double[][] result = actor.ask(a -> a.multiply(otherMatrix), pool).join();
```

## Exception Handling

Exceptions thrown within `tell()` and `ask()` actions are captured in the returned CompletableFuture rather than being thrown immediately. This allows you to handle errors gracefully using the standard CompletableFuture exception handling mechanisms.

The `exceptionally()` method lets you provide a fallback value or perform error handling when an exception occurs. This is important because exceptions thrown inside an actor could otherwise go unnoticed.

```java
counter.tell(c -> {
    if (c.getValue() < 0) {
        throw new IllegalStateException("Negative value!");
    }
    c.increment();
}).exceptionally(ex -> {
    System.err.println("Error: " + ex.getMessage());
    return null;  // Return null because tell() returns Void
});
```

For `ask()` operations, you can provide a fallback value when an exception occurs:

```java
int value = counter.ask(c -> {
    if (!c.isReady()) {
        throw new IllegalStateException("Not ready");
    }
    return c.getValue();
}).exceptionally(ex -> {
    System.err.println("Failed to get value: " + ex.getMessage());
    return -1;  // Return a sentinel value indicating failure
}).join();
```

## Complete Example

The following example demonstrates the key concepts covered in this page: using `tell()` for fire-and-forget operations, using `ask()` for queries, chaining operations with CompletableFuture, and offloading heavy work to the work-stealing pool.

```java
public class TellAskExample {
    public static void main(String[] args) throws Exception {
        // Create an actor system with 4 threads in the work-stealing pool.
        ActorSystem system = new ActorSystem("example", 4);
        ExecutorService pool = system.getWorkStealingPool();

        // Create a data processing actor.
        ActorRef<DataProcessor> processor =
            system.actorOf("processor", new DataProcessor());

        // Load data using tell() and wait for completion.
        // This is a simple operation that doesn't need the pool.
        processor.tell(p -> p.loadData("input.csv")).join();

        // Query the row count using ask().
        // This is a quick operation, so no pool is needed.
        int rowCount = processor.ask(DataProcessor::getRowCount).join();
        System.out.println("Loaded " + rowCount + " rows");

        // Compute statistics on the work-stealing pool.
        // This is CPU-intensive, so we offload it to avoid blocking.
        double[] stats = processor.ask(p -> p.computeStatistics(), pool).join();
        System.out.println("Mean: " + stats[0] + ", StdDev: " + stats[1]);

        // Chain multiple operations together using CompletableFuture.
        // This demonstrates non-blocking composition of actor operations.
        processor.tell(p -> p.filter(row -> row.isValid()))
                 .thenCompose(v -> processor.ask(DataProcessor::getRowCount))
                 .thenAccept(count -> System.out.println("Valid rows: " + count))
                 .join();

        // Always clean up when done.
        system.terminate();
    }
}
```
