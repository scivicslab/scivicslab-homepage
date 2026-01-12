---
sidebar_position: 4
title: Workflow Accumulator
---

# Workflow Accumulator

The `AccumulatorIIAR` class provides an IIActorRef wrapper for the Accumulator interface, enabling Accumulators to be used in YAML-based workflows. This allows workflow definitions to collect results from multiple actors or nodes and aggregate them without writing any Java code for the accumulation logic.

When working with workflows that execute actions across multiple nodes or child actors, you often need to gather and consolidate the results. The Workflow Accumulator provides a standardized way to do this through simple workflow actions like `add`, `getSummary`, `getCount`, and `clear`.

## Creating a Workflow Accumulator

The easiest way to create a Workflow Accumulator is through the `AccumulatorFactory`, which handles both the creation of the underlying Accumulator and its registration with the actor system.

### Using AccumulatorFactory

The factory method creates an AccumulatorIIAR with the specified type and automatically registers it with the actor system.

```java
IIActorSystem system = new IIActorSystem("workflow-system");

// Create and register a table accumulator with the default name "accumulator"
AccumulatorIIAR acc = AccumulatorFactory.createActor("table", system);

// Create and register with a custom name
AccumulatorIIAR namedAcc = AccumulatorFactory.createActor("buffered", "results", system);
```

The factory supports four accumulator types:

| Type | Implementation | Description |
|------|---------------|-------------|
| `"streaming"` | StreamingAccumulator | Prints results immediately as they arrive |
| `"buffered"` | BufferedAccumulator | Stores results and outputs on getSummary() |
| `"table"` | TableAccumulator | Formats results as a comparison table |
| `"json"` | JsonAccumulator | Outputs results in JSON format |

### Manual Creation

If you need more control over the accumulator configuration, you can create it manually:

```java
// Create a custom accumulator (e.g., TableAccumulator with custom column width)
Accumulator customAccumulator = new TableAccumulator(40);

// Wrap it in an IIActorRef
AccumulatorIIAR accActor = new AccumulatorIIAR("results", customAccumulator, system);

// Register with the system
system.addIIActor(accActor);
```

## Supported Actions

AccumulatorIIAR implements `callByActionName` to support the following actions in workflows:

### add

The `add` action adds a single result to the accumulator. It requires three fields in the arguments: `source`, `type`, and `data`.

```yaml
actions:
  - actor: accumulator
    method: add
    arguments:
      source: "node-web-01"    # Where the result came from
      type: "cpu"              # Category of the result
      data: "Intel Xeon E5"    # The actual data
```

The `source` field typically contains the name of the actor or node that generated the result. The `type` field categorizes the data (such as "cpu", "memory", or "disk"). The `data` field contains the actual information as a string.

### getSummary

The `getSummary` action returns a formatted summary of all accumulated results. The format depends on which accumulator type was created.

```yaml
actions:
  - actor: accumulator
    method: getSummary
```

This action returns the summary as the ActionResult's result string, which can be used by the workflow interpreter or logged.

### getCount

The `getCount` action returns the number of results that have been added to the accumulator.

```yaml
actions:
  - actor: accumulator
    method: getCount
```

### clear

The `clear` action removes all accumulated results, resetting the accumulator to its initial state.

```yaml
actions:
  - actor: accumulator
    method: clear
```

## Using in Workflows

The Workflow Accumulator is particularly useful for collecting results from distributed operations. A typical pattern involves creating child actors, executing operations on each, having them report results to the accumulator, and then retrieving the summary.

### Example: Collecting Node Information

The following workflow demonstrates collecting system information from multiple nodes and presenting a summary table.

```yaml
name: collect-node-info
steps:
  # Initialize the accumulator
  - states: ["0", "1"]
    label: init
    actions:
      - actor: this
        method: print
        arguments: "Starting node information collection..."

  # Apply getCpuInfo action to all child nodes
  # Each node reports its CPU to the accumulator
  - states: ["1", "2"]
    label: collect-cpu
    actions:
      - actor: this
        method: apply
        arguments:
          actor: "./node-*"
          method: reportCpu
          arguments: []

  # Apply getMemoryInfo action to all child nodes
  - states: ["2", "3"]
    label: collect-memory
    actions:
      - actor: this
        method: apply
        arguments:
          actor: "./node-*"
          method: reportMemory
          arguments: []

  # Get and display the summary
  - states: ["3", "4"]
    label: show-results
    actions:
      - actor: accumulator
        method: getSummary

  # Print completion message
  - states: ["4", "end"]
    label: done
    actions:
      - actor: this
        method: print
        arguments: "Collection complete!"
```

