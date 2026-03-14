---
sidebar_position: 2
title: "IIActorRef"
description: "IIActorRef: the bridge between type-safe Java actors and YAML-driven workflow execution"
---

# IIActorRef

The `IIActorRef<T>` (Interpreter-Interfaced Actor Reference) is an abstract class that bridges the gap between POJO-actor's type-safe lambda-based communication and the string-based action invocation needed by workflow interpreters. While a standard `ActorRef<T>` lets you call methods using Java lambdas that are checked at compile time, `IIActorRef<T>` adds the ability to invoke methods by their string names, which is essential for executing workflows defined in YAML or JSON files.

## Why IIActorRef is Needed

Standard ActorRef uses Java lambdas for type-safe method invocation:

```java
// Regular ActorRef - the compiler verifies that doWork() exists
actorRef.tell(actor -> actor.doWork());
```

However, workflow interpreters read action definitions from external files and don't know which methods to call until runtime. For this scenario, we need string-based invocation:

```java
// IIActorRef - the method name is provided as a string at runtime
iiActorRef.callByActionName("doWork", "[]");
```

## Class Hierarchy

```
ActorRef<T>
    └── IIActorRef<T> (abstract)
            ├── InterpreterIIAR (built-in for workflow execution)
            └── YourCustomIIAR (your custom workflow actors)
```

## Creating a Custom IIActorRef

To create an actor that can participate in workflows, extend IIActorRef and implement the `callByActionName` method:

```java
public class WorkerIIAR extends IIActorRef<Worker> {

    public WorkerIIAR(String actorName, Worker worker) {
        super(actorName, worker);
    }

    public WorkerIIAR(String actorName, Worker worker, IIActorSystem system) {
        super(actorName, worker, system);
    }

    @Override
    public ActionResult callByActionName(String actionName, String args) {
        try {
            switch (actionName) {
                case "process":
                    this.tell(Worker::process).get();
                    return new ActionResult(true, "processed");

                case "setConfig":
                    JSONArray argsArray = new JSONArray(args);
                    String key = argsArray.getString(0);
                    String value = argsArray.getString(1);
                    this.tell(w -> w.setConfig(key, value)).get();
                    return new ActionResult(true, "config set");

                case "getStatus":
                    String status = this.ask(Worker::getStatus).get();
                    return new ActionResult(true, status);

                default:
                    return new ActionResult(false, "Unknown action: " + actionName);
            }
        } catch (Exception e) {
            return new ActionResult(false, "Error: " + e.getMessage());
        }
    }
}
```

## ActionResult

The `callByActionName` method returns an `ActionResult` that indicates whether the action succeeded or failed:

```java
// Return success
return new ActionResult(true, "Operation completed successfully");

// Return failure - the workflow interpreter tries the next matching transition
return new ActionResult(false, "File not found: config.yaml");
```

## Argument Handling

### No Arguments

When an action takes no arguments, args will be `"[]"`:

```yaml
actions:
  - actor: worker
    method: start
```

```java
case "start":
    this.tell(Worker::start).get();
    return new ActionResult(true, "started");
```

### Single Argument

```yaml
actions:
  - actor: worker
    method: loadFile
    arguments: ["config.json"]
```

```java
case "loadFile":
    JSONArray arr = new JSONArray(args);
    String path = arr.getString(0);
    this.tell(w -> w.loadFile(path)).get();
    return new ActionResult(true, "file loaded");
```

### Multiple Arguments

```yaml
actions:
  - actor: worker
    method: connect
    arguments: ["server1.example.com", 8080, true]
```

```java
case "connect":
    JSONArray arr = new JSONArray(args);
    String host = arr.getString(0);
    int port = arr.getInt(1);
    boolean ssl = arr.getBoolean(2);
    this.tell(w -> w.connect(host, port, ssl)).get();
    return new ActionResult(true, "connected to " + host);
```

### Map Arguments

```yaml
actions:
  - actor: worker
    method: configure
    arguments:
      retries: 3
      timeout: 5000
      verbose: true
```

```java
case "configure":
    JSONObject obj = new JSONObject(args);
    int retries = obj.getInt("retries");
    int timeout = obj.getInt("timeout");
    boolean verbose = obj.optBoolean("verbose", false);
    this.tell(w -> w.configure(retries, timeout, verbose)).get();
    return new ActionResult(true, "configured");
```

## Built-in IIActorRef: InterpreterIIAR

Turing-workflow includes `InterpreterIIAR`, a ready-to-use IIActorRef implementation that wraps an Interpreter instance:

```java
Interpreter interpreter = new Interpreter.Builder()
    .loggerName("main")
    .team(system)
    .build();

InterpreterIIAR interpreterActor = new InterpreterIIAR("main", interpreter, system);
system.addIIActor(interpreterActor);
```

InterpreterIIAR supports these built-in actions:

| Action | Arguments | Description |
|--------|-----------|-------------|
| `readYaml` | File path | Loads a YAML workflow definition from the specified file path. |
| `readJson` | File path | Loads a JSON workflow definition from the specified file path. |
| `execCode` | None | Executes a single step of the loaded workflow. |
| `runUntilEnd` | [maxIterations] | Runs the workflow until it reaches the "end" state. |
| `call` | [workflowFile] | Creates a child interpreter, loads the specified workflow, runs it, and removes the child. |
| `apply` | JSON action definition | Applies an action to existing child actors matching a pattern. |
| `sleep` | Milliseconds | Pauses execution for the specified duration. |
| `print` | Message | Prints the message to standard output. |
| `doNothing` | Message | Does nothing and returns the message as the result. |

## Parent-Child Relationships

IIActorRef instances can form hierarchies for Unix-style path resolution in workflows:

```java
IIActorSystem system = new IIActorSystem("demo");

ParentIIAR parent = new ParentIIAR("parent", new Parent(), system);
system.addIIActor(parent);

ChildIIAR child = new ChildIIAR("child-1", new Child(), system);
child.setParentName("parent");
parent.getNamesOfChildren().add("child-1");
system.addIIActor(child);

// Now the workflow can reference "../" from child-1 to reach parent,
// or "./*" from parent to reach all children.
```

## Thread Safety

Because IIActorRef extends ActorRef, it inherits the same thread-safety guarantees. When you use `tell()` and `ask()` within your `callByActionName` implementation, the operations go through the actor's message queue and are processed sequentially.
