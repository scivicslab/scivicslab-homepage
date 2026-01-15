---
sidebar_position: 2
title: Getting Started
---

:::caution Newer Version Available
This is documentation for version 2.11.0. [See the latest version](/docs/pojo-actor/introduction).
:::

# Getting Started with POJO-actor

This guide will help you set up POJO-actor and create your first actor-based application.

## Prerequisites

- Java 21 or later
- Maven or Gradle

## Installation

### Maven

Add the following dependency to your `pom.xml`:

```xml
<dependency>
    <groupId>com.scivicslab</groupId>
    <artifactId>pojo-actor</artifactId>
    <version>2.11.0</version>
</dependency>
```

### Gradle

```groovy
implementation 'com.scivicslab:pojo-actor:2.11.0'
```

## Creating Your First Actor

### Step 1: Define an Actor Class

Any POJO can be an actor. Here's a simple calculator:

```java
public class CalculatorActor {
    private int value = 0;

    public void setValue(int v) {
        this.value = v;
    }

    public int add(int n) {
        this.value += n;
        return this.value;
    }

    public int multiply(int n) {
        this.value *= n;
        return this.value;
    }

    public int getResult() {
        return this.value;
    }
}
```

### Step 2: Create an Actor System and Reference

```java
import com.scivicslab.pojoactor.workflow.IIActorSystem;
import com.scivicslab.pojoactor.workflow.IIActorRef;

public class Main {
    public static void main(String[] args) throws Exception {
        // Create the actor system
        IIActorSystem system = new IIActorSystem();

        // Create actor instance and reference
        CalculatorActor calc = new CalculatorActor();
        IIActorRef<CalculatorActor> calcRef =
            new IIActorRef<>("calculator", calc, system);

        // Register with the system
        system.addIIActor(calcRef);

        // Use the actor
        calcRef.tell(c -> c.setValue(10)).get();
        int result = calcRef.ask(c -> c.add(5)).get();
        System.out.println("Result: " + result); // 15
    }
}
```

## Using Workflows

### Step 1: Create a Workflow YAML File

Create `calculation.yaml`:

```yaml
name: calculation-workflow

steps:
  - states: ["0", "1"]
    actions:
      - actor: calculator
        method: setValue
        arguments: "10"

  - states: ["1", "2"]
    actions:
      - actor: calculator
        method: add
        arguments: "5"

  - states: ["2", "3"]
    actions:
      - actor: calculator
        method: multiply
        arguments: "2"

  - states: ["3", "end"]
    actions:
      - actor: calculator
        method: getResult
```

### Step 2: Execute the Workflow

```java
import com.scivicslab.pojoactor.workflow.Interpreter;

public class WorkflowExample {
    public static void main(String[] args) throws Exception {
        IIActorSystem system = new IIActorSystem();

        // Setup actor
        CalculatorActor calc = new CalculatorActor();
        IIActorRef<CalculatorActor> calcRef =
            new IIActorRef<>("calculator", calc, system);
        system.addIIActor(calcRef);

        // Create interpreter
        Interpreter interpreter = new Interpreter.Builder()
            .loggerName("calc-workflow")
            .team(system)
            .build();

        // Load and execute workflow
        InputStream yaml = new FileInputStream("calculation.yaml");
        interpreter.readYaml(yaml);

        ActionResult result = interpreter.run();
        System.out.println("Workflow completed: " + result.isSuccess());
        System.out.println("Final result: " + calc.getResult()); // 30
    }
}
```

## Next Steps

- Check the [POJO-actor Javadoc](https://scivicslab.github.io/POJO-actor/) for API details
- Explore the [GitHub repository](https://github.com/scivicslab/POJO-actor) for examples
