---
sidebar_position: 1
title: "Dynamic Actor Loading"
description: "Load actors from external JARs at runtime using Maven coordinates in Turing-workflow"
---

# Dynamic Actor Loading

:::info Coming Soon
This documentation is under development.
:::

## Overview

Dynamic Actor Loading allows you to load actors from external JARs at runtime — including loading directly from Maven coordinates. This enables flexible and extensible actor systems without recompilation, and supports plugin architectures for Turing-workflow.

## Topics to be Covered

- Loading actor definitions from YAML/JSON
- Runtime class loading and instantiation via Maven coordinates
- Actor factory patterns
- Configuration-driven actor hierarchies
- Hot-reloading actors
- Plugin-based actor systems

## Basic Example

Actors can be loaded at runtime from external JARs using the built-in `loader` actor:

```yaml
steps:
  - states: ["0", "1"]
    actions:
      - actor: loader
        method: loadJar
        arguments: "com.example:my-plugin:1.0.0"

  - states: ["1", "2"]
    actions:
      - actor: loader
        method: createChild
        arguments: ["ROOT", "myPlugin", "com.example.MyPluginActor"]
```

## Java API Example

```java
// Example of dynamic actor loading (conceptual)
IIActorSystem system = new IIActorSystem("dynamic-demo");

// Load actor definitions from config
ActorConfig config = ActorConfig.fromYaml("actors.yaml");

for (ActorDefinition def : config.getActors()) {
    Object actorInstance = def.createInstance();
    system.addIIActor(/* wrap in IIActorRef */);
}
```

## Use Cases

- Plugin architectures for Turing-workflow-plugins
- Multi-tenant systems
- Environment-specific actor configurations
- Testing with mock actors

---

*This page will be expanded with detailed documentation and examples.*
