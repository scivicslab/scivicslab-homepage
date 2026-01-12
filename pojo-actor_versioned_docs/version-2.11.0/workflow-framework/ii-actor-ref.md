---
sidebar_position: 2
title: IIActorRef
---

:::caution Newer Version Available
This is documentation for version 2.11.0. [See the latest version](/docs/pojo-actor/introduction).
:::

# IIActorRef

The `IIActorRef<T>` (Interpreter-Interfaced Actor Reference) is an abstract class that bridges the gap between POJO-actor's type-safe lambda-based communication and the string-based action invocation needed by workflow interpreters. While a standard `ActorRef<T>` lets you call methods using Java lambdas that are checked at compile time, `IIActorRef<T>` adds the ability to invoke methods by their string names, which is essential for executing workflows defined in YAML or JSON files.

IIActorRef extends ActorRef and implements the `CallableByActionName` interface. This means it inherits all the standard actor capabilities (tell, ask, tellNow, askNow) while adding the `callByActionName` method for dynamic invocation.

## Why IIActorRef is Needed

Standard ActorRef uses Java lambdas for type-safe method invocation. This works well when you know at compile time which methods you want to call. The lambda approach catches type errors during compilation and provides excellent IDE support.

```java
// Regular ActorRef - the compiler verifies that doWork() exists on MyActor.
// This is type-safe but requires knowing the method at compile time.
actorRef.tell(actor -> actor.doWork());
```

However, workflow interpreters read action definitions from external files. They don't know which methods to call until runtime when they parse the workflow YAML or JSON. For this scenario, we need string-based invocation where the method name is provided as data rather than code.

```java
// IIActorRef - the method name is provided as a string at runtime.
// This enables workflow interpreters to invoke methods dynamically.
iiActorRef.callByActionName("doWork", "[]");
```

## Class Hierarchy

IIActorRef sits between the base ActorRef and concrete implementations like InterpreterIIAR. When you create your own workflow actors, you extend IIActorRef and implement the `callByActionName` method to define which actions your actor supports.

```
ActorRef<T>
    └── IIActorRef<T> (abstract)
            ├── InterpreterIIAR (built-in for workflow execution)
            └── YourCustomIIAR (your custom workflow actors)
```

## Creating a Custom IIActorRef

To create an actor that can participate in workflows, you extend IIActorRef and implement the `callByActionName` method. This method receives an action name and arguments as strings, and you implement the logic to dispatch to the appropriate method on your POJO.

The following example shows a Worker actor that supports three actions: `process`, `setConfig`, and `getStatus`.

```java
public class WorkerIIAR extends IIActorRef<Worker> {

    // Constructor for standalone use (without an actor system).
    public WorkerIIAR(String actorName, Worker worker) {
        super(actorName, worker);
    }

    // Constructor that associates the actor with an IIActorSystem.
    // This enables access to work-stealing pools and other shared resources.
    public WorkerIIAR(String actorName, Worker worker, IIActorSystem system) {
        super(actorName, worker, system);
    }

    @Override
    public ActionResult callByActionName(String actionName, String args) {
        try {
            switch (actionName) {
                case "process":
                    // For actions that don't need arguments, simply call the method.
                    // Using tell() ensures the action goes through the actor's queue.
                    this.tell(Worker::process).get();
                    return new ActionResult(true, "processed");

                case "setConfig":
                    // Parse arguments from the JSON array string.
                    // The workflow might specify: arguments: ["key", "value"]
                    JSONArray argsArray = new JSONArray(args);
                    String key = argsArray.getString(0);
                    String value = argsArray.getString(1);
                    this.tell(w -> w.setConfig(key, value)).get();
                    return new ActionResult(true, "config set");

                case "getStatus":
                    // For queries, use ask() to get a return value.
                    String status = this.ask(Worker::getStatus).get();
                    return new ActionResult(true, status);

                default:
                    // Return failure for unknown actions so the workflow
                    // interpreter knows this action wasn't handled.
                    return new ActionResult(false, "Unknown action: " + actionName);
            }
        } catch (Exception e) {
            // Catch exceptions and return them as ActionResult failures.
            // This allows the workflow interpreter to handle errors gracefully.
            return new ActionResult(false, "Error: " + e.getMessage());
        }
    }
}
```

