---
sidebar_position: 6
title: Accumulator
---

# Accumulator

The `Accumulator` interface provides a standardized way to collect and aggregate results from multiple sources. This is particularly useful in distributed workflows where you need to gather data from multiple actors or nodes and present it in a unified format. For example, when querying system information from a cluster of servers, each server reports its CPU, memory, and other details, and the Accumulator consolidates all these responses into a single summary.

Accumulators are designed to work seamlessly with the actor model. Each result is tagged with a source identifier (typically the actor or node name), a type category, and the actual data. This three-part structure enables flexible aggregation and presentation of heterogeneous data.

## The Accumulator Interface

The Accumulator interface defines four methods that all implementations must provide or inherit with default behavior.

```java
public interface Accumulator {
    // Add a result from a source
    void add(String source, String type, String data);

    // Get a formatted summary of all results
    String getSummary();

    // Clear all accumulated results (optional)
    default void clear() { }

    // Get the count of added results (optional)
    default int getCount() { return 0; }
}
```

The `add` method is the primary way to feed data into the accumulator. The `source` parameter identifies where the data came from (such as "node-web-01" or "worker-3"), the `type` parameter categorizes the data (such as "cpu" or "memory"), and the `data` parameter contains the actual information as a string.

The `getSummary` method returns a formatted string containing all accumulated results. The exact format depends on which implementation you're using—it could be plain text, a table, or JSON.

## Standard Implementations

POJO-actor provides four built-in Accumulator implementations, each suited to different use cases.

### StreamingAccumulator

The StreamingAccumulator prints each result immediately to standard output as it arrives. This is useful for real-time monitoring where you want to see results as they come in rather than waiting for all sources to report.

```java
Accumulator acc = new StreamingAccumulator();

// Each add() call immediately prints to stdout
acc.add("node-1", "cpu", "Intel Xeon E5-2680");
// Output: [node-1] cpu: Intel Xeon E5-2680

acc.add("node-1", "memory", "64GB");
// Output: [node-1] memory: 64GB
```

When you call `getSummary()`, it returns a simple count of how many results were received rather than repeating all the data (since it was already printed).

### BufferedAccumulator

The BufferedAccumulator stores all results in memory and outputs them grouped by source when `getSummary()` is called. This is useful when you want to collect all results before displaying them, ensuring a clean and organized output.

```java
Accumulator acc = new BufferedAccumulator();

// Results are stored silently
acc.add("node-1", "cpu", "Intel Xeon E5-2680");
acc.add("node-2", "cpu", "AMD EPYC 7542");
acc.add("node-1", "memory", "64GB");
acc.add("node-2", "memory", "128GB");

// getSummary() returns all results grouped by source
String summary = acc.getSummary();
```

The output from BufferedAccumulator groups results by source, making it easy to see all information from each node together.

### TableAccumulator

The TableAccumulator formats results as a table where rows represent sources and columns represent data types. This is ideal for comparing values across multiple nodes, such as displaying hardware specifications for all servers in a cluster.

```java
Accumulator acc = new TableAccumulator();

acc.add("node-web-01", "cpu", "Intel Xeon E5-2680 v4");
acc.add("node-web-01", "memory", "64Gi");
acc.add("node-web-02", "cpu", "Intel Xeon E5-2680 v4");
acc.add("node-web-02", "memory", "64Gi");
acc.add("node-db-01", "cpu", "AMD EPYC 7542");
acc.add("node-db-01", "memory", "256Gi");

String table = acc.getSummary();
```

The output looks like this:

```
Node                | cpu                           | memory
--------------------------------------------------------------------------------
node-web-01         | Intel Xeon E5-2680 v4         | 64Gi
node-web-02         | Intel Xeon E5-2680 v4         | 64Gi
node-db-01          | AMD EPYC 7542                 | 256Gi
```

You can customize the column width when constructing the TableAccumulator:

