---
sidebar_position: 3
title: tell, ask, and Work-Stealing Pool
---

# tell, ask, and Work-Stealing Pool

The `tell()` and `ask()` methods are the primary ways to communicate with actors in POJO-actor. They provide type-safe, asynchronous message passing using Java lambdas.

## tell() - Fire and Forget

Use `tell()` when you want to send a message without waiting for a response:

```java
ActorRef<Counter> counter = system.actorOf("counter", new Counter());

// Send message, don't wait
counter.tell(c -> c.increment());

// Send message and wait for completion
counter.tell(c -> c.increment()).join();

// Chain multiple messages
counter.tell(c -> c.increment())
       .thenRun(() -> System.out.println("First increment done"));
```

### Signature

```java
public CompletableFuture<Void> tell(Consumer<T> action)
```

- **action**: A lambda that accepts the actor's POJO and performs some operation
- **returns**: A `CompletableFuture<Void>` that completes when the action finishes

## ask() - Request/Response

Use `ask()` when you need a response from the actor:

```java
ActorRef<Counter> counter = system.actorOf("counter", new Counter());

// Ask and get result
int value = counter.ask(c -> c.getValue()).join();

// Ask with async handling
counter.ask(c -> c.getValue())
       .thenAccept(v -> System.out.println("Value: " + v));

// Ask with transformation
String status = counter.ask(c -> "Counter is at " + c.getValue()).join();
```

### Signature

```java
public <R> CompletableFuture<R> ask(Function<T, R> action)
```

- **action**: A lambda that accepts the actor's POJO and returns a value
- **returns**: A `CompletableFuture<R>` that completes with the return value

## Message Ordering Guarantee

Messages sent via `tell()` and `ask()` are processed **in order** (FIFO):

```java
counter.tell(c -> c.setValue(10));  // Processed first
counter.tell(c -> c.increment());    // Processed second
int v = counter.ask(c -> c.getValue()).join();  // Processed third
// v == 11
```

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

For computationally heavy operations, offload work to a work-stealing pool to avoid blocking the actor's message processing:

```java
// Get the work-stealing pool from the actor system
ExecutorService pool = system.getWorkStealingPool();

// Execute CPU-intensive work on the pool
counter.tell(c -> c.heavyComputation(), pool);

// Ask with pool execution
String result = counter.ask(c -> c.expensiveCalculation(), pool).join();
```

### When to Use Work-Stealing Pool

| Scenario | Regular tell/ask | With Pool |
|----------|-----------------|-----------|
| Simple state updates | Yes | No |
| Quick queries | Yes | No |
| Heavy computation | No | **Yes** |
| Blocking I/O | No | **Yes** |
| Long-running tasks | No | **Yes** |

### Example: Matrix Multiplication

```java
class MatrixActor {
    private double[][] matrix;

    public double[][] multiply(double[][] other) {
        // CPU-intensive operation
        return MatrixMath.multiply(matrix, other);
    }
}

ActorRef<MatrixActor> actor = system.actorOf("matrix", new MatrixActor());
ExecutorService pool = system.getWorkStealingPool();

// Offload to work-stealing pool
double[][] result = actor.ask(a -> a.multiply(otherMatrix), pool).join();
```

## Exception Handling

Exceptions in `tell()` and `ask()` are captured in the `CompletableFuture`:

```java
counter.tell(c -> {
    if (c.getValue() < 0) {
        throw new IllegalStateException("Negative value!");
    }
    c.increment();
}).exceptionally(ex -> {
    System.err.println("Error: " + ex.getMessage());
    return null;
});
```

## Complete Example

```java
public class TellAskExample {
    public static void main(String[] args) throws Exception {
        ActorSystem system = new ActorSystem("example", 4);
        ExecutorService pool = system.getWorkStealingPool();

        ActorRef<DataProcessor> processor =
            system.actorOf("processor", new DataProcessor());

        // Simple tell
        processor.tell(p -> p.loadData("input.csv")).join();

        // Simple ask
        int rowCount = processor.ask(DataProcessor::getRowCount).join();
        System.out.println("Rows: " + rowCount);

        // CPU-intensive operation on pool
        double[] stats = processor.ask(p -> p.computeStatistics(), pool).join();
        System.out.println("Mean: " + stats[0] + ", StdDev: " + stats[1]);

        // Chained operations
        processor.tell(p -> p.filter(row -> row.isValid()))
                 .thenCompose(v -> processor.ask(DataProcessor::getRowCount))
                 .thenAccept(count -> System.out.println("Valid rows: " + count))
                 .join();

        system.terminate();
    }
}
```
