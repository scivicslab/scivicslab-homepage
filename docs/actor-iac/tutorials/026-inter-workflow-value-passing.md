---
id: inter-workflow-value-passing
title: Passing Values Between Workflows
sidebar_position: 26
---

# Passing Values Between Workflows

## Problem Definition

### Main Workflow and Sub-workflow

A workflow can call another workflow. The caller is called the **main workflow**, and the callee is called the **sub-workflow**.

```
main-workflow.yaml (main)
    │
    └── runWorkflow: sub-task.yaml (sub)
```

This mechanism allows complex processes to be split and managed across multiple workflows. Common processes can be extracted as sub-workflows and reused from multiple main workflows.

### Calling Methods

There are two ways to call a sub-workflow. `runWorkflow` executes the sub-workflow on the same actor. `call` creates a child interpreter and executes the sub-workflow.

Depending on which method you use, whether JSON State is shared between main and sub differs. With `runWorkflow`, JSON State is shared. With `call`, it is not shared. This difference significantly affects how values are passed.

### Goal

Pass values between the main workflow and sub-workflow. Specifically, there are two cases.

The first is passing **from main to sub**. This is used when you want to pass configuration values or parameters to the sub-workflow to control its behavior.

The second is passing **from sub to main**. This is used when you want to use information or calculation results obtained in the sub-workflow in the main workflow.


## How to do it

### Using `runWorkflow`

`runWorkflow` executes the sub-workflow on the same actor. Since the actor is the same, the same JSON State is used. This is the simplest way to pass values.

#### Passing from Main to Sub

Values saved with `putJson` in the main workflow can be referenced directly from the sub-workflow. In the following example, the main workflow sets the deployment directory and mode, which the sub-workflow uses.

**Main workflow (main.yaml)**:
```yaml
steps:
  - states: ["0", "1"]
    note: Save configuration values to pass to sub-workflow
    actions:
      - actor: this
        method: putJson
        arguments:
          path: config.targetDir
          value: "/var/www/html"
      - actor: this
        method: putJson
        arguments:
          path: config.mode
          value: "production"

  - states: ["1", "end"]
    note: Execute sub-workflow
    actions:
      - actor: this
        method: runWorkflow
        arguments: ["deploy.yaml"]
```

The main workflow saves two configuration values using `putJson`. It sets the deployment path in `config.targetDir` and the execution mode in `config.mode`. Then it calls the sub-workflow with `runWorkflow`.

**Sub-workflow (deploy.yaml)**:
```yaml
steps:
  - states: ["0", "end"]
    note: Use configuration values passed from main
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            TARGET='${config.targetDir}'
            MODE='${config.mode}'
            echo "Deploying to $TARGET in $MODE mode"
```

The sub-workflow references the values passed from main using `${config.targetDir}` and `${config.mode}`. Since JSON State is shared, the sub-workflow can access these values without any special operations.

#### Passing from Sub to Main

Values saved with `putJson` in the sub-workflow can be referenced after returning to the main workflow. In the following example, the sub-workflow counts files and the main workflow uses the result.

**Sub-workflow (count-files.yaml)**:
```yaml
steps:
  - states: ["0", "1"]
    note: Count files
    actions:
      - actor: this
        method: executeCommand
        arguments: ["ls /var/www/html | wc -l"]

  - states: ["1", "end"]
    note: Save result to return to main
    actions:
      - actor: this
        method: putJson
        arguments:
          path: fileCount
          value: "${result}"
```

The sub-workflow counts files using the `ls` command and retrieves the result with `${result}`. In the next action, it saves the value with the key `fileCount` using `putJson`. Without `putJson`, `${result}` would be overwritten by the next action, and the value would be lost when returning to main.

**Main workflow (main.yaml)**:
```yaml
steps:
  - states: ["0", "1"]
    note: Execute sub-workflow
    actions:
      - actor: this
        method: runWorkflow
        arguments: ["count-files.yaml"]

  - states: ["1", "end"]
    note: Use result from sub-workflow
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - echo "Found ${fileCount} files"
```

The main workflow references the value saved by the sub-workflow using `${fileCount}` after executing the sub-workflow with `runWorkflow`. Since JSON State is shared, values saved in the sub-workflow are retained after returning to main.

