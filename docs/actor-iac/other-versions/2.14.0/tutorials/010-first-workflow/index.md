---
id: first-workflow
title: Creating and Executing a Hello World Workflow
sidebar_position: 10
---

## Problem Definition

Create a workflow with actor-IaC and execute it on the local machine.


## How to do it

### Prerequisites

- actor-IaC must be installed (refer to `005-installation`)
- Java 21 or higher must be installed

### Create Working Directory

```bash
mkdir -p ~/works/testcluster-iac
cd ~/works/testcluster-iac
```

Place the launcher script.

```bash
cp /path/to/actor-IaC/actor_iac.java .
chmod +x actor_iac.java
```

### Create Inventory File

Create `inventory.ini`. The inventory defines the target nodes for workflow execution.

```ini
[local]
localhost actoriac_connection=local
```

- `[local]`: Group name
- `localhost`: Host name
- `actoriac_connection=local`: Specifies local execution (not SSH connection)

### Create Workflow

Create the following directory structure.

```
~/works/testcluster-iac/
├── actor_iac.java        # Launcher script (copied)
├── inventory.ini         # Inventory file (created)
└── hello/                # Workflow directory
    ├── main-hello.yaml   # Main workflow
    └── hello.yaml        # Sub-workflow
```

**hello/hello.yaml** (sub-workflow, executed on each node)

```yaml
name: hello
steps:
  - states: ["0", "end"]
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - "echo 'Hello from actor-IaC!'"
```

**hello/main-hello.yaml** (main workflow, calls the sub-workflow)

```yaml
name: main-hello
steps:
  - states: ["0", "end"]
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runWorkflow
          arguments: ["hello.yaml"]
```

### Workflow YAML Structure

```yaml
name: workflow-name
steps:
  - states: [from-state, to-state]
    actions:
      - actor: target-actor
        method: action-name
        arguments: [arguments...]
```

| Element | Description |
|---------|-------------|
| `name` | Name of the workflow |
| `steps` | List of transitions. Each transition is a combination of states and actions |
| `states` | Format: `[from-state, to-state]` |
| `actions` | List of actions to execute |
| `actor` | Actor name that executes the action |
| `method` | Action name to call (string) |
| `arguments` | Arguments to pass to the action |


Workflow interpreter operation:
1. Load the YAML file
2. Find the step corresponding to the current state held by the interpreter
3. Execute the actions defined in the step in order
4. Transition to the next state
5. Repeat until the state becomes `end`

For details on operation, refer to the Workflow Interpreter documentation.

### Execute Workflow

```bash
./actor_iac.java run -w hello/main-hello.yaml -i inventory.ini -g local
```

| Option | Description |
|--------|-------------|
| `-w hello/main-hello.yaml` | Workflow file to execute |
| `-i inventory.ini` | Inventory file |
| `-g local` | Target group |

### Execution Results

```
2026-01-15 03:33:24 INFO Loading workflow: main-hello.yaml
2026-01-15 03:33:24 INFO Creating node actors for group: local
 ____________________________
/ [main-hello]               \
| - states: ["0", "end"]     |
|  actions:                  |
|  - actor: nodeGroup        |
\  method: apply ...         /
 ----------------------------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||

Hello from actor-IaC!
2026-01-15 03:33:24 INFO Workflow completed successfully
```

actor-IaC displays each step of the workflow in cowsay format. Execution logs are saved to `actor-iac-logs.mv.db` (H2 database) in the current directory.


## Related Documents

This section contains the following related documents:

| Document | Description |
|----------|-------------|
| [Actor Layers](./010-actor-layers) | Explains the hierarchy of actor layers: `this`, `nodeGroup`, `node-*` |
| [Workflow Interpreter](./020-workflow-interpreter) | Explains how the workflow interpreter processes YAML and executes actions |
| [Argument Formats](./030-argument-formats) | Explains JSON argument formats for `@Action` methods |
| [Action Implementation](./040-action-implementation) | Explains `@Action` vs `CallableByActionName` implementation patterns |
