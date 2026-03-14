---
sidebar_position: 3
title: "Interpreter"
description: "The Interpreter class: Turing-workflow's state machine execution engine"
---

# Interpreter

The `Interpreter` class is the heart of Turing-workflow. It executes workflow definitions stored in YAML, JSON, or XML files as finite state machines. A workflow consists of states and transitions between them, where each transition can trigger actions on registered actors. The Interpreter manages the current state, evaluates which transitions are valid, and executes the associated actions.

Workflows are powerful because they externalize the control flow of your application. Instead of hard-coding sequences of operations in Java, you define them in configuration files that can be modified without recompilation. This makes it easier to adjust behavior, support multiple environments, and enable non-developers to customize application logic.

## Workflow Model

A workflow is modeled as a matrix of state transitions. Each row in the matrix specifies a source state, a target state, and a list of actions to execute during the transition. The Interpreter starts at state `"0"` by default and processes transitions until it reaches the terminal `"end"` state.

```yaml
name: example-workflow
steps:
  - states: ["0", "1"]
    actions:
      - actor: worker
        method: initialize

  - states: ["1", "2"]
    actions:
      - actor: worker
        method: process

  - states: ["2", "end"]
    actions:
      - actor: worker
        method: cleanup
```

## Creating an Interpreter

The Interpreter is created using the Builder pattern:

```java
IIActorSystem system = new IIActorSystem("workflow-system");

Interpreter interpreter = new Interpreter.Builder()
    .loggerName("main-workflow")
    .team(system)
    .build();
```

## Loading Workflows

### Loading from YAML

```java
// Load from an InputStream
InputStream yamlStream = getClass().getResourceAsStream("/workflows/main.yaml");
interpreter.readYaml(yamlStream);

// Load from a file path
interpreter.readYaml(Path.of("/etc/myapp/workflows/main.yaml"));
```

### Loading with Overlays

For environment-specific configuration, load a base workflow and apply an overlay directory:

```java
interpreter.readYaml(
    Path.of("base/workflow.yaml"),
    Path.of("overlays/production")
);
```

### Loading from JSON and XML

```java
// Load from JSON
interpreter.readJson(jsonInputStream);

// Load from XML
interpreter.readXml(xmlInputStream);
```

## Executing Workflows

### Single Step Execution

The `execCode` method executes exactly one step of the workflow:

```java
ActionResult result = interpreter.execCode();
if (result.isSuccess()) {
    System.out.println("Now in state: " + interpreter.getCurrentState());
} else {
    System.out.println("Step failed: " + result.getResult());
}
```

### Run Until End

The `runUntilEnd` method repeatedly executes steps until the workflow reaches the `"end"` state:

```java
// Run with the default maximum iterations (10000)
ActionResult result = interpreter.runUntilEnd();

// Run with a custom maximum
ActionResult result = interpreter.runUntilEnd(1000);
```

### Combined Load and Run

```java
// Load and run in one call
ActionResult result = interpreter.runWorkflow("workflow.yaml");

// With a custom iteration limit
ActionResult result = interpreter.runWorkflow("workflow.yaml", 5000);
```

## State Patterns

### Exact Match

```yaml
- states: ["processing", "done"]
  actions:
    - actor: worker
      method: finalize
```

### Wildcard Match

```yaml
- states: ["*", "error"]
  actions:
    - actor: logger
      method: logError
```

### Negation Match

```yaml
- states: ["!end", "cancelled"]
  actions:
    - actor: worker
      method: cancel
```

### OR Match

```yaml
- states: ["error|timeout|failed", "retry"]
  actions:
    - actor: worker
      method: retry
```

### Numeric Comparison

```yaml
- states: [">=10", "complete"]
  actions:
    - actor: worker
      method: finish
```

### JEXL Expressions

```yaml
- states: ["jexl:n >= 5 && n < 10", "phase2"]
  actions:
    - actor: worker
      method: startPhase2
```

