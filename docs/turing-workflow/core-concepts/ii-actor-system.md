---
sidebar_position: 1
title: "IIActorSystem"
description: "IIActorSystem: the actor system that manages workflow actors in Turing-workflow"
---

# IIActorSystem

The `IIActorSystem` (Interpreter-Interfaced Actor System) extends the base `ActorSystem` to support workflow execution. While the standard ActorSystem manages actors that communicate via type-safe Java lambdas, IIActorSystem adds the capability to manage actors that can be invoked by string-based action names. This string-based invocation is essential for workflow interpreters that read action definitions from YAML or JSON files at runtime.

IIActorSystem maintains full compatibility with regular actors, so you can mix both types in the same application. Regular actors use the inherited methods from ActorSystem, while workflow actors (IIActorRef instances) use the additional methods provided by IIActorSystem.

## Creating an IIActorSystem

```java
// Create an IIActorSystem with a name
IIActorSystem system = new IIActorSystem("workflow-system");

// Create an IIActorSystem with a specific thread pool size
IIActorSystem system = new IIActorSystem("workflow-system", 4);
```

## Managing IIActors

### Adding IIActors

```java
Interpreter mainInterpreter = new Interpreter.Builder()
    .loggerName("main-workflow")
    .team(system)
    .build();

InterpreterIIAR mainActor = new InterpreterIIAR(
    "main-workflow",
    mainInterpreter,
    system
);

system.addIIActor(mainActor);
```

### Retrieving IIActors

```java
IIActorRef<Interpreter> actor = system.getIIActor("main-workflow");
if (actor != null) {
    actor.callByActionName("execCode", "[]");
}
```

### Checking and Removing IIActors

```java
if (system.hasIIActor("main-workflow")) {
    System.out.println("The main workflow actor is registered");
}

system.removeIIActor("main-workflow");

int count = system.getIIActorCount();
System.out.println("Currently managing " + count + " workflow actors");

List<String> names = system.listActorNames();
for (String name : names) {
    System.out.println("Registered actor: " + name);
}
```

## Unix-Style Path Resolution

IIActorSystem supports Unix-style path resolution for actor hierarchies. When actors form parent-child hierarchies, you can reference them using familiar path notation:

| Path | Description |
|------|-------------|
| `.` or `this` | Refers to the current actor (self). |
| `..` | Refers to the parent actor in the hierarchy. |
| `./*` | Refers to all direct children of the current actor. |
| `../*` | Refers to all siblings (all children of the parent). |
| `../sibling` | Refers to a specific sibling by name. |
| `./child*` | Refers to children whose names start with "child". |
| `../web*` | Refers to siblings whose names start with "web". |
| `../*server` | Refers to siblings whose names end with "server". |

### Path Resolution Example

```java
IIActorSystem system = new IIActorSystem("path-demo");

ParentIIAR parent = new ParentIIAR("parent", new Parent(), system);
system.addIIActor(parent);

ChildIIAR child1 = new ChildIIAR("child-1", new Child(), system);
child1.setParentName("parent");
parent.getNamesOfChildren().add("child-1");
system.addIIActor(child1);

ChildIIAR child2 = new ChildIIAR("child-2", new Child(), system);
child2.setParentName("parent");
parent.getNamesOfChildren().add("child-2");
system.addIIActor(child2);

// "." returns the actor itself
List<IIActorRef<?>> self = system.resolveActorPath("child-1", ".");
// Result: [child-1]

// ".." returns the parent actor
List<IIActorRef<?>> parentRef = system.resolveActorPath("child-1", "..");
// Result: [parent]

// "../*" returns all siblings
List<IIActorRef<?>> siblings = system.resolveActorPath("child-1", "../*");
// Result: [child-1, child-2]
```

## Lifecycle Management

### Terminating IIActors

```java
// Close all IIActors managed by this system
system.terminateIIActors();
```

### Full System Termination

```java
// Terminates everything: regular actors, IIActors, and thread pools
system.terminate();
```

## Mixing Regular and IIActors

Because IIActorSystem inherits from ActorSystem, you can use both regular actors and IIActors in the same system:

```java
IIActorSystem system = new IIActorSystem("mixed-system");

// Create a regular actor using the inherited actorOf method
ActorRef<Counter> counter = system.actorOf("counter", new Counter());
counter.tell(c -> c.increment());
int value = counter.ask(c -> c.getValue()).join();

// Create an IIActor for workflow execution
InterpreterIIAR workflow = new InterpreterIIAR("workflow", interpreter, system);
system.addIIActor(workflow);
ActionResult result = workflow.callByActionName("execCode", "[]");
```

## Thread Safety

IIActorSystem maintains the same thread-safety guarantees as ActorSystem. The IIActor registry uses a `ConcurrentHashMap` internally, so all registration, retrieval, and removal operations are safe to call from multiple threads concurrently. Path resolution is also thread-safe.

## Complete Example

```java
public class WorkflowExample {
    public static void main(String[] args) throws Exception {
        IIActorSystem system = new IIActorSystem("workflow-demo", 4);

        Interpreter mainInterpreter = new Interpreter.Builder()
            .loggerName("main-workflow")
            .team(system)
            .build();

        InterpreterIIAR mainActor = new InterpreterIIAR(
            "main",
            mainInterpreter,
            system
        );
        system.addIIActor(mainActor);

        for (int i = 1; i <= 3; i++) {
            WorkerIIAR worker = new WorkerIIAR(
                "worker-" + i,
                new Worker(),
                system
            );
            worker.setParentName("main");
            mainActor.getNamesOfChildren().add("worker-" + i);
            system.addIIActor(worker);
        }

        mainInterpreter.readYaml(
            WorkflowExample.class.getResourceAsStream("/main-workflow.yaml")
        );
        ActionResult result = mainInterpreter.runUntilEnd();
        System.out.println("Workflow completed: " + result.isSuccess());

        // Demonstrate path resolution
        List<IIActorRef<?>> allWorkers = system.resolveActorPath("main", "./*");
        System.out.println("Found " + allWorkers.size() + " worker actors");

        system.terminateIIActors();
        system.terminate();
    }
}
```
