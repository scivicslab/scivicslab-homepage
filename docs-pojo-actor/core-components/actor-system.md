---
sidebar_position: 1
title: ActorSystem
---

# ActorSystem

The `ActorSystem` class serves as the foundation of any POJO-actor application. It acts as a container that manages the lifecycle of all actors, coordinates their communication, and provides shared resources such as thread pools. Every actor in your application must be registered with an ActorSystem, which ensures proper resource management and enables actors to discover and communicate with each other.

## Creating an ActorSystem

Before you can create any actors, you need to instantiate an ActorSystem. The system requires a name that identifies it, which is useful for debugging and logging purposes.

### Basic Construction

The simplest way to create an ActorSystem is to provide just a name. In this case, the system will use a default thread pool size based on your system's available processors.

```java
ActorSystem system = new ActorSystem("my-system");
```

If you know your application will need more parallel processing capacity, you can specify the number of threads for the work-stealing pool at construction time. This is particularly useful when your actors perform CPU-intensive computations.

```java
ActorSystem system = new ActorSystem("my-system", 4);
```

### Using the Builder Pattern

For more complex configurations, POJO-actor provides a Builder pattern. This approach makes the code more readable when you need to set multiple configuration options, and it allows for future extensibility without breaking existing code.

```java
ActorSystem system = new ActorSystem.Builder("my-system")
    .threadNum(8)
    .build();
```

## Creating Actors

Once you have an ActorSystem, you can create actors and register them with the system. The `actorOf` method is the recommended way to do this because it handles both the creation of the ActorRef wrapper and the registration in a single call.

The first argument is the actor's name, which must be unique within the system. The second argument is an instance of your POJO class that contains the actor's state and behavior. Notice that you pass a plain Java object here—there's no need to extend any special base class.

```java
ActorRef<MyActor> actorRef = system.actorOf("my-actor", new MyActor());
```

In some cases, you might need to create an ActorRef first and register it later. This approach gives you more control over the actor's initialization but requires two separate steps.

```java
ActorRef<MyActor> actorRef = new ActorRef<>("my-actor", new MyActor(), system);
system.addActor(actorRef);
```

## Actor Management

The ActorSystem provides several methods for managing the actors registered within it. These methods allow you to check whether actors exist, retrieve references to them, and remove them when they're no longer needed.

### Checking Actor Existence

Before attempting to retrieve an actor, you may want to verify that it exists. The `hasActor` method returns true if an actor with the specified name is currently registered with the system.

```java
if (system.hasActor("my-actor")) {
    // The actor exists and can be safely retrieved
}
```

### Retrieving Actors

When you need to communicate with an actor that was created elsewhere in your application, use the `getActor` method to obtain a reference to it. The method returns null if no actor with that name exists, so you should either check with `hasActor` first or handle the null case appropriately.

```java
ActorRef<MyActor> actorRef = system.getActor("my-actor");
```

### Listing All Actors

For debugging or administrative purposes, you can retrieve a list of all actor names registered with the system. This is useful when you need to inspect the current state of your actor hierarchy.

```java
List<String> actorNames = system.listActorNames();
```

### Removing Actors

When an actor is no longer needed, you should remove it from the system to free up resources. The `removeActor` method unregisters the actor from the system's internal registry.

```java
system.removeActor("my-actor");
```

## Work-Stealing Pools

ActorSystem manages one or more work-stealing thread pools that are designed for CPU-intensive tasks. These pools use the ForkJoinPool implementation, which is highly efficient for tasks that can be broken down into smaller subtasks. By default, the system creates one pool with a number of threads equal to the available processors on your machine.

Work-stealing pools are particularly useful when your actors need to perform heavy computations without blocking their message processing queues. You can offload expensive operations to these pools using the `tell` and `ask` methods that accept an ExecutorService parameter.

### Adding Additional Pools

If your application has different types of workloads that should be isolated from each other, you can create additional work-stealing pools. For example, you might want separate pools for image processing tasks and data analysis tasks.

```java
system.addWorkStealingPool(8);
```

### Accessing Pools

To use a work-stealing pool with your actor operations, retrieve it from the system. The default pool is always at index 0. If you've added additional pools, they're assigned sequential indices starting from 1.

```java
ExecutorService defaultPool = system.getWorkStealingPool();
ExecutorService customPool = system.getWorkStealingPool(1);
```

## Lifecycle Management

Proper lifecycle management is essential for building reliable applications. The ActorSystem provides methods to check the health of the system and its actors, as well as to perform a clean shutdown when your application terminates.

### Checking System Status

You can verify whether the ActorSystem itself is still running, or check the status of individual actors. This is useful for health checks and monitoring.

```java
if (system.isAlive()) {
    // The system is running and can accept new actors
}

if (system.isAlive("my-actor")) {
    // The specific actor is still processing messages
}
```

### Terminating the System

When your application is shutting down, call the `terminate` method to perform a graceful cleanup. This method ensures that all resources are properly released.

```java
system.terminate();
```

The termination process performs several steps in sequence. First, it closes all registered actors, which stops their message processing loops and clears their message queues. Next, it shuts down all work-stealing pools, waiting for any in-progress tasks to complete. The system waits up to 60 seconds for a graceful termination before forcing a shutdown.

## Complete Example

The following example demonstrates how to create an ActorSystem, register multiple actors, have them communicate, and properly shut down the system. Notice how the Counter and Logger classes are plain Java objects with no special inheritance requirements.

```java
public class ActorSystemExample {
    public static void main(String[] args) {
        // Create an actor system with 4 threads in the work-stealing pool.
        // The name "example-system" will appear in log messages for debugging.
        ActorSystem system = new ActorSystem("example-system", 4);

        // Create two actors and register them with the system.
        // Each actor gets a unique name for later retrieval.
        ActorRef<Counter> counter = system.actorOf("counter", new Counter());
        ActorRef<Logger> logger = system.actorOf("logger", new Logger());

        // Send a message to increment the counter. The tell() method
        // is fire-and-forget, so execution continues immediately.
        counter.tell(c -> c.increment());

        // Use ask() to retrieve a value from the actor. The join() call
        // blocks until the actor processes the request and returns the result.
        int value = counter.ask(c -> c.getValue()).join();

        // Send the retrieved value to the logger actor for output.
        logger.tell(l -> l.log("Counter value: " + value));

        // Always terminate the system when your application is done.
        // This ensures all actors are stopped and resources are released.
        system.terminate();
    }
}

// A simple counter actor that maintains an integer value.
// Notice this is a plain Java class with no special base class.
class Counter {
    private int value = 0;

    public void increment() {
        value++;
    }

    public int getValue() {
        return value;
    }
}

// A simple logging actor that prints messages to the console.
class Logger {
    public void log(String message) {
        System.out.println("[LOG] " + message);
    }
}
```

## Thread Safety

The ActorSystem is fully thread-safe, meaning you can safely call its methods from multiple threads without external synchronization. Multiple threads can create actors, look up actors by name, and add or remove actors concurrently without causing data corruption or race conditions.

This thread safety is achieved through the use of `ConcurrentHashMap` for the internal actor registry. However, keep in mind that while the registry operations themselves are atomic, sequences of operations (like checking if an actor exists and then retrieving it) are not. If you need such compound operations to be atomic, you should implement your own synchronization.
