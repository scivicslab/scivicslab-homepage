---
sidebar_position: 5
title: Scheduler
---

# Scheduler

The `Scheduler` class provides periodic task execution for actors. It schedules tasks that are executed via `ActorRef.ask()`, ensuring thread-safe access to actor state.

## Creating a Scheduler

```java
// Default scheduler (2 threads)
Scheduler scheduler = new Scheduler();

// Custom thread pool size
Scheduler scheduler = new Scheduler(4);
```

## Scheduling Methods

### scheduleAtFixedRate

Executes at fixed intervals, regardless of task duration:

```java
scheduler.scheduleAtFixedRate(
    "health-check",           // Task ID
    actorRef,                 // Target actor
    actor -> actor.check(),   // Action to perform
    0,                        // Initial delay
    10,                       // Period
    TimeUnit.SECONDS          // Time unit
);
```

**Timing Diagram:**
```
scheduleAtFixedRate (period=100ms, task takes 30ms):

|task|          |task|          |task|
0    30   100   130   200   230   300ms
     └─period─┘      └─period─┘
```

### scheduleWithFixedDelay

Waits for a fixed delay after each task completes:

```java
scheduler.scheduleWithFixedDelay(
    "cleanup",                 // Task ID
    actorRef,                  // Target actor
    actor -> actor.cleanup(),  // Action to perform
    60,                        // Initial delay
    300,                       // Delay between executions
    TimeUnit.SECONDS           // Time unit
);
```

**Timing Diagram:**
```
scheduleWithFixedDelay (delay=100ms, task takes 30ms):

|task|              |task|              |task|
0    30        130  160        260  290ms
     └──delay──┘    └──delay──┘
```

### scheduleOnce

Executes once after a delay:

```java
scheduler.scheduleOnce(
    "init",                       // Task ID
    actorRef,                     // Target actor
    actor -> actor.initialize(),  // Action to perform
    5,                            // Delay
    TimeUnit.SECONDS              // Time unit
);
```

## Choosing Between Fixed Rate and Fixed Delay

| Scenario | Method | Reason |
|----------|--------|--------|
| Metrics collection | `scheduleAtFixedRate` | Need consistent sample intervals |
| Heartbeat | `scheduleAtFixedRate` | Fixed timing requirements |
| Polling external service | `scheduleWithFixedDelay` | Avoid overwhelming service |
| Batch processing | `scheduleWithFixedDelay` | Allow system to recover |
| Cleanup tasks | `scheduleWithFixedDelay` | Ensure completion before next run |

## Managing Scheduled Tasks

### Cancel a Task

```java
boolean cancelled = scheduler.cancelTask("health-check");
```

### Check Task Status

```java
if (scheduler.isScheduled("health-check")) {
    // Task is still active
}
```

### Get Active Task Count

```java
int count = scheduler.getScheduledTaskCount();
```

## Lifecycle Management

The `Scheduler` implements `AutoCloseable`:

```java
// Manual close
scheduler.close();

// Or use try-with-resources
try (Scheduler scheduler = new Scheduler()) {
    scheduler.scheduleAtFixedRate("task", actor, a -> a.work(), 0, 1, TimeUnit.SECONDS);
    // ... do other work ...
} // Automatically closed here
```

Closing the scheduler:
1. Cancels all scheduled tasks
2. Shuts down the executor (waits up to 5 seconds)

## Complete Example

```java
public class SchedulerExample {
    public static void main(String[] args) throws Exception {
        ActorSystem system = new ActorSystem("scheduler-demo");
        Scheduler scheduler = new Scheduler();

        // Create a monitoring actor
        ActorRef<SystemMonitor> monitor =
            system.actorOf("monitor", new SystemMonitor());

        // Health check every 10 seconds
        scheduler.scheduleAtFixedRate(
            "health-check",
            monitor,
            m -> m.checkHealth(),
            0, 10, TimeUnit.SECONDS
        );

        // Memory cleanup every 5 minutes (with delay)
        scheduler.scheduleWithFixedDelay(
            "memory-cleanup",
            monitor,
            m -> m.cleanupMemory(),
            60, 300, TimeUnit.SECONDS
        );

        // One-time initialization after 5 seconds
        scheduler.scheduleOnce(
            "init",
            monitor,
            m -> m.initialize(),
            5, TimeUnit.SECONDS
        );

        // Run for a while
        Thread.sleep(60000);

        // Check status
        System.out.println("Active tasks: " + scheduler.getScheduledTaskCount());

        // Cancel specific task
        scheduler.cancelTask("memory-cleanup");

        // Cleanup
        scheduler.close();
        system.terminate();
    }
}

class SystemMonitor {
    public void checkHealth() {
        System.out.println("Health check at " + System.currentTimeMillis());
    }

    public void cleanupMemory() {
        System.gc();
        System.out.println("Memory cleanup completed");
    }

    public void initialize() {
        System.out.println("System initialized");
    }
}
```

## Thread Safety

- Tasks are executed via `ActorRef.ask()`, ensuring thread-safe access to actor state
- Task registration and cancellation are thread-safe
- Multiple schedulers can target the same actor (messages are queued)

## Error Handling

If a scheduled task throws an exception:
1. The error is logged (SEVERE level)
2. The task continues to be scheduled (not cancelled)
3. The exception does not propagate to other tasks

```java
scheduler.scheduleAtFixedRate("risky-task", actor, a -> {
    if (Math.random() < 0.1) {
        throw new RuntimeException("Random failure");
    }
    a.doWork();
}, 0, 1, TimeUnit.SECONDS);
// Task continues running even after failures
```
