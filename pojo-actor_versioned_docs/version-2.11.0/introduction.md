---
sidebar_position: 1
title: Introduction
---


# POJO-actor: A Lightweight Actor Model for Java Using Virtual Threads

This document is the official manual and reference for **POJO-actor**.
It currently documents version 2.12.0.


---

Building concurrent systems in Java remains challenging.

Traditional shared-state concurrency relies on careful lock management and is prone to subtle bugs.
At the same time, many established actor frameworks introduce significant runtime overhead and complex abstractions that are unnecessary for a large class of applications.

With the introduction of **virtual threads in Java 21**, it has become possible to build tens of thousands of lightweight, actor-like components without relying on heavyweight frameworks or OS-thread-per-actor designs.

**POJO-actor** is a lightweight Java library that implements a simplified actor model on top of modern JDK features, with a strong focus on virtual threads.

It allows developers to write actor-style components as **plain Java objects (POJOs)**, without reflection, code generation, or framework-specific APIs.
The goal is to enable actor-like reasoning while keeping execution, state, and concurrency semantics explicit and inspectable.


## Background: Actor Model and Modern Java

The actor model is a programming paradigm in which independent entities, called actors, communicate exclusively through message passing.
By avoiding shared mutable state, the actor model eliminates the need for explicit locks and reduces the complexity of concurrent programming.

Historically, practical use of the actor model in Java required specialized frameworks.
Because these frameworks typically mapped actors to operating system threads, the number of actors was effectively limited by the number of available CPU cores.

Recent advancements in the JDK have fundamentally changed this situation.
With virtual threads, even a typical developer machine can now support **tens of thousands of concurrent, lightweight execution contexts**, making a simpler and more direct actor-style design practical without heavy runtime machinery.


## Project Repository

The POJO-actor source code is available on GitHub:

[https://github.com/scivicslab/POJO-actor](https://github.com/scivicslab/POJO-actor)



## Core Components

POJO-actor implements a simplified actor model using modern Java features (JDK21+).
The original core of POJO-actor (v1.0.0) was intentionally designed as a
compact implementation of approximately **800 lines of code**, capturing
only the essential mechanics of the actor model.(The README for the original v1.0.0 release 
[README for the original ver1.0.0 release](https://coderlegion.com/8748/pojo-actor-v1-0-a-lightweight-actor-model-library-for-java) is available on CoderLegion.)

This minimal core established the architectural foundation for clarity,
performance, and debuggability, while allowing the project to evolve
beyond its initial scope.


The core components are:

- **ActorSystem**
  Manages actor lifecycles and coordinates execution using configurable work-stealing thread pools.

- **ActorRef**
  A reference to an actor that provides `tell()` and `ask()` messaging interfaces.

- **Virtual Threads**
  Each actor executes on its own virtual thread, enabling lightweight and scalable message handling.

- **Work-Stealing Pools**
  Computationally heavy tasks can be delegated to configurable thread pools to avoid blocking actor execution.

- **Zero Reflection**
  The implementation relies exclusively on standard JDK APIs, making it compatible with GraalVM native-image.


## Any POJO Can Become an Actor

One of POJO-actor’s biggest advantages is that you don’t need to design your code specifically for the actor model from the beginning. Any existing Java object can instantly become an actor, including standard library classes:

```
import java.util.ArrayList;
import java.util.concurrent.CompletableFuture;

// Turn a standard ArrayList into an actor - no modifications needed!
ActorSystem system = new ActorSystem("listSystem");
ActorRef<ArrayList<String>> listActor = system.actorOf("myList", new ArrayList<String>());

// Send messages to the ArrayList actor
listActor.tell(list -> list.add("Hello"));
listActor.tell(list -> list.add("World"));
listActor.tell(list -> list.add("from"));
listActor.tell(list -> list.add("POJO-actor"));

// Query the list size
CompletableFuture<Integer> sizeResult = listActor.ask(list -> list.size());
System.out.println("List size: " + sizeResult.get()); // Prints: List size: 4

// Get specific elements
CompletableFuture<String> firstElement = listActor.ask(list -> list.get(0));
System.out.println("First element: " + firstElement.get()); // Prints: First element: Hello

// Even complex operations work
CompletableFuture<String> joinedResult = listActor.ask(list ->
    String.join(" ", list));
System.out.println(joinedResult.get()); // Prints: Hello World from POJO-actor

system.terminate();
```

This means you can:

- Retrofit existing codebases without architectural changes
- Protect any object with actor-based thread safety
- Scale incrementally by converting objects to actors as needed
- Reuse existing POJOs without any modifications



## Virtual Threads and Managed Thread Pools

### The Problem with Traditional Actor Libraries

Traditional actor libraries map each actor to an OS thread. Since OS threads are expensive resources (typically limited to a few thousand), the number of actors was effectively capped by the number of available CPU cores. Creating 10,000 actors was simply impractical.

### POJO-actor's Solution: Virtual Threads

POJO-actor leverages **JDK 21+ virtual threads**—lightweight threads managed by the JVM rather than the OS. This enables:

- **Tens of thousands of actors** on ordinary hardware
- **Minimal memory overhead** per actor
- **Fast context switching** without OS involvement

```java
// Create 10,000 actors effortlessly
ActorSystem system = new ActorSystem("massiveSystem");
for (int i = 0; i < 10_000; i++) {
    system.actorOf("counter-" + i, new Counter());
}
```

### The Caveat: CPU-Intensive Work

Virtual threads excel at lightweight operations (message passing, state updates, I/O waiting), but they **should not perform heavy CPU computations directly**. Blocking a virtual thread with CPU-bound work defeats its purpose.

For CPU-intensive tasks, POJO-actor provides **managed thread pools**:

```java
ActorSystem system = new ActorSystem("system", 4); // 4 CPU threads

// Light operation → virtual thread (default)
actor.tell(a -> a.updateCounter());

// Heavy computation → managed thread pool
CompletableFuture<Double> result = actor.ask(
    a -> a.performMatrixMultiplication(),
    system.getManagedThreadPool()
);
```

### Summary

| Operation Type | Use | Example |
|----------------|-----|---------|
| Light (state changes, messaging) | Virtual threads (default) | `tell()`, `ask()` |
| Heavy (CPU-bound computation) | Managed thread pool | `ask(..., getManagedThreadPool())` |

This separation keeps your actor system responsive while still enabling parallel computation when needed.



## Workflow Definition

Define workflows in YAML that orchestrate actor interactions:

```yaml
name: example-workflow
steps:
  - states: ["0", "1"]
    actions:
      - actor: greeter
        method: greet
        arguments: "World"
  - states: ["1", "end"]
    actions:
      - actor: logger
        method: log
```



## Use Cases

- **Microservice Orchestration**: Coordinate multiple services with workflow definitions
- **Event-driven Systems**: Build reactive applications with actor-based message passing
- **Distributed Processing**: Scale across multiple nodes with the actor model
- **Infrastructure Automation**: Combined with actor-IaC for infrastructure management
