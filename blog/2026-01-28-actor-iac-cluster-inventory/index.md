---
slug: 2026-01-28-actor-iac-cluster-inventory
title: "actor-IaC: POJO-actor Workflow Based Infrastructure as Code for Cluster Management (Part 1)"
authors: [devteam]
date: 2026-01-28
tags: [actor-iac, pojo-actor, infrastructure]
---

actor-IaC is an Infrastructure as Code (IaC) tool built on top of the POJO-actor workflow engine.
It uses actor-based workflows written in Java and YAML to manage and operate compute clusters in a scalable and traceable way.

In this article (Part 1), we introduce actor-IaC through a practical example: collecting system information from multiple compute nodes in parallel.
This tutorial demonstrates how POJO-actor workflows can be applied to real-world cluster management tasks.

<!-- truncate -->

## Why Use POJO-actor Workflow for IaC?

In previous posts, we explained the design of a framework that easily enables asynchronous parallel processing by turning any POJO into an actor, and introduced the Turing Machine-based workflow engine built on top of it.

In this post, we demonstrate that this workflow mechanism is effective even for practical, real-world applications. As a concrete example, we built a full-featured Infrastructure as Code tool called "actor-IaC" using the POJO-actor workflow engine.

### Consistent Notation

In POJO-actor Workflow, all operations are written in a consistent format: "call a method on a POJO."

```yaml
actions:
  - actor: this
    method: executeCommand
    arguments: ["hostname -f"]
```

The granularity of operations depends on your POJO design. You can freely define methods ranging from executing a single shell command to complex deployment procedures. You're not constrained by DSL limitations.

### Natural Conditional Branching

POJO-actor Workflow is based on state machines (Turing machines). Each step is defined as a pair of "current state" and "next state", and conditional branching is expressed as steps with multiple possible transitions.

```yaml
steps:
  - states: ["check", "success"]
    when: "result.exitCode == 0"
    actions: [...]
  - states: ["check", "failure"]
    when: "result.exitCode != 0"
    actions: [...]
```

No special control syntax is needed. Branching can be described naturally as state transitions.


## The Actor Tree: A Mental Model for Cluster Management

In actor-IaC, actors corresponding to each node defined in the inventory file are automatically generated.

```
IIActorSystem
├── nodeGroup                # Group actor that manages all nodes
│   ├── node-node13          #   Corresponds to each node in inventory
│   ├── node-node14          #   (Number of nodes depends on inventory.ini)
│   └── ...
├── outputMultiplexer        # Aggregates output from all nodes
├── loader                   # Dynamic plugin loading
└── logStore                 # Log DB writing (when --log-db specified)
```

The advantage of this structure is that **when writing workflows, you only need to think about sequential processing on a single machine**.

Sub-workflows describe only "what to do on this one node." Parallelization is handled by `nodeGroup.apply()`. You don't need to worry about synchronization or mutual exclusion across multiple nodes.

Because the mental model is simple, workflow design, debugging, and maintenance all become easier.


## Complete Traceability of Execution Logs (Cluster Operations)

When the mental model is simple, checking logs also becomes easier.

actor-IaC automatically saves execution logs from all nodes to an H2 database. Even logs from parallel execution can be filtered later to extract specific nodes.

```bash
# Show logs for node13 only
./actor_iac.java log-search --db ./actor-iac-logs --node node-node13
```

Even in situations like "1 out of 6 nodes failed. What happened?", you can immediately check the logs for that specific node.


---

## Hands-on: Collecting Cluster Information

Enough theory—let's actually use actor-IaC.

When managing a cluster, you need to understand the configuration of each node:

- CPU: How many cores? What model?
- Memory: How many GB?
- Disk: Capacity and usage?
- GPU: NVIDIA? AMD?
- Network: IP addresses?

Manually checking this for 6 nodes is tedious. With actor-IaC, you can collect information from all nodes in parallel with a single command.


### 1. Inventory File

Define the target nodes. It uses the same INI format as Ansible.

```ini
[compute]
node13 actoriac_host=192.168.5.13
node14 actoriac_host=192.168.5.14
node15 actoriac_host=192.168.5.15
node21 actoriac_host=192.168.5.21
node22 actoriac_host=192.168.5.22
node23 actoriac_host=192.168.5.23

[compute:vars]
actoriac_user=youruser
```


### 2. Sub-workflow (Processing Executed on Each Node)

Create `collect-sysinfo.yaml`. This is the workflow executed on each node.

