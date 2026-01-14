---
sidebar_position: 1
title: IIActorSystem
---

:::caution Newer Version Available
This is documentation for version 2.11.0. [See the latest version](/docs/pojo-actor/introduction).
:::

# IIActorSystem

The `IIActorSystem` (Interpreter-Interfaced Actor System) extends the base `ActorSystem` to support workflow execution. While the standard ActorSystem manages actors that communicate via type-safe Java lambdas, IIActorSystem adds the capability to manage actors that can be invoked by string-based action names. This string-based invocation is essential for workflow interpreters that read action definitions from YAML or JSON files at runtime.

IIActorSystem maintains full compatibility with regular actors, so you can mix both types in the same application. Regular actors use the inherited methods from ActorSystem, while workflow actors (IIActorRef instances) use the additional methods provided by IIActorSystem.

## Creating an IIActorSystem

Creating an IIActorSystem is similar to creating a regular ActorSystem. You provide a name for the system and optionally specify the thread pool size.

```java
// Create an IIActorSystem with a name.
// The thread pool size defaults to the number of available processors.
IIActorSystem system = new IIActorSystem("workflow-system");

// Create an IIActorSystem with a specific thread pool size.
// Use a larger pool if your workflows perform CPU-intensive operations.
IIActorSystem system = new IIActorSystem("workflow-system", 4);
```

## Managing IIActors

IIActorSystem provides a separate registry for IIActorRef instances, distinct from the regular actor registry inherited from ActorSystem. This separation allows you to manage workflow actors independently while still having access to all the standard ActorSystem features.

### Adding IIActors

After creating an IIActorRef (such as an InterpreterIIAR), you register it with the system using the `addIIActor` method. This makes the actor discoverable by name and enables path-based resolution.

```java
// Create an Interpreter instance with the Builder pattern.
// The Builder allows you to configure the logger name and associate
// the interpreter with the actor system for access to shared resources.
Interpreter mainInterpreter = new Interpreter.Builder()
    .loggerName("main-workflow")
    .team(system)
    .build();

// Wrap the Interpreter in an InterpreterIIAR, which provides
// the string-based action invocation interface.
InterpreterIIAR mainActor = new InterpreterIIAR(
    "main-workflow",    // The actor's name (must be unique)
    mainInterpreter,    // The underlying Interpreter instance
    system              // The IIActorSystem managing this actor
);

// Register the actor with the system so it can be discovered and invoked.
system.addIIActor(mainActor);
```

### Retrieving IIActors

To communicate with an IIActor that was registered elsewhere, use the `getIIActor` method with the actor's name. The method returns null if no actor with that name exists.

```java
// Retrieve an IIActorRef by name.
// The returned reference can be used to invoke actions by name.
IIActorRef<Interpreter> actor = system.getIIActor("main-workflow");
if (actor != null) {
    // The actor exists and can be used
    actor.callByActionName("execCode", "[]");
}
```

### Checking and Removing IIActors

IIActorSystem provides methods to check whether an actor exists and to remove actors that are no longer needed.

```java
// Check whether an IIActor with the given name is registered.
// This is useful before attempting to retrieve or send messages to an actor.
if (system.hasIIActor("main-workflow")) {
    System.out.println("The main workflow actor is registered");
}

// Remove an IIActor from the system when it's no longer needed.
// This does not automatically close the actor - you should close it
// separately if you need to stop its message processing.
system.removeIIActor("main-workflow");

// Get the total count of registered IIActors.
// This is useful for monitoring and debugging.
int count = system.getIIActorCount();
System.out.println("Currently managing " + count + " workflow actors");

// List all registered IIActor names.
// Useful for debugging or implementing administrative interfaces.
List<String> names = system.listActorNames();
for (String name : names) {
    System.out.println("Registered actor: " + name);
}
```

## Unix-Style Path Resolution

One of the most powerful features of IIActorSystem is its support for Unix-style path resolution. When actors form parent-child hierarchies, you can reference them using familiar path notation like `.` (self), `..` (parent), and relative names. This makes workflow definitions more intuitive and enables dynamic actor discovery.

### Supported Path Patterns

The following table describes all supported path patterns. These patterns are used in workflow YAML files to specify which actors should receive actions.

| Path | Description |
|------|-------------|
| `.` or `this` | Refers to the current actor (self). Use this when an actor needs to invoke an action on itself. |
| `..` | Refers to the parent actor in the hierarchy. Each actor can have at most one parent. |
| `./*` | Refers to all direct children of the current actor. Useful for broadcasting an action to all children. |
| `../*` | Refers to all siblings (all children of the parent). Includes the current actor itself. |
| `../sibling` | Refers to a specific sibling by name. The sibling must be a child of the same parent. |
| `./child*` | Refers to children whose names start with "child". Supports glob-style wildcards. |
| `../web*` | Refers to siblings whose names start with "web". |
| `../*server` | Refers to siblings whose names end with "server". |

### Path Resolution Example

The following example demonstrates how path resolution works. We create a parent actor with several child actors and then resolve various paths from one child's perspective.

