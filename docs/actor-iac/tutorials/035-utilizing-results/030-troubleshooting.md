---
id: troubleshooting
title: When Workflow Fails on Some Nodes
sidebar_position: 30
---

This shows the investigation procedure when running system information collection on 6 nodes and some nodes fail.


## Error Occurred During Workflow Execution

```bash
$ ./actor_iac.java run -w sysinfo/main-collect-sysinfo.yaml -i inventory.ini -g compute
...
[node-node21] 2026-01-15 10:00:45 ERROR SSH connection failed: Connection refused
[node-node22] 2026-01-15 10:00:45 ERROR SSH connection failed: Connection timed out
...
```

Since console output flows by, check details from the log database.


## Step 1: Check Failure in Session List

```bash
$ ./actor_iac.java log-info --db ./actor-iac-logs --since 1h
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

The status is `PARTIAL` (partial failure).


## Step 2: Check Which Nodes Failed

```bash
$ ./actor_iac.java log-info --db ./actor-iac-logs --session 5 --list-actors
```

Output:
```
Nodes in session #5 (main-collect-sysinfo):
======================================================================
NODE_ID                        STATUS     LOG_LINES
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

`node-node21` and `node-node22` are `FAILED`, and `LOG_LINES` is extremely low. This indicates failure at the SSH connection stage.


## Step 3: Check Error Details for Failed Nodes

```bash
$ ./actor_iac.java log-info --db ./actor-iac-logs --session 5 --node node-node21
```

Output:
```
Logs for node: node-node21
================================================================================
[2026-01-15T10:00:01+09:00] INFO  [node-node21] Connecting to 192.168.5.21...
[2026-01-15T10:00:01+09:00] ERROR [node-node21] SSH connection failed: Connection refused
[2026-01-15T10:00:01+09:00] ERROR [node-node21] Workflow execution aborted
================================================================================
Total: 3 lines
```

`Connection refused` indicates the SSH server is not running.

```bash
$ ./actor_iac.java log-info --db ./actor-iac-logs --session 5 --node node-node22
```

Output:
```
Logs for node: node-node22
================================================================================
[2026-01-15T10:00:01+09:00] INFO  [node-node22] Connecting to 192.168.5.22...
[2026-01-15T10:00:31+09:00] ERROR [node-node22] SSH connection failed: Connection timed out
================================================================================
Total: 2 lines
```

`Connection timed out` indicates network unreachability or firewall blocking.


## Step 4: Remediation and Re-execution

Now that the problems have been identified, address them:

- `node21`: Start the SSH server (`sudo systemctl start sshd`)
- `node22`: Check network connection or firewall settings

After remediation, re-execute the workflow.