In this workflow, the child actors (node-*) are assumed to have `reportCpu` and `reportMemory` methods that add their information to the accumulator.

### Worker Actor Implementation

The child actors need to add their results to the accumulator. Here's how a node actor might implement this:

```java
public class NodeIIAR extends IIActorRef<NodeInfo> {

    private final String nodeName;

    public NodeIIAR(String actorName, NodeInfo node, IIActorSystem system) {
        super(actorName, node, system);
        this.nodeName = actorName;
    }

    @Override
    public ActionResult callByActionName(String actionName, String args) {
        try {
            switch (actionName) {
                case "reportCpu":
                    String cpuInfo = this.ask(NodeInfo::getCpuInfo).get();
                    // Add result to the accumulator
                    addToAccumulator("cpu", cpuInfo);
                    return new ActionResult(true, "CPU reported");

                case "reportMemory":
                    String memInfo = this.ask(NodeInfo::getMemoryInfo).get();
                    // Add result to the accumulator
                    addToAccumulator("memory", memInfo);
                    return new ActionResult(true, "Memory reported");

                default:
                    return new ActionResult(false, "Unknown action: " + actionName);
            }
        } catch (Exception e) {
            return new ActionResult(false, e.getMessage());
        }
    }

    private void addToAccumulator(String type, String data) {
        // Get the accumulator from the system
        IIActorRef<?> accumulator = getTeam().getIIActor("accumulator");
        if (accumulator != null) {
            // Build the JSON arguments for the add action
            JSONObject args = new JSONObject();
            args.put("source", nodeName);
            args.put("type", type);
            args.put("data", data);
            accumulator.callByActionName("add", args.toString());
        }
    }
}
```

## Complete Example

The following Java code sets up a complete workflow with an accumulator and multiple node actors.

```java
public class WorkflowAccumulatorExample {
    public static void main(String[] args) throws Exception {
        IIActorSystem system = new IIActorSystem("accumulator-demo", 4);

        // Create and register a table accumulator
        AccumulatorIIAR accumulator = AccumulatorFactory.createActor("table", system);

        // Create the main workflow interpreter
        Interpreter interpreter = new Interpreter.Builder()
            .loggerName("main")
            .team(system)
            .build();

        InterpreterIIAR mainActor = new InterpreterIIAR("main", interpreter, system);
        interpreter.setSelfActorRef(mainActor);
        system.addIIActor(mainActor);

        // Create several node actors as children
        for (int i = 1; i <= 3; i++) {
            NodeIIAR node = new NodeIIAR("node-" + i, new NodeInfo(), system);
            node.setParentName("main");
            mainActor.getNamesOfChildren().add("node-" + i);
            system.addIIActor(node);
        }

        // Load and run the workflow
        interpreter.readYaml(
            WorkflowAccumulatorExample.class.getResourceAsStream("/collect-info.yaml")
        );
        ActionResult result = interpreter.runUntilEnd();

        // The workflow will have populated the accumulator and displayed results

        // We can also get the summary programmatically
        String summary = accumulator.callByActionName("getSummary", "[]").getResult();
        System.out.println("\nFinal Summary:\n" + summary);

        system.terminate();
    }
}
```

## Thread Safety

The AccumulatorIIAR uses `tell()` and `ask()` internally to access the underlying Accumulator, which ensures thread-safe access through the actor's message queue. This means multiple workflow actions can safely add results to the same accumulator concurrently without risking data corruption.

## Best Practices

When using Workflow Accumulators, consider these guidelines:

1. **Choose the right accumulator type** based on your output needs. Use TableAccumulator for comparing data across nodes, JsonAccumulator for machine processing, or StreamingAccumulator for real-time monitoring.

2. **Use consistent source names** when adding results. The source name is typically the actor name, which makes it easy to trace where results came from.

3. **Clear the accumulator** between workflow runs if you're reusing the same accumulator for multiple operations.

4. **Consider using multiple accumulators** if you have different categories of results that should be displayed separately.