### Using `call`

`call` creates a child interpreter and executes the sub-workflow. The child interpreter has its own JSON State, so JSON State is not shared between main and sub. To pass values, you need to communicate via a shared actor.

#### Passing via Shared Actor

Main and sub share the same `IIActorSystem` (actor registry). Therefore, they can communicate through registered actors. In the following example, the `counter` actor serves as the intermediary for passing values between main and sub.

**Main workflow**:
```yaml
steps:
  - states: ["0", "1"]
    note: Set value in shared actor
    actions:
      - actor: counter
        method: setCount
        arguments: [100]

  - states: ["1", "2"]
    note: Call sub-workflow
    actions:
      - actor: this
        method: call
        arguments: ["process.yaml"]

  - states: ["2", "end"]
    note: Get value updated by sub-workflow
    actions:
      - actor: counter
        method: getCount
```

The main workflow first sets the value to 100 using the `setCount` method of the `counter` actor. This is stored in the `counter` actor's own state, not in the main's JSON State. Then it calls the sub-workflow with `call`, and finally retrieves the value from the `counter` actor.

**Sub-workflow**:
```yaml
steps:
  - states: ["0", "end"]
    note: Update shared actor's value
    actions:
      - actor: counter
        method: increment
```

The sub-workflow calls the `increment` method of the `counter` actor to update the value. Since the `counter` actor is shared between main and sub, values updated in sub can be referenced from main.

This method requires more effort than `runWorkflow`, but allows safer isolated processing since the sub-workflow's JSON State does not affect main.


## Under the hood

### How `runWorkflow` Works

`runWorkflow` executes the sub-workflow on the same actor (NodeIIAR). Since the actor is the same, the same JSON State is used.

```
NodeIIAR (node-xxx)
├── NodeInterpreter (POJO)
└── JSON State              ← Shared between main and sub
    ├── result
    ├── config.targetDir    ← Saved in main
    ├── config.mode         ← Saved in main
    └── fileCount           ← Saved in sub
```

The diagram above shows the actor structure during `runWorkflow` execution. The NodeIIAR actor has a single JSON State, and both the main workflow and sub-workflow read from and write to this JSON State.

When `runWorkflow` is called, the following processes are executed in order. First, the interpreter's state (currentState) is reset to "0". Next, the sub-workflow's YAML file is loaded. Then the sub-workflow is executed until it reaches the "end" state. Finally, control returns to the next Transition in the main workflow.

The important point is that JSON State is not reset. Values saved in main can be referenced in sub, and values saved in sub can be referenced after returning to main.

### How `call` Works

`call` creates a child interpreter. The child interpreter has its own JSON State, but shares the IIActorSystem (actor registry) with the parent.

```
Main Interpreter
├── JSON State (main only)
└── IIActorSystem ─────────┐
                           │ Shared
    Child Interpreter      │
    ├── JSON State (child only)
    └── IIActorSystem ─────┘
            │
            └── counter (shared actor)
```

The diagram above shows the interpreter structure during `call` execution. Main and child each have their own JSON State, so values saved with `putJson` are not visible to each other. On the other hand, since IIActorSystem is shared, both can access registered actors like `counter`.

When `call` is invoked, the following processes are executed in order. First, a child Interpreter is created. At this time, IIActorSystem is inherited from the parent. Next, the sub-workflow's YAML file is loaded into the child Interpreter. Then the sub-workflow is executed until it reaches the "end" state. After the sub-workflow ends, the child Interpreter is destroyed. Finally, control returns to the next Transition in the main workflow.

When the child Interpreter is destroyed, the child's JSON State is also destroyed. Therefore, if you want to use values saved with `putJson` in the sub-workflow in main, you need to pass them via a shared actor.

### Guidelines for Choosing

`runWorkflow` and `call` are suited for different use cases.

`runWorkflow` is suitable for executing tasks that inherit configuration values. Since JSON State is shared, passing values is easy. However, since values written to JSON State by the sub-workflow may affect main, you need to be careful about key name collisions.

`call` is suitable for executing independent sub-tasks. Since JSON State is isolated, there is no worry about the sub-workflow contaminating the main's state. However, passing values requires preparing a shared actor, which takes more effort than `runWorkflow`.
