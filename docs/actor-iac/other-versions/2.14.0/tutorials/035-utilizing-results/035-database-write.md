---
id: database-write
title: H2 Database Log Management
sidebar_position: 35
---

# H2 Database Log Management

## Problem Definition

### Log Management in Large Distributed Environments

actor-IaC log output works fine when targeting a single local node. However, when executing commands in parallel across multiple nodes, logs become interleaved chronologically making them difficult to track.

Below is an example output when executing `apt-get update` simultaneously on 100 nodes.

```
[2025-01-03 10:00:01] [node-001] Starting apt-get update...
[2025-01-03 10:00:01] [node-002] Starting apt-get update...
[2025-01-03 10:00:01] [node-003] Starting apt-get update...
[2025-01-03 10:00:02] [node-001] Hit:1 http://archive.ubuntu.com...
[2025-01-03 10:00:02] [node-047] Starting apt-get update...
[2025-01-03 10:00:02] [node-002] Get:1 http://security.ubuntu.com...
... (completely interleaved and impossible to track)
```

### Scalability Challenges

With the log file approach, problems intensify as node count increases.

| Node Count | Approach | Problem |
|------------|----------|---------|
| 1 | Single log file | No issues |
| 10 | Single log file | Logs interleave and become hard to read |
| 100 | Per-node files | 100 files open simultaneously (still acceptable) |
| 1,000 | Per-node files | Reaches OS ulimit (typically 1024) |
| 10,000 | Per-node files | Complete breakdown |

### Write Speed Challenges

As explained in [Simultaneous Writes from Multiple Processes](./030-multi-process-write.md), actor-IaC enables simultaneous access to the same database from multiple processes via `AUTO_SERVER` mode. However, simply writing to the database causes I/O wait for each log entry, slowing down workflow execution.

```
Problem: Synchronous writes
Node-1 → log() → Write to DB → Wait → Next process
Node-2 → log() → Write to DB → Wait → Next process
    ↑
    Workflow stops for each DB write
```

### Design Requirements

Log management in large distributed environments must meet the following requirements:

1. **Scalability**: Must work with 10,000 nodes
2. **Real-time**: Must be able to check logs during execution
3. **Simplicity**: Avoid dependencies on external services (Kafka, Elasticsearch, etc.)
4. **Queryable**: Must support SQL queries
5. **Pure Java**: No JNI/native libraries required

---

## How to do it

### Adopting H2 Database

H2 Database was chosen as the database that meets all the above requirements.

| DB | Features | Suitability |
|----|----------|-------------|
| **H2** | Pure Java, fastest, single JAR | **Adopted** |
| HSQLDB | Pure Java, mature | Good |
| Derby | Apache, Pure Java, slow | Acceptable |
| SQLite | C implementation, requires JNI | Not recommended |

H2 is implemented in Pure Java so it runs in any environment without JNI, and persists to a single file (`logs.mv.db`) avoiding file descriptor issues.

### CLI Usage

Specify the `--log-db` option when executing workflows to save logs to H2 database.

```bash
# --log-db option saves logs to H2 database
./actor_iac.java run -d workflows -w main --log-db /path/to/logs

# DB file is created as logs.mv.db
```

### Log Query Commands

Use the `logs` subcommand to query saved logs.

```bash
# Display session list
./actor_iac.java logs --db /path/to/logs --list

# Display summary of latest session
./actor_iac.java logs --db /path/to/logs --summary

# Summary of specific session
./actor_iac.java logs --db /path/to/logs --session 42 --summary

# Display logs by node
./actor_iac.java logs --db /path/to/logs --node node-001

# Filter by level (WARN and above only)
./actor_iac.java logs --db /path/to/logs --level WARN
```

### Output Examples

```
$ ./actor_iac.java logs --db logs --list

Recent Sessions:
============================================================
#3   deploy-webservers           COMPLETED
      Started: 2025-01-03 15:30:00
------------------------------------------------------------
#2   deploy-webservers           FAILED
      Started: 2025-01-03 14:20:00
------------------------------------------------------------

$ ./actor_iac.java logs --db logs --summary

Session #3: deploy-webservers
  Started:  2025-01-03 15:30:00
  Ended:    2025-01-03 15:35:23
  Nodes:    100
  Status:   COMPLETED

  Results:
    SUCCESS: 98 nodes
    FAILED:  2 nodes
    Failed:  [node-047, node-089]

$ ./actor_iac.java logs --db logs --node node-047

Logs for node: node-047
================================================================================
[2025-01-03 15:30:01] INFO  [node-047] Starting workflow
[2025-01-03 15:30:02] INFO  [node-047] [init] executeCommand completed (0, 150ms)
[2025-01-03 15:32:45] ERROR [node-047] [update] Command failed (exit=100)
================================================================================
```

