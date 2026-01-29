---
id: troubleshooting
title: Investigating Failure Causes with Logs
sidebar_position: 45
---

:::caution Newer Version Available
This is documentation for version 2.13.0. [See the latest version](/docs/actor-iac/introduction).
:::

# Investigating Failure Causes with Logs

## Problem Definition

**Goal:** Identify the cause and take action when some nodes fail during workflow execution.

When executing workflows across multiple nodes, only some nodes may fail. Since console output flows by, it's difficult to investigate later "which node failed" and "why it failed."

Using the log database makes it easy to identify failed nodes and confirm error details.


## How to do it

### Check Failure in Session List

```bash
./actor_iac.java log-info --db ./actor-iac-logs --since 1h
```

```
Sessions:
================================================================================
#5    main-collect-sysinfo           PARTIAL
      Inventory: inventory.ini
      Started:   2026-01-15T10:00:00+09:00
--------------------------------------------------------------------------------
```

The status is `PARTIAL` (partial failure).

### Check Which Nodes Failed

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 5 --list-actors
```

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

`node-node21` and `node-node22` are `FAILED`, and `LOG_LINES` is extremely low.

### Check Error Details for Failed Nodes

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 5 --node node-node21
```

```
Logs for node: node-node21
================================================================================
[2026-01-15T10:00:01+09:00] INFO  [node-node21] Connecting to 192.168.5.21...
[2026-01-15T10:00:01+09:00] ERROR [node-node21] SSH connection failed: Connection refused
[2026-01-15T10:00:01+09:00] ERROR [node-node21] Workflow execution aborted
================================================================================
Total: 3 lines
```

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 5 --node node-node22
```

```
Logs for node: node-node22
================================================================================
[2026-01-15T10:00:01+09:00] INFO  [node-node22] Connecting to 192.168.5.22...
[2026-01-15T10:00:31+09:00] ERROR [node-node22] SSH connection failed: Connection timed out
================================================================================
Total: 2 lines
```

### Remediation and Re-execution

Now that the problems have been identified, address them:

- `node21`: Start the SSH server (`sudo systemctl start sshd`)
- `node22`: Check network connection or firewall settings

After remediation, re-execute the workflow.


## Under the hood

### Session Status

The `status` column in the `sessions` table contains the following values:

| Status | Description |
|--------|-------------|
| `RUNNING` | Currently executing |
| `COMPLETED` | All nodes succeeded |
| `PARTIAL` | Some nodes failed |
| `FAILED` | All nodes failed |

### Node Status

The `status` column in the `node_results` table contains the following values:

| Status | Description |
|--------|-------------|
| `COMPLETED` | Completed successfully |
| `FAILED` | Failed (reason recorded in `reason` column) |

### Common Error Messages

| Error Message | Cause | Remedy |
|---------------|-------|--------|
| `Connection refused` | SSH server not running | `sudo systemctl start sshd` |
| `Connection timed out` | Network unreachable or firewall | Check network settings |
| `Authentication failed` | Invalid credentials | Check SSH key or password |
| `Host key verification failed` | Host key changed | Remove entry from `~/.ssh/known_hosts` |

### Problem Identification by LOG_LINES

The `LOG_LINES` count shown by `--list-actors` can indicate when failure occurred:

| LOG_LINES | Estimated Failure Timing |
|-----------|--------------------------|
| 0-5 lines | Failed at SSH connection stage |
| 10-30 lines | Failed during workflow execution |
| Similar to normal nodes | Failed near final step |
