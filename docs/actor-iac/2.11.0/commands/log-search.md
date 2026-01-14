---
sidebar_position: 4
title: log-search
---

:::caution Newer Version Available
This is documentation for version 2.11.0. [See the latest version](/docs/actor-iac/introduction).
:::

# log-search

The `log-search` command queries workflow execution logs stored in an H2 database. This enables you to review past executions, analyze failures, and audit what happened on each node.

## Synopsis

```bash
actor-iac log-search --db <path> [options]
```

## Description

The `log-search` command connects to an H2 log database and retrieves information about workflow executions. You can list all sessions, view session summaries, filter logs by node or severity level, and list the nodes that participated in a session.

Each workflow execution creates a session record with metadata like the workflow name, start time, end time, and final status. Within each session, individual log entries record what happened on each node.

## Required Options

| Option | Description |
|--------|-------------|
| `--db <path>` | Path to the H2 database file (without the `.mv.db` extension). |

## Optional Options

### Connection

| Option | Description |
|--------|-------------|
| `--server <host:port>` | Connect to an H2 log server instead of opening the database directly. Use this when logs are stored on a central server started with `log-serve`. |

### Session Selection

| Option | Description |
|--------|-------------|
| `-s, --session <id>` | Session ID to query. Defaults to the most recent session if not specified. |
| `--list` | List all recent sessions instead of showing logs. |

### Filtering

| Option | Description |
|--------|-------------|
| `-n, --node <id>` | Filter logs to show only entries from the specified node. |
| `--level <level>` | Minimum log level to display. Options: DEBUG, INFO, WARN, ERROR. Defaults to DEBUG. |
| `-w, --workflow <name>` | Filter sessions by workflow name (when using `--list`). |
| `-o, --overlay <name>` | Filter sessions by overlay name (when using `--list`). |
| `-i, --inventory <name>` | Filter sessions by inventory name (when using `--list`). |
| `--after <datetime>` | Filter sessions started after this time. Format: `YYYY-MM-DDTHH:mm:ss`. |
| `--since <duration>` | Filter sessions started within the specified duration. Format: `12h`, `1d`, `3d`, `1w`. |
| `--ended-since <duration>` | Filter sessions ended within the specified duration. |
| `--limit <count>` | Maximum number of entries to show. Defaults to 100. |

### Output Mode

| Option | Description |
|--------|-------------|
| `--summary` | Show session summary only (workflow name, status, duration). |
| `--list-nodes` | List all nodes that participated in the specified session. |

## Examples

### List Recent Sessions

View all recent workflow executions:

```bash
./actor_iac.java log-search --db ./workflows/actor-iac-logs --list
```

Example output:

```
Sessions:
================================================================================
#1    deployment-workflow              COMPLETED
      Overlay:   production
      Inventory: servers.ini
      Started:   2026-01-11T10:30:00+09:00
--------------------------------------------------------------------------------
#2    health-check                     COMPLETED
      Started:   2026-01-11T09:15:00+09:00
--------------------------------------------------------------------------------
#3    deployment-workflow              FAILED
      Overlay:   staging
      Started:   2026-01-10T16:45:00+09:00
--------------------------------------------------------------------------------
```

### View Session Summary

Get details about a specific session:

```bash
./actor_iac.java log-search --db ./workflows/actor-iac-logs -s 1 --summary
```

### View Logs for Latest Session

Display log entries from the most recent execution:

```bash
./actor_iac.java log-search --db ./workflows/actor-iac-logs
```

Example output:

```
Logs (level >= DEBUG):
================================================================================
[2026-01-11T10:30:00+09:00] INFO  [cli] Starting workflow: deployment-workflow
[2026-01-11T10:30:01+09:00] INFO  [node-web-01] Executing step: validate
[2026-01-11T10:30:02+09:00] INFO  [node-web-02] Executing step: validate
[2026-01-11T10:30:05+09:00] INFO  [node-web-01] Validation passed
[2026-01-11T10:30:06+09:00] INFO  [node-web-02] Validation passed
[2026-01-11T10:30:07+09:00] INFO  [cli] Workflow completed successfully
================================================================================
Total: 6 entries
```

### Filter by Node

Show logs only from a specific node:

```bash
./actor_iac.java log-search --db ./workflows/actor-iac-logs -n node-web-01
```

### Filter by Log Level

Show only errors and warnings:

```bash
./actor_iac.java log-search --db ./workflows/actor-iac-logs --level WARN
```

### Filter Sessions by Time

List sessions from the last 24 hours:

```bash
./actor_iac.java log-search --db ./workflows/actor-iac-logs --list --since 24h
```

List sessions from the last week:

```bash
./actor_iac.java log-search --db ./workflows/actor-iac-logs --list --since 1w
```

### Filter Sessions by Workflow

List only deployment sessions:

```bash
./actor_iac.java log-search --db ./workflows/actor-iac-logs --list -w deployment-workflow
```

### List Nodes in a Session

See which nodes participated in a session:

```bash
./actor_iac.java log-search --db ./workflows/actor-iac-logs -s 1 --list-nodes
```

Example output:

```
Nodes in session #1 (deployment-workflow):
======================================================================
NODE_ID                        STATUS     LOG_COUNT
----------------------------------------------------------------------
node-web-01                    SUCCESS    45
node-web-02                    SUCCESS    42
node-db-01                     SUCCESS    38
======================================================================
Total: 3 nodes
```

### Query a Log Server

Connect to a remote log server instead of a local database:

```bash
./actor_iac.java log-search --server localhost:29090 --db ./logs/shared --list
```

## Timestamp Format

All timestamps are displayed in ISO 8601 format with timezone offset (e.g., `2026-01-11T10:30:00+09:00`). This makes it unambiguous which time zone the timestamp refers to.

## Log Levels

Log entries have one of four severity levels:

| Level | Color | Description |
|-------|-------|-------------|
| DEBUG | Cyan | Detailed debugging information |
| INFO | Green | Normal operational messages |
| WARN | Yellow | Warning conditions that might need attention |
| ERROR | Red | Error conditions that caused failures |

When displaying logs in a terminal that supports ANSI colors, entries are color-coded by level.

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | Database error or session not found |

## See Also

- [run](./run) - Execute a workflow (creates log entries)
- [log-serve](./log-serve) - Start a centralized log server
- [log-merge](./log-merge) - Merge multiple log databases
