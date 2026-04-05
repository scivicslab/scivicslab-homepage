---
id: cli-commands
sidebar_position: 90
title: "CLI Command Reference"
description: "Complete CLI command reference for Turing-workflow. Covers usage, options, and examples for run, list, describe, log-search, log-serve, log-merge, and db-clear commands."
keywords:
  - Turing-workflow
  - CLI
  - commands
  - run
  - log-search
  - log-merge
  - db-clear
---

# CLI Command Reference

A comprehensive reference document covering all Turing-workflow commands.

## Basic Usage

```bash
./turing_workflow.java --help
```

## Command List

| Command | Description |
|----------|------|
| `run` | Execute a workflow |
| `list` | List steps within a workflow |
| `describe` | Display detailed workflow information |
| `log-search` | Search the log database |
| `log-serve` | Start the log viewer HTTP server |
| `log-merge` | Merge multiple log databases |
| `db-clear` | Delete the log database |

---

## `run` - Workflow Execution

Reads a workflow YAML and executes steps against specified nodes.

### Syntax

```bash
./turing_workflow.java run -w <workflow> [options]
```

### Required Options

| Option | Description |
|------------|------|
| `-w`, `--workflow` | Path to workflow directory or file |

### Options

| Option | Description | Default |
|------------|------|------------|
| `-d`, `--dir` | Working directory | Current directory |
| `-i`, `--inventory` | Path to inventory file | Default within workflow |
| `-g`, `--group` | Target node group | All groups |
| `--limit` | Limit target nodes (comma-separated) | No limit |
| `-k`, `--ask-pass` | Use SSH password authentication | Key authentication |
| `-o`, `--overlay` | Overlay configuration file | None |
| `--render-to` | Output destination for rendered results | None |
| `-t`, `--threads` | Number of parallel execution threads | 4 |
| `-v`, `--verbose` | Verbose output mode | Disabled |

### Logging Options

| Option | Description | Default |
|------------|------|------------|
| `-q`, `--quiet` | Suppress console output | Disabled |
| `-l`, `--log` | Path to log file | None |
| `--log-db` | Path to log database | `./turing-workflow-logs` |
| `--no-log-db` | Disable database logging | Enabled |
| `--log-serve` | Start log server after execution | Disabled |
| `--embedded` | Embedded mode (for external integration) | Disabled |

### Display Options

| Option | Description |
|------------|------|
| `-c`, `--cowfile` | Specify cowsay character (`list` to show available) |

### Examples

**Local execution (basic)**

```bash
./turing_workflow.java run -w ./workflows/deploy
```

**Remote execution (with inventory)**

```bash
./turing_workflow.java run -w ./workflows/deploy -i ./inventory/production.yaml
```

**With overlay**

```bash
./turing_workflow.java run -w ./workflows/deploy -o ./overlays/staging.yaml
```

**Password authentication**

```bash
./turing_workflow.java run -w ./workflows/deploy -i ./inventory/servers.yaml -k
```

**Verbose output**

```bash
./turing_workflow.java run -w ./workflows/deploy -v
```

**Start log server after execution**

```bash
./turing_workflow.java run -w ./workflows/deploy --log-serve
```

**High performance (increased threads)**

```bash
./turing_workflow.java run -w ./workflows/deploy -t 16
```

**Report only output**

```bash
./turing_workflow.java run -w ./workflows/deploy -q --render-to ./report.html
```

### Exit Codes

| Code | Meaning |
|--------|------|
| 0 | Success |
| 1 | Workflow execution error |
| 2 | Argument error |

---

## `list` - Step Listing

Lists steps within a workflow.

### Syntax

```bash
./turing_workflow.java list -w <workflow-directory>
```

### Required Options

| Option | Description |
|------------|------|
| `-w`, `--workflow` | Path to workflow directory |

### Output Format

| Column | Description |
|--------|------|
| Step | Step number |
| Name | Step name (vertex name) |
| Type | Step type (command, script, copy, etc.) |
| Target | Execution target |

### Example Output

```
Step  Name                Type      Target
----  ------------------  --------  --------
1     check-disk-space    command   all
2     backup-config       script    all
3     deploy-package      copy      all
4     restart-service     command   all
5     verify-health       command   all
```

---

## `describe` - Workflow Details

Displays the structure and details of each step in a workflow.

### Syntax

```bash
./turing_workflow.java describe -w <workflow> [options]
```

### Required Options

| Option | Description |
|------------|------|
| `-w`, `--workflow` | Path to workflow directory or file |

### Options

| Option | Description | Default |
|------------|------|------------|
| `-o`, `--overlay` | Display with overlay configuration applied | None |
| `--steps` | Show detailed description for each step | Disabled |

