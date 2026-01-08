---
sidebar_position: 1
title: Introduction
---

# POJO-actor

**A lightweight Actor Model framework for Java with built-in workflow engine**

POJO-actor enables you to build concurrent, distributed applications using the Actor Model pattern while keeping your code simple and testable. Unlike traditional actor frameworks, POJO-actor works with Plain Old Java Objects (POJOs), eliminating the need for complex inheritance hierarchies.

## Key Features

- **POJO-based Actors**: Use any Java class as an actor without extending special base classes
- **Workflow Engine**: Built-in finite state machine interpreter for YAML-defined workflows
- **Type-safe Messaging**: Compile-time type checking for actor messages using Java generics
- **Lightweight**: Minimal dependencies, easy to integrate into existing projects
- **Testable**: Actors are plain Java objects, making unit testing straightforward

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
