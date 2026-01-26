---
id: utilizing-results
title: Utilizing System Information Collection Result Logs
sidebar_position: 35
---

This tutorial explains how to verify the execution results of the system information collection workflow created in the previous tutorial and how to utilize the log database.


## Prerequisites

You must satisfy the following conditions:

- Completed the system information collection tutorial
- Executed the workflow at least once

This tutorial assumes the following directory structure. The current directory is `~/works/testcluster-iac/`.

```
~/works/testcluster-iac/          ← Current directory
├── actor_iac.java
├── actor-iac-logs.mv.db          ← Log database automatically created during workflow execution
├── inventory.ini
└── sysinfo/
    ├── collect-sysinfo.yaml
    └── main-collect-sysinfo.yaml
```

All command examples in this tutorial are executed with `~/works/testcluster-iac/` as the current directory.


## Table of Contents

This tutorial consists of the following sections.

| Section | Content |
|---------|---------|
| Console Output | How to read console output during workflow execution |
| Cowsay Characters | How to change cowsay characters |
| Log File Output | How to save logs to files |
| log-info Command | How to utilize the log database (session list, filtering, actor list) |
| Troubleshooting | Investigation procedures when workflow fails on some nodes |
| Advanced Usage | Detailed confirmation of specific nodes, comparison with past, bulk error log confirmation |
| db-clear Command | How to clear the log database |


## Log Operation Command List

| Command | Description |
|---------|-------------|
| `log-info` | Search and display logs |
| `log-serve` | Start log server (centralized log collection from multiple hosts) |
| `log-merge` | Merge multiple log DBs into one |
| `db-clear` | Delete log DB |


## Console Output

When actor-IaC executes a workflow, it outputs the execution results to the console in real-time. Each log line is prefixed with `[actor-name]` to identify which actor generated the output.

```
[node-node13] ===== HOSTNAME =====
[node-node13] node13.example.com
[node-node14] ===== HOSTNAME =====
[node-node14] node14.example.com
```

Since multiple node actors execute in parallel, outputs from different nodes may be interleaved. The prefix allows you to identify which node each line came from.


## Log File Output

By default, actor-IaC does not output logs to text files. To enable text file log output, use the `-l` option.

```bash
./actor_iac.java run -w sysinfo/main-collect-sysinfo.yaml -i inventory.ini -g compute -l ./actor-iac.log
```

This creates a text log file `actor-iac.log` in the current directory. Text log files can be searched with grep.


## Using the log-info Command

The log database `actor-iac-logs.mv.db` stores all logs from all nodes. You can search and display logs using the `log-info` command.

### Session List

Display a list of workflow execution sessions.

```bash
./actor_iac.java log-info
```

```
Session List
================================================================================
#   Session ID                            Start Time            Status    Nodes
--------------------------------------------------------------------------------
1   sess-20260115-033324-a1b2c3d4        2026-01-15 03:33:24   SUCCESS   6
2   sess-20260115-041523-e5f6g7h8        2026-01-15 04:15:23   SUCCESS   6
3   sess-20260115-052147-i9j0k1l2        2026-01-15 05:21:47   FAILED    6
================================================================================
```

### Session Detail

Display details for a specific session.

```bash
./actor_iac.java log-info --session sess-20260115-033324-a1b2c3d4
```

### Actor Logs

Display logs for a specific actor within a session.

```bash
./actor_iac.java log-info --session sess-20260115-033324-a1b2c3d4 --actor node-node13
```

### Filtering by Log Level

Display only ERROR level logs.

```bash
./actor_iac.java log-info --session sess-20260115-052147-i9j0k1l2 --level ERROR
```


## Troubleshooting

When a workflow fails on some nodes, use the following procedure to investigate.

### 1. Check Session Status

```bash
./actor_iac.java log-info
```

Identify sessions with `FAILED` status.

### 2. Check Error Logs

```bash
./actor_iac.java log-info --session <session-id> --level ERROR
```

### 3. Check Specific Node Logs

```bash
./actor_iac.java log-info --session <session-id> --actor node-<nodename>
```

### Common Error Causes

| Error | Cause | Remedy |
|-------|-------|--------|
| Connection refused | SSH server not running | Start SSH server on target node |
| Permission denied | Authentication failed | Check ssh-agent registration |
| Command not found | Required command not installed | Install required packages |
| Timeout | Network or server issue | Check network connectivity |


## Advanced Usage

### Compare Current vs Past Results

Execute the same workflow and compare with past sessions.

```bash
# Execute current collection
./actor_iac.java run -w sysinfo/main-collect-sysinfo.yaml -i inventory.ini -g compute

# Compare with past session
./actor_iac.java log-info --session <old-session-id> --actor node-node13 > old.log
./actor_iac.java log-info --session <new-session-id> --actor node-node13 > new.log
diff old.log new.log
```

### Bulk Error Check

Check errors across all nodes in a session.

```bash
./actor_iac.java log-info --session <session-id> --level ERROR --all-actors
```


## db-clear Command

To clear the log database, use the `db-clear` command.

```bash
./actor_iac.java db-clear
```

This deletes all data in `actor-iac-logs.mv.db`. Use with caution.

To clear only specific sessions, use:

```bash
./actor_iac.java db-clear --session <session-id>
```


## Summary

- Console output: Real-time confirmation, identified by `[actor-name]` prefix
- Log file: Searchable with grep, default OFF
- Log database: Central management of all logs from all nodes, flexible search with SQL