### Example Output

```
Workflow: deploy-application
  Directory: ./workflows/deploy
  Steps: 5
  Groups: web-servers, db-servers

  Step 1: check-disk-space
    Type: command
    Command: df -h /opt
    On-Failure: abort

  Step 2: backup-config
    Type: script
    Script: scripts/backup.sh
    On-Failure: abort

  Step 3: deploy-package
    Type: copy
    Source: packages/app-2.0.tar.gz
    Destination: /opt/app/
    On-Failure: rollback → Step 2
```

---

## `log-search` - Log Search

Searches and displays log entries from the log database.

### Syntax

```bash
./turing_workflow.java log-search --db <path> [options]
```

### Required Options

| Option | Description |
|------------|------|
| `--db` | Path to log database |

### Options

| Option | Description | Default |
|------------|------|------------|
| `--server` | Remote log server URL | Local |
| `-s`, `--session` | Filter by session ID | All sessions |
| `--list` | Display session list | Disabled |
| `-n`, `--node` | Filter by node name | All nodes |
| `--level` | Filter by log level | All levels |
| `-w` | Filter by workflow name | All |
| `-o` | Output format | text |
| `-i` | Case insensitive | Disabled |
| `--after` | Logs after specified datetime (ISO 8601) | No limit |
| `--since` | Logs within specified period (e.g., `1h`, `30m`) | No limit |
| `--limit` | Maximum number of entries to display | 100 |
| `--summary` | Display session summary | Disabled |
| `--list-nodes` | Display node list | Disabled |

### Examples

**Display session list**

```bash
./turing_workflow.java log-search --db ./turing-workflow-logs --list
```

**Display logs for a specific session**

```bash
./turing_workflow.java log-search --db ./turing-workflow-logs -s abc123
```

**Filter by node and level**

```bash
./turing_workflow.java log-search --db ./turing-workflow-logs -n web-server-01 --level ERROR
```

**Filter by time range**

```bash
./turing_workflow.java log-search --db ./turing-workflow-logs --since 2h
./turing_workflow.java log-search --db ./turing-workflow-logs --after 2026-04-01T10:00:00
```

### Log Levels

| Level | Color | Description |
|--------|-----|------|
| ERROR | Red | Error. Operation failed |
| WARN | Yellow | Warning. Potential issue |
| INFO | White | Information. Normal operation record |
| DEBUG | Gray | Debug. Detailed execution information |
| TRACE | Dark gray | Trace. Most detailed information |

---

## `log-merge` - Log Merge

Merges multiple log databases into one.

### Syntax

```bash
./turing_workflow.java log-merge --target <path> [options]
```

### Required Options

| Option | Description |
|------------|------|
| `--target` | Target database path for merge |

### Options

| Option | Description | Default |
|------------|------|------------|
| `--scan` | Directory to search for log databases | Current directory |
| `--dry-run` | Display targets without actual merge | Disabled |
| `--skip-duplicates` | Skip duplicate entries | Disabled |
| `-v`, `--verbose` | Verbose output | Disabled |

### Examples

**Scan directory and merge**

```bash
./turing_workflow.java log-merge --target ./merged-logs --scan ./project/
```

**Dry run (verify before execution)**

```bash
./turing_workflow.java log-merge --target ./merged-logs --scan ./project/ --dry-run
```

**With verbose output**

```bash
./turing_workflow.java log-merge --target ./merged-logs --scan ./project/ -v
```

### Duplicate Detection

`log-merge` detects duplicates by combining session ID and timestamp. When the `--skip-duplicates` option is specified, entries that already exist in the target are automatically skipped. Without this option, the command stops with an error when duplicates are detected.

---

## `db-clear` - Database Deletion

Deletes log database files.

### Syntax

```bash
./turing_workflow.java db-clear --db <path> [options]
```

### Required Options

| Option | Description |
|------------|------|
| `--db` | Path to database to delete |

### Options

| Option | Description | Default |
|------------|------|------------|
| `-f`, `--force` | Delete without confirmation prompt | With confirmation |
| `--http-port` | Log server port (for shutdown confirmation) | 8080 |

### Safety Check

Without `-f`, a confirmation prompt is displayed before deletion:

```
Database: ./turing-workflow-logs
Files to delete:
  - turing-workflow-logs.mv.db (12.3 MB)
  - turing-workflow-logs.trace.db (0.1 MB)

Are you sure you want to delete these files? [y/N]
```

### Files Deleted

| File | Description |
|----------|------|
| `*.mv.db` | H2 database main file |
| `*.trace.db` | H2 trace log |
| `*.lock.db` | H2 lock file (if present) |
