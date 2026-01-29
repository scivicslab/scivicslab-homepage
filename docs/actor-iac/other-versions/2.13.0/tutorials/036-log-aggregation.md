---
id: log-aggregation
title: Aggregating Log Information
sidebar_position: 36
---

# Aggregating Log Information

## Problem Definition

**Goal:** At the end of the main workflow, aggregate log information obtained from each node and display easy-to-read results.

When executing a workflow on a cluster, output from each node is saved to the log database. However, to understand "what happened overall," you need to aggregate and summarize the logs.

For example, when executing system information collection on 6 nodes, you want to see the following information at a glance:

- Hostname and OS of each node
- CPU and memory configuration
- Disk and GPU information
- Network settings


## How to do it

### How WorkflowReporter Works

actor-IaC provides a WorkflowReporter actor as a simple aggregation mechanism.

WorkflowReporter performs the following processing:

1. Retrieve logs for the current session from the database
2. Extract lines starting with `%` and output them in the "Check Results" section
3. Aggregate transition success/failure and output in the "Transitions" section

WorkflowReporter does not directly access the inventory file or nodes. Command output executed on each node is saved to the log database as standard actor-IaC behavior, and WorkflowReporter extracts lines starting with `%` from there.

### How to Use WorkflowReporter

To use WorkflowReporter, follow these 3 steps:

1. **Incorporate the WorkflowReporter actor into the actor tree at workflow start**

```yaml
- states: ["0", "1"]
  note: Load WorkflowReporter
  actions:
    - actor: loader
      method: createChild
      arguments: ["ROOT", "workflowReporter", "com.scivicslab.actoriac.WorkflowReporter"]
```

This operation results in the following actor tree:

```
ROOT
├── workflowReporter    ← Added
├── nodeGroup
│   ├── node-stonefly513
│   ├── node-stonefly514
│   └── ...
├── h2LogReader
└── ...
```

2. **Execute sub-workflows on each node and output lines to be collected by WorkflowReporter with `%` prefix**

Execute sub-workflows on each node from the main workflow:

```yaml
- states: ["1", "2"]
  note: Collect info on all nodes
  actions:
    - actor: nodeGroup
      method: apply
      arguments:
        actor: "node-*"
        method: runWorkflow
        arguments: ["collect-sysinfo-report.yaml"]
```

In the sub-workflow (collect-sysinfo-report.yaml), output lines to include in the report with `%` prefix:

```yaml
- states: ["0", "1"]
  note: Retrieve hostname
  actions:
    - actor: this
      method: executeCommand
      arguments:
        - |
          HOSTNAME=$(hostname -f 2>/dev/null || hostname)
          echo "%--------------------"
          echo "%[INFO] Hostname: $HOSTNAME"
```

All command output is recorded in the log DB, but WorkflowReporter extracts only lines starting with `%`.

3. **Call the WorkflowReporter actor's report method at the end**

```yaml
- states: ["2", "end"]
  note: Generate report
  actions:
    - actor: workflowReporter
      method: report
```

The `report` method extracts lines starting with `%` from the log DB and generates a report.

### Complete Sub-Workflow Example

The following is a complete example of a sub-workflow (collect-sysinfo-report.yaml) that collects system information.

