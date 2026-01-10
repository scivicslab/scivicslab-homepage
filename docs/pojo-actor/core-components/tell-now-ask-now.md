---
sidebar_position: 4
title: tellNow and askNow
---

# tellNow and askNow

While `tell()` and `ask()` queue messages for sequential processing, `tellNow()` and `askNow()` execute immediately on a separate virtual thread, bypassing the message queue.

## When to Use Immediate Methods

| Use Case | Method |
|----------|--------|
| Emergency/priority messages | `tellNow()` |
| Monitoring actor state | `askNow()` |
| Debug logging | `tellNow()` |
| Health checks during long operations | `askNow()` |
| Non-blocking state queries | `askNow()` |

## tellNow() - Immediate Fire and Forget

`tellNow()` executes immediately without waiting for queued messages:

```java
ActorRef<Counter> counter = system.actorOf("counter", new Counter());

// Queue some regular messages
counter.tell(c -> { Thread.sleep(5000); c.increment(); }); // Long task
counter.tell(c -> c.increment());  // Waits behind long task

// Execute immediately, concurrently with queued tasks
counter.tellNow(c -> {
    System.out.println("Emergency: value = " + c.getValue());
});
```

### Signature

```java
public CompletableFuture<Void> tellNow(Consumer<T> action)
```

### Execution Model

```
Time ──────────────────────────────────────────►

Queue:      [long task......] [increment]
             ↓                      ↓
Regular:    ████████████████  ████

tellNow():       ██  (runs immediately, concurrently)
```

## askNow() - Immediate Query

`askNow()` queries the actor immediately without waiting:

```java
// Check state while other messages are processing
int currentValue = counter.askNow(Counter::getValue).join();
```

### Signature

```java
public <R> CompletableFuture<R> askNow(Function<T, R> action)
```

## Comparison: Queue vs Immediate

```java
ActorRef<Counter> counter = system.actorOf("counter", new Counter());

// Queue a slow operation
counter.tell(c -> {
    Thread.sleep(10000);  // 10 seconds
    c.setValue(100);
});

// This waits for the slow operation (queued after it)
counter.ask(c -> c.getValue())
       .thenAccept(v -> System.out.println("ask: " + v));
// Prints "ask: 100" after 10 seconds

// This runs immediately (concurrent with slow operation)
counter.askNow(c -> c.getValue())
       .thenAccept(v -> System.out.println("askNow: " + v));
// Prints "askNow: 0" immediately
```

## Thread Safety Considerations

Since `tellNow()` and `askNow()` execute concurrently with queued messages, you must consider thread safety:

### Safe: Read-Only Operations

```java
// Safe - reading immutable or atomic state
counter.askNow(c -> c.getValue());  // OK if getValue() is thread-safe
```

### Caution: State Modification

```java
// Be careful - concurrent modification
counter.tellNow(c -> c.increment());  // May conflict with queued messages
```

### Best Practice: Use for Monitoring

```java
class MonitoredActor {
    private AtomicInteger processedCount = new AtomicInteger(0);
    private volatile String status = "idle";

    public void process(Data data) {
        status = "processing";
        // ... do work ...
        processedCount.incrementAndGet();
        status = "idle";
    }

    // Thread-safe getters for monitoring
    public int getProcessedCount() { return processedCount.get(); }
    public String getStatus() { return status; }
}

// Monitor while processing continues
ActorRef<MonitoredActor> actor = system.actorOf("worker", new MonitoredActor());

// Queue work
for (Data d : dataList) {
    actor.tell(a -> a.process(d));
}

// Monitor progress (doesn't wait for queue)
ScheduledExecutorService monitor = Executors.newScheduledThreadPool(1);
monitor.scheduleAtFixedRate(() -> {
    int count = actor.askNow(MonitoredActor::getProcessedCount).join();
    String status = actor.askNow(MonitoredActor::getStatus).join();
    System.out.println("Processed: " + count + ", Status: " + status);
}, 0, 1, TimeUnit.SECONDS);
```

## Use Case Examples

### Emergency Shutdown

```java
class Worker {
    private volatile boolean shouldStop = false;

    public void doWork() {
        while (!shouldStop) {
            // ... work ...
        }
    }

    public void emergencyStop() {
        shouldStop = true;
    }
}

ActorRef<Worker> worker = system.actorOf("worker", new Worker());
worker.tell(Worker::doWork);

// Later, need to stop immediately
worker.tellNow(Worker::emergencyStop);
```

### Debug Logging

```java
// Log current state without interrupting workflow
actor.tellNow(a -> {
    logger.debug("Actor state: " + a.toString());
});
```

### Health Checks

```java
// Check health during long-running operations
boolean healthy = actor.askNow(a -> a.isHealthy()).join();
if (!healthy) {
    alertSystem.sendAlert("Actor unhealthy!");
}
```

## Summary

| Method | Queue | Thread Safety | Primary Use |
|--------|-------|---------------|-------------|
| `tell()` | Yes | Guaranteed | Normal operations |
| `ask()` | Yes | Guaranteed | Normal queries |
| `tellNow()` | No | User's responsibility | Urgent commands |
| `askNow()` | No | User's responsibility | Monitoring/debugging |
