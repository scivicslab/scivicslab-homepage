---
sidebar_position: 4
title: tellNow and askNow
---

# tellNow and askNow

While `tell()` and `ask()` provide safe, queued message processing, there are situations where you need to interact with an actor immediately without waiting for queued messages to complete. The `tellNow()` and `askNow()` methods provide this capability by executing actions directly on a separate virtual thread, bypassing the message queue entirely.

These methods are powerful but require careful use. Because they run concurrently with the actor's normal message processing, you become responsible for ensuring thread safety in the operations you perform.

## When to Use Immediate Methods

The immediate methods are designed for specific use cases where waiting in the queue would be impractical or counterproductive. The most common scenarios involve emergency operations, monitoring, and debugging.

Emergency or priority messages need immediate attention regardless of what's currently in the queue. For example, if you need to signal an actor to stop processing immediately, waiting behind a long queue of pending work would defeat the purpose.

Monitoring actor state is another key use case. When you want to check an actor's health or progress, you typically don't want to wait for all queued messages to complete first—you want to see the current state right now.

Debug logging similarly benefits from immediate execution. If you're troubleshooting an issue, you want to see the actor's state at the exact moment you request it, not after all pending operations have completed.

| Use Case | Recommended Method | Why |
|----------|-------------------|-----|
| Emergency or priority messages that can't wait | `tellNow()` | Bypasses queue for immediate execution |
| Monitoring actor state during long operations | `askNow()` | Gets current state without waiting for queue |
| Debug logging of actor internals | `tellNow()` | Captures state at the moment of request |
| Health checks during long operations | `askNow()` | Immediate response without blocking |
| Non-blocking state queries | `askNow()` | Concurrent read while processing continues |

## tellNow() - Immediate Fire and Forget

The `tellNow()` method executes an action on the actor immediately, without waiting for any queued messages. The action runs on a new virtual thread concurrently with whatever the actor is currently doing.

This method is useful when you need to signal something to an actor urgently, such as setting a flag that the actor checks during its normal processing.

### How tellNow() Works

When you call `tellNow()`, the action is executed immediately on a separate virtual thread. This means it runs concurrently with any message that the actor's main virtual thread is currently processing.

```java
ActorRef<Counter> counter = system.actorOf("counter", new Counter());

// First, queue a slow operation that will take 5 seconds.
// This message will start processing immediately on the actor's thread.
counter.tell(c -> { Thread.sleep(5000); c.increment(); });

// This message is queued behind the slow operation.
// It won't execute until the 5-second sleep completes.
counter.tell(c -> c.increment());

// This executes immediately on a separate thread, concurrently
// with the slow operation. It doesn't wait in the queue.
counter.tellNow(c -> {
    System.out.println("Emergency: value = " + c.getValue());
});
```

### Method Signature

Like `tell()`, `tellNow()` returns a CompletableFuture that completes when the action finishes. The difference is that the action starts executing immediately rather than being queued.

```java
public CompletableFuture<Void> tellNow(Consumer<T> action)
```

### Execution Model

The following diagram illustrates how `tellNow()` operates concurrently with queued messages. Notice that the immediate action runs in parallel with the regular message processing, not after it.

```
Time ──────────────────────────────────────────►

Queue:      [long task......] [increment]
             ↓                      ↓
Regular:    ████████████████  ████

tellNow():       ██  (runs immediately, concurrently)
```

## askNow() - Immediate Query

The `askNow()` method queries an actor immediately and returns the result without waiting for queued messages. This is particularly useful for monitoring scenarios where you need to check an actor's current state without disturbing its message processing.

### How askNow() Works

When you call `askNow()`, the query executes immediately on a separate virtual thread. The result is returned as a CompletableFuture that completes when the query finishes, which happens concurrently with any ongoing message processing.

```java
// Check the state immediately while other messages are processing.
// This doesn't wait for any queued messages to complete first.
int currentValue = counter.askNow(Counter::getValue).join();
```

### Method Signature

```java
public <R> CompletableFuture<R> askNow(Function<T, R> action)
```

## Comparing Queue vs Immediate Execution

To understand the difference between queued and immediate methods, consider this example. An actor has a slow operation in its queue, and we want to query its state both through the queue and immediately.

```java
ActorRef<Counter> counter = system.actorOf("counter", new Counter());

// Queue a slow operation that takes 10 seconds and sets the value to 100.
counter.tell(c -> {
    Thread.sleep(10000);  // 10 seconds
    c.setValue(100);
});

// This ask() is queued after the slow operation.
// It waits for the slow operation to complete before executing.
counter.ask(c -> c.getValue())
       .thenAccept(v -> System.out.println("ask: " + v));
// Prints "ask: 100" after 10 seconds

// This askNow() executes immediately, concurrently with the slow operation.
// It sees the current value before the slow operation changes it.
counter.askNow(c -> c.getValue())
       .thenAccept(v -> System.out.println("askNow: " + v));
// Prints "askNow: 0" immediately
```

## Thread Safety Considerations

