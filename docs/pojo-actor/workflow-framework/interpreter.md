---
sidebar_position: 3
title: Interpreter
---

# Interpreter

The `Interpreter` class executes matrix-based workflow definitions. It reads workflows from YAML, JSON, or XML files and executes them as finite state machines, invoking actions on registered actors during state transitions.

## Workflow Model

Workflows are defined as a matrix of state transitions:

```yaml
name: example-workflow
steps:
  - states: ["0", "1"]        # Transition from state 0 to 1
    actions:
      - actor: worker
        method: initialize

  - states: ["1", "2"]        # Transition from state 1 to 2
    actions:
      - actor: worker
        method: process

  - states: ["2", "end"]      # Transition to terminal state
    actions:
      - actor: worker
        method: cleanup
```

## Creating an Interpreter

Use the Builder pattern:

```java
IIActorSystem system = new IIActorSystem("workflow-system");

Interpreter interpreter = new Interpreter.Builder()
    .loggerName("main-workflow")
    .team(system)
    .build();
```

## Loading Workflows

### From YAML

```java
// From InputStream
interpreter.readYaml(inputStream);

// From Path
interpreter.readYaml(Path.of("workflow.yaml"));

// With overlay
interpreter.readYaml(
    Path.of("base/workflow.yaml"),
    Path.of("overlays/production")
);
```

### From JSON

```java
interpreter.readJson(inputStream);
```

### From XML

```java
interpreter.readXml(inputStream);
```

## Executing Workflows

### Single Step

```java
ActionResult result = interpreter.execCode();
if (result.isSuccess()) {
    System.out.println("State: " + interpreter.getCurrentState());
}
```

### Run Until End

```java
// Default max iterations (10000)
ActionResult result = interpreter.runUntilEnd();

// Custom max iterations
ActionResult result = interpreter.runUntilEnd(1000);
```

### Load and Run

```java
// Load and run in one call
ActionResult result = interpreter.runWorkflow("workflow.yaml");
ActionResult result = interpreter.runWorkflow("workflow.yaml", 5000);
```

## State Patterns

The interpreter supports flexible state matching:

| Pattern | Description | Example |
|---------|-------------|---------|
| Exact | Match specific state | `"1"` matches state "1" |
| Wildcard | Match any state | `"*"` matches all states |
| Negation | Match except one | `"!end"` matches all except "end" |
| OR | Match multiple | `"1|2|3"` matches 1, 2, or 3 |
| Comparison | Numeric comparison | `">=5"`, `"<10"` |
| JEXL | Complex expressions | `"jexl:n >= 5 && n < 10"` |

### Pattern Examples

```yaml
steps:
  # Wildcard - catches all states
  - states: ["*", "error"]
    actions:
      - actor: logger
        method: logError

  # Negation - any state except "end"
  - states: ["!end", "processing"]
    actions:
      - actor: worker
        method: process

  # OR - multiple source states
  - states: ["error|timeout|failed", "retry"]
    actions:
      - actor: worker
        method: retry

  # Numeric comparison
  - states: [">=10", "complete"]
    actions:
      - actor: worker
        method: finish

  # JEXL expression
  - states: ["jexl:n >= 5 && n < 10", "phase2"]
    actions:
      - actor: worker
        method: phase2Work
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
```

### Single String

```yaml
actions:
  - actor: worker
    method: loadFile
    arguments: "config.json"
```

## Actor Path Resolution

Reference actors using Unix-style paths:

```yaml
steps:
  # Self reference
  - states: ["0", "1"]
    actions:
      - actor: this
        method: initialize

  # Parent actor
  - states: ["1", "2"]
    actions:
      - actor: ..
        method: reportStatus

  # Specific sibling
  - states: ["2", "3"]
    actions:
      - actor: ../logger
        method: log

  # All children
  - states: ["3", "4"]
    actions:
      - actor: ./*
        method: process

  # Wildcard pattern
  - states: ["4", "end"]
    actions:
      - actor: ./worker*
        method: cleanup
```

