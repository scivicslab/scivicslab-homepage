---
id: first-workflow
sidebar_position: 1
title: "First Workflow"
description: "Create and run a Hello World workflow with Turing-workflow. Learn about the 3-layer actor structure, workflow interpreter, and argument formats."
keywords:
  - Turing-workflow
  - workflow
  - YAML
  - actor
  - IIActorRef
  - interpreter
---

# First Workflow

## Problem Definition

Create a workflow with Turing-workflow and run it on your local machine. Understand the structure of workflow YAML and learn how to call sub-workflows from a main workflow.

## How to do it

### Prerequisites

- Turing-workflow is installed (see `110_installation`)
- Java 21 or higher is installed

### Create a Working Directory

```bash
mkdir -p ~/works/testcluster-wf
cd ~/works/testcluster-wf
```

Place the launcher script in the directory.

```bash
cp /path/to/Turing-workflow/turing_workflow.java .
chmod +x turing_workflow.java
```

### Create an Inventory File

Create `inventory.ini`. The inventory file defines the nodes that the workflow will target.

```ini
[local]
localhost actoriac_connection=local
```

| Element | Description |
|---------|-------------|
| `[local]` | Group name |
| `localhost` | Host name |
| `actoriac_connection=local` | Specifies local execution (not SSH connection) |

### Create the Workflow

Create the following directory structure.

```
~/works/testcluster-wf/
├── turing_workflow.java    # Launcher script (already copied)
├── inventory.ini           # Inventory file (already created)
└── hello/                  # Workflow directory
    ├── main-hello.yaml     # Main workflow
    └── hello.yaml          # Sub-workflow
```

**hello/hello.yaml** (Sub-workflow, executed on each node)

```yaml
name: hello
steps:
  - states: ["0", "end"]
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - "echo 'Hello from Turing-workflow!'"
```

**hello/main-hello.yaml** (Main workflow, calls the sub-workflow)

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
| `steps` | List of transitions. Each transition is a pair of states and actions |
| `states` | Specifies source and destination states in `[from-state, to-state]` format |
| `actions` | List of actions to execute |
| `actor` | Name of the actor that executes the action |
| `method` | Name of the action to call (string) |
| `arguments` | Arguments to pass to the action |

### Run the Workflow

```bash
./turing_workflow.java run -w hello/main-hello.yaml -i inventory.ini -g local
```

| Option | Description |
|--------|-------------|
| `-w hello/main-hello.yaml` | Workflow file to execute |
| `-i inventory.ini` | Inventory file |
| `-g local` | Target group |

### Execution Result

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

Hello from Turing-workflow!
2026-01-15 03:33:24 INFO Workflow completed successfully
```

Turing-workflow displays each workflow step in cowsay format. Execution logs are saved to `turing-workflow-logs.mv.db` (H2 database) in the current directory.

### `actor: this` in Sub-workflows

Sub-workflows are executed by the NodeInterpreter on each node actor. `actor: this` refers to the actor itself that is currently running.

```yaml
# Sub-workflow (executed by NodeInterpreter)
- actor: this
  method: executeCommand
  arguments:
    - "echo 'Hello from Turing-workflow!'"
```

When executed on the node-server1 actor, `this` refers to node-server1.

### Workflow Argument Formats

`@Action` methods are always called with **a single String argument**. The contents written in the `arguments` field of the workflow YAML are converted to a JSON string and passed to the method. It is the method's responsibility to parse it appropriately.

#### Conversion Rules

| YAML Format | Value Passed to Method | How to Parse |
|-------------|------------------------|--------------|
| `arguments: "value"` | `["value"]` | `new JSONArray(arg).getString(0)` |
| `arguments: ["a", "b"]` | `["a", "b"]` | `new JSONArray(arg)` |
| `arguments: {k: v}` | `{"k": "v"}` | `new JSONObject(arg)` |

Strings and arrays are converted to JSON arrays, and objects are converted to JSON objects.

#### Responsibilities of @Action Methods

`@Action` methods have the following responsibilities:

1. **Receive a String argument** -- The signature is `ActionResult method(String arg)`
2. **Parse appropriately** -- Convert to `JSONArray` or `JSONObject` according to the expected format
3. **Execute processing** -- Perform actual processing using the parsed values
4. **Return results** -- Return success/failure and result message via `ActionResult`
5. **Document argument format in Javadoc** -- So workflow authors can reference it

## Under the Hood

### 3-Layer Actor Structure

Turing-workflow is implemented using POJO-actor's workflow framework. A key feature of POJO-actor is the ability to turn any POJO (Plain Old Java Object) into an actor. Turing-workflow actors have a 3-layer structure.

```
T (POJO)           <- Business logic (pure Java object)
    | type parameter