```yaml
name: collect-sysinfo

steps:
  - states: ["0", "1"]
    note: Get hostname and OS info
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            echo "===== HOSTNAME ====="
            hostname -f
            echo "===== OS INFO ====="
            cat /etc/os-release | grep -E "^(NAME|VERSION)="

  - states: ["1", "2"]
    note: Get CPU info
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            echo "===== CPU INFO ====="
            lscpu | grep -E "^(Architecture|CPU\(s\)|Model name)"

  - states: ["2", "3"]
    note: Get memory info
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            echo "===== MEMORY INFO ====="
            free -h

  - states: ["3", "4"]
    note: Get disk info
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            echo "===== DISK INFO ====="
            df -h | grep -E "^(/dev|Filesystem)"

  - states: ["4", "5"]
    note: Get GPU info
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            echo "===== GPU INFO ====="
            if command -v nvidia-smi &> /dev/null; then
                nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader
            else
                lspci | grep -i -E "(vga|3d)" || echo "No GPU detected"
            fi

  - states: ["5", "end"]
    note: Get network info
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            echo "===== NETWORK INFO ====="
            ip -4 addr show | grep -E "(^[0-9]+:|inet )" | head -20
```

Note that this workflow is written as **sequential processing for a single node**. There's no consideration for parallel execution.


### 3. Main Workflow (Applying to All Nodes)

Create `main-collect-sysinfo.yaml`.

```yaml
name: main-collect-sysinfo

steps:
  - states: ["0", "end"]
    note: Execute sub-workflow in parallel on all nodes
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runWorkflow
          arguments: ["collect-sysinfo.yaml"]
```

Just one step. `nodeGroup.apply()` executes the sub-workflow in parallel on all nodes matching the pattern `node-*`.


### Execution

```bash
./actor_iac.java run -w sysinfo/main-collect-sysinfo.yaml -i inventory.ini -g compute
```

When executed, it simultaneously connects via SSH to all 6 nodes and collects system information.

```
[node-node13] ===== HOSTNAME =====
[node-node13] node13.local
[node-node14] ===== HOSTNAME =====
[node-node14] node14.local
[node-node13] ===== CPU INFO =====
[node-node13] Architecture:          x86_64
[node-node13] CPU(s):                32
[node-node13] Model name:            AMD Ryzen 9 5950X
...
```

The prefix like `[node-node13]` at the beginning of each line indicates which node the output came from. Since execution is parallel, outputs arrive in mixed order, but you can distinguish them by the prefix.


### Checking Results

All logs are automatically saved to an H2 database (`actor-iac-logs.mv.db`).

```bash
# Show session list
./actor_iac.java log-search --db ./actor-iac-logs --list

# Show logs for a specific node
./actor_iac.java log-search --db ./actor-iac-logs --node node-node13
```

---

## actor-IaC Features

actor-IaC is not an experimental tool—it already has production-ready features.

| Command | Description |
|---------|-------------|
| `run` | Execute a workflow |
| `list` | List available workflows |
| `describe` | Show workflow details |
| `log-search` | Search and display execution logs |
| `log-merge` | Merge distributed log DBs |
| `db-clear` | Delete log DB |

The overlay feature allows you to use the same workflow across development, staging, and production environments.

Plugin-based extensions are planned for the future.


## Summary

actor-IaC is the answer to "Can POJO-actor Workflow express complex workflows?"

1. **Consistent notation**: A unified format of POJO method calls
2. **Natural conditional branching**: State machine-based, no special syntax needed
3. **Simple mental model**: Just think about sequential processing on a single node
4. **Complete traceability**: All logs saved to DB, searchable anytime

In Part 2, we'll introduce how to format and analyze the collected information.


## Try It Yourself

You don't need a cluster to try actor-IaC. The [actor-IaC-examples](https://github.com/scivicslab/actor-IaC-examples) repository includes examples that run on localhost:

```bash
# Install dependencies
git clone https://github.com/scivicslab/POJO-actor && cd POJO-actor && mvn install && cd ..
git clone https://github.com/scivicslab/actor-IaC && cd actor-IaC && mvn install && cd ..

# Clone examples and run
git clone https://github.com/scivicslab/actor-IaC-examples
cd actor-IaC-examples

# Hello World example
./actor_iac.java run -d ./hello -w main-hello -i localhost.ini -g all

# Collect system info from localhost
./actor_iac.java run -d ./sysinfo -w main-collect-sysinfo -i localhost.ini -g all
```

See the repository's README for more examples and detailed instructions.

---

## References

This article is part of the official actor-IaC documentation and tutorial series.

- **Official Website**: https://scivicslab.com
- **Original Article**: https://scivicslab.com/blog/2026-01-28-actor-iac-cluster-inventory
- **Documentation**: https://scivicslab.com/docs/actor-iac/introduction
- **GitHub Repository**: https://github.com/scivicslab/actor-iac
- **API Reference (Javadoc)**: https://scivicslab.github.io/actor-IaC/
- **POJO-actor v1.0 Introduction (blog)**: [A Lightweight Actor Model Library for Java](https://scivicslab.com/blog/2025-12-22-pojo-actor-v1-introduction)
- **Tutorial Part 2-1 (blog)**: [Workflow Language Basics](https://scivicslab.com/blog/2025-12-30-TutorialPart2-1)
- **Tutorial Part 2-2 (blog)**: [Creating Workflows](https://scivicslab.com/blog/2025-12-31-TutorialPart2-2)
