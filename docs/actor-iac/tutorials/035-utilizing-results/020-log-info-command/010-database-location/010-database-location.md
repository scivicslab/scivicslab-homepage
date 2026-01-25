---
id: database-location
title: Storing Logs in a Database
sidebar_position: 10
---

# Storing Logs in a Database

## Problem Definition

**Goal:** Reliably collect and store workflow execution logs.

In cluster management, workflows are executed in parallel against multiple nodes. Output from each node occurs simultaneously and is displayed mixed on the console. To investigate "what happened on which node" after execution, logs need to be saved.

In traditional log management, users had to explicitly specify log file output destinations. If you forget log settings and execute, important information is lost. Especially in error situations, you want to avoid "I didn't take logs" scenarios.


## How to do it

actor-IaC automatically saves logs to a database during workflow execution. No user configuration is required.

### Default Behavior

When you execute the `run` command, `actor-iac-logs.mv.db` is created in the current directory.

```
~/works/testcluster-iac/
├── actor_iac.java
├── inventory.ini
├── actor-iac-logs.mv.db    ← Auto-created
└── sysinfo/
    └── main-collect-sysinfo.yaml
```

If the database already exists, logs are appended to the existing database.

### Changing the Storage Location

To change the default storage location, use the `--log-db` option.

```bash
./actor_iac.java run -w workflow.yaml -i inventory.ini --log-db ./logs/myproject
```

If you don't want to save logs for test runs, use the `--no-log-db` option.

```bash
./actor_iac.java run -w workflow.yaml -i inventory.ini --no-log-db
```


## Under the hood

### Database Schema

The log database consists of 3 tables.

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

Records output from all nodes line by line. Each line records the node name (actor name), so you can extract logs for only a specific node later.

| Column | Description | Example |
|--------|-------------|---------|
| id | Log ID | 1234 |
| session_id | Associated session | 3 |
| timestamp | Output time | 2026-01-15T10:00:05 |
| actor_name | Node name | node-node13 |
| level | Log level | INFO |
| message | Log message | ===== CPU INFO ===== |

**node_results table**

Records the final result for each node. Allows checking "which node succeeded/failed" without scanning all logs.

| Column | Description | Example |
|--------|-------------|---------|
| session_id | Associated session | 3 |
| actor_name | Node name | node-node13 |
| status | Execution result | COMPLETED |
| reason | Failure reason (only on failure) | SSH connection refused |


### Log Write Path

During workflow execution, output from each node is written to the database through the following path.

```
Each node → outputMultiplexer → logStore → logs table
                  │
                  ├→ Console output
                  └→ File output (optional)
```

Each node actor sends messages to outputMultiplexer, and outputMultiplexer distributes to each output destination. For details of this mechanism, see [Actor Model Log Collection](./012-log-write-path.md).


### Concurrent Writes from Multiple Processes

When actor-IaC is executed simultaneously from multiple terminals, all processes can write to the same database.

```
Terminal 1: ./actor_iac.java run -w workflow-A.yaml ...
Terminal 2: ./actor_iac.java run -w workflow-B.yaml ...
```

This behavior is achieved by H2 database's `AUTO_SERVER` mode. When the first process opens the database, H2 starts a TCP server, and subsequent processes connect to that server. When all processes terminate, the server automatically shuts down.

`AUTO_SERVER` mode identifies by the absolute path of the database file. If executed from the same current directory, they write to the same database; if executed from different directories, they become different databases.