### Additional H2 Features

**Web Console (for development/debugging):**

```bash
# Start H2 Web Console
java -jar ~/.m2/repository/com/h2database/h2/2.2.224/h2-2.2.224.jar -web -webPort 8082

# Access http://localhost:8082 in browser
# JDBC URL: jdbc:h2:/path/to/logs
```

**H2 Shell (CLI queries):**

```bash
java -cp ~/.m2/repository/com/h2database/h2/2.2.224/h2-2.2.224.jar \
     org.h2.tools.Shell -url "jdbc:h2:./logs"

sql> SELECT * FROM sessions ORDER BY started_at DESC LIMIT 5;
sql> SELECT COUNT(*) FROM logs WHERE level = 'ERROR';
```

---

## Under the hood

### Schema Design

Three tables are defined in the H2 database.

```sql
-- Workflow execution sessions
CREATE TABLE sessions (
    id IDENTITY PRIMARY KEY,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    workflow_name VARCHAR(255),
    node_count INT,
    status VARCHAR(20) DEFAULT 'RUNNING'  -- RUNNING/COMPLETED/FAILED
);

-- Log entries
CREATE TABLE logs (
    id IDENTITY PRIMARY KEY,
    session_id BIGINT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    node_id VARCHAR(255) NOT NULL,
    vertex_name VARCHAR(255),
    action_name VARCHAR(255),
    level VARCHAR(10) NOT NULL,           -- DEBUG/INFO/WARN/ERROR
    message CLOB,                         -- Large content support
    exit_code INT,
    duration_ms BIGINT,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Node results (for success/failure aggregation)
CREATE TABLE node_results (
    id IDENTITY PRIMARY KEY,
    session_id BIGINT,
    node_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,          -- SUCCESS/FAILED
    reason VARCHAR(1000),
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    UNIQUE (session_id, node_id)
);

-- Indexes
CREATE INDEX idx_logs_session ON logs(session_id);
CREATE INDEX idx_logs_node ON logs(node_id);
CREATE INDEX idx_logs_level ON logs(level);
```

### Complete View of Write Path

Here is the write path from node actors to the database.

```
NodeIIAR
    │
    │ callByActionName("add", ...)
    ▼
outputMultiplexer (MultiplexerAccumulatorIIAR)
    │
    │ add(source, type, data)
    ▼
MultiplexerAccumulator
    │
    ├─→ ConsoleAccumulator → System.out
    ├─→ FileAccumulator → Log file (with --log-file)
    └─→ DatabaseAccumulator
            │
            │ tell (Fire-and-forget)
            ▼
        LogStoreIIAR (ActorRef<DistributedLogStore>)
            │
            │ logAction()
            ▼
        H2LogStore
            │
            │ offer to queue
            ▼
        writeQueue (BlockingQueue)
            │
            │ writerThread (background)
            ▼
        H2 Database
```

### Fire-and-Forget Pattern

`DatabaseAccumulator` uses the `tell` method to request DB writes asynchronously.

```java
// DatabaseAccumulator.java
@Override
public void add(String source, String type, String data) {
    if (logStoreActor == null || sessionId < 0) {
        return;
    }
    if (data == null || data.isEmpty()) {
        return;
    }

    String formattedData = formatOutput(source, data);

    // Fire-and-forget: Don't wait for DB write completion
    logStoreActor.tell(
        store -> store.logAction(sessionId, source, type, "output", 0, 0L, formattedData),
        dbExecutor
    );
}
```

The `tell` method sends a message to the actor and returns immediately. The caller does not wait for the result, so workflow execution is not affected even if DB writes take time.

### Asynchronous Batch Writing

`H2LogStore` queues logs and a background thread writes them in batches.