```yaml
name: collect-sysinfo-report

description: |
  Sub-workflow to collect system information and output summary with % prefix.

steps:
  - states: ["0", "1"]
    note: Retrieve hostname and OS information
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            HOSTNAME=$(hostname -f 2>/dev/null || hostname)
            OS_NAME=$(grep -E "^PRETTY_NAME=" /etc/os-release 2>/dev/null | cut -d'"' -f2)
            echo "%--------------------"
            echo "%[INFO] Hostname: $HOSTNAME"
            echo "%[INFO] OS: $OS_NAME"

  - states: ["1", "2"]
    note: Retrieve CPU information
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            CPU_MODEL=$(LANG=C lscpu | grep "Model name:" | sed 's/Model name:\s*//')
            CPU_CORES=$(LANG=C lscpu | grep "^CPU(s):" | awk '{print $2}')
            echo "%[INFO] CPU: $CPU_MODEL ($CPU_CORES cores)"

  - states: ["2", "3"]
    note: Retrieve memory information
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            MEM_TOTAL=$(free -h | awk '/^Mem:/ {print $2}')
            echo "%[INFO] Memory: $MEM_TOTAL"

  - states: ["3", "4"]
    note: Retrieve disk information
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            lsblk -d -n -o NAME,SIZE,MODEL 2>/dev/null | grep -v "^loop" | while read NAME SIZE MODEL; do
              echo "%[INFO] Disk: $NAME $SIZE $MODEL"
            done

  - states: ["4", "5"]
    note: Retrieve GPU information
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            if command -v nvidia-smi &> /dev/null; then
              GPU=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
              echo "%[INFO] GPU: $GPU (NVIDIA)"
            else
              GPU=$(lspci 2>/dev/null | grep -i -E "(vga|3d|display)" | head -1 | sed 's/.*: //')
              if [ -n "$GPU" ]; then
                echo "%[INFO] GPU: $GPU"
              else
                echo "%[INFO] GPU: Not detected"
              fi
            fi

  - states: ["5", "end"]
    note: Retrieve network information
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            PRIMARY_IP=$(ip -4 addr show | grep -v "127.0.0.1" | grep "inet " | head -1 | awk '{print $2}' | cut -d'/' -f1)
            echo "%[INFO] Network: $PRIMARY_IP"
```

By outputting `%--------------------` in the first step, the separation between nodes becomes clear in the report.


### Generate Report Even on Error

To report results up to that point even if the workflow is interrupted by an error, add a catch-all transition.

```yaml
  - states: ["!end", "end"]
    note: Generate report even on error
    actions:
      - actor: workflowReporter
        method: report
```

`!end` means "all states except end". This transition is executed regardless of which state the error occurs in.


### Execution Example

Execute the following command to collect system information from the entire cluster and generate a report.

```bash
cd ~/proj-POJO-actor/actor-IaC-examples
./actor_iac.java run -w ./sysinfo/main-collect-and-report.yaml -i inventory.ini -g compute
```

A report like the following is displayed at the end of the workflow.

```
=== Workflow Execution Report ===
Session #138 | Workflow: ./sysinfo/main-collect-and-report.yaml | Status: RUNNING
Started: 2026-01-25T09:26:32.369583

--- Check Results ---
--------------------
[INFO] Hostname: stonefly513
[INFO] OS: Ubuntu 24.04.3 LTS
[INFO] CPU: AMD Ryzen 7 7700 8-Core Processor (16 cores)
[INFO] Memory: 62Gi
[INFO] Disk: sda 1.9T TS2TSSD230S
[INFO] Disk: nvme0n1 931.5G CSSD-M2B1TPG3NF2
[INFO] GPU: NVIDIA GeForce RTX 4080 (NVIDIA)
[INFO] Network: 192.168.5.13
--------------------
[INFO] Hostname: stonefly514
[INFO] OS: Ubuntu 24.04.3 LTS
[INFO] CPU: AMD Ryzen 7 7700 8-Core Processor (16 cores)
[INFO] Memory: 62Gi
[INFO] Disk: sda 1.9T TS2TSSD230S
[INFO] GPU: NVIDIA GeForce RTX 4080 (NVIDIA)
[INFO] Network: 192.168.5.14
--------------------
[INFO] Hostname: stonefly523
[INFO] OS: Ubuntu 24.04.2 LTS
[INFO] CPU: AMD Ryzen 9 7950X3D 16-Core Processor (32 cores)
[INFO] Memory: 62Gi
[INFO] Disk: sda 1.8T ST2000DM008-2UB1
[INFO] GPU: Advanced Micro Devices, Inc. [AMD/ATI] Navi 31 [Radeon RX 7900 XT/7900 XTX/7900M]
[INFO] Network: 192.168.5.23

--- Transitions ---
[✓] 0 -> 1
[✓] 1 -> 2

Summary: 2 succeeded, 0 failed
```

Only lines output with the `%` prefix are aggregated in the "Check Results" section. `%--------------------` is output as a separator between nodes.