## ActionResult

The `callByActionName` method returns an `ActionResult` that indicates whether the action succeeded or failed. The workflow interpreter uses this result to determine how to proceed—typically transitioning to the next state on success, or trying alternative paths on failure.

ActionResult contains two fields: a boolean indicating success, and a string message that can carry either a success value or an error description.

```java
// Return success with a descriptive message or result value.
return new ActionResult(true, "Operation completed successfully");

// Return failure with an error message.
// The workflow interpreter may use this to choose an alternative path.
return new ActionResult(false, "File not found: config.yaml");
```

## Argument Handling

Arguments are passed to `callByActionName` as a JSON string. The format depends on how the action is defined in the workflow YAML file. Your implementation needs to parse this string appropriately based on the expected argument structure.

### No Arguments

When an action takes no arguments, the args string will be an empty JSON array `[]`.

```yaml
# In workflow YAML:
actions:
  - actor: worker
    method: start
    arguments: []
```

```java
// In your callByActionName implementation:
case "start":
    // No need to parse args - just call the method.
    this.tell(Worker::start).get();
    return new ActionResult(true, "started");
```

### Single Argument

For a single argument, the workflow YAML can specify it directly or as a single-element array. Either way, you receive it as a JSON array string.

```yaml
# In workflow YAML:
actions:
  - actor: worker
    method: loadFile
    arguments: ["config.json"]
```

```java
case "loadFile":
    // Parse the JSON array and extract the first (and only) element.
    JSONArray arr = new JSONArray(args);
    String path = arr.getString(0);
    this.tell(w -> w.loadFile(path)).get();
    return new ActionResult(true, "file loaded");
```

### Multiple Arguments

When an action needs multiple arguments, they're passed as elements in a JSON array. Each element can be of different types (strings, numbers, booleans).

```yaml
# In workflow YAML:
actions:
  - actor: worker
    method: connect
    arguments: ["server1.example.com", 8080, true]
```

```java
case "connect":
    // Parse each argument according to its expected type.
    JSONArray arr = new JSONArray(args);
    String host = arr.getString(0);   // "server1.example.com"
    int port = arr.getInt(1);          // 8080
    boolean ssl = arr.getBoolean(2);   // true
    this.tell(w -> w.connect(host, port, ssl)).get();
    return new ActionResult(true, "connected to " + host);
```

### Map Arguments

For complex configurations, workflows can specify arguments as a JSON object (map). This is useful when you have many optional parameters or when the argument structure is more complex.

```yaml
# In workflow YAML:
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
    // Parse as a JSON object to access named properties.
    JSONObject obj = new JSONObject(args);
    int retries = obj.getInt("retries");
    int timeout = obj.getInt("timeout");
    boolean verbose = obj.optBoolean("verbose", false);  // Optional with default
    this.tell(w -> w.configure(retries, timeout, verbose)).get();
    return new ActionResult(true, "configured");
```

## Using IIActorRef in Workflows

Once you've created an IIActorRef implementation and registered it with an IIActorSystem, it can be referenced by name in workflow YAML files. The workflow interpreter will look up the actor by name and call `callByActionName` with the specified method and arguments.

```yaml
name: example-workflow
steps:
  # First step: load configuration
  - states: ["0", "1"]
    actions:
      - actor: worker           # References the registered IIActorRef name
        method: loadFile        # Passed to callByActionName as actionName
        arguments: ["settings.json"]  # Passed as JSON array string

  # Second step: process the data
  - states: ["1", "2"]
    actions:
      - actor: worker
        method: process
        # No arguments needed for this action

  # Final step: check the result
  - states: ["2", "end"]
    actions:
      - actor: worker
        method: getStatus
```

## Parent-Child Relationships

IIActorRef instances can form hierarchies where actors have parent and child relationships. This enables the Unix-style path resolution in workflows (like `..` for parent and `./*` for children).

To establish a parent-child relationship, you set the parent's name on the child and add the child's name to the parent's children list.

