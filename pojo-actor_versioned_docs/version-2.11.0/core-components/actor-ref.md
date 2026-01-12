---
sidebar_position: 2
title: ActorRef
---

# ActorRef

The `ActorRef<T>` class is a reference handle that wraps your plain Java object (POJO) and provides the actor model's message-passing semantics. When you create an ActorRef, it sets up the infrastructure needed for safe concurrent access to your object: a message queue for incoming requests, a dedicated virtual thread for processing those requests, and methods for sending messages to the actor.

The key insight behind ActorRef is that it transforms any ordinary Java object into an actor without requiring that object to extend any special base class or implement any particular interface. Your business logic remains in plain Java, while ActorRef provides the concurrency guarantees.

## Creating ActorRefs

There are two main ways to create an ActorRef: through an ActorSystem (recommended) or by direct construction.

### Through ActorSystem (Recommended)

The preferred approach is to use the `actorOf` method on ActorSystem. This method creates the ActorRef, starts its message processing thread, and registers it with the system in a single operation. The registration enables other parts of your application to look up the actor by name.

```java
ActorSystem system = new ActorSystem("my-system");
ActorRef<MyActor> actorRef = system.actorOf("my-actor", new MyActor());
```

### Direct Construction

You can also construct an ActorRef directly, which is useful in testing scenarios or when you need more control over initialization. When constructing directly, you can optionally provide an ActorSystem reference, which enables the actor to access system resources like work-stealing pools.

```java
// Standalone actor without a system
ActorRef<MyActor> actorRef = new ActorRef<>("my-actor", new MyActor());

// Actor with system reference (for accessing pools and other system features)
ActorRef<MyActor> actorRef = new ActorRef<>("my-actor", new MyActor(), system);
```

## Message Processing Model

Understanding how ActorRef processes messages is essential for writing correct concurrent code. Each ActorRef maintains three key components that work together to ensure thread-safe access to your POJO.

First, there is a **message queue** implemented as a BlockingQueue that stores incoming messages in FIFO (first-in, first-out) order. When you call `tell()` or `ask()`, your message is added to this queue rather than being executed immediately.

Second, there is a **virtual thread** that runs continuously, pulling messages from the queue and executing them one at a time against your POJO. This single-threaded execution model eliminates race conditions because only one message can access your object's state at any given moment.

Third, there is an **atomic running flag** that tracks whether the actor is still active. This flag is used to stop the message processing loop when the actor is closed.

```
                    ┌──────────────────┐
 tell()/ask() ────► │  Message Queue   │ ────► Virtual Thread ────► POJO
                    │  (BlockingQueue) │       (processes one
                    └──────────────────┘        message at a time)
```

## Messaging Methods Overview

ActorRef provides four methods for communicating with actors. Each method has different characteristics regarding whether it waits in the queue and what kind of response it provides.

The `tell()` method sends a message that will be queued and processed eventually. It returns a CompletableFuture that completes when the action finishes, but it doesn't return a value from the actor. Use this for fire-and-forget operations where you don't need a response.

The `ask()` method also queues a message, but it returns a CompletableFuture containing the result of the action. Use this when you need to retrieve data from the actor or need confirmation that an operation succeeded.

The `tellNow()` method bypasses the queue entirely and executes the action immediately on a separate virtual thread. This is useful for urgent operations that can't wait, but it requires you to ensure thread safety in your POJO.

The `askNow()` method similarly bypasses the queue and returns a result immediately. This is useful for monitoring or debugging when you need to inspect actor state without waiting for queued messages to complete.

| Method | Queued | Returns | Primary Use Case |
|--------|--------|---------|------------------|
| `tell()` | Yes | `CompletableFuture<Void>` | Fire-and-forget operations |
| `ask()` | Yes | `CompletableFuture<R>` | Request-response queries |
| `tellNow()` | No | `CompletableFuture<Void>` | Urgent commands that bypass the queue |
| `askNow()` | No | `CompletableFuture<R>` | Immediate queries for monitoring |

## Child Actors

Actors can create and supervise child actors, forming a hierarchy. This parent-child relationship is useful for organizing complex systems and implementing supervision strategies where parent actors can monitor and restart their children.

When you create a child actor, you should set up the parent-child relationship explicitly. The child maintains a reference to its parent's name, and the parent keeps track of its children's names.

```java
ActorRef<Parent> parent = system.actorOf("parent", new Parent());

// Create a child actor from within the parent's context
ActorRef<Child> child = parent.ask(p -> {
    return parent.createChild("child-1", new Child());
}).join();

// Query the parent for its children's names
Set<String> children = parent.ask(p -> p.getNamesOfChildren()).join();

// Query the child for its parent's name
String parentName = child.ask(c -> c.getParentName()).join();
```

