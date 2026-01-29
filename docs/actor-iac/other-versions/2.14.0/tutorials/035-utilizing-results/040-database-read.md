---
id: database-read
title: Database Log Reading
sidebar_position: 40
---

# Database Log Reading

## Problem Definition

**Goal:** Efficiently search and retrieve logs stored in the database.

Through the asynchronous batch writing explained in [Database Log Writing](./035-database-write.md), logs are accumulated in the H2 database. A reading function is needed to search and analyze these logs later.

Reading has the following requirements:

- Get session list
- Session details (summary, node list)
- Extract logs for specific nodes
- Filter by log level
- Filter by time range


## How to do it

You can search and display logs from the database with the `log-info` command.

### Display Session List

```bash
./actor_iac.java log-info --db ./actor-iac-logs
```

```
Sessions:
================================================================================
#6    main-update-packages            COMPLETED
      Started:   2026-01-26T14:05:00+09:00
--------------------------------------------------------------------------------
#5    main-collect-sysinfo            COMPLETED
      Started:   2026-01-26T14:00:00+09:00
--------------------------------------------------------------------------------
```

### Specific Session Details

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 5
```

```
Session #5: main-collect-sysinfo
Status: COMPLETED
Started: 2026-01-26T14:00:00+09:00
Ended: 2026-01-26T14:02:30+09:00
Duration: 2m 30s

Nodes (6):
  node-node11  SUCCESS
  node-node12  SUCCESS
  node-node13  SUCCESS
  node-node14  FAILED   SSH connection refused
  node-node15  SUCCESS
  node-node16  SUCCESS
```

### Extract Logs for Specific Node

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 5 --node node-node14
```

```
[node-node14] 2026-01-26T14:00:05 INFO  Connecting to 192.168.5.14...
[node-node14] 2026-01-26T14:00:35 ERROR SSH connection refused
[node-node14] 2026-01-26T14:00:35 ERROR Node failed: SSH connection refused
```

### Filter by Log Level

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 5 --level ERROR
```

```
[node-node14] 2026-01-26T14:00:35 ERROR SSH connection refused
[node-node14] 2026-01-26T14:00:35 ERROR Node failed: SSH connection refused
```

### Search by Time Range

```bash
# Sessions from the last hour
./actor_iac.java log-info --db ./actor-iac-logs --since 1h

# Since a specific date/time
./actor_iac.java log-info --db ./actor-iac-logs --since "2026-01-26T10:00:00"
```


## Under the hood

### H2LogReader Class

Log reading is handled by the `H2LogReader` class. `H2LogStore` holds an `H2LogReader` internally and delegates reading operations to it.

```java
// H2LogStore.java:85
this.reader = new H2LogReader(connection);

