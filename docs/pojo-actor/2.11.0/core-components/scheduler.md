---
sidebar_position: 5
title: Scheduler
---

:::caution Newer Version Available
This is documentation for version 2.11.0. [See the latest version](/docs/pojo-actor/introduction).
:::

# Scheduler

The `Scheduler` class provides periodic task execution for actors in POJO-actor. It allows you to schedule recurring tasks that execute at fixed intervals or with fixed delays between executions. All scheduled tasks are executed via `ActorRef.ask()`, which ensures that the tasks go through the actor's message queue and maintain thread-safe access to actor state.

Schedulers are useful for implementing health checks, periodic cleanup tasks, metrics collection, heartbeats, and any other recurring operations that need to interact with actors.

## Creating a Scheduler

To create a Scheduler, simply instantiate it. You can use the default constructor, which creates an internal thread pool with 2 threads, or specify a custom number of threads if you expect to have many concurrent scheduled tasks.

```java
// Create a scheduler with the default thread pool (2 threads).
// This is sufficient for most applications with a moderate number of tasks.
Scheduler scheduler = new Scheduler();

// Create a scheduler with a larger thread pool for applications
// that need many concurrent scheduled tasks.
Scheduler scheduler = new Scheduler(4);
```

## Scheduling Methods

The Scheduler provides three methods for scheduling tasks, each suited to different use cases. Understanding the distinction between them is important for choosing the right one for your needs.

### scheduleAtFixedRate

The `scheduleAtFixedRate` method executes a task at fixed time intervals, measured from the start of each execution. This means the scheduler tries to start a new execution every N time units, regardless of how long the previous execution took.

Use this method when you need consistent timing between the start of successive executions, such as for metrics collection where you want samples at exactly 10-second intervals.

```java
scheduler.scheduleAtFixedRate(
    "health-check",           // A unique ID for this task (used for cancellation)
    actorRef,                 // The actor to execute the task on
    actor -> actor.check(),   // The action to perform on the actor
    0,                        // Initial delay before the first execution
    10,                       // Period between the start of successive executions
    TimeUnit.SECONDS          // Time unit for the delay and period
);
```

The timing behavior of `scheduleAtFixedRate` is illustrated below. Notice that each task starts exactly 100ms after the previous one started, regardless of how long the task took to complete.

```
scheduleAtFixedRate (period=100ms, task takes 30ms):

|task|          |task|          |task|
0    30   100   130   200   230   300ms
     └─period─┘      └─period─┘
```

If a task takes longer than the period, subsequent executions will be delayed, but the scheduler will try to "catch up" by starting the next execution immediately after the delayed one finishes.

### scheduleWithFixedDelay

The `scheduleWithFixedDelay` method waits for a fixed amount of time after each task completes before starting the next execution. This means the actual interval between the start of successive executions varies depending on how long each task takes.

Use this method when you want to ensure there's always a gap between executions, such as when polling an external service. This prevents task executions from piling up if individual executions take longer than expected.

```java
scheduler.scheduleWithFixedDelay(
    "cleanup",                 // Task ID
    actorRef,                  // Target actor
    actor -> actor.cleanup(),  // Action to perform
    60,                        // Initial delay before the first execution
    300,                       // Delay after each execution completes
    TimeUnit.SECONDS           // Time unit
);
```

The timing behavior of `scheduleWithFixedDelay` is illustrated below. Notice that the delay is measured from when each task finishes, not from when it started.

```
scheduleWithFixedDelay (delay=100ms, task takes 30ms):

|task|              |task|              |task|
0    30        130  160        260  290ms
     └──delay──┘    └──delay──┘
```

### scheduleOnce

The `scheduleOnce` method executes a task exactly once after a specified delay. This is useful for deferred initialization, timeout handling, or any one-time operation that should happen in the future.

```java
scheduler.scheduleOnce(
    "init",                       // Task ID
    actorRef,                     // Target actor
    actor -> actor.initialize(),  // Action to perform
    5,                            // Delay before execution
    TimeUnit.SECONDS              // Time unit
);
```

## Choosing Between Fixed Rate and Fixed Delay

The choice between `scheduleAtFixedRate` and `scheduleWithFixedDelay` depends on what matters most for your use case: consistent timing or guaranteed rest periods.

| Scenario | Recommended Method | Rationale |
|----------|-------------------|-----------|
| Metrics collection | `scheduleAtFixedRate` | You need samples at consistent intervals for accurate time-series data |
| Heartbeat signals | `scheduleAtFixedRate` | Fixed timing requirements for failure detection |
| Polling external service | `scheduleWithFixedDelay` | Prevents overwhelming the service if requests are slow |
| Batch processing | `scheduleWithFixedDelay` | Allows the system to recover between batches |
| Cleanup tasks | `scheduleWithFixedDelay` | Ensures the previous cleanup completes before starting the next |

## Managing Scheduled Tasks

The Scheduler provides methods to check on and manage scheduled tasks after they've been created.

### Cancel a Task

You can cancel a scheduled task by its ID. The method returns true if the task was successfully cancelled, or false if the task was not found (perhaps because it already completed for a `scheduleOnce` task).

```java
boolean cancelled = scheduler.cancelTask("health-check");
if (cancelled) {
    System.out.println("Health check task cancelled");
} else {
    System.out.println("Task not found or already completed");
}
```

### Check Task Status

You can check whether a task with a given ID is still scheduled and active.

