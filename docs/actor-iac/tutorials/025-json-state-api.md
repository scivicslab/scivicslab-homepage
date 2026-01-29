---
id: json-state-api
title: "Passing Values Between Actions (JSON State API)"
sidebar_position: 25
---

# Passing Values Between Actions (JSON State API)

## Problem Definition

### Transition and Action

A workflow is a collection of **Transitions** (steps). Each Transition has one or more **Actions**. In the following example, one Transition contains two Actions.

```yaml
# This is one Transition (step)
- states: ["0", "1"]
  note: Get hostname and store it
  actions:
    # This is an Action (first one)
    - actor: this
      method: executeCommand
      arguments: ["hostname -s"]
    # This is an Action (second one)
    - actor: this
      method: putJson
      arguments:
        path: hostname
        value: "${result}"
```

Actions are executed sequentially from top to bottom. Each Action's execution result is saved to the `${result}` variable and can be referenced from the next Action.

### Goal

Pass values between actions in a workflow.

There are many cases where you want to use information obtained in one action in subsequent actions. Examples include: getting the hostname and using it in a subsequent report, holding the result of a prerequisite check and summarizing it at the end, updating counters or cumulative values in multiple actions, etc.


## How to do it

### Basic Rules

There are three basic rules for passing values between actions:

1. **The result of the immediately preceding action can be referenced with `${result}`**
2. **`${result}` is overwritten when the next action executes**
3. **Values you want to use later should be saved with a name using `putJson`**

The second rule is particularly important. `${result}` only holds the result of the "immediately preceding" action. If you want to use the result of an action from two or three steps ago, you must save it with `putJson`.

### Using `${result}` for Immediate Results

In the following example, the first action executes `hostname -s`, and its result is referenced as `${result}` in the second action.

```yaml
- states: ["0", "1"]
  actions:
    - actor: this
      method: executeCommand
      arguments: ["hostname -s"]     # Result: "myhost" → saved to ${result}
    - actor: this
      method: executeCommand
      arguments:
        - echo "Host is ${result}"   # ${result} is "myhost"
```

This method is effective when you only need to use the value in the immediately following action.

### `${result}` Gets Overwritten

The following example shows how `${result}` gets overwritten with each action.

```yaml
- states: ["0", "1"]
  actions:
    - actor: this
      method: executeCommand
      arguments: ["hostname -s"]     # ${result} = "myhost"
    - actor: this
      method: executeCommand
      arguments: ["date +%Y-%m-%d"]  # ${result} = "2026-01-27" (overwritten)
    - actor: this
      method: executeCommand
      arguments:
        - echo "Host is ${result}"   # ${result} is "2026-01-27" ("myhost" is lost)
```

When referencing `${result}` in the third action, you get the date from the second action. The hostname obtained in the first action is lost.

### Saving Values with `putJson`

Values you want to use later should be saved with a name using `putJson`. Saved values can be referenced with `${key}`.

```yaml
- states: ["0", "1"]
  actions:
    - actor: this
      method: executeCommand
      arguments: ["hostname -s"]     # ${result} = "myhost"
    - actor: this
      method: putJson                # Save with the name "hostname"
      arguments:
        path: hostname
        value: "${result}"
    - actor: this
      method: executeCommand
      arguments: ["date +%Y-%m-%d"]  # ${result} = "2026-01-27"
    - actor: this
      method: executeCommand
      arguments:
        - echo "Host is ${hostname}, Date is ${result}"
        # ${hostname} is "myhost", ${result} is "2026-01-27"
```

Values saved with `putJson` can be referenced from subsequent actions or from other Transitions.

### Referencing from Another Transition

Saved values can be referenced across Transitions. In the following example, the hostname saved in the first Transition is used in the last Transition.

```yaml
- states: ["0", "1"]
  note: Get hostname and save it
  actions:
    - actor: this
      method: executeCommand
      arguments: ["hostname -s"]
    - actor: this
      method: putJson
      arguments:
        path: hostname
        value: "${result}"

- states: ["1", "2"]
  note: Some other processing (${result} is overwritten)
  actions:
    - actor: this
      method: executeCommand
      arguments: ["uptime"]

- states: ["2", "end"]
  note: Use the saved hostname
  actions:
    - actor: this
      method: executeCommand
      arguments:
        - echo "Report for ${hostname}"
        # ${hostname} is the value saved in the first Transition
```

