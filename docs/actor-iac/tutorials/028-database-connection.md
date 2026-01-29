---
id: database-connection
title: Sharing Database Connections (DistributedLogStore)
sidebar_position: 28
---

# Sharing Database Connections (DistributedLogStore)

## Problem Definition

### Accessing the Log Database

In actor-IaC, logs during workflow execution are stored in an H2 database. Multiple components need to access this database.

- **NodeGroupInterpreter**: Session start, log writing
- **DatabaseAccumulator**: Log writing via outputMultiplexer
- **TransitionViewerPlugin**: Reading Transition history

### Problem: Plugins Cannot Obtain Connection

When a plugin is created from a workflow with `loader.createChild`, the database connection is not automatically set.

```yaml
- states: ["0", "1"]
  note: Load TransitionViewerPlugin
  actions:
    - actor: loader
      method: createChild
      arguments: ["ROOT", "transitionViewer", "com.scivicslab.actoriac.plugins.transitionviewer.TransitionViewerPlugin"]
```

At this point, the plugin's `connection` field remains `null`. As a result, calling actions that reference the database causes an error.

### Goal

Enable plugins dynamically created from workflows to safely obtain and share connections to the log database.


## How to do it

### Design Approach

The following design is adopted for sharing database connections.

1. **Share `H2LogStore` instance via `DistributedLogStore` interface**
2. **Provide `getConnection()` method for obtaining connections**
3. **Use `ActorSystemAware` interface for automatic initialization**

### Class Structure

```
DistributedLogStore (interface)
       △
       │ implements
       │
   H2LogStore (class) ─── Connection (H2 database connection)
```

- **`DistributedLogStore`**: Log store interface. Has static methods for singleton management
- **`H2LogStore`**: Concrete implementation using H2 database

### DistributedLogStore Interface

Define methods for singleton access in the `DistributedLogStore` interface.

```java
public interface DistributedLogStore extends AutoCloseable {

    /** Holds singleton instance */
    static DistributedLogStore instance = null;

    /**
     * Set the singleton instance.
     * Called by RunCLI when workflow execution starts.
     */
    static void setInstance(DistributedLogStore store) {
        instance = store;
    }

    /**
     * Get the singleton instance.
     * @return DistributedLogStore instance, null if not set
     */
    static DistributedLogStore getInstance() {
        return instance;
    }

    /**
     * Get the database connection.
     * Use for read-only operations.
     * @return JDBC Connection
     */
    Connection getConnection();

    // ... existing methods ...
}
```

### Implementation in H2LogStore

Add the `getConnection()` method to the `H2LogStore` class.

```java
public class H2LogStore implements DistributedLogStore {

    private final Connection connection;

    @Override
    public Connection getConnection() {
        return this.connection;
    }

    // ... existing code ...
}
```

### Automatic Initialization in Plugins

Automatically obtain the connection from the singleton in the `setActorSystem` method of `TransitionViewerPlugin`.

```java
// TransitionViewerPlugin.java
@Override
public void setActorSystem(IIActorSystem system) {
    this.system = system;
    initConnection();
}

private void initConnection() {
    DistributedLogStore logStore = DistributedLogStore.getInstance();
    if (logStore != null) {
        this.connection = logStore.getConnection();
        logger.fine("TransitionViewerPlugin: Initialized database connection");
    }
}
```

With this implementation, the database connection is automatically set when the plugin is added to the actor tree.

### Instance Setup in RunCLI

When `RunCLI` starts workflow execution, it creates an `H2LogStore` instance and shares it via the `DistributedLogStore` interface.

```java
// RunCLI.java
// 1. Create H2LogStore instance
H2LogStore logStore = new H2LogStore(dbPath);

// 2. Share via DistributedLogStore interface
DistributedLogStore.setInstance(logStore);

// Workflow execution...

// 3. Clear after workflow execution
DistributedLogStore.setInstance(null);
logStore.close();
```

When other components call `DistributedLogStore.getInstance()`, they actually receive the `H2LogStore` instance.


## Under the hood

### Connection Lifecycle

The lifecycle of the `H2LogStore` instance is managed by `RunCLI`. Other components borrow this instance via the `DistributedLogStore` interface.

```
RunCLI startup
    │
    ▼
┌─────────────────────────────────────┐
│ H2LogStore logStore = new H2LogStore()│
│ DistributedLogStore.setInstance(logStore)│
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Workflow execution                  │
│ ├── NodeGroupInterpreter            │
│ │   └── logStore.log()              │
│ ├── TransitionViewerPlugin          │
│ │   └── connection.prepareStatement()│
│ └── Other components                │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ DistributedLogStore.setInstance(null)│
│ logStore.close()                    │
└─────────────────────────────────────┘
    │
    ▼
RunCLI exit
```