## Action Arguments

### List Format

```yaml
actions:
  - actor: worker
    method: configure
    arguments: ["host.example.com", 8080, true]
```

### Map Format

```yaml
actions:
  - actor: worker
    method: configure
    arguments:
      host: "host.example.com"
      port: 8080
      ssl: true
      timeout: 30000
```

### Single String

```yaml
actions:
  - actor: worker
    method: loadFile
    arguments: "config.json"
```

## Subworkflows

### call - Create and Execute Child

```yaml
steps:
  - states: ["0", "1"]
    actions:
      - actor: this
        method: call
        arguments: ["sub-workflow.yaml"]
```

### apply - Action on Existing Children

```yaml
steps:
  - states: ["0", "1"]
    actions:
      - actor: this
        method: apply
        arguments:
          actor: "worker-*"
          method: process
          arguments: [100]
```

## Built-in Actions

| Action | Arguments | Description |
|--------|-----------|-------------|
| `execCode` | None | Executes a single step of the current workflow. |
| `runUntilEnd` | [maxIterations] | Runs the workflow from the current state until reaching "end". |
| `call` | [workflowFile] | Loads and executes a subworkflow file in a new child interpreter. |
| `runWorkflow` | [file, maxIterations] | Loads a workflow file and runs it with the specified iteration limit. |
| `apply` | JSON action definition | Applies an action to child actors matching a pattern. |
| `sleep` | milliseconds | Pauses workflow execution for the specified duration. |
| `print` | message | Prints the message to standard output. |
| `doNothing` | message | Does nothing and returns success. Useful for default paths. |

## Interpreter State

```java
// Get the current state name
String state = interpreter.getCurrentState();

// Get the index of the current step in the workflow matrix
int index = interpreter.getCurrentTransitionIndex();

// Check whether a workflow has been loaded
if (interpreter.hasCodeLoaded()) {
    // A workflow is loaded and ready to execute
}

// Reset the interpreter to its initial state
interpreter.reset();
```

## Complete Example

```java
public class WorkflowDemo {
    public static void main(String[] args) throws Exception {
        // Create the actor system
        IIActorSystem system = new IIActorSystem("demo", 4);

        // Create a worker actor
        WorkerIIAR worker = new WorkerIIAR("worker", new Worker(), system);
        system.addIIActor(worker);

        // Create the interpreter
        Interpreter interpreter = new Interpreter.Builder()
            .loggerName("main")
            .team(system)
            .build();

        InterpreterIIAR interpreterActor = new InterpreterIIAR(
            "main",
            interpreter,
            system
        );
        interpreter.setSelfActorRef(interpreterActor);
        system.addIIActor(interpreterActor);

        // Load and execute the workflow
        interpreter.readYaml(
            WorkflowDemo.class.getResourceAsStream("/workflow.yaml")
        );

        ActionResult result = interpreter.runUntilEnd();
        if (result.isSuccess()) {
            System.out.println("Workflow completed successfully");
        } else {
            System.out.println("Workflow failed: " + result.getResult());
        }

        system.terminate();
    }
}
```

## Error Handling

When an action returns an `ActionResult` with `success=false`, the Interpreter tries the next step that matches the current source state:

```yaml
steps:
  # Try the optimized path first
  - states: ["1", "2"]
    actions:
      - actor: worker
        method: processOptimized

  # Fallback path if the first fails
  - states: ["1", "2"]
    actions:
      - actor: worker
        method: processStandard
```

## Conditional Branching

Define multiple steps with the same source state but different target states:

```yaml
steps:
  - states: ["1", "path-a"]
    actions:
      - actor: validator
        method: isTypeA

  - states: ["1", "path-b"]
    actions:
      - actor: validator
        method: isTypeB

  # Default path if neither A nor B matched
  - states: ["1", "path-default"]
    actions:
      - actor: this
        method: doNothing
        arguments: "Using default path"
```
