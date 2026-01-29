---
id: database-location
title: Storing Logs in a Database
sidebar_position: 25
---

:::caution Newer Version Available
This is documentation for version 2.13.0. [See the latest version](/docs/actor-iac/introduction).
:::

# Storing Logs in a Database

## Problem Definition

**Goal:** Reliably collect and store workflow execution logs with central management.

In cluster management, workflows are executed in parallel across multiple nodes. Outputs from each node occur simultaneously and are displayed interleaved on the console. To investigate "what happened on which node" after execution, logs need to be saved.

Traditional log management required users to explicitly specify log file output destinations. If you forget to configure logging and execute, important information is lost. Logs can also become scattered across many files. The situation of "not having logs" during error investigation should be avoided.

actor-IaC automatically saves all execution logs to an H2 database. You can query the database with the `log-info` command to search and extract past execution results. This is achieved with simple command-line operations, without using elaborate mechanisms like distributed databases.


## How to do it

actor-IaC automatically saves logs to the database when executing workflows. No user configuration is required.

### Default Behavior

When you execute the `run` command, `actor-iac-logs.mv.db` is created in the current directory.

```
~/works/testcluster-iac/
├── actor_iac.java
├── inventory.ini
├── actor-iac-logs.mv.db    ← Automatically created
└── sysinfo/
    └── main-collect-sysinfo.yaml
```

If the database already exists, logs are appended to the existing database.

### Changing the Storage Location

To change the default storage location, use the `--log-db` option.

```bash
./actor_iac.java run -w workflow.yaml -i inventory.ini --log-db ./logs/myproject
```

To skip saving logs (e.g., for test runs), use the `--no-log-db` option.

```bash
./actor_iac.java run -w workflow.yaml -i inventory.ini --no-log-db
```


## Under the hood

### Database Schema

The log database consists of three tables.

**sessions table**

Records one workflow execution as one record.

| Column | Description | Example |
|--------|-------------|---------|
| id | Session ID | 3 |
| started_at / ended_at | Start/end time | 2026-01-15T10:00:00 |
| workflow_name | Workflow file name | sysinfo/main-collect-sysinfo.yaml |
| status | Execution status | COMPLETED |
| cwd | Current directory at execution | /home/user/works/testcluster |
| command_line | Execution command | run -w sysinfo/main.yaml -i inv.ini |

**logs table**

Records all node output line by line. Each line includes the node name (actor name), allowing extraction of specific node logs later.

| Column | Description | Example |
|--------|-------------|---------|
| id | Log ID | 1234 |
| session_id | Parent session | 3 |
| timestamp | Output time | 2026-01-15T10:00:05 |
| actor_name | Node name | node-node13 |
| level | Log level | INFO |
| message | Log message | ===== CPU INFO ===== |

**node_results table**

Records the final result for each node. Allows checking "which nodes succeeded/failed" without scanning all logs.

| Column | Description | Example |
|--------|-------------|---------|
| session_id | Parent session | 3 |
| actor_name | Node name | node-node13 |
| status | Execution result | COMPLETED |
| reason | Failure reason (only on failure) | SSH connection refused |


### Log Write Path

During workflow execution, output from each node is written to the database via the following path.

```
Each node → outputMultiplexer → logStore → logs table
                  │
                  ├→ Console output
                  └→ File output (optional)
```

Each node actor sends messages to outputMultiplexer, which distributes them to each output destination. For details on this mechanism, see [Database Write](./035-database-write.md).