Important points:
- **The owner of `H2LogStore` is RunCLI**. It is responsible for creating the instance and calling `close()` at the end
- **Other components only borrow connections via the `DistributedLogStore` interface** and must not call `close()`
- **The shared instance is only valid during workflow execution**. After execution, it is cleared with `setInstance(null)`

### Connection Sharing and Exclusion Control

The H2 database is started in `AUTO_SERVER=TRUE` mode, supporting simultaneous access from multiple threads. However, care must be taken when sharing the same `Connection` object across multiple threads.

```java
// H2LogStore.java
String url = "jdbc:h2:" + dbPath + ";AUTO_SERVER=TRUE";
this.connection = DriverManager.getConnection(url);
```

Creating and executing `PreparedStatement` is done locally within each method, making it thread-safe.

```java
// TransitionViewerPlugin.java - Thread-safe implementation
private List<TransitionRecord> getTransitions(long sessionId) throws SQLException {
    // PreparedStatement is created as a local variable
    try (PreparedStatement ps = connection.prepareStatement(sql)) {
        ps.setLong(1, sessionId);
        try (ResultSet rs = ps.executeQuery()) {
            // Process results
        }
    }
    // Automatically closed by try-with-resources
}
```

### Why You Must Not Release the Connection

If a plugin calls `connection.close()`, other components will also be unable to use the connection.

```
❌ Wrong implementation
TransitionViewerPlugin.showTransitions()
    │
    ├── Display Transition history
    └── connection.close()  ← Don't do this
                │
                ▼
        NodeGroupInterpreter.endSession()
            └── logStore.log() → SQLException!
```

RunCLI is responsible for releasing the connection. Individual components only borrow and use the connection.

### Class Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         RunCLI                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ // Create and share H2LogStore instance              │  │
│  │ H2LogStore logStore = new H2LogStore(dbPath);        │  │
│  │ DistributedLogStore.setInstance(logStore);           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ setInstance(H2LogStore)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              DistributedLogStore (interface)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ // Hold instance in static field                    │  │
│  │ static DistributedLogStore instance; // actually H2LogStore│
│  │ static getInstance() → DistributedLogStore           │  │
│  │ getConnection() → Connection                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              △
                              │ implements
                              │
┌─────────────────────────────────────────────────────────────┐
│                   H2LogStore (implementation)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ private final Connection connection; // H2 DB connection│
│  │ getConnection() { return this.connection; }          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ getInstance().getConnection()
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                TransitionViewerPlugin                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ private Connection connection;                       │  │
│  │                                                      │  │
│  │ initConnection() {                                   │  │
│  │   // Get H2LogStore connection via interface        │  │
│  │   DistributedLogStore logStore =                     │  │
│  │       DistributedLogStore.getInstance(); // → H2LogStore│
│  │   this.connection = logStore.getConnection();        │  │
│  │ }                                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Pattern for Plugin Developers

Plugins requiring database access should be implemented with the following pattern.

```java
public class MyPlugin implements CallableByActionName, ActorSystemAware {

    private IIActorSystem system;
    private Connection connection;

    @Override
    public void setActorSystem(IIActorSystem system) {
        this.system = system;
        initConnection();
    }

    private void initConnection() {
        // Get H2LogStore instance via DistributedLogStore interface
        DistributedLogStore logStore = DistributedLogStore.getInstance();
        if (logStore != null) {
            // Get Connection (H2 database connection) held by H2LogStore
            this.connection = logStore.getConnection();
        }
    }

    // Method using database
    private List<String> queryLogs(long sessionId) throws SQLException {
        if (connection == null) {
            throw new IllegalStateException("Database connection not initialized");
        }

        String sql = "SELECT message FROM logs WHERE session_id = ?";
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            ps.setLong(1, sessionId);
            try (ResultSet rs = ps.executeQuery()) {
                List<String> results = new ArrayList<>();
                while (rs.next()) {
                    results.add(rs.getString("message"));
                }
                return results;
            }
        }
    }
}
```

Key points:
- Implement `ActorSystemAware` and initialize in `setActorSystem()`
- Get `H2LogStore` instance via `DistributedLogStore.getInstance()`, then get DB connection via `getConnection()`
- Do not call `connection.close()` (the owner of `H2LogStore` is RunCLI)
- Close `PreparedStatement` properly with try-with-resources
