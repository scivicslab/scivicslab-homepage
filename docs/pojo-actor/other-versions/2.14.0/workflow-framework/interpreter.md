---
sidebar_position: 3
title: Interpreter
---

# Interpreter

The `Interpreter` class is the heart of POJO-actor's workflow framework. It executes workflow definitions stored in YAML, JSON, or XML files as finite state machines. A workflow consists of states and transitions between them, where each transition can trigger actions on registered actors. The Interpreter manages the current state, evaluates which transitions are valid, and executes the associated actions.

Workflows are powerful because they externalize the control flow of your application. Instead of hard-coding sequences of operations in Java, you define them in configuration files that can be modified without recompilation. This makes it easier to adjust behavior, support multiple environments, and enable non-developers to customize application logic.

## Workflow Model

A workflow is modeled as a matrix of state transitions. Each row in the matrix specifies a source state, a target state, and a list of actions to execute during the transition. The Interpreter starts at state "0" by default and processes transitions until it reaches the terminal "end" state.

The following YAML shows a simple three-step workflow. Each step is a transition from one state to another, with actions that are executed when the transition occurs.

```yaml
name: example-workflow
steps:
  # This transition moves from state "0" to state "1".
  # When taken, it calls the initialize method on the worker actor.
  - states: ["0", "1"]
    actions:
      - actor: worker
        method: initialize

  # This transition moves from state "1" to state "2".
  # The process method is called during this transition.
  - states: ["1", "2"]
    actions:
      - actor: worker
        method: process

  # This transition moves from state "2" to the terminal "end" state.
  # The cleanup method performs any necessary finalization.
  - states: ["2", "end"]
    actions:
      - actor: worker
        method: cleanup
```

## Creating an Interpreter

The Interpreter is created using the Builder pattern, which allows you to configure various settings before constructing the instance. The most important settings are the logger name (for debugging output) and the team (the IIActorSystem that manages the workflow actors).

```java
IIActorSystem system = new IIActorSystem("workflow-system");

// Create an Interpreter with the Builder pattern.
// The loggerName identifies this interpreter in log output.
// The team associates the interpreter with an actor system.
Interpreter interpreter = new Interpreter.Builder()
    .loggerName("main-workflow")
    .team(system)
    .build();
```

## Loading Workflows

Before execution, you must load a workflow definition into the Interpreter. The Interpreter supports multiple file formats: YAML (most common), JSON, and XML. You can load from input streams, file paths, or with overlay directories for environment-specific customization.

### Loading from YAML

YAML is the most common format for workflow definitions because of its readability. You can load from an InputStream (useful for embedded resources) or from a file path.

```java
// Load from an InputStream, such as a classpath resource.
// This is useful when workflows are bundled with your application.
InputStream yamlStream = getClass().getResourceAsStream("/workflows/main.yaml");
interpreter.readYaml(yamlStream);

// Load from a file path on the filesystem.
// This is useful when workflows are stored externally and may be modified.
interpreter.readYaml(Path.of("/etc/myapp/workflows/main.yaml"));
```

### Loading with Overlays

For applications that need different behavior in different environments (development, staging, production), you can load a base workflow and apply an overlay directory. Files in the overlay directory replace or augment the base workflow according to a kustomization-style merge strategy.

```java
// Load the base workflow and apply environment-specific overrides.
// The overlay directory might contain patches for production settings.
interpreter.readYaml(
    Path.of("base/workflow.yaml"),
    Path.of("overlays/production")
);
```

### Loading from JSON and XML

While YAML is the most common format, the Interpreter also supports JSON and XML for integration with systems that use those formats.

```java
// Load from JSON
interpreter.readJson(jsonInputStream);

// Load from XML
interpreter.readXml(xmlInputStream);
```

## Executing Workflows

Once a workflow is loaded, you can execute it either step-by-step (for fine-grained control) or in a single run until completion (for typical use cases).

### Single Step Execution

The `execCode` method executes exactly one step of the workflow. It finds a valid transition from the current state, executes the associated actions, and updates the current state. This method is useful when you need to interleave workflow execution with other processing or when you want to inspect the state between steps.

