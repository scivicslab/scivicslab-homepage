---
id: parallel-execution
sidebar_position: 2
title: "Asynchronous Parallel Execution on Multiple Nodes"
description: "Learn about asynchronous parallel execution on multiple nodes using the apply method, result aggregation with Accumulator, and performance comparisons."
keywords:
  - Turing-workflow
  - parallel execution
  - apply
  - accumulator
  - async
  - node group
---

# Asynchronous Parallel Execution on Multiple Nodes

## Problem Definition

### Batch Execution on Multiple Nodes

In Turing-workflow, there are many situations where you need to execute the same operation on multiple servers (nodes). For example, when collecting system information from 10 servers, executing one at a time sequentially takes a long time. If you can execute in parallel on multiple nodes, you can significantly reduce the time.

### Result Aggregation

The results of execution on each node are stored in each node's JSON State. Since JSON State is not shared between nodes, a mechanism is needed to collect results from all nodes.

### Goal

Execute workflows asynchronously in parallel on multiple nodes and aggregate the results.


## How to do it

### Execute Asynchronously in Parallel with `apply`

`apply` asynchronously calls the same method in parallel on multiple actors matching a specified pattern. In the following example, `runWorkflow` is executed on all node actors matching `node-*`.

```yaml
- states: ["0", "1"]
  note: Execute sub-workflow in parallel on all nodes
  actions:
    - actor: nodeGroup
      method: apply
      arguments:
        actor: "node-*"
        method: runWorkflow
        arguments: ["collect-info.yaml"]
```

`apply` is a method of the `nodeGroup` actor. Wildcard patterns can be specified in the `actor` argument. `node-*` matches all actors starting with `node-`, such as `node-server1`, `node-server2`, `node-192.168.1.10`, etc.

Execution on each node is performed asynchronously in parallel, so even with 10 nodes, processing on all nodes completes in the time it takes for one (assuming no network bandwidth or server load constraints).

`apply` blocks the main workflow until processing on all nodes is complete. After asynchronous parallel execution on all nodes finishes, the main workflow proceeds to the next transition. This guarantees that results from all nodes are available in the next step.

### Aggregate Results with Accumulator

To aggregate execution results from each node, use an Accumulator. An Accumulator collects lines with a `%` prefix from each node's output and allows you to retrieve them all at once at the end.

#### Creating an Accumulator

Before executing `apply`, you need to create an Accumulator with `createAccumulator`.

```yaml
- states: ["0", "1"]
  note: Create Accumulator
  actions:
    - actor: nodeGroup
      method: createAccumulator
      arguments: ["streaming"]
```

The argument `"streaming"` specifies a mode that collects output from each node in real-time. Lines with the `%` prefix output by each node are immediately added to the Accumulator.

#### Output in Sub-workflows

In sub-workflows, output information you want to aggregate with a `%` prefix. Only lines starting with `%` are collected by the Accumulator.

```yaml
# collect-info.yaml (executed on each node)
steps:
  - states: ["0", "end"]
    note: Output system information with % prefix
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            HOSTNAME=$(hostname -s)
            MEM=$(free -h | awk '/Mem:/{print $2}')
            CPU=$(nproc)
            echo "%$HOSTNAME: Memory=$MEM, CPUs=$CPU"
```

This retrieves the hostname, memory capacity, and CPU count, and outputs them in one line with a `%` prefix. Processing before `echo` (such as variable assignments) does not have `%`, so it is not collected by the Accumulator.

#### Retrieving Results

After execution on all nodes completes, retrieve the aggregated results with `getAccumulatorSummary`.

```yaml
- states: ["2", "end"]
  note: Retrieve aggregated results
  actions:
    - actor: nodeGroup
      method: getAccumulatorSummary
```

`getAccumulatorSummary` returns a string concatenating all collected `%` prefix lines. When executed on 3 nodes, you get results like the following.

```
server1: Memory=16Gi, CPUs=4
server2: Memory=32Gi, CPUs=8
server3: Memory=8Gi, CPUs=2
```

The `%` prefix is removed from each line in the output.

### Complete Workflow Example

The following is a complete workflow example that collects and reports system information from multiple nodes.

