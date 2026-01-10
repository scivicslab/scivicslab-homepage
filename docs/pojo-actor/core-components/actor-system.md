---
sidebar_position: 1
title: ActorSystem
---

# ActorSystem

The `ActorSystem` is the container and coordinator for all actors in a POJO-actor application. It manages actor lifecycles, thread pools, and provides the infrastructure for actor communication.

## Creating an ActorSystem

### Basic Construction

```java
// Create with a name (uses default thread pool size)
ActorSystem system = new ActorSystem("my-system");

// Create with specific thread pool size
ActorSystem system = new ActorSystem("my-system", 4);
```

### Using the Builder Pattern

```java
ActorSystem system = new ActorSystem.Builder("my-system")
    .threadNum(8)
    .build();
```

## Creating Actors

The primary way to create actors is through the `actorOf` method:

```java
// Create a new actor and register it with the system
ActorRef<MyActor> actorRef = system.actorOf("my-actor", new MyActor());
```

You can also add pre-created actors:

```java
ActorRef<MyActor> actorRef = new ActorRef<>("my-actor", new MyActor(), system);
system.addActor(actorRef);
```

## Actor Management

### Checking Actor Existence

```java
if (system.hasActor("my-actor")) {
    // Actor exists
}
```

### Retrieving Actors

```java
ActorRef<MyActor> actorRef = system.getActor("my-actor");
```

### Listing All Actors

```java
List<String> actorNames = system.listActorNames();
```

### Removing Actors

```java
system.removeActor("my-actor");
```

## Work-Stealing Pools

ActorSystem manages work-stealing pools for CPU-intensive tasks. By default, one pool is created with threads equal to available processors.

### Adding Additional Pools

```java
// Add a pool with 8 threads
system.addWorkStealingPool(8);
```

### Accessing Pools

```java
// Get the default pool (index 0)
ExecutorService defaultPool = system.getWorkStealingPool();

// Get a specific pool by index
ExecutorService pool = system.getWorkStealingPool(1);
```

## Lifecycle Management

### Checking System Status

```java
// Check if the system is alive
if (system.isAlive()) {
    // System is running
}

// Check if a specific actor is alive
if (system.isAlive("my-actor")) {
    // Actor is running
}
```

### Terminating the System

```java
// Gracefully terminate all actors and thread pools
system.terminate();
```

This will:
1. Close all registered actors
2. Shutdown all work-stealing pools
3. Wait up to 60 seconds for graceful termination

## Complete Example

```java
public class ActorSystemExample {
    public static void main(String[] args) {
        // Create actor system
        ActorSystem system = new ActorSystem("example-system", 4);

        // Create actors
        ActorRef<Counter> counter = system.actorOf("counter", new Counter());
        ActorRef<Logger> logger = system.actorOf("logger", new Logger());

        // Use actors
        counter.tell(c -> c.increment());
        int value = counter.ask(c -> c.getValue()).join();

        logger.tell(l -> l.log("Counter value: " + value));

        // Cleanup
        system.terminate();
    }
}

class Counter {
    private int value = 0;
    public void increment() { value++; }
    public int getValue() { return value; }
}

class Logger {
    public void log(String message) {
        System.out.println("[LOG] " + message);
    }
}
```

## Thread Safety

`ActorSystem` is thread-safe. Multiple threads can:
- Create actors concurrently
- Look up actors concurrently
- Add/remove actors concurrently

The internal actor registry uses `ConcurrentHashMap` for safe concurrent access.