```java
ActionResult result = interpreter.execCode();
if (result.isSuccess()) {
    // The step succeeded. Check the new state.
    System.out.println("Now in state: " + interpreter.getCurrentState());
} else {
    // The step failed. The result contains error information.
    System.out.println("Step failed: " + result.getResult());
}
```

### Run Until End

The `runUntilEnd` method repeatedly executes steps until the workflow reaches the "end" state or until an error occurs. You can optionally specify a maximum number of iterations to prevent infinite loops in workflows with cycles.

```java
// Run with the default maximum iterations (10000).
// The method returns when the workflow reaches "end" or encounters an error.
ActionResult result = interpreter.runUntilEnd();

// Run with a custom maximum to limit execution time.
// This is useful for workflows that might have long-running cycles.
ActionResult result = interpreter.runUntilEnd(1000);
```

### Combined Load and Run

For convenience, you can combine loading and running in a single method call. This is the simplest way to execute a workflow file.

```java
// Load the workflow and run it to completion in one call.
ActionResult result = interpreter.runWorkflow("workflow.yaml");

// With a custom iteration limit.
ActionResult result = interpreter.runWorkflow("workflow.yaml", 5000);
```

## State Patterns

One of the Interpreter's most powerful features is its flexible state matching system. Instead of requiring exact state names, you can use patterns to match multiple states, enable fallback behaviors, or create conditional transitions.

### Exact Match

The simplest pattern is an exact match, where the source state must be exactly equal to the pattern string.

```yaml
# This transition only fires when the current state is exactly "processing".
- states: ["processing", "done"]
  actions:
    - actor: worker
      method: finalize
```

### Wildcard Match

The wildcard pattern `*` matches any state. This is useful for error handlers or logging that should apply regardless of the current state.

```yaml
# This transition can fire from any state, providing a catch-all error handler.
- states: ["*", "error"]
  actions:
    - actor: logger
      method: logError
```

### Negation Match

The negation pattern `!state` matches any state except the specified one. This is useful for transitions that should be available from most states but not a specific one.

```yaml
# This transition fires from any state except "end".
# It could be used for a cancel operation.
- states: ["!end", "cancelled"]
  actions:
    - actor: worker
      method: cancel
```

### OR Match

The OR pattern matches any of several specified states, separated by `|` characters.

```yaml
# This transition fires when the state is "error", "timeout", or "failed".
# It consolidates recovery logic for multiple failure modes.
- states: ["error|timeout|failed", "retry"]
  actions:
    - actor: worker
      method: retry
```

### Numeric Comparison

For workflows that use numeric states, you can use comparison operators to match ranges of states.

```yaml
# This transition fires when the numeric state is >= 10.
- states: [">=10", "complete"]
  actions:
    - actor: worker
      method: finish
```

### JEXL Expressions

For complex conditions, you can use JEXL (Java Expression Language) expressions. The current state is available as the variable `n` in the expression.

```yaml
# This transition fires when the state is a number between 5 and 9 (inclusive).
- states: ["jexl:n >= 5 && n < 10", "phase2"]
  actions:
    - actor: worker
      method: startPhase2
```

## Action Arguments

Actions in workflow steps can receive arguments in several formats. The format you choose depends on what's most readable and what your action implementation expects.

### List Format

Arguments as a JSON array are the most common format. Each element becomes a positional argument to the action.

```yaml
actions:
  # The worker's configure method will receive three arguments:
  # "host.example.com", 8080, and true
  - actor: worker
    method: configure
    arguments: ["host.example.com", 8080, true]
```

### Map Format

For actions with many parameters or optional parameters, a map format is more readable. The action implementation receives this as a JSON object string.

```yaml
actions:
  # Named parameters are easier to read and maintain.
  # The order doesn't matter, and you can add optional parameters easily.
  - actor: worker
    method: configure
    arguments:
      host: "host.example.com"
      port: 8080
      ssl: true
      timeout: 30000
```

### Single String

