---
id: actor-tree-visualization
title: Actor Tree Visualization
sidebar_position: 39
---

:::caution Newer Version Available
This is documentation for version 2.13.0. [See the latest version](/docs/actor-iac/introduction).
:::

# Actor Tree Visualization

## Problem Definition

Visualize the actor hierarchy structure during workflow execution.

In actor-IaC, actors are dynamically created during workflow execution. Understanding the actor hierarchy structure is useful in the following situations:

- **Debugging**: Confirm that actors are being created correctly
- **Performance analysis**: Consider actor splitting for parallel processing
- **Reporting**: Display execution state to users

## How to do it

### printTree Action

Calling the `printTree` action on the ROOT actor returns the actor hierarchy in ASCII tree format.

```yaml
- states: ["5", "6"]
  note: Display current actor tree
  actions:
    - actor: ROOT
      method: printTree
```

The ROOT actor provides other actions for getting child actor information besides `printTree`.

| Action | Description |
|--------|-------------|
| `listChildren` | Returns immediate child actor names, comma-separated |
| `getChildCount` | Returns the number of immediate child actors |
| `printTree` | Returns hierarchy structure as ASCII tree |

### Output Examples

For a simple workflow, a tree like the following is output.

```
ROOT
├── loader
├── nodeGroup
│   └── node-localhost
└── outputMultiplexer
```

When executing on multiple nodes, actors for each node are created under nodeGroup.

```
ROOT
├── loader
│   └── systemInfoAggregator
├── nodeGroup
│   ├── node-192.168.5.13
│   ├── node-192.168.5.14
│   └── node-192.168.5.15
└── outputMultiplexer
```

When creating actors per document for parallel processing, the hierarchy looks like this.

```
ROOT
├── loader
├── nodeGroup
│   └── node-localhost
│       ├── doc-SCIVICS001
│       ├── doc-SCIVICS002
│       └── doc-SCIVICS003
└── outputMultiplexer
```

### Checking Parallel Processing State

In workflows that build documents in parallel, you can confirm the splitting state by calling printTree after actor creation.

```yaml
name: ParallelDocBuildWorkflow
description: |
  Build documents in parallel.
  Assign a dedicated actor to each document for speedup.

steps:
  - states: ["0", "1"]
    note: Create actor per document
    actions:
      - actor: nodeGroup
        method: createActorsForDocuments
        arguments:
          - "~/docu-search/document_list.txt"

  - states: ["1", "2"]
    note: Show actor tree after creation
    actions:
      - actor: ROOT
        method: printTree

  - states: ["2", "3"]
    note: Build all documents in parallel
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "doc-*"
          method: buildDocument
```

When processing a large number of documents, splitting into actors for parallel processing speeds things up. For example, if 10 documents are processed in parallel with 10 actors, it completes in 1/10 the time of sequential processing.

### Including in Reports

By including actor structure in the final report, you can record the execution environment state.

```
=== Workflow Execution Report ===
Session #42 | Status: COMPLETED

--- Actor Tree ---
ROOT
├── nodeGroup
│   ├── node-192.168.5.13
│   └── node-192.168.5.14
└── outputMultiplexer

--- Results ---
[OK] All nodes processed successfully
```

## Under the hood

### Basic Structure of Actor Hierarchy

The actor-IaC actor hierarchy is a tree structure with the ROOT actor at the top.

```
IIActorSystem
└── ROOT
    ├── loader
    │   └── (dynamically loaded plugins)
    ├── nodeGroup
    │   ├── node-192.168.5.13
    │   └── node-192.168.5.14
    └── outputMultiplexer
```

### RootIIAR Class

`RootIIAR` inherits from `IIActorRef` and implements the `CallableByActionName` interface. It is thanks to this interface that actions like `printTree` can be called from workflows.

```java
public class RootIIAR extends IIActorRef<Object> {

    public static final String ROOT_NAME = "ROOT";
    private final IIActorSystem system;

    @Override
    public ActionResult callByActionName(String actionName, String args) {
        return switch (actionName) {
            case "listChildren" -> listChildren();
            case "getChildCount" -> getChildCount();
            case "printTree" -> printTree();
            default -> new ActionResult(false, "Unknown action: " + actionName);
        };
    }

    private ActionResult printTree() {
        StringBuilder sb = new StringBuilder();
        sb.append(ROOT_NAME).append("\n");
        // Recursively add child actors
        for (String childName : getNamesOfChildren()) {
            appendActorTree(sb, childName, "", isLast);
        }
        return new ActionResult(true, sb.toString());
    }
}
```

### Recursive Tree Construction

The `appendActorTree` method is called recursively, traversing each actor's children while building the ASCII tree. By using `├──` and `└──` connectors appropriately, it achieves an easy-to-read tree format.

```java
private void appendActorTree(StringBuilder sb, String actorName,
                             String prefix, boolean isLast) {
    String connector = isLast ? "└── " : "├── ";
    sb.append(prefix).append(connector).append(actorName).append("\n");

    IIActorRef<?> actor = system.getIIActor(actorName);
    Set<String> childNames = actor.getNamesOfChildren();

    String newPrefix = prefix + (isLast ? "    " : "│   ");
    for (String child : childNames) {
        appendActorTree(sb, child, newPrefix, childIsLast);
    }
}
```

The prefix accumulates vertical lines (`│`) indicating the parent hierarchy, and switches between connectors and continuation lines according to the isLast flag. This allows correct display of actor hierarchies of any depth.