### JSON State API Action List

The JSON State API provides the following actions.

| Action | Description | Argument Format |
|--------|-------------|-----------------|
| `putJson` | Save a value | `{path: "key", value: <any>}` |
| `getJson` | Get a value | `["key"]` |
| `hasJson` | Check if key exists | `["key"]` |
| `clearJson` | Clear all saved values | (no arguments) |
| `printJson` | Output all contents for debugging | (no arguments) |

`getJson` sets the value to `${result}`, so it's unnecessary when you can directly reference with `${key}`. `hasJson` is used in combination with conditional branching.

### Combining with Conditional Branching

Using the `condition` field, you can branch processing based on the value of `${result}`. In the following example, different Transitions are executed depending on the result of a file existence check.

```yaml
- states: ["0", "1"]
  note: Check file existence
  actions:
    - actor: this
      method: executeCommand
      arguments: ["test -f /etc/myconfig && echo EXISTS || echo MISSING"]

- states: ["1", "2"]
  condition: "result.contains('EXISTS')"
  note: When file exists
  actions:
    - actor: this
      method: executeCommand
      arguments: ["cat /etc/myconfig"]

- states: ["1", "2"]
  condition: "result.contains('MISSING')"
  note: When file does not exist
  actions:
    - actor: this
      method: executeCommand
      arguments: ["echo 'default' > /etc/myconfig"]
```

`condition` evaluates the `${result}` of the last action of the previous Transition.


## Under the hood

### ActionResult Class

Each Action's execution result is returned as an `ActionResult` class. This class has two fields.

```java
public class ActionResult {
    private final boolean success;  // Whether it succeeded
    private final String result;    // Result string
}
```

**`success`**: Indicates whether the Action succeeded. If `false`, the workflow is interrupted as a failure or branching by `condition` is performed.

**`result`**: Holds the Action's result as a string. For `executeCommand` it contains the command's standard output, for `putJson` it contains the saved key name, etc.

The `${result}` variable references this `ActionResult.result` field value. In other words, `${result}` is always a string.

### JSON State

Each actor has an internal storage called **JSON State**. Both `${result}` and values saved with `putJson` are stored in this JSON State.

```
jsonState (JsonState)
├── result     ← Result of the immediately preceding action (overwritten each time)
├── hostname   ← Value saved with putJson
├── status     ← Value saved with putJson
└── ...
```

`${result}` and `${hostname}` are internally retrieved from the same JSON State. The difference is that the `result` key is automatically overwritten each time an action executes, while the `hostname` key is not changed unless explicitly set with `putJson`.

### Scope and Persistence

**Scope**: JSON State is independent for each actor (`node-*`). When executing on multiple nodes, each node has its own JSON State. Values saved on one node cannot be referenced from another node.

**Persistence**: JSON State is only held during workflow execution. It is discarded when the workflow ends. To persistently hold values, you need to write them to a file.

### Type Preservation

The type of values saved with `putJson` is preserved. Strings, numbers, booleans, objects, and arrays can all be saved.

```yaml
value: "text"        # String
value: 42            # Number
value: true          # Boolean
value: {key: "val"}  # Object
value: [1, 2, 3]     # Array
```

### POJO State vs JSON State

POJO-actor has two places to store state: POJO fields and JSON State.

| | POJO Fields | JSON State |
|---|---|---|
| Purpose | Business logic state | Temporary state during workflow execution |
| Examples | SSH connection info, configuration values | Intermediate results, flags |
| Access method | setter/getter | `putJson`/`getJson` |
| Persistence | During actor lifetime | During workflow execution |

POJO fields are structured data defined in Java code, while JSON State is flexible storage that can be dynamically read and written from YAML workflows.

### Class Hierarchy

JSON State is implemented in the ActorRef class and is available to all actors.

```
ActorRef<T>        ← Has JSON State
    │
    └── IIActorRef<T>   ← Exposes JSON State API through callByActionName
            │
            ├── NodeIIAR         ← node-* actors
            └── NodeGroupIIAR    ← nodegroup-* actors
```

`IIActorRef` exposes the JSON State API to YAML workflows through the `callByActionName` method. This allows actions like `putJson` and `getJson` to be called from workflows.
