---
id: action-implementation
title: "Action Implementation Methods"
sidebar_position: 4
---

# Action Implementation Methods

## Problem Definition

### Background: Calling Java Methods from Workflow

In workflow YAML, actor methods are called by specifying them as strings:

```yaml
- actor: turing
  method: put
  arguments: "e"
```

A mechanism is needed to call actual Java methods from this `method: put` string.

### Two Implementation Methods

POJO-actor provides two implementation methods:

| Method | Inheritance/Implementation | Use Case |
|--------|---------------------------|----------|
| `@Action` annotation | Extends `IIActorRef<T>` | Operate POJOs from workflow |
| `CallableByActionName` interface | Implements interface | Plugins, dynamic loading |

### Problem: Which One to Choose?

When creating a new actor, there's no clear criteria for choosing between these methods.

---

## How to do it

### Selection Criteria

| Requirement | Recommendation |
|-------------|----------------|
| Want to operate existing POJO from workflow | `@Action` |
| Want to protect POJO state between actors (exclusive control) | `@Action` |
| Want to load dynamically as plugin | `CallableByActionName` |
| Actors created during workflow execution | `CallableByActionName` |
| Want to use with Native Image (GraalVM) | `CallableByActionName` |

### @Action Annotation Method

A method that wraps POJOs to make them operable from workflows.

```java
// Step 1: POJO (ordinary class that doesn't know about workflows)
public class Turing {
    private int currentPos = 0;
    private Tape tape = new Tape();

    public void put(String value) {
        this.tape.set(this.currentPos, value);
    }

    public void move(String direction) {
        if ("R".equals(direction)) currentPos++;
        else if ("L".equals(direction)) currentPos--;
    }
}
```

```java
// Step 2: Wrap with IIActorRef
public class TuringIIAR extends IIActorRef<Turing> {

    public TuringIIAR(String name, Turing pojo, IIActorSystem system) {
        super(name, pojo, system);
    }

    @Action("put")
    public ActionResult put(String args) {
        String value = ActionArgs.getFirst(args);
        this.object.put(value);  // Call POJO method
        return new ActionResult(true, "Put " + value);
    }

    @Action("move")
    public ActionResult move(String args) {
        String direction = ActionArgs.getFirst(args);
        this.object.move(direction);
        return new ActionResult(true, "Moved " + direction);
    }
}
```

```java
// Step 3: Register with system
Turing turing = new Turing();
TuringIIAR actor = new TuringIIAR("turing", turing, system);
system.addIIActor(actor);
```

**Features:**
- Access POJO via `this.object`
- Thread-safe operations possible with `tell()`/`ask()`
- `@Action` methods auto-detected via reflection

### CallableByActionName Method

A method that implements an interface and dispatches actions via switch statement.

```java
public class MyPlugin implements CallableByActionName, ActorSystemAware {

    private IIActorSystem system;
    private Connection connection;

    @Override
    public void setActorSystem(IIActorSystem system) {
        this.system = system;
    }

    @Override
    public ActionResult callByActionName(String actionName, String args) {
        try {
            return switch (actionName) {
                case "connect" -> connect(args);
                case "query" -> query(args);
                case "disconnect" -> disconnect();
                default -> new ActionResult(false, "Unknown: " + actionName);
            };
        } catch (Exception e) {
            return new ActionResult(false, "Error: " + e.getMessage());
        }
    }

    private ActionResult connect(String args) { /* ... */ }
    private ActionResult query(String args) { /* ... */ }
    private ActionResult disconnect() { /* ... */ }
}
```

**Features:**
- Explicit dispatch via switch statement
- No reflection needed (Native Image compatible)
- Can be dynamically created with `loader.createChild`

---

## Under the hood

### @Action Internal Behavior

When `callByActionName` is called on the `IIActorRef` base class, it processes in this order:

```
1. Search for @Action methods
   └── Scan both subclass and wrapped object
   └── Find method whose annotation value matches actionName

2. If hit, invoke
   └── Call method via reflection
   └── Return ActionResult

3. If no hit, fallback
   └── Try subclass override
   └── Try built-in actions (putJson, etc.)
```

This allows mixing `@Action` and switch statements.

### Dynamic Loading with CallableByActionName

Flow when dynamically creating plugins with `loader.createChild` action:

```yaml
- actor: loader
  method: createChild
  arguments: ["ROOT", "myPlugin", "com.example.MyPlugin"]
```

```
1. LoaderIIAR loads the class
   └── Load class from JAR via URLClassLoader

2. Create instance
   └── Class.getDeclaredConstructor().newInstance()

3. Initialize if ActorSystemAware
   └── Call setActorSystem(system)

4. Register in actor tree
   └── Register as child of parent actor
```

### Exclusive Control Differences

| Method | Exclusive Control |
|--------|-------------------|
| `@Action` + `tell()`/`ask()` | Access to POJO is serialized |
| `CallableByActionName` | Caller's responsibility (implement if needed) |

With the `@Action` method, operating on POJO via lambda like `tell(t -> t.put(value))` guarantees exclusive control through POJO-actor's mailbox mechanism.

With the `CallableByActionName` method, concurrent access to fields within the plugin must be managed by the developer.

### Native Image Compatibility

| Method | Native Image |
|--------|-------------|
| `@Action` | Reflection configuration required |
| `CallableByActionName` | Works as-is |

In GraalVM Native Image, classes using reflection must be declared in advance in a configuration file. The `CallableByActionName` method doesn't use reflection, so it can be compiled to Native Image without additional configuration.

### Design Guideline Summary

```
Want to create an actor
    │
    ├─ Want to wrap a POJO?
    │      │
    │      ├─ Yes → @Action method
    │      │         - Protect POJO state
    │      │         - Exclusive control with tell()/ask()
    │      │
    │      └─ No → CallableByActionName method
    │
    ├─ Need dynamic loading?
    │      │
    │      └─ Yes → CallableByActionName method
    │                - Create with loader.createChild
    │                - Initialize with ActorSystemAware
    │
    └─ Use with Native Image?
           │
           └─ Yes → CallableByActionName method
                     - No reflection configuration needed
```
