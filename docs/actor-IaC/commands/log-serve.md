---
sidebar_position: 5
title: log-serve
---

# log-serve

The `log-serve` command starts an H2 TCP server for centralized workflow logging. This enables multiple actor-IaC processes to write to a single shared log database.

## Synopsis

```bash
actor-iac log-serve --db <path> [options]
```

## Description

When running multiple workflow processes concurrently on the same machine, each process would normally create its own embedded H2 database. This leads to scattered logs that are difficult to query and analyze together. The `log-serve` command solves this problem by providing a central log server that all workflow processes can connect to.

The server runs on localhost only because actor-IaC operates from a single operation terminal. Remote nodes do not write to the log server directly; the operation terminal collects results from remote nodes and writes them to the log database.

```
┌─────────────────────────────────────────────────┐
│              Operation Terminal                  │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │        H2 Log Server (TCP)             │     │
│  │        Port 29090                       │     │
│  └─────────────────┬──────────────────────┘     │
│                    │                             │
│    ┌───────────────┼───────────────┐            │
│    │               │               │            │
│  ┌─┴─┐           ┌─┴─┐           ┌─┴─┐         │
│  │WF1│           │WF2│           │WF3│         │
│  └───┘           └───┘           └───┘         │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Required Options

| Option | Description |
|--------|-------------|
| `--db <path>` | Database file path (without the `.mv.db` extension). The database is created if it does not exist. |

## Optional Options

### Server Configuration

| Option | Description |
|--------|-------------|
| `-p, --port <port>` | TCP port for the H2 server. Defaults to 29090. actor-IaC reserves ports 29090-29100 for log servers. |
| `--info-port <port>` | HTTP port for the info API. Defaults to TCP port minus 200 (e.g., 28890 for TCP port 29090). |

### Auto-Shutdown

| Option | Description |
|--------|-------------|
| `--auto-shutdown` | Enable automatic shutdown when no connections are active for the idle timeout period. |
| `--idle-timeout <seconds>` | Idle timeout in seconds for auto-shutdown. Defaults to 300 (5 minutes). |
| `--check-interval <seconds>` | How often to check for active connections. Defaults to 60 (1 minute). |

### Other

| Option | Description |
|--------|-------------|
| `-v, --verbose` | Enable verbose output showing detailed server activity. |
| `--find` | Scan for running H2 log servers on localhost and display their status. Does not start a new server. |

## Examples

### Start a Log Server

Start a log server with the default port:

```bash
./actor_iac.java log-serve --db ./logs/shared
```

Example output:

```
============================================================
H2 Log Server Started
============================================================
  TCP Port:   29090
  HTTP Port:  28890
  Database:   /home/user/project/logs/shared.mv.db

Connect from workflows using:
  --log-serve=localhost:29090

Server info API:
  curl http://localhost:28890/info

Query logs using:
  actor-iac log-search --server=localhost:29090 --db /home/user/project/logs/shared --list
============================================================

Server is running. Press Ctrl+C to stop.
```

### Start on a Custom Port

Use a different port if the default is in use:

```bash
./actor_iac.java log-serve --db ./logs/shared --port 29091
```

### Auto-Shutdown Mode

Start a server that automatically shuts down after 10 minutes of inactivity:

```bash
./actor_iac.java log-serve --db ./logs/shared --auto-shutdown --idle-timeout 600
```

This is useful when you want the server to clean up after all workflows complete, without manual intervention.

### Find Running Servers

Scan localhost for existing log servers:

```bash
./actor_iac.java log-serve --find
```

Example output:

```
============================================================
Scanning for H2 Log Servers on localhost...
============================================================

H2 Log Servers Found:
------------------------------------------------------------
  Port 29090: H2 Database Server
           HTTP API: http://localhost:28890/info
           Version:  2.11.0
           Database: /home/user/project/logs/shared
           Sessions: 15
           Started:  2026-01-11T09:00:00+09:00
           Connect:  --log-serve=localhost:29090

============================================================
```

## HTTP Info API

The log server provides an HTTP endpoint at `/info` that returns server information in JSON format. This is used by the `--find` option and can be called directly for monitoring.

```bash
curl http://localhost:28890/info
```

Response:

```json
{
  "server": "actor-iac-log-server",
  "version": "2.11.0",
  "port": 29090,
  "db_path": "/home/user/project/logs/shared",
  "db_file": "/home/user/project/logs/shared.mv.db",
  "started_at": "2026-01-11T09:00:00+09:00",
  "session_count": 15
}
```

## Connecting from Workflows

To connect a workflow process to the log server, use the `--log-serve` option with the `run` command:

```bash
./actor_iac.java run -d ./workflows -w deploy --log-serve=localhost:29090
```

If the server is not reachable, the workflow falls back to embedded mode with a warning.

## Database Schema

The log server initializes the database with the standard actor-IaC schema:

- **sessions**: Workflow execution metadata (workflow name, status, timestamps)
- **logs**: Individual log entries (timestamp, node ID, level, message)
- **node_results**: Per-node completion status

Indexes are created for efficient querying by session, node, timestamp, and log level.

## Port Range

actor-IaC reserves TCP ports 29090-29100 for log servers. The `--find` option scans this range when looking for existing servers. The HTTP info port defaults to TCP port minus 200, so it falls in the 28890-28900 range.

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Server shutdown normally (Ctrl+C or auto-shutdown) |
| 1 | Failed to start server (port in use, database error) |

## See Also

- [run](./run) - Execute a workflow (can connect to log server)
- [log-search](./log-search) - Query logs from the database
- [log-merge](./log-merge) - Merge scattered log databases
