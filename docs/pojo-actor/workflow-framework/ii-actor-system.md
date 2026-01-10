---
sidebar_position: 1
title: IIActorSystem
---

# IIActorSystem

`IIActorSystem` (Interpreter-Interfaced Actor System) extends `ActorSystem` to support workflow execution. It manages `IIActorRef` instances alongside regular actors and provides Unix-style path resolution for actor references.

## Creating an IIActorSystem

```java
// Create with a name
IIActorSystem system = new IIActorSystem("workflow-system");

// Create with specific thread pool size
IIActorSystem system = new IIActorSystem("workflow-system", 4);
```

## Managing IIActors

`IIActorSystem` can manage both regular `ActorRef` instances and `IIActorRef` instances for workflow execution.

### Adding IIActors

```java
InterpreterIIAR interpreter = new InterpreterIIAR(
    "main-workflow",
    new Interpreter.Builder().loggerName("main").team(system).build(),
    system
);
system.addIIActor(interpreter);
```

### Retrieving IIActors

```java
IIActorRef<Interpreter> actor = system.getIIActor("main-workflow");
```

### Checking and Removing IIActors

```java
// Check existence
if (system.hasIIActor("main-workflow")) {
    // Actor exists
}

// Remove an IIActor
system.removeIIActor("main-workflow");

// Get count
int count = system.getIIActorCount();

// List all IIActor names
List<String> names = system.listActorNames();
```

## Unix-Style Path Resolution

`IIActorSystem` provides path-based actor resolution, enabling workflows to reference actors using familiar Unix path notation:

| Path | Description |
|------|-------------|
| `.` or `this` | Self (the current actor) |
| `..` | Parent actor |
| `./*` | All children of self |
| `../*` | All siblings (children of parent) |
| `../sibling` | Specific sibling by name |
| `./child*` | Children matching wildcard |
| `../web*` | Siblings starting with "web" |
| `../*server` | Siblings ending with "server" |

### Path Resolution Example

```java
// Setup parent-child relationship
IIActorRef<?> parent = system.getIIActor("parent");
IIActorRef<?> child1 = system.getIIActor("child-1");
IIActorRef<?> child2 = system.getIIActor("child-2");

// Resolve paths from child-1's perspective
List<IIActorRef<?>> self = system.resolveActorPath("child-1", ".");
// Returns: [child-1]

List<IIActorRef<?>> parent = system.resolveActorPath("child-1", "..");
// Returns: [parent]

List<IIActorRef<?>> siblings = system.resolveActorPath("child-1", "../*");
// Returns: [child-1, child-2]
```

### Wildcard Patterns

```java
// All children
List<IIActorRef<?>> children = system.resolveActorPath("parent", "./*");

// Children starting with "worker"
List<IIActorRef<?>> workers = system.resolveActorPath("parent", "./worker*");

// Siblings ending with "-handler"
List<IIActorRef<?>> handlers = system.resolveActorPath("child-1", "../*-handler");
```

## Lifecycle Management

### Terminating IIActors

```java
// Terminate all IIActors
system.terminateIIActors();
```

### Full System Termination

```java
// Terminates both regular actors and IIActors
system.terminate();
```

## Complete Example

```java
public class WorkflowExample {
    public static void main(String[] args) throws Exception {
        // Create the IIActorSystem
        IIActorSystem system = new IIActorSystem("workflow-demo", 4);

        // Create and register the main workflow interpreter
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

        // Create worker actors
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

        // Load and execute workflow
        mainInterpreter.readYaml(
            WorkflowExample.class.getResourceAsStream("/main-workflow.yaml")
        );
        mainInterpreter.runUntilEnd();

        // Path resolution example
        List<IIActorRef<?>> allWorkers = system.resolveActorPath("main", "./*");
        System.out.println("Worker count: " + allWorkers.size());

        // Cleanup
        system.terminateIIActors();
        system.terminate();
    }
}
```

## Mixing Regular and IIActors

`IIActorSystem` inherits all `ActorSystem` functionality, so you can use both actor types:

```java
IIActorSystem system = new IIActorSystem("mixed-system");

// Regular actor (lambda-based communication)
ActorRef<Counter> counter = system.actorOf("counter", new Counter());
counter.tell(c -> c.increment());

// IIActor (string-based action invocation for workflows)
InterpreterIIAR workflow = new InterpreterIIAR("workflow", interpreter, system);
system.addIIActor(workflow);
workflow.callByActionName("execCode", "[]");
```

## Thread Safety

- Actor registration and removal are thread-safe (uses `ConcurrentHashMap`)
- Path resolution is thread-safe
- Multiple threads can query and modify actors concurrently
