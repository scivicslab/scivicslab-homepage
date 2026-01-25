---
id: actor-logs
title: Displaying Logs for Specific Actors
sidebar_position: 40
---

## Problem Definition

You've checked the actor list within the session. Next, you want to extract and check logs for only a specific actor (node). Also, you want to extract only errors and warnings to identify problems.

**What to achieve:**
- Extract and display logs for only a specific node
- Filter by log level (ERROR, WARN, etc.)
- Efficiently get only needed information from a large volume of logs


## How to do it

### Display Logs for a Specific Actor

Specifying an actor name with the `--node` option displays only that actor's logs.

```bash
# Display node-node13 logs from session 2
./actor_iac.java log-info --db ./actor-iac-logs --session 2 --node node-node13
```

Output example:
```
Logs for node: node-node13
================================================================================
[2026-01-15T14:30:01+09:00] INFO  [node-node13] Starting workflow: collect-sysinfo
[2026-01-15T14:30:02+09:00] INFO  [node-node13] ===== HOSTNAME =====
[2026-01-15T14:30:02+09:00] INFO  [node-node13] node13.local
[2026-01-15T14:30:02+09:00] INFO  [node-node13] ===== OS INFO =====
[2026-01-15T14:30:02+09:00] INFO  [node-node13] NAME="Ubuntu"
...
================================================================================
Total: 57 lines
```

### Filter by Log Level

The `--level` option displays only logs at or above the specified level.

```bash
# ERROR only
./actor_iac.java log-info --db ./actor-iac-logs --session 2 --level ERROR

# WARN and above (WARN + ERROR)
./actor_iac.java log-info --db ./actor-iac-logs --session 2 --level WARN

# All logs (DEBUG and above)
./actor_iac.java log-info --db ./actor-iac-logs --session 2 --level DEBUG
```

### Limit Number of Displayed Lines

The `--limit` option limits the number of displayed lines.

```bash
# First 10 lines only
./actor_iac.java log-info --db ./actor-iac-logs --session 2 --limit 10

# Display all lines (specify large value)
./actor_iac.java log-info --db ./actor-iac-logs --session 2 --node node-node13 --limit 10000
```

### Combine with grep

You can pipe `log-info` output to grep for further filtering.

```bash
# Extract only GPU information
./actor_iac.java log-info --db ./actor-iac-logs --session 2 --node node-node13 | grep -A5 "GPU INFO"

# Display 5 lines before and after errors
./actor_iac.java log-info --db ./actor-iac-logs --session 2 --level ERROR | grep -B5 -A5 "Connection"
```


## Under the hood

**Log Level Hierarchy:**

| Level | Value | Description | Display Color |
|-------|-------|-------------|---------------|
| `DEBUG` | 0 | Debug information | Cyan |
| `INFO` | 1 | Normal execution information | Green |
| `WARN` | 2 | Warnings | Yellow |
| `ERROR` | 3 | Errors | Red |

Specifying `--level WARN` displays WARN (2) and above, meaning WARN and ERROR.

**Node ID Naming Convention:**

The `node-` prefix is added to node names defined in the inventory file.

```
Inventory: node13     → Log: node-node13
Inventory: web-server → Log: node-web-server
```

This is to distinguish node actors from other actors (cli, nodeGroup, etc.).


## Derived Problems and Solutions

### Problem: Don't know which actor name to specify

Don't know the actor name to specify with the `--node` option.

### Solution: First check actor list with --list-actors

```bash
# Check actor list
./actor_iac.java log-info --db ./actor-iac-logs --session 2 --list-actors

# Display logs with confirmed actor name
./actor_iac.java log-info --db ./actor-iac-logs --session 2 --node node-node13
```
