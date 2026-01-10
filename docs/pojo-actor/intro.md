---
sidebar_position: 1
title: Introduction
---


# POJO-actor: A Lightweight Actor Model for Java Using Virtual Threads

This document is the official manual and reference for **POJO-actor**.

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



## Architecture

POJO-actor implements a simplified actor model using modern Java features (JDK21+).
The original core of POJO-actor (v1.0.0) was intentionally designed as a
compact implementation of approximately **800 lines of code**, capturing
only the essential mechanics of the actor model.

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



## Quick Example

```java
// Define a simple actor as a POJO
public class GreetingActor {
    public String greet(String name) {
        return "Hello, " + name + "!";
    }
}

// Create actor reference and use it
IIActorSystem system = new IIActorSystem();
GreetingActor actor = new GreetingActor();
IIActorRef<GreetingActor> ref = new IIActorRef<>("greeter", actor, system);

// Call actor method
String result = ref.ask(a -> a.greet("World")).get();
System.out.println(result); // "Hello, World!"
```

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

## Getting Started

Check out the [Getting Started](./getting-started) guide to begin building with POJO-actor.

## Use Cases

- **Microservice Orchestration**: Coordinate multiple services with workflow definitions
- **Event-driven Systems**: Build reactive applications with actor-based message passing
- **Distributed Processing**: Scale across multiple nodes with the actor model
- **Infrastructure Automation**: Combined with actor-IaC for infrastructure management