```java
if (scheduler.isScheduled("health-check")) {
    System.out.println("Health check task is still running");
} else {
    System.out.println("Health check task is not active");
}
```

### Get Active Task Count

To get an overview of how many tasks are currently scheduled, use the `getScheduledTaskCount` method.

```java
int count = scheduler.getScheduledTaskCount();
System.out.println("Currently " + count + " tasks are scheduled");
```

## Lifecycle Management

The Scheduler implements `AutoCloseable`, which allows it to be used with try-with-resources for automatic cleanup. When you're done with a Scheduler, you should close it to release its resources.

### Manual Close

You can close a Scheduler manually when you're done with it. This cancels all scheduled tasks and shuts down the internal thread pool.

```java
scheduler.close();
```

### Try-with-Resources

For short-lived schedulers, you can use try-with-resources to ensure automatic cleanup.

```java
try (Scheduler scheduler = new Scheduler()) {
    scheduler.scheduleAtFixedRate("task", actor, a -> a.work(), 0, 1, TimeUnit.SECONDS);
    // ... do other work while the task runs periodically ...
    Thread.sleep(10000);  // Let it run for 10 seconds
}  // Scheduler is automatically closed here
```

When a Scheduler is closed, it performs the following cleanup steps: first, it cancels all scheduled tasks so no new executions will start; second, it shuts down the internal executor service and waits up to 5 seconds for any in-progress tasks to complete.

## Complete Example

The following example demonstrates a complete workflow: creating a Scheduler, scheduling different types of tasks, monitoring their status, and properly cleaning up resources.

```java
public class SchedulerExample {
    public static void main(String[] args) throws Exception {
        ActorSystem system = new ActorSystem("scheduler-demo");
        Scheduler scheduler = new Scheduler();

        // Create a monitoring actor that will receive scheduled tasks.
        ActorRef<SystemMonitor> monitor =
            system.actorOf("monitor", new SystemMonitor());

        // Schedule a health check that runs every 10 seconds.
        // The initial delay of 0 means the first check happens immediately.
        scheduler.scheduleAtFixedRate(
            "health-check",
            monitor,
            m -> m.checkHealth(),
            0, 10, TimeUnit.SECONDS
        );

        // Schedule memory cleanup to run every 5 minutes.
        // Using scheduleWithFixedDelay ensures each cleanup completes
        // before the delay countdown for the next one begins.
        // The initial delay of 60 seconds gives the system time to start up.
        scheduler.scheduleWithFixedDelay(
            "memory-cleanup",
            monitor,
            m -> m.cleanupMemory(),
            60, 300, TimeUnit.SECONDS
        );

        // Schedule a one-time initialization task that runs after 5 seconds.
        // This is useful for deferred initialization that shouldn't happen
        // until the system has had time to stabilize.
        scheduler.scheduleOnce(
            "init",
            monitor,
            m -> m.initialize(),
            5, TimeUnit.SECONDS
        );

        // Let the scheduler run for a minute to demonstrate the tasks.
        Thread.sleep(60000);

        // Check the current status of scheduled tasks.
        System.out.println("Active tasks: " + scheduler.getScheduledTaskCount());

        // Cancel a specific task when it's no longer needed.
        scheduler.cancelTask("memory-cleanup");

        // Clean up all resources when the application is shutting down.
        scheduler.close();
        system.terminate();
    }
}

// The actor that receives scheduled task invocations.
// This is a plain Java class - the Scheduler uses ActorRef.ask()
// internally, so all method calls are thread-safe.
class SystemMonitor {
    public void checkHealth() {
        System.out.println("Health check at " + System.currentTimeMillis());
        // In a real application, this might check database connections,
        // memory usage, thread counts, etc.
    }

    public void cleanupMemory() {
        System.gc();
        System.out.println("Memory cleanup completed");
        // In a real application, this might also clear caches,
        // release unused resources, etc.
    }

    public void initialize() {
        System.out.println("System initialized");
        // One-time setup that should happen after startup completes.
    }
}
```

## Thread Safety

All scheduled tasks are executed via `ActorRef.ask()`, which means they go through the actor's message queue and are processed sequentially with other messages sent to that actor. This provides the same thread-safety guarantees as manually calling `ask()` on the actor.

Task registration and cancellation operations on the Scheduler itself are also thread-safe. Multiple threads can safely schedule new tasks, cancel existing tasks, or query task status concurrently.

If you have multiple Schedulers targeting the same actor, all their scheduled tasks will be queued in that actor's message queue. This means the tasks are serialized and won't execute concurrently with each other or with other messages sent to the actor.

## Error Handling

If a scheduled task throws an exception, the Scheduler handles it gracefully to prevent one failing task from affecting others.

When an exception occurs, the error is logged at SEVERE level so you can diagnose the problem. The task continues to be scheduled for future executions (it's not cancelled due to the error). The exception does not propagate to other scheduled tasks, so they continue to run normally.

```java
scheduler.scheduleAtFixedRate("risky-task", actor, a -> {
    if (Math.random() < 0.1) {
        // This exception will be logged but won't stop the task
        // from being scheduled for future executions.
        throw new RuntimeException("Random failure");
    }
    a.doWork();
}, 0, 1, TimeUnit.SECONDS);
// The task continues running every second, even after failures.
```

This error handling behavior ensures that transient failures don't permanently disable scheduled tasks. However, you should monitor your logs for repeated errors, as they may indicate a systematic problem that needs attention.
