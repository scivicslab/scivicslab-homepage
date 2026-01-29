---
id: parallel-execution
title: Asynchronous Parallel Execution on Multiple Nodes (apply)
sidebar_position: 27
---

# Asynchronous Parallel Execution on Multiple Nodes (apply)

## Problem Definition

### Batch Execution Across Multiple Nodes

In actor-IaC, it is common to execute the same operation on multiple servers (nodes). For example, when collecting system information from 10 servers, executing them one by one takes time. If we can execute them in parallel, we can significantly reduce the time.

### Aggregating Results

The execution results from each node are stored in their respective JSON State. However, since JSON State is not shared between nodes, it is not possible to retrieve results from all nodes together directly. A mechanism to aggregate results from all nodes in one place is needed.

### Goal

Execute workflows asynchronously in parallel on multiple nodes and aggregate the results.


## How to do it

### Execute Asynchronously in Parallel with `apply`

`apply` asynchronously calls the same method in parallel on multiple actors matching the specified pattern. In the following example, `runWorkflow` is executed on all node actors matching `node-*`.

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

`apply` is a method of the `nodeGroup` actor. The `actor` argument can specify a wildcard pattern. `node-*` matches all actors starting with `node-`, such as `node-server1`, `node-server2`, `node-192.168.1.10`, etc.

Execution on each node is done asynchronously in parallel, so even with 10 nodes, the processing of all nodes completes in the time it takes for one node (assuming no network bandwidth or server load constraints).

`apply` blocks the main workflow until processing on all nodes is complete. In other words, the main workflow proceeds to the next Transition only after all asynchronous parallel executions are finished. This guarantees that results from all nodes are available in the next step.

### Aggregate Results with Accumulator

To aggregate execution results from each node, use an Accumulator. The Accumulator is a mechanism that collects lines with a specific prefix (`%`) from each node's output and retrieves them together at the end.

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

The argument `"streaming"` specifies a mode that collects output from each node in real-time. In this mode, `%`-prefixed lines output by each node are immediately added to the Accumulator.

#### Output in Sub-workflow

In the sub-workflow, output information you want to aggregate with the `%` prefix. Only lines starting with `%` are collected by the Accumulator.

```yaml
# collect-info.yaml (executed on each node)
steps:
  - states: ["0", "end"]
    note: Output system info with % prefix
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

This sub-workflow retrieves the hostname, memory capacity, and CPU count, and outputs them in one line with the `%` prefix. Processing before `echo` (such as variable assignments) does not have `%`, so it is not collected by the Accumulator.

#### Retrieving Results

After execution on all nodes is complete, retrieve the aggregated results with `getAccumulatorSummary`.

```yaml
- states: ["2", "end"]
  note: Get aggregated results
  actions:
    - actor: nodeGroup
      method: getAccumulatorSummary
```

`getAccumulatorSummary` returns a string concatenating all collected `%`-prefixed lines. For example, when executed on 3 nodes, you get results like:

```
server1: Memory=16Gi, CPUs=4
server2: Memory=32Gi, CPUs=8
server3: Memory=8Gi, CPUs=2
```

The `%` prefix is removed from each line in the output.

### Complete Example

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
    note: Collect system info on all nodes
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runWorkflow
          arguments: ["collect-info.yaml"]

  - states: ["2", "3"]
    note: Get aggregated results
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

This workflow consists of four steps. First, it creates an Accumulator, then executes sub-workflows in parallel on all nodes. After that, it retrieves the aggregated results, and finally outputs them as a report. `${result}` contains the result of `getAccumulatorSummary` (information from all nodes).


## Under the hood

### What is Asynchronous Parallel

The term "asynchronous parallel" represents two characteristics.

**Asynchronous**: The sender does not wait for the receiver to complete processing before proceeding to the next operation. In actor-IaC, message sending to each node is done asynchronously. When sending messages to 10 nodes, it continues sending to the 2nd and 3rd nodes without waiting for the 1st node's response.

**Parallel**: Multiple processes are executed simultaneously. Each node independently processes the received message, so 10 nodes proceed with processing at the same time.

By combining these two, `apply` can efficiently execute workflows on many nodes.

### How `apply` Works

`apply` is a method of the NodeGroup actor. It searches for actors matching the specified pattern and asynchronously calls the specified method on each in parallel.

```
NodeGroupIIAR
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

The diagram above shows how `apply` works. NodeGroupIIAR searches IIActorSystem for actors matching `node-*` and calls `runWorkflow` on each in parallel. Execution on each node is independent and proceeds without waiting for each other.

### How Accumulator Works

The Accumulator monitors the standard output of each node and collects lines starting with `%`.

```
node-server1 output:
  HOSTNAME=server1        ← Not collected
  MEM=16Gi                ← Not collected
  %server1: Memory=16Gi   ← Collected

node-server2 output:
  HOSTNAME=server2        ← Not collected
  %server2: Memory=32Gi   ← Collected
```

The reason for using the `%` prefix is to distinguish between debug output or intermediate results and the final results you want to aggregate. Lines without `%` are ignored, so you can freely output debug information in sub-workflows without it being mixed into the Accumulator.

### Why JSON State is Not Shared Between Nodes

Each node (NodeIIAR) is an independent actor with its own JSON State.

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

This is intentional design. Each node having independent state prevents conflicts during parallel execution. If JSON State were shared, multiple nodes writing to the same key simultaneously could corrupt data.

Therefore, aggregating results from each node requires a mechanism like the Accumulator. The Accumulator safely collects output from each node and provides it together at the end.

### `apply` (Asynchronous Parallel) vs Loop (Sequential Execution)

It is possible to process each node sequentially in a loop without using `apply`, but there is a significant performance difference.

Consider a case with 10 nodes where processing on each node takes 10 seconds. Sequential execution in a loop takes 10 nodes × 10 seconds = 100 seconds. On the other hand, asynchronous parallel execution with `apply` processes all nodes simultaneously, completing in about 10 seconds.

The more nodes there are, the greater the benefit of asynchronous parallel execution with `apply`.