## JSON State API

Since version 2.10.0, every ActorRef includes a built-in JSON state store for dynamic data that doesn't fit neatly into your POJO's typed fields. This is useful for storing metadata, configuration, or runtime information that may change frequently or vary between different instances of the same actor type.

The JSON state uses XPath-style paths to navigate a hierarchical structure. You can store primitive values, and the API provides type-safe getter methods with optional default values.

```java
ActorRef<MyActor> actor = system.actorOf("worker", new MyActor());

// Store values using dot-notation for nested paths
actor.putJson("workflow.retry", 3);
actor.putJson("workflow.timeout", 5000);

// Store values in arrays using bracket notation
actor.putJson("hosts[0]", "server1.example.com");
actor.putJson("hosts[1]", "server2.example.com");

// Retrieve values with type-safe methods
int retry = actor.getJsonInt("workflow.retry", 0);  // Returns 3
String host = actor.getJsonString("hosts[0]");       // Returns "server1.example.com"

// Check whether a path exists before reading
if (actor.hasJson("workflow.retry")) {
    // The path exists and has a value
}

// Clear all JSON state when needed
actor.clearJsonState();
```

## Lifecycle Management

ActorRef implements `AutoCloseable`, which means you can use it with try-with-resources for automatic cleanup, or close it manually when the actor is no longer needed.

### Checking Actor Status

Before sending messages to an actor, you can verify that it's still alive and capable of processing messages. An actor is considered alive from the moment it's created until it's closed.

```java
if (actorRef.isAlive()) {
    // The actor is running and will process messages
    actorRef.tell(a -> a.doWork());
}
```

### Closing an Actor

When you close an actor, several things happen in sequence. The message processing loop is stopped, preventing any new messages from being processed. Any messages remaining in the queue are discarded. If the actor is registered with a system, it's removed from that system's registry.

```java
// Manual close when you're done with the actor
actorRef.close();

// Or use try-with-resources for automatic cleanup
try (ActorRef<MyActor> actor = new ActorRef<>("temp", new MyActor())) {
    actor.tell(a -> a.doWork()).join();
}  // Actor is automatically closed here
```

### Clearing Pending Messages

In some scenarios, you may want to discard all pending messages without closing the actor. For example, if a user cancels an operation, you might want to clear the queue and start fresh. The `clearPendingMessages` method removes all queued messages and returns the count of messages that were discarded.

```java
int cleared = actorRef.clearPendingMessages();
System.out.println("Discarded " + cleared + " pending messages");
```

## Complete Example

The following example demonstrates the key features of ActorRef: creating an actor, sending messages, querying state, using the JSON state API, and proper cleanup. The BankAccount class is a simple POJO that knows nothing about the actor model—all the concurrency is handled by ActorRef.

```java
public class ActorRefExample {
    public static void main(String[] args) throws Exception {
        ActorSystem system = new ActorSystem("example");

        // Create a bank account actor. The BankAccount class is a plain
        // Java object with no special requirements.
        ActorRef<BankAccount> account = system.actorOf("account", new BankAccount());

        // Send deposit messages. These are queued and processed in order,
        // ensuring the balance calculations are never corrupted by
        // concurrent access.
        account.tell(a -> a.deposit(100)).join();
        account.tell(a -> a.deposit(50)).join();
        account.tell(a -> a.withdraw(30)).join();

        // Query the current balance. The ask() method waits for
        // all previous messages to be processed before executing,
        // so we're guaranteed to see the effects of all three operations.
        double balance = account.ask(BankAccount::getBalance).join();
        System.out.println("Balance: " + balance); // Outputs: 120.0

        // Use the JSON state API to store metadata about the account.
        // This data is stored separately from the BankAccount POJO.
        account.putJson("lastAccess", System.currentTimeMillis());
        account.putJson("owner", "John Doe");

        // Retrieve the stored metadata
        String owner = account.getJsonString("owner");
        System.out.println("Account owner: " + owner);

        // Clean up resources when done
        system.terminate();
    }
}

// A simple bank account that maintains a balance.
// This is a plain Java class with no knowledge of the actor model.
class BankAccount {
    private double balance = 0;

    public void deposit(double amount) {
        balance += amount;
    }

    public void withdraw(double amount) {
        if (balance >= amount) {
            balance -= amount;
        }
    }

    public double getBalance() {
        return balance;
    }
}
```
