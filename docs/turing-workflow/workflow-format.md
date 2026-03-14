---
sidebar_position: 3
title: "Workflow Format"
description: "YAML workflow format reference: states, actions, arguments, conditional branching, and state patterns"
---

# Workflow Format

Turing-workflow uses YAML as its primary workflow definition format. This page describes the complete format specification.

## Basic Structure

A workflow file has a `name` and a `steps` array. Each step defines a state transition with the states involved and the actions to execute:

```yaml
name: my-workflow
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

The workflow engine starts at state `"0"` and processes transitions until it reaches the terminal `"end"` state.

## Actions

Each action in a step specifies which actor to call, which method to invoke, and optionally what arguments to pass:

```yaml
actions:
  - actor: dataProcessor    # actor name registered in IIActorSystem
    method: process         # method name (matches @Action annotation)
    arguments: "data.csv"   # arguments (optional)
```

## Arguments

The `arguments` field accepts three formats:

### String

A plain string value is passed directly to the actor method:

```yaml
actions:
  - actor: worker
    method: loadFile
    arguments: "config.json"
```

### JSON Array

A JSON array passes multiple positional arguments:

```yaml
actions:
  - actor: loader
    method: createChild
    arguments: ["ROOT", "myActor", "com.example.MyActor"]
```

### JSON Object (Hash)

A JSON object passes named parameters:

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

## Conditional Branching

Multiple transitions from the same state provide conditional branching. Transitions are checked in order; the first one whose actions all succeed wins:

```yaml
# From state "2": if current value is "1", stay in state "2"
- states: ["2", "2"]
  actions:
    - actor: turing
      method: matchCurrentValue
      arguments: "1"

# From state "2": if current value is "0", go to state "3"
- states: ["2", "3"]
  actions:
    - actor: turing
      method: matchCurrentValue
      arguments: "0"
```

When an action returns `ActionResult(false, ...)`, the transition fails and the interpreter moves on to the next step that matches the current source state. This enables fallback behavior without explicit error handling code.

## State Patterns

Turing-workflow supports flexible state matching patterns beyond exact string equality.

### Exact Match

The default — the source state must be exactly equal to the pattern:

```yaml
- states: ["processing", "done"]
  actions:
    - actor: worker
      method: finalize
```

### Negation Match

`"!state"` matches any state except the specified one:

```yaml
# Fires from any state except "end"
- states: ["!end", "cancelled"]
  actions:
    - actor: worker
      method: cancel
```

### Wildcard Match

`"*"` matches any state — useful for catch-all handlers:

```yaml
- states: ["*", "error"]
  actions:
    - actor: logger
      method: logError
```

### OR Match

`"state1|state2|state3"` matches any of the listed states:

```yaml
- states: ["error|timeout|failed", "retry"]
  actions:
    - actor: worker
      method: retry
```

### Numeric Comparison

For workflows with numeric states, comparison operators can match ranges:

```yaml
- states: [">=10", "complete"]
  actions:
    - actor: worker
      method: finish
```

### JEXL Expressions

For complex conditions, JEXL (Java Expression Language) expressions can be used. The current state is available as the variable `n`:

```yaml
- states: ["jexl:n >= 5 && n < 10", "phase2"]
  actions:
    - actor: worker
      method: startPhase2
```

## Labels

Steps can have an optional `label` field, used by the YAML overlay system to identify steps for patching:

```yaml
- states: ["0", "1"]
  label: setup
  actions:
    - actor: deployer
      method: prepare
```

## Execution Modes

By default, actions are executed on the work-stealing pool. You can override this for specific actions:

```yaml
actions:
  # Execute on the work-stealing pool (default)
  - actor: worker
    method: heavyComputation
    execution: POOL

  # Execute directly on the interpreter's thread
  - actor: worker
    method: quickCheck
    execution: DIRECT
```

## Actor Path Resolution

Actions can reference actors using Unix-style path notation:

```yaml
steps:
  # Reference self (the interpreter itself)
  - states: ["0", "1"]
    actions:
      - actor: this
        method: initialize

  # Reference the parent actor in the hierarchy
  - states: ["1", "2"]
    actions:
      - actor: ..
        method: reportStatus

  # Reference a specific sibling actor
  - states: ["2", "3"]
    actions:
      - actor: ../logger
        method: logProgress

  # Apply an action to all children
  - states: ["3", "4"]
    actions:
      - actor: ./*
        method: processItem

  # Apply an action to children matching a pattern
  - states: ["4", "end"]
    actions:
      - actor: ./worker*
        method: cleanup
```

## Built-in Actions (actor: this)

When the actor is `this`, the interpreter itself handles the action:

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
