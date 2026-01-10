---
sidebar_position: 2
title: IIActorRef
---

# IIActorRef

`IIActorRef<T>` (Interpreter-Interfaced Actor Reference) is an abstract class that bridges the POJO-actor framework with workflow interpreters. It extends `ActorRef<T>` and implements `CallableByActionName`, enabling actors to be invoked dynamically using string-based action names.

## Why IIActorRef?

Standard `ActorRef` uses Java lambdas for type-safe method invocation:

```java
// Regular ActorRef - compile-time type safety
actorRef.tell(actor -> actor.doWork());
```

For workflow interpreters that read action names from YAML/JSON files, we need string-based invocation:

```java
// IIActorRef - runtime invocation by action name
iiActorRef.callByActionName("doWork", "[]");
```

## Class Hierarchy

```
ActorRef<T>
    └── IIActorRef<T> (abstract)
            └── InterpreterIIAR
            └── YourCustomIIAR
```

## Creating a Custom IIActorRef

To create an interpreter-interfaced actor, extend `IIActorRef` and implement `callByActionName`:

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

Actions return an `ActionResult` indicating success or failure:

```java
// Success
return new ActionResult(true, "Operation completed");

// Failure
return new ActionResult(false, "Error message");
```

The workflow interpreter uses the result to determine state transitions.

## Argument Handling

Arguments are passed as a JSON string. Common patterns:

### No Arguments

```java
// YAML: arguments: []
// args = "[]"
case "start":
    this.tell(Worker::start).get();
    return new ActionResult(true, "started");
```

### Single Argument

```java
// YAML: arguments: ["config.json"]
// args = "[\"config.json\"]"
case "loadConfig":
    JSONArray arr = new JSONArray(args);
    String path = arr.getString(0);
    this.tell(w -> w.loadConfig(path)).get();
    return new ActionResult(true, "config loaded");
```

### Multiple Arguments

```java
// YAML: arguments: ["server1", 8080, true]
// args = "[\"server1\",8080,true]"
case "connect":
    JSONArray arr = new JSONArray(args);
    String host = arr.getString(0);
    int port = arr.getInt(1);
    boolean ssl = arr.getBoolean(2);
    this.tell(w -> w.connect(host, port, ssl)).get();
    return new ActionResult(true, "connected");
```

### Map Arguments

```java
// YAML:
//   arguments:
//     retries: 3
//     timeout: 5000
// args = "{\"retries\":3,\"timeout\":5000}"
case "configure":
    JSONObject obj = new JSONObject(args);
    int retries = obj.getInt("retries");
    int timeout = obj.getInt("timeout");
    this.tell(w -> w.configure(retries, timeout)).get();
    return new ActionResult(true, "configured");
```

## Using with Workflows

Once registered with `IIActorSystem`, the actor can be referenced in YAML workflows:

```yaml
name: example-workflow
steps:
  - states: ["0", "1"]
    actions:
      - actor: worker
        method: loadConfig
        arguments: ["settings.json"]

  - states: ["1", "2"]
    actions:
      - actor: worker
        method: process

  - states: ["2", "end"]
    actions:
      - actor: worker
        method: getStatus
```

## Parent-Child Relationships

IIActors support hierarchical relationships for path resolution:

```java
IIActorSystem system = new IIActorSystem("demo");

// Create parent
ParentIIAR parent = new ParentIIAR("parent", new Parent(), system);
system.addIIActor(parent);

// Create child with parent reference
ChildIIAR child = new ChildIIAR("child-1", new Child(), system);
child.setParentName("parent");
parent.getNamesOfChildren().add("child-1");
system.addIIActor(child);
```

## Built-in IIActorRef: InterpreterIIAR

POJO-actor provides `InterpreterIIAR` for workflow execution:

```java
Interpreter interpreter = new Interpreter.Builder()
    .loggerName("main")
    .team(system)
    .build();

InterpreterIIAR interpreterActor = new InterpreterIIAR("main", interpreter, system);
system.addIIActor(interpreterActor);
```

Supported actions in `InterpreterIIAR`:

| Action | Arguments | Description |
|--------|-----------|-------------|
| `readYaml` | File path | Load YAML workflow |
| `readJson` | File path | Load JSON workflow |
| `execCode` | None | Execute one step |
| `runUntilEnd` | [maxIterations] | Run until "end" state |
| `call` | [workflowFile] | Execute subworkflow |
| `apply` | JSON action definition | Apply action to children |
| `sleep` | Milliseconds | Sleep for duration |
| `print` | Message | Print to stdout |
| `doNothing` | Message | No-op, return message |

## Complete Example

```java
// 1. Define the POJO
class Calculator {
    private double value = 0;

    public void add(double n) { value += n; }
    public void multiply(double n) { value *= n; }
    public double getValue() { return value; }
    public void reset() { value = 0; }
}

// 2. Create the IIActorRef
class CalculatorIIAR extends IIActorRef<Calculator> {

    public CalculatorIIAR(String name, Calculator calc, IIActorSystem system) {
        super(name, calc, system);
    }

    @Override
    public ActionResult callByActionName(String action, String args) {
        try {
            JSONArray arr = args.equals("[]") ? new JSONArray() : new JSONArray(args);

            switch (action) {
                case "add":
                    double addVal = arr.getDouble(0);
                    this.tell(c -> c.add(addVal)).get();
                    return new ActionResult(true, "added " + addVal);

                case "multiply":
                    double mulVal = arr.getDouble(0);
                    this.tell(c -> c.multiply(mulVal)).get();
                    return new ActionResult(true, "multiplied by " + mulVal);

                case "getValue":
                    double result = this.ask(Calculator::getValue).get();
                    return new ActionResult(true, String.valueOf(result));

                case "reset":
                    this.tell(Calculator::reset).get();
                    return new ActionResult(true, "reset");

                default:
                    return new ActionResult(false, "Unknown: " + action);
            }
        } catch (Exception e) {
            return new ActionResult(false, e.getMessage());
        }
    }
}

// 3. Use in workflow
IIActorSystem system = new IIActorSystem("calc-demo");
CalculatorIIAR calc = new CalculatorIIAR("calc", new Calculator(), system);
system.addIIActor(calc);

// Direct invocation
calc.callByActionName("add", "[10]");
calc.callByActionName("multiply", "[3]");
ActionResult result = calc.callByActionName("getValue", "[]");
System.out.println("Result: " + result.getResult()); // 30.0
```

## Thread Safety

- `callByActionName` can be invoked concurrently from multiple threads
- Use `tell()` and `ask()` for thread-safe state access (they queue messages)
- For immediate concurrent access, ensure the underlying POJO is thread-safe