```java
public class H2LogStore implements DistributedLogStore {
    private final BlockingQueue<LogTask> writeQueue;
    private final Thread writerThread;
    private static final int BATCH_SIZE = 100;

    public H2LogStore(Path dbPath) throws SQLException {
        // AUTO_SERVER=TRUE: Enables simultaneous access from multiple processes
        String url = "jdbc:h2:" + dbPath.toAbsolutePath() + ";AUTO_SERVER=TRUE";
        this.connection = DriverManager.getConnection(url);

        // Start async batch writer thread
        this.writerThread = new Thread(this::writerLoop, "H2LogStore-Writer");
        this.writerThread.setDaemon(true);
        this.writerThread.start();
    }

    @Override
    public void log(long sessionId, String nodeId, String label,
                   LogLevel level, String message) {
        // Add to queue and return immediately
        writeQueue.offer(new LogTask.InsertLog(
            sessionId, nodeId, label, null, level, message, null, null));
    }

    private void writerLoop() {
        List<LogTask> batch = new ArrayList<>(BATCH_SIZE);
        while (running.get() || !writeQueue.isEmpty()) {
            LogTask task = writeQueue.poll(100, TimeUnit.MILLISECONDS);
            if (task != null) {
                batch.add(task);
                writeQueue.drainTo(batch, BATCH_SIZE - 1);  // Get up to 100 items
                processBatch(batch);
                batch.clear();
            }
        }
    }

    private void processBatch(List<LogTask> batch) {
        connection.setAutoCommit(false);
        for (LogTask task : batch) {
            task.execute(connection);
        }
        connection.commit();
        connection.setAutoCommit(true);
    }
}
```

### Simultaneous Access from Multiple Processes

H2's `AUTO_SERVER=TRUE` option enables simultaneous access from multiple processes. The first process to open the database automatically starts H2 Embedded Server, and subsequent processes connect to that server via TCP.

```
Terminal 1: actor-IaC running (writing)
┌─────────────────────────────────────┐
│ ./actor_iac.java run ... --log-db logs │
│   ↓                                        │
│ H2LogStore                                 │
│ (jdbc:h2:logs;AUTO_SERVER=TRUE)            │
│   → H2 Embedded Server auto-starts         │
└──────────┬─────────────────────────────────┘
           │
           ▼ TCP (automatic)
      logs.mv.db
           ▲
           │ TCP (automatic)
┌──────────┴─────────────────────────────────┐
│ ./actor_iac.java logs --db logs            │
│   ↓                                        │
│ H2LogReader                                │
│ (jdbc:h2:logs;ACCESS_MODE_DATA=r;AUTO_...) │
│   → Connects via TCP                       │
└────────────────────────────────────────────┘
Terminal 2: Log query (read-only)
```

### Package Structure

```
com.scivicslab.actoriac.log/
├── LogLevel.java           # enum: DEBUG, INFO, WARN, ERROR
├── LogEntry.java           # record: Log entry
├── SessionStatus.java      # enum: RUNNING, COMPLETED, FAILED
├── SessionSummary.java     # record: Session summary
├── DistributedLogStore.java # interface: Log store API
├── H2LogStore.java         # Write implementation (async batch)
└── H2LogReader.java        # Read-only implementation
```

### DistributedLogStore Interface

```java
public interface DistributedLogStore extends AutoCloseable {
    /** Start a new session */
    long startSession(String workflowName, int nodeCount);

    /** Record a log entry */
    void log(long sessionId, String nodeId, LogLevel level, String message);

    /** Record log with vertex name */
    void log(long sessionId, String nodeId, String vertexName,
             LogLevel level, String message);

    /** Record action result (with exit code and duration) */
    void logAction(long sessionId, String nodeId, String vertexName,
                   String actionName, int exitCode, long durationMs, String output);

    /** Mark node as successful */
    void markNodeSuccess(long sessionId, String nodeId);

    /** Mark node as failed */
    void markNodeFailed(long sessionId, String nodeId, String reason);

    /** End session */
    void endSession(long sessionId, SessionStatus status);

    /** Get logs by node */
    List<LogEntry> getLogsByNode(long sessionId, String nodeId);

    /** Get session summary */
    SessionSummary getSummary(long sessionId);
}
```

### Effects of Asynchronous Writing

| Aspect | Synchronous Write | Asynchronous Batch Write |
|--------|-------------------|--------------------------|
| Workflow execution speed | Delayed by DB writes | No impact |
| Transaction count | Per log entry | Per batch (up to 100) |
| DB load | High | Low |
| Log loss risk | None | Unwritten entries lost on abnormal termination |

About the last row: If the process terminates abnormally before buffered logs are written to DB, those logs are lost. However, actor-IaC calls `close()` at workflow end and waits until the queue is empty, so there's no problem during normal termination.

### Three-Layer Actor Structure

`H2LogStore` is a pure POJO that is actorized through actor-IaC's three-layer structure.

```
POJO Layer:    H2LogStore (implements DistributedLogStore)
                   ↓ wrap
Actor Layer:   ActorRef<DistributedLogStore>
                   ↓ extend
IIActor Layer: LogStoreIIAR (extends IIActorRef<DistributedLogStore>)
```

`LogStoreIIAR` implements `CallableByActionName`, allowing actions to be called by string from workflows.
