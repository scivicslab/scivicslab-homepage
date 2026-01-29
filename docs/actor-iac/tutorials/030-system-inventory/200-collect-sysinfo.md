---
id: collect-sysinfo
title: Creating and Executing a System Information Collection Workflow
sidebar_position: 200
---

# Creating and Executing a System Information Collection Workflow

## Problem Definition

**Goal:** Create and execute a workflow using actor-IaC to collect system information (CPU, memory, disk, GPU, OS, network) from multiple compute nodes.


## How to do it

### Prerequisites

- actor-IaC must be installed (refer to `005-installation`)
- [SSH connection requirements](./010-ssh-setup) must be met


### 1. Create the Working Directory

```bash
mkdir -p ~/works/testcluster-iac/sysinfo
cd ~/works/testcluster-iac
```


### 2. Create the Inventory File

Define the target nodes for system information collection in `inventory.ini`.

```bash
cat > inventory.ini << 'EOF'
[compute]
node13 actoriac_host=192.168.5.13
node14 actoriac_host=192.168.5.14
node15 actoriac_host=192.168.5.15
node21 actoriac_host=192.168.5.21
node22 actoriac_host=192.168.5.22
node23 actoriac_host=192.168.5.23

[compute:vars]
actoriac_user=youruser
EOF
```

| Item | Description |
|------|-------------|
| `[compute]` | Group name |
| `node13` - `node23` | Identifier for each node |
| `actoriac_host=...` | IP address of each node |
| `[compute:vars]` | Variables applied to the entire group |
| `actoriac_user=youruser` | SSH connection username |


### 3. Create the Sub-workflow

Create the sub-workflow that runs on each node in `sysinfo/collect-sysinfo.yaml`.

```bash
cat > sysinfo/collect-sysinfo.yaml << 'EOF'
name: collect-sysinfo

description: |
  Sub-workflow to collect system information from each compute node.
  Retrieves hostname, OS, CPU, memory, disk, GPU, and network information.

steps:
  - states: ["0", "1"]
    note: Retrieve hostname and OS information
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            echo "===== HOSTNAME ====="
            hostname -f
            echo ""
            echo "===== OS INFO ====="
            cat /etc/os-release | grep -E "^(NAME|VERSION|ID)="
            uname -a

  - states: ["1", "2"]
    note: Retrieve CPU architecture, core count, and model name
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            echo "===== CPU INFO ====="
            lscpu | grep -E "^(Architecture|CPU\(s\)|Model name|Thread|Core|Socket)"

  - states: ["2", "3"]
    note: Retrieve memory capacity (total, used, free)
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            echo "===== MEMORY INFO ====="
            free -h

  - states: ["3", "4"]
    note: Retrieve disk device list and mount status
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            echo "===== DISK INFO ====="
            lsblk -d -o NAME,SIZE,TYPE,MODEL 2>/dev/null || lsblk -d -o NAME,SIZE,TYPE
            echo ""
            df -h | grep -E "^(/dev|Filesystem)"

  - states: ["4", "5"]
    note: Retrieve GPU presence and model name (uses nvidia-smi for NVIDIA GPUs)
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            echo "===== GPU INFO ====="
            if command -v nvidia-smi &> /dev/null; then
                nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader 2>/dev/null || echo "nvidia-smi failed"
            else
                lspci 2>/dev/null | grep -i -E "(vga|3d|display)" || echo "No GPU detected via lspci"
            fi

  - states: ["5", "end"]
    note: Retrieve network interfaces and IP addresses
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            echo "===== NETWORK INFO ====="
            ip -4 addr show | grep -E "(^[0-9]+:|inet )" | head -20
EOF
```


### 4. Create the Main Workflow

Create the main workflow that calls the sub-workflow in `sysinfo/main-collect-sysinfo.yaml`.

```bash
cat > sysinfo/main-collect-sysinfo.yaml << 'EOF'
name: main-collect-sysinfo

description: |
  Main workflow to collect system information from all compute nodes in parallel.
  Executes collect-sysinfo.yaml on each node.

steps:
  - states: ["0", "end"]
    note: Execute collect-sysinfo.yaml in parallel on all nodes
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runWorkflow
          arguments: ["collect-sysinfo.yaml"]
EOF
```


### 5. Execute the Workflow

```bash
./actor_iac.java run -w sysinfo/main-collect-sysinfo.yaml -i inventory.ini -g compute
```

| Option | Description |
|--------|-------------|
| `-w sysinfo/main-collect-sysinfo.yaml` | Workflow file to execute |
| `-i inventory.ini` | Inventory file |
| `-g compute` | Target group |

actor-IaC executes the sub-workflow in parallel on the 6 nodes. Output from each node is prefixed with `[node-node13]` and similar. All logs are automatically saved to `actor-iac-logs.mv.db`.

If SSH authentication errors occur, refer to the troubleshooting section in [SSH Connection Requirements](./010-ssh-setup).


### 6. Directory Structure

Directory structure after completion:

```
~/works/testcluster-iac/
├── actor_iac.java
├── actor-iac-logs.mv.db    ← Created automatically after execution
├── inventory.ini
└── sysinfo/
    ├── collect-sysinfo.yaml
    └── main-collect-sysinfo.yaml
```


### 7. Verify Workflow Contents (Optional)

You can verify workflow contents with the `describe` command.

**List workflows:**
```bash
./actor_iac.java list -w sysinfo
```

**Workflow details:**
```bash
./actor_iac.java describe -w sysinfo/collect-sysinfo.yaml --steps
```

If you write `description:` or `note:` in workflows, they can be viewed with the `describe` command.


## Under the hood

### Actor Tree Generation

When executing a workflow, actor-IaC reads the inventory file and generates an actor tree. actor-IaC creates node actors corresponding to each node definition in the inventory file and places them as child actors of the nodeGroup actor. In the example above, 6 node actors are created for the 6 nodes (node13 - node23).

```
ROOT Actor
└── nodeGroup Actor ("nodeGroup")
    ├── node-node13 Actor
    ├── node-node14 Actor
    ├── node-node15 Actor
    ├── node-node21 Actor
    ├── node-node22 Actor
    └── node-node23 Actor
```

The purpose of actor-IaC is to execute the same configuration tasks in parallel across multiple servers. To achieve parallel execution, actor-IaC places multiple node actors as child actors under the nodeGroup actor.

| Actor | Role |
|-------|------|
| nodeGroup Actor | Executes the main workflow. Controls which sub-workflow to execute on which nodes |
| node Actor | Executes sub-workflows. Defines specific commands to execute on each node |

### Parallel Execution of Sub-workflows

When the main workflow `main-collect-sysinfo.yaml` calls the `nodeGroup.apply()` method, the nodeGroup actor executes the sub-workflow `collect-sysinfo.yaml` in parallel on all child actors matching the specified pattern (`node-*`). Each node actor executes commands on the remote node via SSH and returns the results.

For log output aggregation and persistence, refer to [Viewing Execution Results](../035-system-inventory-results/).