**Main workflow (main-collect-info.yaml)**:
```yaml
name: CollectSystemInfo

steps:
  - states: ["0", "1"]
    note: Create Accumulator
    actions:
      - actor: nodeGroup
        method: createAccumulator
        arguments: ["streaming"]

  - states: ["1", "2"]
    note: Collect system information on all nodes
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runWorkflow
          arguments: ["collect-info.yaml"]

  - states: ["2", "3"]
    note: Retrieve aggregated results
    actions:
      - actor: nodeGroup
        method: getAccumulatorSummary

  - states: ["3", "end"]
    note: Output report
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            echo "=== System Information Report ==="
            echo "${result}"
            echo "=== End of Report ==="
```

The main workflow consists of 4 steps. First, it creates an Accumulator, then executes sub-workflows in parallel on all nodes. It retrieves the aggregated results and finally outputs them as a report. `${result}` contains the result from `getAccumulatorSummary` (information from all nodes).


## Under the hood

### Difference Between Asynchronous and Parallel

The expression "asynchronous parallel" represents two characteristics.

**Asynchronous**: The sender of a message proceeds to the next process without waiting for the recipient to complete. In Turing-workflow, message sending to each node is performed asynchronously. When sending messages to 10 nodes, messages continue to be sent to the 2nd, 3rd, etc. without waiting for a response from the 1st.

**Parallel**: Multiple processes execute simultaneously. Each node independently processes the messages it receives, so 10 nodes process simultaneously.

By combining asynchronous sending and parallel processing, `apply` efficiently executes workflows on many nodes.

### Internal Behavior of `apply`

`apply` is a method that `NodeGroupInterpreter` has. It searches for actors matching the specified pattern and asynchronously calls the specified method in parallel on each actor.

```
NodeGroupInterpreter
├── IIActorSystem
│   ├── node-server1 (NodeIIAR)
│   ├── node-server2 (NodeIIAR)
│   └── node-server3 (NodeIIAR)
└── Accumulator

apply("node-*", "runWorkflow", ["collect-info.yaml"])
    │
    ├──→ node-server1.runWorkflow("collect-info.yaml")  ─┐
    ├──→ node-server2.runWorkflow("collect-info.yaml")  ─┼─ Parallel execution
    └──→ node-server3.runWorkflow("collect-info.yaml")  ─┘
```

`NodeGroupInterpreter` searches for actors matching `node-*` from `IIActorSystem` and calls `runWorkflow` in parallel on each actor. Execution on each node is independent and proceeds without waiting for each other.

### Internal Behavior of Accumulator

The Accumulator monitors standard output from each node and collects lines starting with `%`.

```
Output from node-server1:
  HOSTNAME=server1        ← Not collected
  MEM=16Gi                ← Not collected
  %server1: Memory=16Gi   ← Collected

Output from node-server2:
  HOSTNAME=server2        ← Not collected
  %server2: Memory=32Gi   ← Collected
```

The reason for using the `%` prefix is to distinguish debug output and intermediate results from the final results you want to aggregate. Lines without `%` are ignored, so you can freely output debug information in sub-workflows without it mixing into the Accumulator.

### JSON State Isolation Design

Each node (`NodeIIAR`) is an independent actor, and each node has its own JSON State.

```
node-server1 (NodeIIAR)
└── JSON State
    ├── result
    └── hostname    ← server1's JSON State

node-server2 (NodeIIAR)
└── JSON State
    ├── result
    └── hostname    ← server2's JSON State (separate from server1)
```

The design where each node has independent state is intentional. No conflicts occur during parallel execution. If JSON State were shared, multiple nodes trying to write to the same key simultaneously could corrupt data.

The Accumulator is needed to aggregate results from each node. The Accumulator safely collects output from each node and provides it all together at the end.

### Performance Comparison: `apply` (Asynchronous Parallel) vs Sequential Loop

It is possible to process each node sequentially in a loop without using `apply`, but there is a significant difference in performance.

Consider a case with 10 nodes where processing on each node takes 10 seconds. Sequential execution in a loop takes 10 nodes x 10 seconds = 100 seconds. On the other hand, asynchronous parallel execution with `apply` processes all nodes simultaneously, completing in about 10 seconds.

The more nodes there are, the greater the benefit of asynchronous parallel execution with `apply`.
