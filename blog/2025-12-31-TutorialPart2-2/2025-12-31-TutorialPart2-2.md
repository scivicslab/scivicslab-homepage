---
id: 12-31-TutorialPart2-2
slug: 2025-12-31-TutorialPart2-2
title: "POJO-actor Tutorial Part 2 (Second Half): Creating Workflows"
authors: [devteam]
date: 2025-12-31
tags: [pojo-actor, tutorial]
image: /img/blog-pojo-actor-workflow.svg
---

This tutorial explains the complete process of making ordinary Java classes (POJOs) callable from workflows.

Using turing83 (a Turing machine that outputs the binary representation of 1/3) as an example, we proceed through the following four steps:

1. **Create POJO**: An ordinary Java class with business logic
2. **Create IIActorRef**: An adapter to call the POJO from workflows
3. **Create YAML**: The workflow definition
4. **Execute**: Run the workflow with IIActorSystem

```
[YAML] → [Interpreter] → [IIActorRef] → [POJO]
```
![POJO-actor Workflow](/img/blog-pojo-actor-workflow.svg)

<!-- truncate -->

## Step 1: Creating the POJO

First, create an ordinary Java class containing the business logic you want to manipulate in the workflow. This class knows nothing about workflows. It's just a plain POJO.

### Turing.java (excerpt)

```java
public class Turing {
    int currentPos = 0;
    Tape tape = new Tape();

    /** Initialize the machine */
    public void initMachine() {
        this.currentPos = 0;
        this.tape = new Tape();
    }

    /** Write a value to the tape */
    public void put(String value) {
        this.tape.setWithResizing(this.currentPos, value);
    }

    /** Move the head ("L"=left, "R"=right) */
    public void move(String direction) {
        if (direction.equalsIgnoreCase("L")) {
            this.currentPos--;
        } else if (direction.equalsIgnoreCase("R")) {
            this.currentPos++;
        }
    }

    /** Print the tape contents */
    public void printTape() {
        System.out.println("TAPE\t" + this.tape.toString());
    }
}
```

**Key points**:
- No knowledge of workflows or actors required
- Testable as an ordinary Java class
- Methods have simple inputs and outputs

## Step 2: Creating the IIActorRef

Next, create an adapter (`IIActorRef`) to call the POJO from workflows. This class receives method names and arguments specified in YAML and invokes the actual POJO methods.

### TuringIIAR.java

```java
import com.scivicslab.pojoactor.core.ActionResult;
import com.scivicslab.pojoactor.workflow.IIActorRef;
import com.scivicslab.pojoactor.workflow.IIActorSystem;
import org.json.JSONArray;

public class TuringIIAR extends IIActorRef<Turing> {

    public TuringIIAR(String actorName, Turing turing, IIActorSystem system) {
        super(actorName, turing, system);
    }

    // Parse arguments from JSON array: ["0"] → "0"
    private String parseFirstArg(String args) {
        if (args == null || args.isEmpty() || args.equals("[]")) {
            return "";
        }
        JSONArray array = new JSONArray(args);
        return array.length() > 0 ? array.getString(0) : "";
    }

    @Override
    public ActionResult callByActionName(String actionName, String args) {
        try {
            switch (actionName) {
                case "initMachine":
                    this.tell(t -> t.initMachine()).get();
                    return new ActionResult(true, "Machine initialized");

                case "put":
                    String putValue = parseFirstArg(args);
                    this.tell(t -> t.put(putValue)).get();
                    return new ActionResult(true, "Put " + putValue);

                case "move":
                    String direction = parseFirstArg(args);
                    this.tell(t -> t.move(direction)).get();
                    return new ActionResult(true, "Moved " + direction);

                case "printTape":
                    this.tell(t -> t.printTape()).get();
                    return new ActionResult(true, "Tape printed");

                default:
                    return new ActionResult(false, "Unknown action: " + actionName);
            }
        } catch (Exception e) {
            return new ActionResult(false, "Error: " + e.getMessage());
        }
    }
}
```

### Key Concepts

#### The callByActionName Method

The core part to implement when extending `IIActorRef` is the `callByActionName` method. The first argument `actionName` receives the name specified in YAML's `method:` (e.g., `"put"`, `"move"`), and the second argument `args` receives the YAML's `arguments:` converted to a JSON array string (e.g., `["0"]`, `["R"]`). Within this method, you call the appropriate POJO method based on actionName and return the result as an `ActionResult`.

#### The Role of ActionResult

The return value `ActionResult` controls workflow branching. Returning `ActionResult(true, message)` is considered success, and the next action is executed, or if all actions succeed, transition to the to-state occurs. On the other hand, returning `ActionResult(false, message)` is considered failure, and this Row is immediately aborted, and the next Row with the same from-state is tried. This mechanism enables conditional branching by listing multiple Rows with the same from-state.

#### tell() and ask()

`tell()` is used for method calls that don't use the return value, and `ask()` is used for method calls that use the return value (such as condition checking).

```java
// tell: wait for result but don't use the value
this.tell(t -> t.put("0")).get();

// ask: use the result value
boolean result = this.ask(t -> t.matchCurrentValue("1")).get();
return new ActionResult(result, "match=" + result);
```

Within IIActorRef, simply write `tell(action).get()` or `ask(action).get()`. You don't need to worry about which thread pool executes the action on the IIActorRef side. The Interpreter examines the Action class's `execution` field (ExecutionMode) and selects the appropriate pool. ExecutionMode has two types: `POOL` (execute on ManagedThreadPool, default) and `DIRECT` (direct call). Unless explicitly specified in YAML, POOL is used, so CPU-intensive processing is executed safely.

