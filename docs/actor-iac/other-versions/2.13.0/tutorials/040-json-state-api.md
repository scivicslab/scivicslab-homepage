---
id: json-state-api
title: Passing Values Between Transitions (JSON State API)
sidebar_position: 40
---

# Passing Values Between Transitions (JSON State API)

This tutorial explains how to pass values between transitions in a workflow.

## 1. Overview

In workflows, there are cases where you want to use information obtained in one step in subsequent steps. For example:

- Detect files with changes and use that list in subsequent build steps
- Keep the results of prerequisite checks and report them all together at the end
- Update counters or accumulated values across multiple transitions

In actor-IaC, you can hold state within Node actors using the **JSON State API**.

## 2. Available Actions

NodeIIAR provides the following JSON State actions:

| Action | Description | Argument Format |
|--------|-------------|-----------------|
| `putJson` | Save a value | `{path: "key.path", value: <any>}` |
| `getJson` | Get a value | `["key.path"]` |
| `hasJson` | Check if key exists | `["key.path"]` |
| `clearJson` | Clear all state | (no arguments) |
| `printJson` | Debug output | (no arguments) |

## 3. Basic Usage

### 3.1 Saving Values (putJson)

```yaml
- states: ["0", "1"]
  note: Store a simple value
  actions:
    - actor: this
      method: putJson
      arguments:
        path: myKey
        value: "Hello World"

- states: ["1", "2"]
  note: Store a nested value
  actions:
    - actor: this
      method: putJson
      arguments:
        path: workflow.counter
        value: 42
```

### 3.2 Nested Paths

You can specify nested structures with `.` (dot) in paths:

```yaml
- actor: this
  method: putJson
  arguments:
    path: build.results.doc1
    value: "success"
```

This creates the following JSON structure:

```json
{
  "build": {
    "results": {
      "doc1": "success"
    }
  }
}
```

### 3.3 Debug Output (printJson)

Output the entire current JSON State to the console:

```yaml
- states: ["debug", "next"]
  note: Print current state for debugging
  actions:
    - actor: this
      method: printJson
```

Output example:

```json
{
  "myKey" : "Hello World",
  "workflow" : {
    "counter" : 42
  },
  "build" : {
    "results" : {
      "doc1" : "success"
    }
  }
}
```

## 4. Practical Example: Change Detection and Build

### 4.1 Recording Documents with Changes

```yaml
name: DocumentBuildWorkflow

steps:
  - states: ["0", "1"]
    note: Check doc1 for changes
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            cd ~/docs/doc1
            if git fetch origin && [ "$(git rev-parse HEAD)" != "$(git rev-parse @{u})" ]; then
              echo "CHANGED"
            else
              echo "UP-TO-DATE"
            fi

  - states: ["1", "2"]
    condition: "result.contains('CHANGED')"
    note: Record doc1 as changed
    actions:
      - actor: this
        method: putJson
        arguments:
          path: changed.doc1
          value: true

  - states: ["1", "2"]
    condition: "result.contains('UP-TO-DATE')"
    note: Record doc1 as up-to-date
    actions:
      - actor: this
        method: putJson
        arguments:
          path: changed.doc1
          value: false

  # ... Check other documents similarly ...

  - states: ["check-done", "build"]
    note: Check if doc1 needs build
    actions:
      - actor: this
        method: hasJson
        arguments:
          - changed.doc1

  - states: ["build", "build-doc1"]
    condition: "result == 'true'"
    note: Build doc1
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            cd ~/docs/doc1
            yarn build
            echo "%[OK] doc1: built"
```

### 4.2 Updating Counters

Since numeric addition is not directly supported at this time, calculate in shell script and save with putJson:

```yaml
- states: ["count", "next"]
  note: Increment counter
  actions:
    - actor: this
      method: executeCommand
      arguments:
        - |
          # Get current value (default 0)
          CURRENT=0
          NEW=$((CURRENT + 1))
          echo $NEW

- states: ["next", "save"]
  note: Save new counter value
  actions:
    - actor: this
      method: putJson
      arguments:
        path: counter
        value: "${result}"
```

## 5. Notes

### 5.1 Scope

JSON State is independent for each Node actor (`node-*`). When executing on multiple nodes, each node has its own state.

### 5.2 Persistence

JSON State is retained only during workflow execution. It is discarded after workflow completion. If persistent state is needed, write it to a file.

### 5.3 Types

The type of values saved with `putJson` is preserved:
- String: `value: "text"`
- Number: `value: 42`
- Boolean: `value: true`
- Object: `value: {key: "val"}`
- Array: `value: [1, 2, 3]`

## 6. Summary

- `putJson`/`getJson`/`hasJson` enable value passing between transitions
- Specify nested structures with `.` in paths
- Use `printJson` to check state during debugging
- Each Node actor has independent state

---

**Related Documents:**

- Workflow Report and % Prefix - Report aggregation
- Actor Tree Visualization - Checking actor structure
