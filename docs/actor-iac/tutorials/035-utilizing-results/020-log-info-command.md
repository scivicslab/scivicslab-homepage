---
id: log-info-command
title: Utilizing the Log Database
sidebar_position: 20
---

## Problem Definition

You want to reliably store all logs from all compute nodes. You want central management so logs don't scatter and get lost in a mess of log files. However, you want to achieve this with simple command-line operations without using elaborate systems like distributed databases.


## Solution: Log Database

actor-IaC automatically saves all execution logs to an H2 database. You can query the database with the `log-info` command to search and extract past execution results.

**Difference from Ansible:**
Ansible does not save command output from each node. actor-IaC aggregates all output from all nodes into a database, allowing later search and reference.


## Table of Contents

| Section | Content |
|---------|---------|
| Database Location and Mechanism | Log DB storage location, AUTO_SERVER mode, --log-db option |
| Displaying and Searching Session List | Session list, filtering by workflow name and time |
| Checking Session Details | Session summary, actor list |
| Displaying Logs for Specific Actors | Per-node logs, log level filter |


## Database Location

By default, actor-IaC creates the log database `actor-iac-logs.mv.db` in the current directory.

```bash
# Check database file
ls -la ./actor-iac-logs.mv.db
```

You can specify a different location with the `--log-db` option:

```bash
./actor_iac.java run -w workflow.yaml --log-db /path/to/logs.mv.db
```


## Session List

Display a list of all execution sessions:

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


## Session Details

View details for a specific session:

```bash
./actor_iac.java log-info --session sess-20260115-033324-a1b2c3d4
```


## Actor Logs

View logs for a specific actor within a session:

```bash
./actor_iac.java log-info --session sess-20260115-033324-a1b2c3d4 --actor node-node13
```


## Log Level Filtering

Display only ERROR level logs:

```bash
./actor_iac.java log-info --session sess-20260115-052147-i9j0k1l2 --level ERROR
```
