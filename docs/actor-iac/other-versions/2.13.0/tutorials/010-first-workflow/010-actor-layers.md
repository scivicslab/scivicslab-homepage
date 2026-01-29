---
id: actor-layers
title: "Under the hood (1): Three-Layer Structure of POJO, ActorRef, and IIActorRef"
sidebar_position: 10
---

:::caution Newer Version Available
This is documentation for version 2.13.0. [See the latest version](/docs/actor-iac/introduction).
:::

## Overview of the Three-Layer Structure

actor-IaC is implemented using the POJO-actor workflow framework.
A characteristic of POJO-actor is that it can turn any POJO (Plain Old Java Object) into an actor.
This enables asynchronous parallel execution of any POJO.

actor-IaC has actors corresponding to target compute nodes.
This allows operations on each compute node to be executed asynchronously and in parallel quite naturally, making workflow descriptions straightforward.

For this reason, actor-IaC actors have a three-layer structure.

```
T (POJO)           ← Business logic (pure Java object)
    ↑ type parameter
ActorRef<T>        ← Foundation of actor model (tell/ask, message queue)
    ↑ extends
IIActorRef<T>      ← Receives calls from workflow interpreter
```

| Layer | Role |
|-------|------|
| POJO | Pure Java object that implements business logic |
| `ActorRef<T>` | Provides actor model functionality (message queue, tell/ask) |
| `IIActorRef<T>` | Enables string-based calls from workflow YAML |

The `T` in `ActorRef<T>` is a type parameter. This is not an inheritance relationship (is-a) or ownership relationship (has-a), but a type binding relationship through generics.


## Roles of Each Layer

### POJO Layer

POJO stands for Plain Old Java Object, an ordinary Java object that does not depend on any special framework.

```java
public class NodeExecutor {
    public String executeCommand(String command) {
        // SSH connect and execute command
        return result;
    }
}
```

POJOs implement only pure business logic without being aware of the actor model. Unit testing is easy.


### ActorRef\<T\> Layer

`ActorRef<T>` makes a POJO operate as an actor.

```java
ActorRef<NodeExecutor> nodeActor = new ActorRef<>("node-server1", new NodeExecutor());

// tell: Send message asynchronously (don't wait for result)
nodeActor.tell(executor -> executor.executeCommand("ls -la"));

// ask: Send message asynchronously and wait for result
CompletableFuture<String> result = nodeActor.ask(executor -> executor.executeCommand("ls -la"));
```

Features provided by the ActorRef layer:
- Message queue (only one message processed at a time)
- Asynchronous messaging via tell/ask
- Thread safety guarantee


### IIActorRef\<T\> Layer

`IIActorRef<T>` (Interpreter-Interfaced ActorRef) enables string-based action calls from workflow YAML.

When the workflow YAML interpreter executes an actor's action written in the workflow, it calls the `callByActionName(actionName, args)` method of the corresponding `IIActorRef<T>` (actor). The `callByActionName` method calls the POJO's method inside.

```java
public class NodeExecutorIIAR extends IIActorRef<NodeExecutor> {
    @Override
    public ActionResult callByActionName(String actionName, String args) {
        return switch (actionName) {
            case "executeCommand" -> {
                String command = parseArgs(args);
                String result = getObject().executeCommand(command);
                yield new ActionResult(true, result);
            }
            default -> new ActionResult(false, "Unknown action: " + actionName);
        };
    }
}
```

This enables calling actor actions from YAML using strings:

```yaml
- actor: node-server1
  method: executeCommand     # ← string
  arguments: ["ls -la"]      # ← string
```
