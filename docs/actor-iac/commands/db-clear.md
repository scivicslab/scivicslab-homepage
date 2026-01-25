---
sidebar_position: 7
title: db-clear
---

# db-clear

The `db-clear` command deletes H2 log database files. This is useful when you want to clean up old logs or start fresh after testing.

## Synopsis

```bash
actor-iac db-clear --db <path> [options]
```

## Description

The `db-clear` command removes the H2 database files associated with actor-IaC workflow logging. It deletes both the main database file (`.mv.db`) and the trace file (`.trace.db`) if present.

Before deleting, the command checks if a log server is running on the default or specified HTTP port. This prevents accidental deletion of a database that is currently in use. You can bypass this check with the `--force` option.

## Required Options

| Option | Description |
|--------|-------------|
| `--db <path>` | Path to the H2 database file (without the `.mv.db` extension). |

## Optional Options

| Option | Description |
|--------|-------------|
| `-f, --force` | Force deletion without checking if a log server is running. Use with caution. |
| `--http-port <port>` | HTTP port to check for a running log server. Defaults to 29091 (the default info API port for log-serve). |

## Examples

### Delete a Log Database

Delete the default log database in the current directory:

```bash
./actor_iac.java db-clear --db ./actor-iac-logs
```

Example output:

```
Deleted: /home/user/project/actor-iac-logs.mv.db
Deleted: /home/user/project/actor-iac-logs.trace.db
Database cleared successfully.
```

### Force Delete

Delete even if a log server might be running:

```bash
./actor_iac.java db-clear --db ./actor-iac-logs --force
```

### Check Custom Port

If your log server uses a non-default HTTP port:

```bash
./actor_iac.java db-clear --db ./logs/shared --http-port 28891
```

## Safety Check

By default, the command checks if a log server is running before deleting. If a server is detected, the command fails with an error:

```
Error: Log server is running on HTTP port 29091
Please stop the log server first, or use --force to skip this check.
```

This prevents accidental deletion of a database that workflows are actively writing to. To proceed anyway, either:

1. Stop the log server first (`Ctrl+C` or wait for auto-shutdown)
2. Use the `--force` option (not recommended while server is running)

## Files Deleted

The command deletes the following files if they exist:

| File | Description |
|------|-------------|
| `<path>.mv.db` | Main H2 database file containing all data |
| `<path>.trace.db` | H2 trace file (debug logging, may not exist) |

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Database cleared successfully |
| 1 | Error (log server running, file not found, permission denied) |

## Use Cases

### Clean Up After Testing

After running integration tests that generate many log entries:

```bash
./actor_iac.java db-clear --db ./test-logs
```

### Reset Development Environment

Start fresh with no execution history:

```bash
./actor_iac.java db-clear --db ./actor-iac-logs
```

### Automated Cleanup

In a CI/CD pipeline, clean up before each test run:

```bash
./actor_iac.java db-clear --db ./ci-logs --force 2>/dev/null || true
./actor_iac.java run -d ./workflows -w test-suite --log-db ./ci-logs
```

## See Also

- [log-search](./log-search) - Query logs before deleting
- [log-serve](./log-serve) - Start a log server (check before clearing)
- [log-merge](./log-merge) - Consolidate logs before clearing source databases