```java
// Create with custom column width of 40 characters
Accumulator acc = new TableAccumulator(40);
```

### JsonAccumulator

The JsonAccumulator outputs results in JSON format, which is useful when the accumulated data needs to be processed programmatically or stored in a structured format.

```java
Accumulator acc = new JsonAccumulator();

acc.add("node-1", "cpu", "Intel Xeon");
acc.add("node-1", "memory", "64GB");
acc.add("node-2", "cpu", "AMD EPYC");

String json = acc.getSummary();
// Returns structured JSON
```

## Choosing an Implementation

The choice of accumulator depends on your use case:

| Scenario | Recommended Implementation | Reason |
|----------|---------------------------|--------|
| Real-time monitoring | StreamingAccumulator | See results immediately as they arrive |
| Batch reporting | BufferedAccumulator | Collect everything first, then display |
| Comparing across nodes | TableAccumulator | Easy visual comparison in table format |
| Machine processing | JsonAccumulator | Structured output for further processing |

## Using Accumulator with Actors

While Accumulators are plain Java objects, they're designed to work well with the actor model. You can wrap an Accumulator in an ActorRef for thread-safe access from multiple actors.

```java
ActorSystem system = new ActorSystem("demo");

// Create an accumulator actor for thread-safe access
ActorRef<Accumulator> accumulator = system.actorOf("results", new TableAccumulator());

// Multiple actors can safely add results
workerRef.ask(w -> {
    String cpuInfo = w.getCpuInfo();
    // Send result to accumulator through its actor
    accumulator.tell(acc -> acc.add("worker-1", "cpu", cpuInfo));
    return cpuInfo;
});

// Later, get the summary
String summary = accumulator.ask(Accumulator::getSummary).join();
System.out.println(summary);
```

## Complete Example

The following example demonstrates collecting system information from multiple simulated nodes and presenting it in a table format.

```java
public class AccumulatorExample {
    public static void main(String[] args) throws Exception {
        ActorSystem system = new ActorSystem("accumulator-demo");

        // Create a TableAccumulator wrapped in an ActorRef for thread safety
        ActorRef<Accumulator> results = system.actorOf("results", new TableAccumulator());

        // Simulate multiple nodes reporting their information
        String[] nodes = {"web-01", "web-02", "db-01"};

        for (String node : nodes) {
            // Each node reports CPU info
            results.tell(acc -> acc.add(node, "cpu", getRandomCpu())).join();

            // Each node reports memory info
            results.tell(acc -> acc.add(node, "memory", getRandomMemory())).join();

            // Each node reports OS info
            results.tell(acc -> acc.add(node, "os", "Ubuntu 22.04")).join();
        }

        // Get and display the summary table
        String summary = results.ask(Accumulator::getSummary).join();
        System.out.println("System Information Summary:");
        System.out.println(summary);

        // Get the count of collected data points
        int count = results.ask(Accumulator::getCount).join();
        System.out.println("Total data points collected: " + count);

        system.terminate();
    }

    private static String getRandomCpu() {
        String[] cpus = {"Intel Xeon E5-2680", "AMD EPYC 7542", "Intel Core i9-12900K"};
        return cpus[(int)(Math.random() * cpus.length)];
    }

    private static String getRandomMemory() {
        String[] memories = {"32GB", "64GB", "128GB", "256GB"};
        return memories[(int)(Math.random() * memories.length)];
    }
}
```

## Thread Safety

All standard Accumulator implementations use thread-safe internal data structures (such as `Collections.synchronizedMap`), making them safe to use from multiple threads concurrently. However, for optimal integration with the actor model, wrapping the Accumulator in an ActorRef ensures that all operations are serialized through the actor's message queue, providing an additional layer of safety and consistency.

For workflow usage where Accumulators are invoked via string-based action names, see the [Workflow Accumulator](/docs/pojo-actor/workflow-framework/workflow-accumulator) documentation.
