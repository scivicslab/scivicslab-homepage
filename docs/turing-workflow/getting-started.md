---
sidebar_position: 2
title: "Getting Started"
description: "Quick start guide for Turing-workflow: Maven dependency and basic Java API usage"
---

# Getting Started

This guide walks you through adding Turing-workflow to your project and running your first workflow.

## Installation

### Maven

Add the following dependency to your `pom.xml`:

```xml
<dependency>
    <groupId>com.scivicslab</groupId>
    <artifactId>turing-workflow</artifactId>
    <version>3.0.0</version>
</dependency>
```

### Building from Source

```bash
git clone https://github.com/scivicslab/Turing-workflow
cd Turing-workflow
mvn install
```

## Basic Usage

### 1. Write a Workflow YAML

Create a `workflow.yaml` file that defines the state transitions for your workflow:

```yaml
name: my-workflow
steps:
  - states: ["0", "1"]
    actions:
      - actor: dataProcessor
        method: process
        arguments: "data.csv"
  - states: ["1", "end"]
    actions:
      - actor: log
        method: info
        arguments: "Done"
```

### 2. Write an Actor

Implement `IIActorRef<T>` and annotate methods with `@Action`:

```java
public class MyActor extends IIActorRef<MyActor> {

    public MyActor(String name, IIActorSystem system) {
        super(name, null, system);
    }

    @Action("process")
    public ActionResult process(String filename) {
        // ... process the file
        return new ActionResult(true, "Processed: " + filename);
    }
}
```

The `@Action` annotation value is the method name used in YAML. Returning `new ActionResult(false, ...)` causes the transition to fail and the interpreter tries the next transition.

### 3. Set Up and Run

```java
// Create IIActorSystem
IIActorSystem system = new IIActorSystem("my-workflow");
system.addIIActor(new MyActor("myActor", system));

// Build and run interpreter
Interpreter interpreter = new Interpreter.Builder()
    .loggerName("my-workflow")
    .team(system)
    .build();

interpreter.readYaml(new FileInputStream("workflow.yaml"));
ActionResult result = interpreter.runUntilEnd(100);

System.out.println("Result: " + result.getResult());
```

## Example: Turing Machine

The following is a complete workflow example — a Turing machine that outputs an irrational number: 001011011101111011111...

```yaml
name: turing87
steps:
- states: ["0", "100"]
  actions:
  - {actor: turing, method: initMachine}
- states: ["100", "1"]
  actions:
  - {actor: turing, method: printTape}
- states: ["1", "2"]
  actions:
  - {actor: turing, method: put, arguments: "e"}
  - {actor: turing, method: move, arguments: "R"}
  - {actor: turing, method: put, arguments: "e"}
  - {actor: turing, method: move, arguments: "R"}
  - {actor: turing, method: put, arguments: "0"}
  - {actor: turing, method: move, arguments: "R"}
  - {actor: turing, method: move, arguments: "R"}
  - {actor: turing, method: put, arguments: "0"}
  - {actor: turing, method: move, arguments: "L"}
  - {actor: turing, method: move, arguments: "L"}
- states: ["2", "2"]
  actions:
  - {actor: turing, method: matchCurrentValue, arguments: "1"}
  - {actor: turing, method: move, arguments: "R"}
  - {actor: turing, method: put, arguments: "x"}
  - {actor: turing, method: move, arguments: "L"}
  - {actor: turing, method: move, arguments: "L"}
  - {actor: turing, method: move, arguments: "L"}
- states: ["2", "3"]
  actions:
  - {actor: turing, method: matchCurrentValue, arguments: "0"}
- states: ["3", "3"]
  actions:
  - {actor: turing, method: isAny}
  - {actor: turing, method: move, arguments: "R"}
  - {actor: turing, method: move, arguments: "R"}
- states: ["3", "4"]
  actions:
  - {actor: turing, method: isNone}
  - {actor: turing, method: put, arguments: "1"}
  - {actor: turing, method: move, arguments: "L"}
- states: ["4", "3"]
  actions:
  - {actor: turing, method: matchCurrentValue, arguments: "x"}
  - {actor: turing, method: put, arguments: " "}
  - {actor: turing, method: move, arguments: "R"}
- states: ["4", "5"]
  actions:
  - {actor: turing, method: matchCurrentValue, arguments: "e"}
  - {actor: turing, method: move, arguments: "R"}
- states: ["4", "4"]
  actions:
  - {actor: turing, method: isNone}
  - {actor: turing, method: move, arguments: "L"}
  - {actor: turing, method: move, arguments: "L"}
- states: ["5", "5"]
  actions:
  - {actor: turing, method: isAny}
  - {actor: turing, method: move, arguments: "R"}
  - {actor: turing, method: move, arguments: "R"}
- states: ["5", "101"]
  actions:
  - {actor: turing, method: isNone}
  - {actor: turing, method: put, arguments: "0"}
  - {actor: turing, method: move, arguments: "L"}
  - {actor: turing, method: move, arguments: "L"}
```

## Next Steps

- [Workflow Format](./workflow-format) — Learn about the YAML workflow format in detail
- [Core Concepts](./core-concepts/interpreter) — Understand the Interpreter, IIActorSystem, and IIActorRef
- [Advanced Topics](./advanced/dynamic-actor-loading) — Dynamic actor loading, YAML overlays