## Step 3: Creating the YAML Workflow

Once the POJO and IIActorRef are ready, describe the workflow in YAML.

### turing83.yaml

```yaml
name: turing83
steps:
- states: ["0", "1"]
  actions:
  - actor: turing
    method: initMachine
- states: ["1", "2"]
  actions:
  - actor: turing
    method: printTape
- states: ["2", "3"]
  actions:
  - actor: turing
    method: put
    arguments: "0"
  - actor: turing
    method: move
    arguments: "R"
- states: ["3", "4"]
  actions:
  - actor: turing
    method: move
    arguments: "R"
- states: ["4", "5"]
  actions:
  - actor: turing
    method: put
    arguments: "1"
  - actor: turing
    method: move
    arguments: "R"
- states: ["5", "1"]
  actions:
  - actor: turing
    method: move
    arguments: "R"
```

### YAML Structure

| Element | Description |
|---------|-------------|
| `name` | Workflow name |
| `steps` | List of Rows |
| `states` | `[from-state, to-state]` |
| `actions` | List of actions to execute |
| `actor` | IIActorRef name (the name registered in Step 4) |
| `method` | Action name passed to callByActionName |
| `arguments` | Arguments passed to callByActionName (converted to JSON array) |

## Step 4: Creating the Execution Application

Finally, create an application that combines everything and executes it.

### TuringWorkflowApp.java

```java
import com.scivicslab.pojoactor.core.ActionResult;
import com.scivicslab.pojoactor.workflow.IIActorSystem;
import com.scivicslab.pojoactor.workflow.Interpreter;
import java.io.InputStream;

public class TuringWorkflowApp {

    public static void main(String[] args) {
        String yamlPath = "/code/turing83.yaml";
        new TuringWorkflowApp().runWorkflow(yamlPath);
    }

    public void runWorkflow(String yamlPath) {
        // 1. Create IIActorSystem
        IIActorSystem system = new IIActorSystem("turing-system");

        try {
            // 2. Create POJO
            Turing turing = new Turing();

            // 3. Wrap with IIActorRef and register with system
            TuringIIAR turingActor = new TuringIIAR("turing", turing, system);
            system.addIIActor(turingActor);

            // 4. Create Interpreter
            Interpreter interpreter = new Interpreter.Builder()
                    .loggerName("TuringWorkflow")
                    .team(system)
                    .build();

            // 5. Load YAML
            InputStream yamlStream = getClass().getResourceAsStream(yamlPath);
            interpreter.readYaml(yamlStream);

            // 6. Execute workflow (max 50 iterations)
            ActionResult result = interpreter.runUntilEnd(50);

            // 7. Display result
            System.out.println("Result: " + result.getResult());

        } finally {
            // 8. Cleanup
            system.terminateIIActors();
            system.terminate();
        }
    }
}
```

### Execution Flow

```
1. Create IIActorSystem
       ↓
2. Create POJO (Turing)
       ↓
3. Wrap with IIActorRef (TuringIIAR)
   └─ Register with name "turing"
       ↓
4. Create Interpreter
   └─ Reference IIActorSystem
       ↓
5. Load YAML
   └─ actor: "turing" → Reference registered TuringIIAR
       ↓
6. Execute with runUntilEnd()
   └─ Repeat state transitions
       ↓
7. Finish
```

## How to Run

```bash
# Build POJO-actor
git clone https://github.com/scivicslab/POJO-actor
cd POJO-actor
mvn clean install

# Build and run actor-WF-examples
git clone https://github.com/scivicslab/actor-WF-examples
cd actor-WF-examples
mvn compile
mvn exec:java -Dexec.mainClass="com.scivicslab.turing.TuringWorkflowApp" -Dexec.args="turing83"
```

**Output:**
```
Loading workflow from: /code/turing83.yaml
Workflow loaded successfully
Executing workflow...

TAPE    0    value
TAPE    0    value    0 1
TAPE    0    value    0 1 0 1
TAPE    0    value    0 1 0 1 0 1
...

Workflow finished: Maximum iterations (50) exceeded
```

## Summary

Steps to create a workflow:

| Step | What to Create | Role |
|------|----------------|------|
| 1 | POJO | Business logic (workflow-independent) |
| 2 | IIActorRef | Bridge between YAML and POJO |
| 3 | YAML | Workflow definition |
| 4 | App | Assemble and execute everything |

This structure separates business logic (POJO) from workflow control (YAML), allowing each to be tested and modified independently.

---

## References

- **Documentation**: [POJO-actor Docs](https://scivicslab.com/docs/pojo-actor/introduction)
- **GitHub**: [scivicslab/POJO-actor](https://github.com/scivicslab/POJO-actor)
- **Javadoc**: [API Reference](https://scivicslab.github.io/POJO-actor/)
- **actor-WF-examples**: [https://github.com/scivicslab/actor-WF-examples](https://github.com/scivicslab/actor-WF-examples)
- **POJO-actor v1.0 Introduction (blog)**: [A Lightweight Actor Model Library for Java](/blog/2025-12-22-pojo-actor-v1-introduction)
- **Tutorial Part 2-1 (blog)**: [Workflow Language Basics](/blog/2025-12-30-TutorialPart2-1)

