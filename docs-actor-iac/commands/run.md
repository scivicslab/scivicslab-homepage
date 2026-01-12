---
sidebar_position: 1
title: run
---

# run

The `run` command executes a workflow against target nodes. This is the primary command for running infrastructure automation tasks with actor-IaC.

## Synopsis

```bash
actor-iac run -d <directory> -w <workflow> [options]
```

## Description

The `run` command loads a workflow definition from the specified directory, optionally applies an overlay for environment-specific customization, and executes the workflow. When an inventory file is provided, the workflow runs against remote nodes via SSH. Without an inventory, the workflow runs locally.

During execution, all actions and their results are logged to an H2 database. The command exits with code 0 on success and non-zero on failure.

## Required Options

| Option | Description |
|--------|-------------|
| `-d, --dir <directory>` | Directory containing workflow files. This directory is scanned recursively for YAML, JSON, and XML files. |
| `-w, --workflow <name>` | Name of the workflow to execute. You can specify the name with or without the file extension. |

## Optional Options

### Inventory and Targeting

| Option | Description |
|--------|-------------|
| `-i, --inventory <file>` | Path to an Ansible-compatible inventory file. When specified, the workflow executes against remote nodes via SSH. |
| `-g, --group <name>` | Host group to target from the inventory. Defaults to `all` if not specified. |
| `--limit <hosts>` | Limit execution to specific hosts. Accepts a comma-separated list of hostnames or IP addresses. |

### Authentication

| Option | Description |
|--------|-------------|
| `-k, --ask-pass` | Prompt for SSH password before execution. By default, actor-IaC uses SSH agent for key-based authentication. |

### Overlay System

| Option | Description |
|--------|-------------|
| `-o, --overlay <directory>` | Overlay directory containing `overlay-conf.yaml`. Variables, patches, and name transformations from the overlay are applied to the base workflow before execution. |
| `--render-to <directory>` | Render overlay-applied workflows to the specified directory without executing. Useful for previewing the merged workflow. |

### Execution

| Option | Description |
|--------|-------------|
| `-t, --threads <count>` | Number of worker threads for CPU-bound operations. Defaults to 4. |
| `-v, --verbose` | Enable verbose output with detailed logging of each step execution. |

### Logging

actor-IaC supports three independent log outputs. Each can be enabled/disabled separately:

#### Console Output (stdout/stderr)

| Option | Description |
|--------|-------------|
| `-q, --quiet, --no-console-log` | Suppress all console output (stdout/stderr). Useful for high-performance batch execution where console output would slow down execution. |

#### Text File Logging

| Option | Description |
|--------|-------------|
| `--file-log, -l, --log <file>` | Custom log file path. By default, logs are written to `actor-iac-YYYYMMDDHHmm.log` in the current directory. |
| `--no-file-log, --no-log` | Disable text file logging (*.log files). |

#### Database Logging (H2)

| Option | Description |
|--------|-------------|
| `--db-log, --log-db <path>` | H2 database path for structured logging. Defaults to `actor-iac-logs` in the **current directory** (where the command is executed). |
| `--no-db-log, --no-log-db` | Disable H2 database logging. |
| `--db-log-server, --log-serve <host:port>` | Connect to an H2 log server at the specified address. Enables multiple workflow processes to share a single log database. Falls back to embedded mode if the server is unreachable. |
| `--embedded` | Force embedded H2 database mode instead of auto-detecting or starting a TCP server. |

### Other

| Option | Description |
|--------|-------------|
| `-L, --list-workflows` | List discovered workflows and exit without executing. |

## Examples

### Basic Local Execution

Run a workflow locally without an inventory:

```bash
./actor_iac.java run -d ./workflows -w hello-world
```

### Remote Execution with Inventory

Run a workflow against all nodes in the `webservers` group:

```bash
./actor_iac.java run -d ./workflows -w deploy -i inventory.ini -g webservers
```

### Using an Overlay

Apply a production overlay to the base workflow:

```bash
./actor_iac.java run -d ./workflows -w deploy -o ./overlays/production -i inventory.ini
```

### Password Authentication

Prompt for SSH password instead of using SSH agent:

```bash
./actor_iac.java run -d ./workflows -w deploy -i inventory.ini -g webservers -k
```

### Targeting Specific Hosts

Limit execution to specific hosts:

```bash
./actor_iac.java run -d ./workflows -w deploy -i inventory.ini --limit=192.168.1.10,192.168.1.11
```

### Verbose Mode

Enable detailed logging for troubleshooting:

```bash
./actor_iac.java run -d ./workflows -w deploy -i inventory.ini -v
```

### Using a Log Server

Connect to a shared log server for centralized logging:

```bash
./actor_iac.java run -d ./workflows -w deploy -i inventory.ini --db-log-server=localhost:29090
```

### High-Performance Execution

Disable console output and text file logging for maximum performance:

```bash
./actor_iac.java run -d ./workflows -w deploy -i inventory.ini --no-console-log --no-file-log
```

### Minimal Logging

Disable all logging outputs:

```bash
./actor_iac.java run -d ./workflows -w deploy -i inventory.ini --no-console-log --no-file-log --no-db-log
```

### Preview Merged Workflow

Render the overlay-applied workflow to see the final result without executing:

```bash
./actor_iac.java run -d ./workflows -o ./overlays/production --render-to ./rendered
```

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Workflow completed successfully |
| 1 | Workflow failed or encountered an error |
| 2 | Invalid command-line options |

## Logging Behavior

By default, the `run` command outputs to three destinations:

1. **Console**: Real-time output to stdout/stderr (disable with `--no-console-log` or `-q`)
2. **Text file**: A timestamped log file in the current directory (e.g., `actor-iac-202601111030.log`). Disable with `--no-file-log`.
3. **H2 database**: Structured logs in the current directory (e.g., `./actor-iac-logs.mv.db`). Disable with `--no-db-log`.

The database log enables structured querying with the `log-search` command. Each execution creates a new session with metadata about the workflow, overlay, inventory, and final status.

### Performance Tip

For high-performance batch execution, disable console output which can significantly slow down execution:

```bash
./actor_iac.java run -d ./workflows -w deploy -i inventory.ini --no-console-log
```

## See Also

- [list](./list) - List available workflows
- [describe](./describe) - Display workflow description
- [log-search](./log-search) - Query execution logs
- [log-serve](./log-serve) - Start a centralized log server
