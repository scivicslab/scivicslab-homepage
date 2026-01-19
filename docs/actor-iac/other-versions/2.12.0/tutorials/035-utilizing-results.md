---
id: utilizing-results
title: "Tutorial: Utilizing System Information Collection Results"
sidebar_position: 35
---

This tutorial explains how to verify execution results of the system information collection workflow created in the System Inventory tutorial and how to utilize the log database.


## Prerequisites

Users must satisfy the following conditions:

- The System Inventory tutorial has been completed
- Workflow files are placed in the `~/works/testcluster-iac/sysinfo/` directory


## 1. Verify Execution Results

When actor-IaC executes a workflow, system information collected from each node is output to the console. The following is a partial example of the output.

```
$ ./actor_iac.java run -d ./sysinfo -w main-collect-sysinfo -i inventory.ini -g compute
2026-01-15 10:00:00 INFO Loading workflow: main-collect-sysinfo.yaml
2026-01-15 10:00:00 INFO Creating node actors for group: compute
2026-01-15 10:00:00 INFO Created 6 node actors for group 'compute'
2026-01-15 10:00:00 INFO Starting workflow execution...
 ________________________________
/ [main-collect-sysinfo]         \
| - states: ["0", "end"]         |
|  actions:                      |
|  - actor: nodeGroup            |
|  method: apply                 |
\  arguments: [3 keys]           /
 --------------------------------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||

2026-01-15 10:00:00 INFO Applying method 'runWorkflow' to 6 actors matching 'node-*'
...
===== HOSTNAME =====
node13.local
===== OS INFO =====
NAME="Ubuntu"
VERSION="22.04.3 LTS (Jammy Jellyfish)"
ID=ubuntu
Linux node13.local 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux
===== CPU INFO =====
Architecture:            x86_64
CPU(s):                  32
Thread(s) per core:      2
Core(s) per socket:      16
Socket(s):               1
Model name:              AMD Ryzen 9 5950X 16-Core Processor
===== MEMORY INFO =====
              total        used        free      shared  buff/cache   available
Mem:           62Gi       8.2Gi        45Gi       256Mi       8.5Gi        53Gi
Swap:         8.0Gi          0B       8.0Gi
===== DISK INFO =====
NAME   SIZE TYPE MODEL
sda    1.8T disk Samsung SSD 870
nvme0n1 1.0T disk Samsung SSD 980 PRO
===== GPU INFO =====
NVIDIA GeForce RTX 3090, 24576 MiB, 525.147.05
===== NETWORK INFO =====
1: lo: <LOOPBACK,UP,LOWER_UP>
    inet 127.0.0.1/8 scope host lo
2: enp5s0: <BROADCAST,MULTICAST,UP,LOWER_UP>
    inet 192.168.5.13/24 brd 192.168.5.255 scope global enp5s0
...
```

:::note
Due to parallel execution, output from each node is displayed in mixed order of arrival. To check information from only a specific node, users filter using the log database.
:::


## 2. Utilize the Log Database

actor-IaC automatically saves all execution logs to an H2 database (`actor-iac-logs.mv.db`). Users can search and extract past execution results using the `logs` command.

### 2.1 Database File Location

By default, the log database is created in the current directory where the `run` command is executed.

```
~/works/testcluster-iac/
├── actor_iac.java
├── inventory.ini
├── actor-iac-logs.mv.db    ← Log database
└── sysinfo/
    ├── collect-sysinfo.yaml
    └── main-collect-sysinfo.yaml
```

:::tip
Users can change the database save location using the `--log-db` option of the `run` command.
```bash
./actor_iac.java run -d ./sysinfo -w main-collect-sysinfo -i inventory.ini -g compute --log-db ./logs/myproject
```
:::


### 2.2 Display Session List

The `--list` option displays the session list. A session refers to one execution of the `run` command.

```bash
./actor_iac.java logs --db ./actor-iac-logs --list
```

Example output:
```
Sessions:
================================================================================
#1    main-collect-sysinfo           COMPLETED
      Inventory: inventory.ini
      Started:   2026-01-15T10:00:00+09:00
--------------------------------------------------------------------------------
#2    main-collect-sysinfo           COMPLETED
      Inventory: inventory.ini
      Started:   2026-01-15T14:30:00+09:00
--------------------------------------------------------------------------------
#3    main-collect-sysinfo           FAILED
      Inventory: inventory.ini
      Started:   2026-01-15T16:45:00+09:00
--------------------------------------------------------------------------------
```

