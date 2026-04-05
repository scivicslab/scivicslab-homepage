---
id: database-connection
sidebar_position: 100
title: "Database Connection Sharing"
description: "Database connection sharing design in Turing-workflow. Covers the DistributedLogStore interface, H2LogStore implementation, ActorSystemAware interface, and thread safety."
keywords:
  - Turing-workflow
  - database connection
  - DistributedLogStore
  - H2LogStore
  - ActorSystemAware
  - connection sharing
  - thread safety
---

# Database Connection Sharing

Multiple components in Turing-workflow need to access the database. This document explains the connection sharing design and patterns for plugin developers.

## Problem

During workflow execution, the following components require database access:

- **`NodeGroupInterpreter`**: Writing workflow execution logs
- **`DatabaseAccumulator`**: Log aggregation and search
- **Plugins**: Reading and writing custom data

Plugins generated via the loader actor's `createChild` do not automatically obtain database connections. An explicit connection sharing mechanism is required.

## Design

### `DistributedLogStore` Interface

An interface that abstracts database access. It is managed as a singleton pattern, sharing a single instance across the entire application.

```java
public interface DistributedLogStore {
    static DistributedLogStore getInstance() { ... }
    static void setInstance(DistributedLogStore store) { ... }

    Connection getConnection();
    void close();
}
```

### `H2LogStore` Implementation

The H2 database implementation of `DistributedLogStore`. It manages connections to the turing-workflow-logs database.

```java
H2LogStore store = new H2LogStore("jdbc:h2:./turing-workflow-logs;AUTO_SERVER=TRUE");
DistributedLogStore.setInstance(store);
```

### `ActorSystemAware` Interface

An interface that allows plugins to automatically receive resources during actor system initialization. Plugins implementing this interface are automatically initialized when generated via `createChild`.

```java
public interface ActorSystemAware {
    void setActorSystem(IIActorSystem system);
}
```

## Lifecycle Management in `RunCLI`

`RunCLI` (the entry point for the `run` command) manages the database connection lifecycle in the following order:

1. **create**: Generate `H2LogStore` instance and establish database connection
2. **`setInstance`**: Register with singleton via `DistributedLogStore.setInstance(store)`
3. **Workflow execution**: All components obtain connection via `getInstance()`
4. **`setInstance(null)`**: Clear the singleton reference
5. **close**: Close database connection and release resources

```
RunCLI starts
  │
  ├─ H2LogStore store = new H2LogStore(...)
  ├─ DistributedLogStore.setInstance(store)
  │
  ├─ Workflow execution
  │   ├─ NodeGroupInterpreter → DistributedLogStore.getInstance()
  │   ├─ DatabaseAccumulator  → DistributedLogStore.getInstance()
  │   └─ Plugins              → DistributedLogStore.getInstance()
  │
  ├─ DistributedLogStore.setInstance(null)
  └─ store.close()
```

## Thread Safety

### `AUTO_SERVER=TRUE`

By specifying `AUTO_SERVER=TRUE` in the H2 database connection URL, multiple processes can access the database simultaneously. H2 automatically switches to server mode and mediates connections.

### Local `PreparedStatement`

Each thread (actor) uses a local `PreparedStatement`. While the `Connection` object is shared, individual SQL operations are executed with thread-local `PreparedStatement`s, so there is no interference at the query level.

```
Thread-1 (NodeIIAR-node1)
  └─ PreparedStatement ps1 = conn.prepareStatement(...)

Thread-2 (NodeIIAR-node2)
  └─ PreparedStatement ps2 = conn.prepareStatement(...)

Thread-3 (Plugin-report)
  └─ PreparedStatement ps3 = conn.prepareStatement(...)
```

## Patterns for Plugin Developers

To access the database from a plugin, follow these patterns.

### 1. Implement `ActorSystemAware`

```java
public class MyPlugin implements ActorSystemAware {
    private IIActorSystem actorSystem;

    @Override
    public void setActorSystem(IIActorSystem system) {
        this.actorSystem = system;
    }
}
```

### 2. Obtain Connection via `DistributedLogStore.getInstance()`

```java
Connection conn = DistributedLogStore.getInstance().getConnection();
PreparedStatement ps = conn.prepareStatement("SELECT * FROM logs WHERE session_id = ?");
ps.setString(1, sessionId);
ResultSet rs = ps.executeQuery();
```

### 3. Do NOT Call `connection.close()`

The connection lifecycle is managed by `RunCLI`. If a plugin calls `connection.close()`, other components will no longer be able to use the connection.

```java
// NG: Never do this
connection.close();

// OK: You may close PreparedStatement and ResultSet
ps.close();
rs.close();
```

This design allows plugins to focus on database access without worrying about connection management complexity.