ActorRef<T>        <- Actor model foundation (tell/ask, message queue)
    | extends
IIActorRef<T>      <- Receives calls from the workflow interpreter
```

| Layer | Role |
|-------|------|
| POJO | Pure Java object that implements business logic |
| `ActorRef<T>` | Provides actor model functionality (message queue, tell/ask) |
| `IIActorRef<T>` | Enables string-based calls from workflow YAML |

The `T` in `ActorRef<T>` is a type parameter. `T` is neither an inheritance relationship (is-a) nor an ownership relationship (has-a), but a type binding relationship through generics.

### How the Workflow Interpreter Works

The workflow interpreter is an object that parses and executes YAML workflows. The interpreter maintains a current state (initial value `"0"`) and operates as follows.

**State Matching and Transitions:**

The `states` of each step (called a transition) is in `[from-state, to-state]` format. The interpreter searches from top to bottom for a transition whose from-state matches the current state.

Example with hello.yaml:
1. Initial state: current state = `"0"`
2. `states: ["0", "end"]` matches
3. Execute actions (executeCommand)
4. Success, so update current state to `"end"`
5. Current state is `"end"`, so workflow ends

**Action Execution and Conditional Branching:**

Actions in each transition are executed from top to bottom. Each action returns success (true) or failure (false).

- All succeed: Transition to to-state
- Failure midway: Try the next transition with the same from-state

By arranging multiple transitions with the same from-state, you can implement conditional branching.

**Termination Conditions:**

A workflow terminates under any of the following conditions:

- Current state becomes `"end"` (success)
- No matching transition is found (failure)
- Maximum iteration count is reached (failure)

### NodeInterpreter and NodeGroupInterpreter

The purpose of Turing-workflow is to execute identical configuration tasks in parallel across multiple servers. This requires defining work procedures (workflows) for each node unit and having a main workflow that distributes and executes them on each node.

Turing-workflow implements `NodeInterpreter` as the workflow interpreter for each node and `NodeGroupInterpreter` as the interpreter for the main workflow.

```java
public class NodeInterpreter extends Interpreter {
    private final Node node;           // POJO responsible for SSH operations
    ...
}

public class NodeGroupInterpreter extends Interpreter {
    private final NodeGroup nodeGroup; // POJO responsible for inventory management
    ...
}
```

The `Node` class enables SSH operations to be executed from workflows. The `NodeGroup` class enables batch operations on multiple nodes.

Workflow interpreters also have the 3-layer `POJO -> ActorRef -> IIActorRef` structure.

```
nodeGroup actor:
  NodeGroupIIAR extends IIActorRef<NodeGroupInterpreter>
                                       |
                        NodeGroupInterpreter extends Interpreter

node-* actors:
  NodeIIAR extends IIActorRef<NodeInterpreter>
                                  |
                       NodeInterpreter extends Interpreter
```

### How Sub-workflow Calls Work

The main workflow uses `nodeGroup.apply()` to execute sub-workflows in parallel on all node actors.

```yaml
# Main workflow (executed by NodeGroupInterpreter)
- actor: nodeGroup
  method: apply
  arguments:
    actor: "node-*"           # Target all node actors
    method: runWorkflow
    arguments: ["hello.yaml"] # Execute sub-workflow
```

`apply()` calls the specified method (`runWorkflow`) in parallel on all actors matching `node-*`.

### Interpreter Conversion Processing

The `Interpreter` class converts YAML arguments to JSON strings as follows.

```java
private String convertArgumentsToJson(Object arguments) {
    if (arguments == null) {
        return "[]";
    }
    if (arguments instanceof String) {
        // Wrap string in array
        return new JSONArray().put(arguments).toString();
    }
    if (arguments instanceof List) {
        // Convert array as-is
        return new JSONArray((List<?>) arguments).toString();
    }
    if (arguments instanceof Map) {
        // Convert object as-is (do not wrap in array)
        return new JSONObject((Map<?, ?>) arguments).toString();
    }
    return arguments.toString();
}
```

### Method Design Conventions

The following conventions are recommended when implementing new `@Action` methods.

| Case | Recommended Format | Reason |
|------|-------------------|--------|
| Single value (command, path, etc.) | JSONArray | Simple to write |
| Multiple positional arguments | JSONArray | Order is clear |
| Named/optional arguments | JSONObject | Key names make meaning clear |