For actions that take a single string argument, you can provide it directly without wrapping in an array.

```yaml
actions:
  # Single string argument for simplicity.
  - actor: worker
    method: loadFile
    arguments: "config.json"
```

## Actor Path Resolution

Actions can reference actors using Unix-style path notation, which is resolved relative to the current interpreter's position in the actor hierarchy. This makes workflows more flexible and reusable.

```yaml
steps:
  # Reference self (the interpreter itself).
  - states: ["0", "1"]
    actions:
      - actor: this
        method: initialize

  # Reference the parent actor in the hierarchy.
  - states: ["1", "2"]
    actions:
      - actor: ..
        method: reportStatus

  # Reference a specific sibling actor.
  - states: ["2", "3"]
    actions:
      - actor: ../logger
        method: logProgress

  # Apply an action to all children.
  - states: ["3", "4"]
    actions:
      - actor: ./*
        method: processItem

  # Apply an action to children matching a pattern.
  - states: ["4", "end"]
    actions:
      - actor: ./worker*
        method: cleanup
```

## Execution Modes

By default, actions are executed on the work-stealing pool for better parallelism. You can override this behavior for specific actions.

```yaml
actions:
  # Execute on the work-stealing pool (default).
  # Good for CPU-intensive operations.
  - actor: worker
    method: heavyComputation
    execution: POOL

  # Execute directly on the interpreter's thread.
  # Good for quick operations where pool overhead isn't worth it.
  - actor: worker
    method: quickCheck
    execution: DIRECT
```

## Subworkflows

Complex workflows can be decomposed into smaller, reusable subworkflows. The Interpreter provides several mechanisms for invoking subworkflows.

### call - Create and Execute Child

The `call` action creates a new child interpreter, loads a subworkflow into it, runs it to completion, and then removes the child. This is the simplest way to invoke a subworkflow.

```yaml
steps:
  # This invokes a subworkflow defined in a separate file.
  # The interpreter creates a child, runs it, and cleans up automatically.
  - states: ["0", "1"]
    actions:
      - actor: this
        method: call
        arguments: ["sub-workflow.yaml"]
```

### apply - Action on Existing Children

The `apply` action sends an action to existing child actors that match a pattern. Unlike `call`, this doesn't create new actors—it works with actors that were already created and registered.

```yaml
steps:
  # Send the "process" action to all children matching "worker-*".
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

When the actor is specified as `this`, the interpreter itself handles the action. Several built-in actions are available for common operations.

| Action | Arguments | Description |
|--------|-----------|-------------|
| `execCode` | None | Executes a single step of the current workflow. Useful for nested control flow. |
| `runUntilEnd` | [maxIterations] | Runs the workflow from the current state until reaching "end". |
| `call` | [workflowFile] | Loads and executes a subworkflow file in a new child interpreter. |
| `runWorkflow` | [file, maxIterations] | Loads a workflow file and runs it with the specified iteration limit. |
| `apply` | JSON action definition | Applies an action to child actors matching a pattern. |
| `sleep` | milliseconds | Pauses workflow execution for the specified duration. |
| `print` | message | Prints the message to standard output. Useful for debugging workflows. |
| `doNothing` | message | Does nothing and returns success with the message. Useful for default paths. |

## Interpreter State

You can query and manipulate the Interpreter's state programmatically.

```java
// Get the current state name.
String state = interpreter.getCurrentState();

// Get the index of the current step in the workflow matrix.
int index = interpreter.getCurrentTransitionIndex();

// Check whether a workflow has been loaded.
if (interpreter.hasCodeLoaded()) {
    // A workflow is loaded and ready to execute.
}

// Reset the interpreter to its initial state.
// This clears the current state and allows reloading a new workflow.
interpreter.reset();
```

## Workflow Base Directory

When workflows reference other files (like subworkflows), the Interpreter resolves relative paths from a base directory. You can set this explicitly for better control.

```java
// Set the base directory for resolving relative workflow paths.
interpreter.setWorkflowBaseDir("/var/workflows");