## Execution Modes

Control how actions are executed:

```yaml
actions:
  - actor: worker
    method: heavyTask
    execution: POOL      # Default: execute on work-stealing pool

  - actor: worker
    method: quickCheck
    execution: DIRECT    # Direct synchronous call
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

The `call` action:
1. Creates a child interpreter actor
2. Loads the specified workflow
3. Runs until "end" state
4. Removes the child actor

### runWorkflow - Reload and Execute

```yaml
steps:
  - states: ["0", "1"]
    actions:
      - actor: this
        method: runWorkflow
        arguments: ["other-workflow.yaml", 1000]
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

The interpreter supports these built-in actions when using `this` as the actor:

| Action | Arguments | Description |
|--------|-----------|-------------|
| `execCode` | None | Execute single step |
| `runUntilEnd` | [maxIterations] | Run until "end" |
| `call` | [workflowFile] | Execute subworkflow |
| `runWorkflow` | [file, maxIterations] | Load and run |
| `apply` | JSON action | Apply to children |
| `sleep` | milliseconds | Sleep |
| `print` | message | Print to stdout |
| `doNothing` | message | No-op |

## Interpreter State

```java
// Get current state
String state = interpreter.getCurrentState();

// Get current step index
int index = interpreter.getCurrentVertexIndex();

// Check if workflow is loaded
boolean loaded = interpreter.hasCodeLoaded();

// Reset interpreter
interpreter.reset();
```

## Workflow Base Directory

```java
// Set base directory for relative paths
interpreter.setWorkflowBaseDir("/path/to/workflows");

// Get base directory
String dir = interpreter.getWorkflowBaseDir();
```

## Complete Example

```java
public class WorkflowDemo {
    public static void main(String[] args) throws Exception {
        // Setup system
        IIActorSystem system = new IIActorSystem("demo", 4);

        // Create worker actor
        WorkerIIAR worker = new WorkerIIAR("worker", new Worker(), system);
        system.addIIActor(worker);

        // Create interpreter
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

        // Load and run workflow
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

### Example Workflow (workflow.yaml)

```yaml
name: demo-workflow
steps:
  - states: ["0", "1"]
    actions:
      - actor: worker
        method: initialize
        arguments:
          timeout: 5000
          retries: 3

  - states: ["1", "2"]
    actions:
      - actor: worker
        method: process
        execution: POOL

  - states: ["2", "success"]
    actions:
      - actor: worker
        method: checkResult
        # Returns success=true if result is valid

  - states: ["2", "retry"]
    actions:
      - actor: this
        method: print
        arguments: "Result check failed, retrying..."

  - states: ["retry", "1"]
    actions:
      - actor: this
        method: sleep
        arguments: "1000"

  - states: ["success", "end"]
    actions:
      - actor: worker
        method: cleanup
```

## Error Handling

Actions that return `ActionResult(false, ...)` cause the interpreter to try the next matching step:

```yaml
steps:
  # Primary path - try this first
  - states: ["1", "2"]
    actions:
      - actor: worker
        method: processOptimized
        # Returns false if optimization not available

  # Fallback path - tried if primary fails
  - states: ["1", "2"]
    actions:
      - actor: worker
        method: processStandard
```

## Conditional Branching

Use multiple steps with the same source state for conditional logic:

```yaml
steps:
  # Check condition (returns true/false)
  - states: ["1", "path-a"]
    actions:
      - actor: validator
        method: isTypeA

  - states: ["1", "path-b"]
    actions:
      - actor: validator
        method: isTypeB

  - states: ["1", "path-default"]
    actions:
      - actor: this
        method: doNothing
        arguments: "default path"
```

## Overlay Support

Load workflows with environment-specific overlays:

```java
interpreter.readYaml(
    Path.of("base/main-workflow.yaml"),
    Path.of("overlays/production")
);
```

See the [Workflow Kustomization](/docs/pojo-actor/advanced-topics/workflow-kustomization) guide for details.
