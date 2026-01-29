---
id: database-write
title: Database Log Writing
sidebar_position: 35
---

# Database Log Writing

## Problem Definition

**Goal:** Implement a write method that supports simultaneous writes from multiple processes while not affecting workflow execution speed.

As explained in [Simultaneous Writes from Multiple Processes](./030-multi-process-write.md), actor-IaC enables simultaneous access to the same database from multiple processes via `AUTO_SERVER` mode. However, simply writing to the database causes I/O wait for each log entry, slowing down workflow execution.

```
Problem: Synchronous writes
Node-1 → log() → Write to DB → Wait → Next process
Node-2 → log() → Write to DB → Wait → Next process
    ↑
    Workflow stops for each DB write
```

In cluster management where large numbers of logs occur simultaneously from multiple nodes, this delay accumulates and becomes a serious bottleneck.


## How to do it

With actor-IaC, asynchronous batch writing is performed automatically without user configuration.

When executing a workflow, logs from each node are written to the database via the following path:

```
Node-1 ─┐
Node-2 ─┼─→ outputMultiplexer ─→ DatabaseAccumulator ─→ H2LogStore ─→ DB
Node-3 ─┘
```

Asynchronization occurs at two points in this path:

1. **DatabaseAccumulator**: Uses fire-and-forget pattern to request DB write without waiting for completion
2. **H2LogStore**: Queues logs and a background thread writes them in batches

This allows node actors to proceed to the next process immediately after sending logs.

```
Actual behavior:
Node-1 → log() → Add to queue → Return immediately → Next process
                      ↓
              Background thread
              writes to DB in batches
```


## Under the hood

### Complete View of Write Path

Let's look at the detailed write path from node actors to the database.

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
// DatabaseAccumulator.java:66-86
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
// H2LogStore.java (conceptual diagram)
public class H2LogStore implements DistributedLogStore {
    private final BlockingQueue<LogTask> writeQueue;  // Write queue
    private final Thread writerThread;                 // Background thread
    private static final int BATCH_SIZE = 100;

    @Override
    public void log(long sessionId, String nodeId, String label,
                   LogLevel level, String message) {
        // Add to queue and return immediately
        writeQueue.offer(new LogTask.InsertLog(
            sessionId, nodeId, label, null, level, message, null, null));
    }

    // Background thread loop
    private void writerLoop() {
        List<LogTask> batch = new ArrayList<>(BATCH_SIZE);
        while (running.get() || !writeQueue.isEmpty()) {
            LogTask task = writeQueue.poll(100, TimeUnit.MILLISECONDS);
            if (task != null) {
                batch.add(task);
                writeQueue.drainTo(batch, BATCH_SIZE - 1);  // Get up to 100 items
                processBatch(batch);                         // Batch write
                batch.clear();
            }
        }
    }

    private void processBatch(List<LogTask> batch) {
        connection.setAutoCommit(false);
        for (LogTask task : batch) {
            task.execute(connection);  // Execute INSERT
        }
        connection.commit();           // Batch commit
        connection.setAutoCommit(true);
    }
}
```

#### Batch Write Flow

1. When `log()` method is called, `LogTask` is added to queue and returns immediately
2. Background thread retrieves tasks from queue
3. `drainTo()` retrieves up to 100 items at once
4. Start transaction, batch INSERT
5. Commit and complete


### Effects of Asynchronous Writing

| Aspect | Synchronous Write | Asynchronous Batch Write |
|--------|-------------------|--------------------------|
| Workflow execution speed | Delayed by DB writes | No impact |
| Transaction count | Per log entry | Per batch (up to 100) |
| DB load | High | Low |
| Log loss risk | None | Unwritten entries lost on abnormal termination |

About the last row: If the process terminates abnormally before buffered logs are written to DB, those logs are lost. However, actor-IaC calls `close()` at workflow end and waits until the queue is empty, so there's no problem during normal termination.