```java
IIActorSystem system = new IIActorSystem("path-demo");

// Create and register a parent actor.
ParentIIAR parent = new ParentIIAR("parent", new Parent(), system);
system.addIIActor(parent);

// Create child actors and establish the parent-child relationship.
ChildIIAR child1 = new ChildIIAR("child-1", new Child(), system);
child1.setParentName("parent");            // Set the parent reference
parent.getNamesOfChildren().add("child-1"); // Add to parent's children list
system.addIIActor(child1);

ChildIIAR child2 = new ChildIIAR("child-2", new Child(), system);
child2.setParentName("parent");
parent.getNamesOfChildren().add("child-2");
system.addIIActor(child2);

// Now resolve paths from child-1's perspective.

// "." returns the actor itself.
List<IIActorRef<?>> self = system.resolveActorPath("child-1", ".");
// Result: [child-1]

// ".." returns the parent actor.
List<IIActorRef<?>> parentRef = system.resolveActorPath("child-1", "..");
// Result: [parent]

// "../*" returns all siblings (all children of the parent).
List<IIActorRef<?>> siblings = system.resolveActorPath("child-1", "../*");
// Result: [child-1, child-2]
```

### Wildcard Patterns

Wildcard patterns allow you to select multiple actors based on name patterns. This is particularly useful in workflows where you need to apply an action to a group of actors.

```java
// Resolve all children of the parent actor.
List<IIActorRef<?>> allChildren = system.resolveActorPath("parent", "./*");

// Resolve only children whose names start with "worker".
// This would match "worker-1", "worker-2", "worker-primary", etc.
List<IIActorRef<?>> workers = system.resolveActorPath("parent", "./worker*");

// Resolve siblings whose names end with "-handler".
// This would match "event-handler", "error-handler", etc.
List<IIActorRef<?>> handlers = system.resolveActorPath("child-1", "../*-handler");
```

## Lifecycle Management

IIActorSystem provides methods to manage the lifecycle of all IIActors it manages.

### Terminating IIActors

The `terminateIIActors` method closes all registered IIActorRef instances. This stops their message processing loops and releases their resources.

```java
// Close all IIActors managed by this system.
// This should be called when shutting down a workflow engine.
system.terminateIIActors();
```

### Full System Termination

When you're done with the entire system, call `terminate` to clean up both regular actors and IIActors, as well as all thread pools.

```java
// Terminates everything: regular actors, IIActors, and thread pools.
// This inherits the behavior from ActorSystem and adds IIActor cleanup.
system.terminate();
```

## Complete Example

The following example demonstrates a typical workflow setup: creating an IIActorSystem, registering multiple IIActors with parent-child relationships, using path resolution, and properly cleaning up resources.

```java
public class WorkflowExample {
    public static void main(String[] args) throws Exception {
        // Create the IIActorSystem with 4 threads for the work-stealing pool.
        IIActorSystem system = new IIActorSystem("workflow-demo", 4);

        // Create and register the main workflow interpreter.
        // This will be the parent actor that coordinates worker actors.
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

        // Create several worker actors as children of the main actor.
        // In a real workflow, these might be created dynamically based
        // on the workflow definition.
        for (int i = 1; i <= 3; i++) {
            WorkerIIAR worker = new WorkerIIAR(
                "worker-" + i,
                new Worker(),
                system
            );
            // Establish the parent-child relationship.
            worker.setParentName("main");
            mainActor.getNamesOfChildren().add("worker-" + i);
            system.addIIActor(worker);
        }

        // Load and execute a workflow using the main interpreter.
        mainInterpreter.readYaml(
            WorkflowExample.class.getResourceAsStream("/main-workflow.yaml")
        );
        ActionResult result = mainInterpreter.runUntilEnd();
        System.out.println("Workflow completed: " + result.isSuccess());

        // Demonstrate path resolution: find all workers from the main actor's
        // perspective using the "./*" pattern.
        List<IIActorRef<?>> allWorkers = system.resolveActorPath("main", "./*");
        System.out.println("Found " + allWorkers.size() + " worker actors");

        // Clean up all resources.
        system.terminateIIActors();
        system.terminate();
    }
}
```

## Mixing Regular and IIActors

Because IIActorSystem inherits from ActorSystem, you can use both regular actors (with lambda-based communication) and IIActors (with string-based action invocation) in the same system. This is useful when part of your application uses workflows while other parts use traditional actor communication.

```java
IIActorSystem system = new IIActorSystem("mixed-system");

// Create a regular actor using the inherited actorOf method.
// This actor uses lambda-based tell() and ask() for communication.
ActorRef<Counter> counter = system.actorOf("counter", new Counter());
counter.tell(c -> c.increment());
int value = counter.ask(c -> c.getValue()).join();

// Create an IIActor that can be invoked by action name strings.
// This is used by the workflow interpreter for dynamic invocation.
InterpreterIIAR workflow = new InterpreterIIAR("workflow", interpreter, system);
system.addIIActor(workflow);
ActionResult result = workflow.callByActionName("execCode", "[]");
```

## Thread Safety

IIActorSystem maintains the same thread-safety guarantees as ActorSystem. The IIActor registry uses a `ConcurrentHashMap` internally, so all registration, retrieval, and removal operations are safe to call from multiple threads concurrently. Path resolution is also thread-safe and can be performed while other threads are modifying the actor hierarchy.