Each session is assigned a unique session ID (#1, #2, #3...). Users use session IDs to search for specific execution results.


### 2.3 Filter Sessions

The session list can be filtered using the following options.

#### Filter by Workflow Name

```bash
# Display only sessions for workflows starting with main-
./actor_iac.java logs --db ./actor-iac-logs --list -w main-collect-sysinfo
```

#### Filter by Time

```bash
# Display sessions started within the last 24 hours
./actor_iac.java logs --db ./actor-iac-logs --list --since 24h

# Display sessions started within the last 3 days
./actor_iac.java logs --db ./actor-iac-logs --list --since 3d

# Display sessions started within the last week
./actor_iac.java logs --db ./actor-iac-logs --list --since 1w

# Display sessions started after a specific datetime (ISO 8601 format)
./actor_iac.java logs --db ./actor-iac-logs --list --after 2026-01-15T00:00:00
```

Units available with the `--since` option:

| Unit | Meaning | Example |
|------|---------|---------|
| `m` | minutes | `30m` = from 30 minutes ago |
| `h` | hours | `12h` = from 12 hours ago |
| `d` | days | `3d` = from 3 days ago |
| `w` | weeks | `1w` = from 1 week ago |


### 2.4 Display Session Summary

The `--summary` option displays an overview of the specified session.

```bash
# Display summary of the latest session
./actor_iac.java logs --db ./actor-iac-logs --summary

# Display summary of a specific session (#2)
./actor_iac.java logs --db ./actor-iac-logs --session 2 --summary
```

Example output:
```
Session #2: main-collect-sysinfo
  Status:    COMPLETED
  Inventory: inventory.ini
  Started:   2026-01-15T14:30:00+09:00
  Ended:     2026-01-15T14:30:45+09:00
  Duration:  45 seconds
  Nodes:     6
  Log entries: 342
```


### 2.5 Display Node List in Session

The `--list-nodes` option displays a list of nodes that participated in the session.

```bash
# Display node list for the latest session
./actor_iac.java logs --db ./actor-iac-logs --list-nodes

# Display node list for a specific session (#2)
./actor_iac.java logs --db ./actor-iac-logs --session 2 --list-nodes
```

Example output:
```
Nodes in session #2 (main-collect-sysinfo):
======================================================================
NODE_ID                        STATUS     LOG_COUNT
----------------------------------------------------------------------
node-node13                    COMPLETED  57
node-node14                    COMPLETED  57
node-node15                    COMPLETED  57
node-node21                    COMPLETED  57
node-node22                    COMPLETED  57
node-node23                    COMPLETED  57
======================================================================
Total: 6 nodes
```

The `LOG_COUNT` for each node indicates the number of log lines output by the node.


### 2.6 Display Logs for a Specific Node

The `-n` or `--node` option displays logs for only a specific node. Users use the option to extract information from only a specific node from mixed output during parallel execution.

```bash
# Display logs for node-node13 in the latest session
./actor_iac.java logs --db ./actor-iac-logs --node node-node13

# Display logs for node-node13 in a specific session (#2)
./actor_iac.java logs --db ./actor-iac-logs --session 2 --node node-node13
```

Example output:
```
Logs for node: node-node13
================================================================================
[2026-01-15T14:30:01+09:00] INFO  [node-node13] Starting workflow: collect-sysinfo
[2026-01-15T14:30:02+09:00] INFO  [node-node13] ===== HOSTNAME =====
[2026-01-15T14:30:02+09:00] INFO  [node-node13] node13.local
[2026-01-15T14:30:02+09:00] INFO  [node-node13] ===== OS INFO =====
[2026-01-15T14:30:02+09:00] INFO  [node-node13] NAME="Ubuntu"
[2026-01-15T14:30:02+09:00] INFO  [node-node13] VERSION="22.04.3 LTS (Jammy Jellyfish)"
...
================================================================================
Total: 57 entries
```

:::tip
Node IDs have the `node-` prefix. When defined as `node13` in the inventory file, the node appears as `node-node13` in logs.
:::


### 2.7 Filter by Log Level

The `--level` option displays only logs at or above the specified log level.

```bash
# Display only ERROR level logs
./actor_iac.java logs --db ./actor-iac-logs --level ERROR

# Display WARN and above (WARN, ERROR) logs
./actor_iac.java logs --db ./actor-iac-logs --level WARN

# Display INFO and above (INFO, WARN, ERROR) logs (default)
./actor_iac.java logs --db ./actor-iac-logs --level INFO

# Display DEBUG and above (all logs)
./actor_iac.java logs --db ./actor-iac-logs --level DEBUG
```

Log level hierarchy:

| Level | Description | Color |
|-------|-------------|-------|
| `DEBUG` | Debug information | Cyan |
| `INFO` | Normal execution information | Green |
| `WARN` | Warnings | Yellow |
| `ERROR` | Errors | Red |


### 2.8 Limit Display Line Count

The `--limit` option limits the maximum number of log lines displayed. The default is 100 lines.

```bash
# Display only the first 10 lines
./actor_iac.java logs --db ./actor-iac-logs --limit 10

# Display up to 1000 lines
./actor_iac.java logs --db ./actor-iac-logs --limit 1000

# Display all lines for a specific node's logs
./actor_iac.java logs --db ./actor-iac-logs --node node-node13 --limit 10000
```


## 3. When Workflow Fails on Some Nodes

This section shows the investigation procedure when system information collection was executed on 6 nodes but some nodes failed.

### Error Occurred During Workflow Execution

```bash
$ ./actor_iac.java run -d ./sysinfo -w main-collect-sysinfo -i inventory.ini -g compute
...
2026-01-15 10:00:45 ERROR [node-node21] SSH connection failed: Connection refused
2026-01-15 10:00:45 ERROR [node-node22] SSH connection failed: Connection timed out
...
```

Console output scrolls away, so users check details from the log database.

### Step 1: Confirm Failure in Session List

```bash
$ ./actor_iac.java logs --db ./actor-iac-logs --list --since 1h
```

Output:
```
Sessions:
================================================================================
#5    main-collect-sysinfo           PARTIAL
      Inventory: inventory.ini
      Started:   2026-01-15T10:00:00+09:00
--------------------------------------------------------------------------------
```

The status shows `PARTIAL` (partial failure).

### Step 2: Identify Which Nodes Failed

```bash
$ ./actor_iac.java logs --db ./actor-iac-logs --session 5 --list-nodes
```

Output:
```
Nodes in session #5 (main-collect-sysinfo):
======================================================================
NODE_ID                        STATUS     LOG_COUNT
----------------------------------------------------------------------
node-node13                    COMPLETED  57
node-node14                    COMPLETED  57
node-node15                    COMPLETED  57
node-node21                    FAILED     3
node-node22                    FAILED     2
node-node23                    COMPLETED  57
======================================================================
Total: 6 nodes
```

`node-node21` and `node-node22` are `FAILED`, and their `LOG_COUNT` is extremely low. The failure occurred at the SSH connection stage.

### Step 3: Check Error Details for Failed Nodes

```bash
$ ./actor_iac.java logs --db ./actor-iac-logs --session 5 --node node-node21
```

Output:
```
Logs for node: node-node21
================================================================================
[2026-01-15T10:00:01+09:00] INFO  [node-node21] Connecting to 192.168.5.21...
[2026-01-15T10:00:01+09:00] ERROR [node-node21] SSH connection failed: Connection refused
[2026-01-15T10:00:01+09:00] ERROR [node-node21] Workflow execution aborted
================================================================================
Total: 3 entries
```

`Connection refused` indicates the SSH server is not running.

```bash
$ ./actor_iac.java logs --db ./actor-iac-logs --session 5 --node node-node22
```

Output:
```
Logs for node: node-node22
================================================================================
[2026-01-15T10:00:01+09:00] INFO  [node-node22] Connecting to 192.168.5.22...
[2026-01-15T10:00:31+09:00] ERROR [node-node22] SSH connection failed: Connection timed out
================================================================================
Total: 2 entries
```

`Connection timed out` indicates network unreachability or firewall blocking.

### Step 4: Resolution and Re-execution

The issues have been identified, so users address the issues:

- `node21`: Start the SSH server (`sudo systemctl start sshd`)
- `node22`: Check network connectivity or firewall settings

After addressing the issues, users re-execute the workflow.


## 4. Check Specific Node Details Later

Due to mixed output from parallel execution, there are cases when users want to check information from only a specific node later.

### Want to Check GPU Information for node15

The workflow completed successfully, but users want to check GPU information for node15 in detail.

```bash
$ ./actor_iac.java logs --db ./actor-iac-logs --node node-node15 | grep -A5 "GPU INFO"
```

Output:
```
[2026-01-15T10:00:25+09:00] INFO  [node-node15] ===== GPU INFO =====
[2026-01-15T10:00:25+09:00] INFO  [node-node15] NVIDIA GeForce RTX 4090, 24564 MiB, 545.23.08
```

Users can confirm that node15 has an RTX 4090 installed.

### Want to Compare GPU Information Across All Nodes

```bash
$ ./actor_iac.java logs --db ./actor-iac-logs --session 5 | grep "GPU INFO" -A1
```

Output:
```
[2026-01-15T10:00:15+09:00] INFO  [node-node13] ===== GPU INFO =====
[2026-01-15T10:00:15+09:00] INFO  [node-node13] NVIDIA GeForce RTX 3090, 24576 MiB, 525.147.05
[2026-01-15T10:00:18+09:00] INFO  [node-node14] ===== GPU INFO =====
[2026-01-15T10:00:18+09:00] INFO  [node-node14] NVIDIA GeForce RTX 3090, 24576 MiB, 525.147.05
[2026-01-15T10:00:25+09:00] INFO  [node-node15] ===== GPU INFO =====
[2026-01-15T10:00:25+09:00] INFO  [node-node15] NVIDIA GeForce RTX 4090, 24564 MiB, 545.23.08
[2026-01-15T10:00:28+09:00] INFO  [node-node23] ===== GPU INFO =====
[2026-01-15T10:00:28+09:00] INFO  [node-node23] No NVIDIA GPU detected via lspci
```

From the output, users can understand the following:
- node13, node14: RTX 3090 (driver 525.147.05)
- node15: RTX 4090 (driver 545.23.08)
- node23: No GPU

node23 is the only node without a GPU. For workflows requiring GPU computation, users need to exclude node23.


## 5. Compare with Past Execution Results

When collecting system information regularly, users can detect changes by comparing with past results.

### Check if Memory Usage Has Increased Compared to a Week Ago

```bash
# Find sessions from a week ago
$ ./actor_iac.java logs --db ./actor-iac-logs --list --since 1w -w main-collect-sysinfo
```

Output:
```
Sessions:
================================================================================
#1    main-collect-sysinfo           COMPLETED
      Started:   2026-01-08T10:00:00+09:00
--------------------------------------------------------------------------------
#3    main-collect-sysinfo           COMPLETED
      Started:   2026-01-12T10:00:00+09:00
--------------------------------------------------------------------------------
#5    main-collect-sysinfo           COMPLETED
      Started:   2026-01-15T10:00:00+09:00
--------------------------------------------------------------------------------
```

```bash
# Memory information for node13 from a week ago (session #1)
$ ./actor_iac.java logs --db ./actor-iac-logs --session 1 --node node-node13 | grep -A3 "MEMORY INFO"
```

Output:
```
[2026-01-08T10:00:12+09:00] INFO  [node-node13] ===== MEMORY INFO =====
[2026-01-08T10:00:12+09:00] INFO  [node-node13]               total        used        free
[2026-01-08T10:00:12+09:00] INFO  [node-node13] Mem:           62Gi       5.1Gi        48Gi
```

```bash
# Memory information for node13 from today (session #5)
$ ./actor_iac.java logs --db ./actor-iac-logs --session 5 --node node-node13 | grep -A3 "MEMORY INFO"
```

Output:
```
[2026-01-15T10:00:12+09:00] INFO  [node-node13] ===== MEMORY INFO =====
[2026-01-15T10:00:12+09:00] INFO  [node-node13]               total        used        free
[2026-01-15T10:00:12+09:00] INFO  [node-node13] Mem:           62Gi       8.2Gi        45Gi
```

Memory usage increased from 5.1Gi to 8.2Gi over the week. There may be a process continuously consuming memory.


## 6. Check Error Logs in Bulk

To detect issues early in large-scale clusters, users check only error logs.

```bash
$ ./actor_iac.java logs --db ./actor-iac-logs --level ERROR --limit 1000
```

Output:
```
Logs (level >= ERROR):
================================================================================
[2026-01-15T10:00:01+09:00] ERROR [node-node21] SSH connection failed: Connection refused
[2026-01-15T10:00:31+09:00] ERROR [node-node22] SSH connection failed: Connection timed out
[2026-01-15T10:00:25+09:00] ERROR [node-node15] Command failed: nvidia-smi: command not found
================================================================================
Total: 3 entries
```

Users can see there are 3 errors. On node15, the `nvidia-smi` command was not found (possibly NVIDIA drivers are not installed).

To check details of each error, users specify the node and display logs:

```bash
$ ./actor_iac.java logs --db ./actor-iac-logs --node node-node15 | grep -B5 -A5 "nvidia-smi"
```


## Summary

This tutorial covered how to verify execution results of the system information collection workflow and how to utilize the log database.

**Key options of the logs command:**

| Option | Description |
|--------|-------------|
| `--db` | Path to database file (required) |
| `--list` | Display session list |
| `-s, --session` | Specify target session ID |
| `-n, --node` | Display logs for a specific node |
| `--list-nodes` | Display node list in session |
| `--summary` | Display session summary |
| `--level` | Filter by log level |
| `--since` | Filter by relative time |
| `--limit` | Limit display count |

By utilizing the log database feature of actor-IaC, users can reference past execution results later and efficiently investigate causes when issues occur.