// H2LogStore.java:483-485
@Override
public List<LogEntry> getLogsByNode(long sessionId, String nodeId) {
    return reader.getLogsByNode(sessionId, nodeId);  // Delegate to H2LogReader
}
```

This design separates write logic (`H2LogStore`) from read logic (`H2LogReader`).


### Query Methods Provided

`H2LogReader` provides the following query methods:

| Method | Description | Usage |
|--------|-------------|-------|
| `listSessions(limit)` | Get session list | Default display of `log-info` |
| `listSessionsFiltered(...)` | Get filtered session list | `--since`, `--workflow` |
| `getSummary(sessionId)` | Get session summary | `--session N` |
| `getNodesInSession(sessionId)` | Get nodes in session | `--session N` |
| `getLogsByNode(sessionId, nodeId)` | Get logs for specific node | `--node` |
| `getLogsByLevel(sessionId, minLevel)` | Get logs at or above specified level | `--level` |
| `getLatestSessionId()` | Get latest session ID | Default session selection |


### SQL Query Implementation Example

`H2LogReader` executes SQL queries using standard JDBC API.

```java
// H2LogReader.java:91-106
public List<LogEntry> getLogsByNode(long sessionId, String nodeId) {
    List<LogEntry> entries = new ArrayList<>();
    try (PreparedStatement ps = connection.prepareStatement(
            "SELECT * FROM logs WHERE session_id = ? AND node_id = ? ORDER BY timestamp")) {
        ps.setLong(1, sessionId);
        ps.setString(2, nodeId);
        try (ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                entries.add(mapLogEntry(rs));
            }
        }
    }
    return entries;
}
```

With appropriate indexes configured, searches are efficient even with large amounts of logs.


### Database Schema

The three tables read by queries:

#### sessions Table

Records workflow execution sessions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | IDENTITY | Session ID (auto-increment) |
| `started_at` | TIMESTAMP | Start time |
| `ended_at` | TIMESTAMP | End time |
| `workflow_name` | VARCHAR | Workflow file name |
| `status` | VARCHAR | Execution status (RUNNING, COMPLETED, FAILED) |
| `node_count` | INT | Number of nodes |

#### logs Table

Records logs from all nodes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | IDENTITY | Log ID (auto-increment) |
| `session_id` | BIGINT | Parent session (foreign key) |
| `timestamp` | TIMESTAMP | Output time |
| `node_id` | VARCHAR | Node name |
| `level` | VARCHAR | Log level (INFO, WARN, ERROR) |
| `message` | CLOB | Log message |

#### node_results Table

Records final result for each node.

| Column | Type | Description |
|--------|------|-------------|
| `session_id` | BIGINT | Parent session (foreign key) |
| `node_id` | VARCHAR | Node name |
| `status` | VARCHAR | Execution result (SUCCESS, FAILED) |
| `reason` | VARCHAR | Failure reason (only when failed) |


### Separation of Reading and Writing

Why `H2LogStore` implements both read and write interfaces:

```
                     ┌─────────────────────────┐
                     │ <<interface>>           │
                     │ DistributedLogStore     │
                     ├─────────────────────────┤
                     │ // Write                │
                     │ +log()                  │
                     │ +logAction()            │
                     │ +startSession()         │
                     │ +endSession()           │
                     │ // Read                 │
                     │ +getLogsByNode()        │
                     │ +getSummary()           │
                     │ +listSessions()         │
                     └────────────┬────────────┘
                                  │ implements
                                  ▼
                     ┌─────────────────────────┐
                     │ H2LogStore              │
                     ├─────────────────────────┤
                     │ -reader: H2LogReader    │───┐
                     │ -writeQueue             │   │ delegates
                     ├─────────────────────────┤   │
                     │ +log() → add to queue   │   │
                     │ +getLogsByNode() ───────┼───┘
                     └─────────────────────────┘
                                               │
                     ┌─────────────────────────┐
                     │ H2LogReader             │←──┘
                     ├─────────────────────────┤
                     │ -connection             │
                     ├─────────────────────────┤
                     │ +getLogsByNode()        │
                     │ +getSummary()           │
                     │ +listSessions()         │
                     └─────────────────────────┘
```

With this design:
- Write: Asynchronous batch processing (via `H2LogStore`'s `writeQueue`)
- Read: Synchronous SQL queries (executed directly by `H2LogReader`)

Reading is synchronous (results must be returned) but independent of writing, so reading is possible even while the write queue is being processed.


### log-info Command Implementation

The `log-info` command (`LogsCLI` class) creates an `H2LogStore` instance and calls read methods.

```java
// LogsCLI.java (conceptual diagram)
public Integer call() {
    H2LogStore store = new H2LogStore(dbPath);

    if (sessionId != null) {
        // Specific session details
        SessionSummary summary = store.getSummary(sessionId);
        List<NodeInfo> nodes = store.getNodesInSession(sessionId);
        printSessionDetail(summary, nodes);
    } else {
        // Session list
        List<SessionSummary> sessions = store.listSessions(limit);
        printSessionList(sessions);
    }

    store.close();
    return 0;
}
```

`AUTO_SERVER=TRUE` mode allows running `log-info` from another process during workflow execution to read logs.