Because `tellNow()` and `askNow()` execute concurrently with the actor's normal message processing, you must ensure that the operations you perform are thread-safe. This is fundamentally different from `tell()` and `ask()`, which guarantee single-threaded access because they go through the queue.

### Safe: Read-Only Operations

Reading immutable or atomic state is generally safe with immediate methods. If your POJO uses atomic variables or volatile fields for the data you're reading, the operation will be thread-safe.

```java
// Safe: reading an AtomicInteger is thread-safe by design.
// This works correctly even while other messages are modifying state.
counter.askNow(c -> c.getValue());  // OK if getValue() reads an AtomicInteger
```

### Caution: State Modification

Modifying state with `tellNow()` can lead to race conditions if the same state is being modified by queued messages. You should only modify state with `tellNow()` if you've designed your POJO to handle concurrent access, such as by using atomic operations or synchronization.

```java
// Caution: this could conflict with concurrent modifications
// from queued messages unless increment() is thread-safe.
counter.tellNow(c -> c.increment());
```

### Best Practice: Design for Monitoring

The safest approach is to design your actors with monitoring in mind from the start. Use atomic variables or volatile fields for values that you want to read via `askNow()`, and reserve state modifications for the queued methods.

```java
class MonitoredActor {
    // Use AtomicInteger for values that will be read via askNow().
    private AtomicInteger processedCount = new AtomicInteger(0);

    // Use volatile for simple status flags.
    private volatile String status = "idle";

    public void process(Data data) {
        status = "processing";
        // ... perform the actual work ...
        processedCount.incrementAndGet();
        status = "idle";
    }

    // These getters are safe to call from askNow() because they
    // read from thread-safe data structures.
    public int getProcessedCount() { return processedCount.get(); }
    public String getStatus() { return status; }
}
```

With this design, you can safely monitor the actor's progress without interfering with its message processing:

```java
ActorRef<MonitoredActor> actor = system.actorOf("worker", new MonitoredActor());

// Queue a lot of work for the actor to process.
for (Data d : dataList) {
    actor.tell(a -> a.process(d));
}

// Monitor progress using askNow() without waiting for the queue.
// This scheduled task runs every second to report status.
ScheduledExecutorService monitor = Executors.newScheduledThreadPool(1);
monitor.scheduleAtFixedRate(() -> {
    int count = actor.askNow(MonitoredActor::getProcessedCount).join();
    String status = actor.askNow(MonitoredActor::getStatus).join();
    System.out.println("Processed: " + count + ", Status: " + status);
}, 0, 1, TimeUnit.SECONDS);
```

## Use Case Examples

### Emergency Shutdown

A common use case for `tellNow()` is implementing an emergency stop mechanism. If an actor is performing a long-running operation, you might need to signal it to stop immediately.

```java
class Worker {
    // volatile ensures the flag is visible across threads
    private volatile boolean shouldStop = false;

    public void doWork() {
        while (!shouldStop) {
            // Perform one unit of work, then check the flag.
            // This allows the worker to respond to stop signals promptly.
            processNextItem();
        }
        System.out.println("Worker stopped gracefully");
    }

    public void emergencyStop() {
        shouldStop = true;
    }
}

ActorRef<Worker> worker = system.actorOf("worker", new Worker());

// Start the long-running work via the queue.
worker.tell(Worker::doWork);

// Later, when an emergency stop is needed:
// Using tellNow() signals the worker immediately without waiting
// for doWork() to complete (which it won't, until the flag is set).
worker.tellNow(Worker::emergencyStop);
```

### Debug Logging

When debugging an issue, you often want to see the actor's internal state at a specific moment without waiting for queued messages to complete.

```java
// Log the current state immediately for debugging.
// This captures the state at this exact moment, not after
// any pending messages have been processed.
actor.tellNow(a -> {
    logger.debug("Actor state snapshot: " + a.toString());
});
```

### Health Checks

Health checks need to respond quickly, regardless of how much work is queued for the actor. Using `askNow()` ensures you get an immediate response.

```java
// Check health immediately without waiting for the queue.
// This is essential for health checks that have timeout requirements.
boolean healthy = actor.askNow(a -> a.isHealthy()).join();
if (!healthy) {
    alertSystem.sendAlert("Actor " + actor.getName() + " is unhealthy!");
}
```

## Summary

The following table summarizes the key differences between the queued methods (`tell()` and `ask()`) and the immediate methods (`tellNow()` and `askNow()`).

| Method | Queued | Thread Safety | Primary Use |
|--------|--------|---------------|-------------|
| `tell()` | Yes | Guaranteed by the actor model | Normal operations that modify state |
| `ask()` | Yes | Guaranteed by the actor model | Normal queries that return values |
| `tellNow()` | No | Your responsibility | Urgent commands that bypass the queue |
| `askNow()` | No | Your responsibility | Monitoring and debugging queries |

When choosing between these methods, prefer `tell()` and `ask()` for normal operations because they provide automatic thread-safety guarantees. Reserve `tellNow()` and `askNow()` for the specific scenarios described above, and design your POJOs with thread-safe fields for any data that will be accessed via the immediate methods.
