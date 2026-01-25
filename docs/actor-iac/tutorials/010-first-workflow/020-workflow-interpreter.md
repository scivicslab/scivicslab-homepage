---
id: workflow-interpreter
title: "Under the hood (2): Workflow Interpreter"
sidebar_position: 20
---

## How the Workflow Interpreter Works

The workflow interpreter is an object that interprets and executes YAML workflows.

The workflow interpreter has a current state (initial value `"0"`) and operates as follows.

**State Matching and Transition**

Each step (called transition below) has `states` in the format `[from-state, to-state]`. The Interpreter searches from top to bottom for a transition with a from-state that matches the current state.

Example with hello.yaml:
1. Initial state: current state = `"0"`
2. `states: ["0", "end"]` matches
3. Execute actions (executeCommand)
4. Since it succeeded, update current state to `"end"`
5. Since it's `"end"`, workflow ends

**Action Execution and Conditional Branching**

Actions in each transition are executed from top to bottom. Each action returns success (true) or failure (false).

- All succeed: Transition to to-state
- Failure midway: Abort this transition and try the next transition with the same from-state

This mechanism allows conditional branching by arranging multiple transitions with the same from-state.

**Termination Conditions**

A workflow terminates under any of the following:

- Current state becomes `"end"` (success)
- No matching transition found (failure)
- Maximum iteration count reached (failure)



## actor-IaC's Workflow Interpreter

The workflow interpreter is implemented in POJO-actor's `Interpreter` class.

The purpose of actor-IaC is to execute the same configuration tasks in parallel on multiple servers.
It is natural to define work procedures (workflows) for each node as a unit.
This requires a main workflow to distribute and execute these to each node.


For this reason, actor-IaC implements:
- `NodeInterpreter` as the workflow interpreter for each node
- `NodeGroupInterpreter` as the interpreter for the main workflow

Both inherit from `Interpreter`, and `NodeInterpreter` and `NodeGroupInterpreter` have `Node` and `NodeGroup` as fields respectively.

The `Node` class enables SSH operations to be executed from workflows.
The `NodeGroup` class enables batch operations on multiple nodes.


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

These Interpreter, Node, and NodeGroup are simply POJOs.


## Three-Layer Structure of Workflow Interpreter

For a workflow to call a sub-workflow, the interpreter itself must be callable from an interpreter. Therefore, workflow interpreters also have the three-layer structure of `POJO -> ActorRef -> IIActorRef`.


```
nodeGroup actor:
  NodeGroupIIAR extends IIActorRef<NodeGroupInterpreter>
                                       ↓
                        NodeGroupInterpreter extends Interpreter

node-* actor:
  NodeIIAR extends IIActorRef<NodeInterpreter>
                                  ↓
                       NodeInterpreter extends Interpreter

logStore actor:
  H2LogStoreIIAR extends IIActorRef<DistributedLogStore>
                                         ↓
                          DistributedLogStore (does not inherit Interpreter)
```

`IIActorRef` (interpreter interfaced ActorRef) inherits from `ActorRef` and adds the `callByActionName` method. This enables calling actions from workflow YAML using strings.


```java
class ActorRef<T> {
    void tell(Consumer<T> action);              // Asynchronous messaging (don't wait for result)
    CompletableFuture<R> ask(Function<T, R> action);  // Asynchronous messaging (wait for result)
}

abstract class IIActorRef<T> extends ActorRef<T> implements CallableByActionName {
    abstract ActionResult callByActionName(String actionName, String args);  // Call action by string
}
```

`NodeIIAR` and `NodeGroupIIAR` implement `callByActionName`:

```java
public class NodeIIAR extends IIActorRef<NodeInterpreter> {
    @Override
    public ActionResult callByActionName(String actionName, String arg) {
        switch (actionName) {
            case "executeCommand":
                return this.ask(n -> n.executeCommand(arg)).get();
            case "runWorkflow":
                return this.object.runWorkflow(arg);
            ...
        }
    }
}
```

The string specified in the `method` field of workflow YAML is converted to a POJO method call through `callByActionName`.



## What is an Actor in actor-IaC

In POJO-actor's workflow framework, an actor is an object of `IIActorRef<T>` or a class that inherits it.
All actors available from workflows in actor-IaC have this form.

**node-\* actor (each node)**

```
NodeInterpreter             ← POJO
    ↓ type parameter
ActorRef<NodeInterpreter>   ← Foundation of actor model (tell/ask, message queue)
    ↓ extends
NodeIIAR                    ← Callable from workflow YAML (callByActionName)
```

**nodeGroup actor (manages node group)**

```
NodeGroupInterpreter             ← POJO
    ↓ type parameter
ActorRef<NodeGroupInterpreter>   ← Foundation of actor model (tell/ask, message queue)
    ↓ extends
NodeGroupIIAR                    ← Callable from workflow YAML (callByActionName)
```


## Calling Sub-Workflows from Main Workflow

The main workflow has all node actors execute sub-workflows in parallel using `nodeGroup.apply()`.

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


## `actor: this` in Sub-Workflows

Sub-workflows are executed by NodeInterpreter on each node actor. `actor: this` refers to the executing actor itself.

```yaml
# Sub-workflow (executed by NodeInterpreter)
- actor: this
  method: executeCommand
  arguments:
    - "echo 'Hello from actor-IaC!'"
```

When executed on the node-server1 actor, `this` refers to node-server1.
