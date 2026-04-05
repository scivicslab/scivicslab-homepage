---
id: PluginLogDb_260403_oo01
sidebar_position: 30
title: "plugin-log-db: Workflow Logging with H2 Database"
description: "A plugin providing asynchronous recording and querying of workflow execution logs using the H2 embedded database."
keywords:
  - H2 database
  - logging
  - workflow log
  - session management
  - batch writing
  - distributed log
---

# plugin-log-db

A plugin that records and queries workflow execution logs on a per-session basis using the H2 embedded database. It supports high performance through asynchronous batch writing and flexible SQL-based queries.

## Features

- **Pure Java**: No native dependencies (H2 is an embedded database)
- **Single file storage**: All logs stored in a `.mv.db` file
- **Asynchronous batch writing**: High throughput via `BlockingQueue` + dedicated writer thread
- **Read/Write separation**: Separate JDBC connections for reads and writes
- **SQL queries**: Flexible searching by node, level, or session

## Database Schema

### `sessions` Table

Management table for workflow execution sessions.

| Column | Type | Description |
|---|---|---|
| `id` | IDENTITY | Session ID (auto-increment) |
| `started_at` | TIMESTAMP | Start time |
| `ended_at` | TIMESTAMP | End time |
| `workflow_name` | VARCHAR(255) | Workflow name |
| `overlay_name` | VARCHAR(255) | Overlay name |
| `inventory_name` | VARCHAR(255) | Inventory name |
| `node_count` | INT | Number of nodes |
| `status` | VARCHAR(20) | `RUNNING`, `SUCCESS`, `FAILED` |
| `cwd` | VARCHAR(1000) | Working directory |
| `git_commit` | VARCHAR(50) | Git commit hash |
| `git_branch` | VARCHAR(255) | Git branch name |
| `command_line` | VARCHAR(2000) | Execution command line |
| `plugin_version` | VARCHAR(50) | Plugin version |
| `plugin_commit` | VARCHAR(50) | Plugin commit hash |

### `logs` Table

Individual log entries.

| Column | Type | Description |
|---|---|---|
| `id` | IDENTITY | Log ID |
| `session_id` | BIGINT | Session ID (foreign key) |
| `timestamp` | TIMESTAMP | Recording time |
| `node_id` | VARCHAR(255) | Node identifier |
| `label` | CLOB | Transition label |
| `action_name` | CLOB | Action name |
| `level` | VARCHAR(10) | `DEBUG`, `INFO`, `WARN`, `ERROR` |
| `message` | CLOB | Log message |
| `exit_code` | INT | Command exit code |
| `duration_ms` | BIGINT | Execution time (milliseconds) |

### `node_results` Table

Final results per node.

| Column | Type | Description |
|---|---|---|
| `session_id` | BIGINT | Session ID |
| `node_id` | VARCHAR(255) | Node identifier |
| `status` | VARCHAR(20) | `SUCCESS` or `FAILED` |
| `reason` | VARCHAR(1000) | Failure reason (optional) |

## Usage

### `H2LogStore` (write + read)

```java
// File-based DB (for production, AUTO_SERVER=TRUE for concurrent access)
H2LogStore store = new H2LogStore(Path.of("./workflow-logs/mylog"));

// In-memory DB (for testing)
H2LogStore store = new H2LogStore();

// Session lifecycle
long sessionId = store.startSession("deploy-workflow", "prod", "hosts.ini", 3);

// Log recording (asynchronous, fire-and-forget)
store.log(sessionId, "node-web1", LogLevel.INFO, "Starting deployment");

// Record action result
store.logAction(sessionId, "node-web1", "deploy",
    "kubectl apply", 0, 1500, "deployment.apps/web configured");

// Node results
store.markNodeSuccess(sessionId, "node-web1");
store.markNodeFailed(sessionId, "node-db1", "Connection timeout");

// End session (flushes all queued writes before updating)
store.endSession(sessionId, SessionStatus.SUCCESS);

// Text log file (optional)
store.setTextLogFile(Path.of("./workflow.log"));

// Close (stops writer thread + disconnects connections)
store.close();
```

### `H2LogReader` (read-only)

```java
// Direct connection from file
H2LogReader reader = new H2LogReader(Path.of("./workflow-logs/mylog"));

// Connection via TCP (remote reading)
H2LogReader reader = new H2LogReader("192.168.1.10", 9092, "/path/to/db");

// Via shared connection
H2LogReader reader = new H2LogReader(connection);

// Latest session
long latestId = reader.getLatestSessionId();

// Session summary
SessionSummary summary = reader.getSummary(latestId);
System.out.println("Status: " + summary.getStatus());
System.out.println("Duration: " + summary.getDuration());
System.out.println("Nodes: " + summary.getNodeCount());
System.out.println("Errors: " + summary.getErrorCount());

// Logs by node
List<LogEntry> logs = reader.getLogsByNode(sessionId, "node-web1");

// Logs by level (specified level and above)
List<LogEntry> errors = reader.getLogsByLevel(sessionId, LogLevel.ERROR);

// Session list
List<SessionSummary> recent = reader.listSessions(20);

// Filtered session list
List<SessionSummary> filtered = reader.listSessionsFiltered(
    "deploy-workflow", null, null, null, 10);

// Node information within session
List<H2LogReader.NodeInfo> nodes = reader.getNodesInSession(sessionId);
```

## Internal Architecture

### Asynchronous Write Pipeline

```
Application Thread                    Writer Thread
      |                                       |
  log()/logAction()                      writerLoop()
      |                                       |
  writeQueue.offer(LogTask)  ------>  writeQueue.poll()
      |                              drainTo(batch, 100)
      |                              processBatch()
      |                                  setAutoCommit(false)
      |                                  task.execute(writeConnection)
      |                                  commit()
      |                                  setAutoCommit(true)
```

- **Batch size**: Up to 100 tasks
- **Write connection**: Dedicated to writer thread
- **Read connection**: For queries via `H2LogReader` and `getConnection()`

### `startSession` / `endSession` Synchronization

`startSession` and `endSession` are executed via the write queue and wait for completion using `CountDownLatch`. This guarantees:

- The session ID returned by `startSession` is definitely committed to the DB
- All logs queued before `endSession` have been written

## `LogStoreActor` `@Action` Methods

| Action | Arguments (JSON) | Description |
|---|---|---|
| `log` | `{sessionId, nodeId, level, message}` | Record a log entry |
| `logAction` | `{sessionId, nodeId, label, actionName, exitCode, durationMs, output}` | Record an action result |
| `startSession` | `{workflowName, overlayName?, inventoryName?, nodeCount}` | Start a session |
| `endSession` | `{sessionId, status}` | End a session |
| `markNodeSuccess` | `{sessionId, nodeId}` | Record node success |
| `markNodeFailed` | `{sessionId, nodeId, reason}` | Record node failure |

## `DatabaseAccumulator`

An `Accumulator` implementation that asynchronously records `outputMultiplexer` output to the H2 database.

```java
DatabaseAccumulator dbAcc = new DatabaseAccumulator(logStoreActor, dbExecutor, sessionId);
multiplexer.addTarget(dbAcc);
```

## Log Levels

| Level | Description |
|---|---|
| `DEBUG` | Detailed debugging information |
| `INFO` | Normal execution information |
| `WARN` | Warning (processing continues) |
| `ERROR` | Error (processing failed) |

Level comparison is available via `LogLevel.isAtLeast(LogLevel min)`.

## Dependencies

- `com.h2database:h2:2.2.224` - H2 embedded database
- `org.json:json:20231013` - JSON parsing
- No dependencies on other plugins