// Get the current base directory.
String dir = interpreter.getWorkflowBaseDir();
```

## Complete Example

The following example demonstrates the full workflow setup and execution process, from creating the system and actors to loading and running a workflow.

```java
public class WorkflowDemo {
    public static void main(String[] args) throws Exception {
        // Create the actor system with a work-stealing pool.
        IIActorSystem system = new IIActorSystem("demo", 4);

        // Create a worker actor that the workflow will invoke.
        WorkerIIAR worker = new WorkerIIAR("worker", new Worker(), system);
        system.addIIActor(worker);

        // Create the interpreter with its builder.
        Interpreter interpreter = new Interpreter.Builder()
            .loggerName("main")
            .team(system)
            .build();

        // Wrap the interpreter in an IIActorRef so it can be used in workflows.
        InterpreterIIAR interpreterActor = new InterpreterIIAR(
            "main",
            interpreter,
            system
        );
        // Set the self-reference so the interpreter knows its own actor.
        interpreter.setSelfActorRef(interpreterActor);
        system.addIIActor(interpreterActor);

        // Load the workflow from a classpath resource.
        interpreter.readYaml(
            WorkflowDemo.class.getResourceAsStream("/workflow.yaml")
        );

        // Execute the workflow until it reaches "end".
        ActionResult result = interpreter.runUntilEnd();
        if (result.isSuccess()) {
            System.out.println("Workflow completed successfully");
        } else {
            System.out.println("Workflow failed: " + result.getResult());
        }

        // Clean up all resources.
        system.terminate();
    }
}
```

### Example Workflow File (workflow.yaml)

This workflow demonstrates several features: parameterized actions, conditional branching based on action results, retry logic with sleep, and cleanup.

```yaml
name: demo-workflow
steps:
  # Initialize with configuration parameters.
  - states: ["0", "1"]
    actions:
      - actor: worker
        method: initialize
        arguments:
          timeout: 5000
          retries: 3

  # Process the work on the work-stealing pool.
  - states: ["1", "2"]
    actions:
      - actor: worker
        method: process
        execution: POOL

  # Check the result. If checkResult returns success, go to "success".
  - states: ["2", "success"]
    actions:
      - actor: worker
        method: checkResult

  # If checkResult failed, we try this path instead (same source state).
  # The print action logs that we're retrying.
  - states: ["2", "retry"]
    actions:
      - actor: this
        method: print
        arguments: "Result check failed, retrying..."

  # Wait before retrying, then go back to state 1 to reprocess.
  - states: ["retry", "1"]
    actions:
      - actor: this
        method: sleep
        arguments: "1000"

  # On success, perform cleanup and finish.
  - states: ["success", "end"]
    actions:
      - actor: worker
        method: cleanup
```

## Error Handling

The Interpreter provides implicit error handling through the state transition mechanism. When an action returns an `ActionResult` with `success=false`, the Interpreter tries the next step that matches the current source state. This enables fallback behavior without explicit error handling code.

```yaml
steps:
  # Try the optimized path first.
  # If processOptimized returns failure, the interpreter tries the next matching step.
  - states: ["1", "2"]
    actions:
      - actor: worker
        method: processOptimized

  # Fallback path for when the optimized approach fails.
  # This step has the same source state, so it's tried if the first one fails.
  - states: ["1", "2"]
    actions:
      - actor: worker
        method: processStandard
```

## Conditional Branching

You can implement conditional logic by defining multiple steps with the same source state but different target states. The Interpreter evaluates them in order and takes the first path where the action succeeds.

```yaml
steps:
  # Check if this is type A. If the validator returns true, go to path-a.
  - states: ["1", "path-a"]
    actions:
      - actor: validator
        method: isTypeA

  # If type A check failed, try type B.
  - states: ["1", "path-b"]
    actions:
      - actor: validator
        method: isTypeB

  # Default path if neither A nor B matched.
  # The doNothing action always succeeds, making this a catch-all.
  - states: ["1", "path-default"]
    actions:
      - actor: this
        method: doNothing
        arguments: "Using default path"
```
