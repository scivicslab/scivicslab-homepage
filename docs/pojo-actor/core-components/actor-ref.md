---
sidebar_position: 2
title: ActorRef
---

# ActorRef

`ActorRef<T>` is a reference to an actor that provides messaging capabilities and lifecycle management. It wraps a POJO and provides the actor model's message-passing semantics through `tell()` and `ask()` methods.

## Creating ActorRefs

### Through ActorSystem (Recommended)

```java
ActorSystem system = new ActorSystem("my-system");
ActorRef<MyActor> actorRef = system.actorOf("my-actor", new MyActor());
```

### Direct Construction

```java
// Without actor system
ActorRef<MyActor> actorRef = new ActorRef<>("my-actor", new MyActor());

// With actor system
ActorRef<MyActor> actorRef = new ActorRef<>("my-actor", new MyActor(), system);
```

## Message Processing Model

Each `ActorRef` maintains:
- A **message queue** (FIFO) for incoming messages
- A **virtual thread** that processes messages sequentially
- An **atomic running flag** for lifecycle management

Messages sent via `tell()` and `ask()` are queued and processed one at a time, ensuring thread-safe access to the actor's state.

```
                    ┌──────────────────┐
 tell()/ask() ────► │  Message Queue   │ ────► Virtual Thread ────► POJO
                    │  (BlockingQueue) │       (processes one
                    └──────────────────┘        message at a time)
```

## Messaging Methods Overview

| Method | Queued | Returns | Use Case |
|--------|--------|---------|----------|
| `tell()` | Yes | `CompletableFuture<Void>` | Fire-and-forget |
| `ask()` | Yes | `CompletableFuture<R>` | Request-response |
| `tellNow()` | No | `CompletableFuture<Void>` | Urgent, concurrent |
| `askNow()` | No | `CompletableFuture<R>` | Urgent query, concurrent |

## Child Actors

Actors can create and supervise child actors:

```java
ActorRef<Parent> parent = system.actorOf("parent", new Parent());

// Create a child actor
ActorRef<Child> child = parent.ask(p -> {
    return parent.createChild("child-1", new Child());
}).join();

// Get child names
Set<String> children = parent.ask(p -> p.getNamesOfChildren()).join();

// Get parent name from child
String parentName = child.ask(c -> c.getParentName()).join();
```

## JSON State API

Since version 2.10.0, actors have built-in JSON state for dynamic data:

```java
ActorRef<MyActor> actor = system.actorOf("worker", new MyActor());

// Store values using XPath-style paths
actor.putJson("workflow.retry", 3);
actor.putJson("hosts[0]", "server1.example.com");

// Read values
int retry = actor.getJsonInt("workflow.retry", 0);
String host = actor.getJsonString("hosts[0]");

// Check existence
if (actor.hasJson("workflow.retry")) {
    // Path exists
}

// Clear state
actor.clearJsonState();
```

## Lifecycle Management

### Checking Actor Status

```java
if (actorRef.isAlive()) {
    // Actor is running and can process messages
}
```

### Closing an Actor

`ActorRef` implements `AutoCloseable`:

```java
// Manual close
actorRef.close();

// Or use try-with-resources
try (ActorRef<MyActor> actor = new ActorRef<>("temp", new MyActor())) {
    actor.tell(a -> a.doWork()).join();
}
```

Closing an actor:
1. Stops the message processing loop
2. Clears the message queue
3. Removes the actor from its system

### Clearing Pending Messages

```java
// Clear all queued messages
int cleared = actorRef.clearPendingMessages();
System.out.println("Cleared " + cleared + " messages");
```

## Complete Example

```java
public class ActorRefExample {
    public static void main(String[] args) throws Exception {
        ActorSystem system = new ActorSystem("example");

        // Create an actor
        ActorRef<BankAccount> account = system.actorOf("account", new BankAccount());

        // Send messages (queued, processed in order)
        account.tell(a -> a.deposit(100)).join();
        account.tell(a -> a.deposit(50)).join();
        account.tell(a -> a.withdraw(30)).join();

        // Query state
        double balance = account.ask(BankAccount::getBalance).join();
        System.out.println("Balance: " + balance); // 120.0

        // Use JSON state for metadata
        account.putJson("lastAccess", System.currentTimeMillis());
        account.putJson("owner", "John Doe");

        // Cleanup
        system.terminate();
    }
}

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