```java
IIActorSystem system = new IIActorSystem("demo");

// Create the parent actor.
ParentIIAR parent = new ParentIIAR("parent", new Parent(), system);
system.addIIActor(parent);

// Create a child actor and establish the relationship.
ChildIIAR child = new ChildIIAR("child-1", new Child(), system);
child.setParentName("parent");                  // Tell the child who its parent is
parent.getNamesOfChildren().add("child-1");     // Tell the parent about its child
system.addIIActor(child);

// Now the workflow can reference "../" from child-1 to reach parent,
// or "./*" from parent to reach all children.
```

## Built-in IIActorRef: InterpreterIIAR

POJO-actor includes `InterpreterIIAR`, a ready-to-use IIActorRef implementation that wraps an Interpreter instance. This is the primary way to execute workflows and is sufficient for most use cases.

```java
// Create an Interpreter with the Builder pattern.
Interpreter interpreter = new Interpreter.Builder()
    .loggerName("main")
    .team(system)
    .build();

// Wrap it in InterpreterIIAR for workflow execution.
InterpreterIIAR interpreterActor = new InterpreterIIAR("main", interpreter, system);
system.addIIActor(interpreterActor);
```

InterpreterIIAR supports these built-in actions:

| Action | Arguments | Description |
|--------|-----------|-------------|
| `readYaml` | File path | Loads a YAML workflow definition from the specified file path. |
| `readJson` | File path | Loads a JSON workflow definition from the specified file path. |
| `execCode` | None | Executes a single step of the loaded workflow and returns the result. |
| `runUntilEnd` | [maxIterations] | Runs the workflow until it reaches the "end" state or hits the iteration limit. |
| `call` | [workflowFile] | Creates a child interpreter, loads the specified workflow, runs it to completion, and removes the child. |
| `apply` | JSON action definition | Applies an action to existing child actors matching a pattern. |
| `sleep` | Milliseconds | Pauses execution for the specified duration. |
| `print` | Message | Prints the message to standard output. |
| `doNothing` | Message | Does nothing and returns the message as the result (useful for default paths). |

## Complete Example

The following example demonstrates the complete process of creating a custom IIActorRef, registering it, and using it both programmatically and in a workflow context.

```java
// 1. Define the POJO that contains the business logic.
// This is a plain Java class with no special requirements.
class Calculator {
    private double value = 0;

    public void add(double n) { value += n; }
    public void multiply(double n) { value *= n; }
    public double getValue() { return value; }
    public void reset() { value = 0; }
}

// 2. Create the IIActorRef that wraps the POJO.
// This class maps string action names to method calls.
class CalculatorIIAR extends IIActorRef<Calculator> {

    public CalculatorIIAR(String name, Calculator calc, IIActorSystem system) {
        super(name, calc, system);
    }

    @Override
    public ActionResult callByActionName(String action, String args) {
        try {
            // Parse arguments - handle empty array case
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
                    return new ActionResult(true, "reset to 0");

                default:
                    return new ActionResult(false, "Unknown action: " + action);
            }
        } catch (Exception e) {
            return new ActionResult(false, e.getMessage());
        }
    }
}

// 3. Use the IIActorRef in your application.
IIActorSystem system = new IIActorSystem("calc-demo");
CalculatorIIAR calc = new CalculatorIIAR("calc", new Calculator(), system);
system.addIIActor(calc);

// Call actions programmatically using callByActionName.
calc.callByActionName("add", "[10]");           // value = 10
calc.callByActionName("multiply", "[3]");       // value = 30
ActionResult result = calc.callByActionName("getValue", "[]");
System.out.println("Result: " + result.getResult());  // Prints: 30.0

// The same actor can be used from workflow YAML:
// - actor: calc
//   method: add
//   arguments: [10]
```

## Thread Safety

Because IIActorRef extends ActorRef, it inherits the same thread-safety guarantees. When you use `tell()` and `ask()` within your `callByActionName` implementation, the operations go through the actor's message queue and are processed sequentially.

The `callByActionName` method itself can be called from multiple threads concurrently. If your implementation uses `tell()` and `ask()` (as recommended), thread safety is handled automatically. However, if you access the POJO directly without going through tell/ask, you need to ensure thread safety yourself.
