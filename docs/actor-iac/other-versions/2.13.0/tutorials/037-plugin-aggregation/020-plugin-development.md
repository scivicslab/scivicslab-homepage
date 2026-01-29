---
id: plugin-development
title: Creating Custom Plugins
sidebar_position: 20
---

:::caution Newer Version Available
This is documentation for version 2.13.0. [See the latest version](/docs/actor-iac/introduction).
:::

# Creating Custom Plugins

## Problem Definition

Create custom plugins to extend actor-IaC functionality. With plugins, you can call processing not available in actor-IaC's standard features from workflows, such as database access, external API integration, and custom aggregation processing.

Here, as an example, we create a plugin that reads GPU information from the log database and aggregates it in table format.

## How to do it

### Project Structure

Create the plugin as a Maven project. The minimum configuration requires only 2 files: pom.xml and the plugin class.

```
actor-IaC-plugins/
├── pom.xml
└── src/main/java/com/scivicslab/actoriac/plugins/h2analyzer/
    └── SystemInfoAggregator.java
```

### pom.xml

In pom.xml, define the plugin dependencies and build method. The important points are declaring POJO-actor with `provided` scope and including plugin-specific dependencies (H2 database in this example) with `compile` scope.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.scivicslab.actoriac.plugins</groupId>
    <artifactId>actor-IaC-plugins</artifactId>
    <version>1.0.0</version>

    <properties>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
    </properties>

    <dependencies>
        <!-- POJO-actor (provided - supplied by host) -->
        <dependency>
            <groupId>com.scivicslab</groupId>
            <artifactId>pojo-actor</artifactId>
            <version>2.12.0</version>
            <scope>provided</scope>
        </dependency>

        <!-- H2 Database (include in plugin) -->
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <version>2.2.224</version>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-shade-plugin</artifactId>
                <version>3.5.1</version>
                <executions>
                    <execution>
                        <phase>package</phase>
                        <goals><goal>shade</goal></goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

Dependency scope settings are based on the following concepts. Dependencies with `provided` scope are not included in the JAR and are supplied by the host (actor-IaC) at runtime. Dependencies with `compile` scope are included in the plugin JAR by maven-shade-plugin.

| Dependency | Scope | Reason |
|------------|-------|--------|
| pojo-actor | provided | Supplied by host (actor-IaC), not included in JAR |
| h2 | compile | Plugin-specific dependency, included in JAR |

### Basic Plugin Structure

The plugin class implements the `CallableByActionName` interface. By implementing this interface, actions can be called by string from workflows. Additionally, implementing `ActorSystemAware` enables access to other actors.

```java
package com.scivicslab.actoriac.plugins.h2analyzer;

import com.scivicslab.pojoactor.core.ActionResult;
import com.scivicslab.pojoactor.core.CallableByActionName;
import com.scivicslab.pojoactor.workflow.ActorSystemAware;
import com.scivicslab.pojoactor.workflow.IIActorSystem;
import java.sql.*;

public class SystemInfoAggregator implements CallableByActionName, ActorSystemAware {

    private Connection connection;
    private IIActorSystem system;

    @Override
    public void setActorSystem(IIActorSystem system) {
        this.system = system;
    }

    @Override
    public ActionResult callByActionName(String actionName, String args) {
        try {
            return switch (actionName) {
                case "connect" -> connect(args);
                case "summarize-gpus" -> summarizeGpus(args);
                case "disconnect" -> disconnect();
                default -> new ActionResult(false, "Unknown action: " + actionName);
            };
        } catch (Exception e) {
            return new ActionResult(false, "Error: " + e.getMessage());
        }
    }
}
```

In the `callByActionName` method, use switch expressions to dispatch from action names to corresponding methods. This approach is fast because it doesn't use Reflection and is compatible with Native Image.

Implementation points:

| Interface | Role |
|-----------|------|
| CallableByActionName | Enables calling actions by string from workflows |
| ActorSystemAware | Obtains reference to actor system, enables access to other actors |

### Database Connection

actor-IaC starts a log server (H2 TCP server), and plugins read log data by connecting to this server. The connection process first attempts TCP connection, and falls back to embedded mode if it fails.

```java
private ActionResult connect(String args) {
    try {
        // Get database path from arguments
        String dbPath = parseArgs(args);

        // Instantiate H2 driver directly (avoid ClassLoader issues)
        org.h2.Driver driver = new org.h2.Driver();

        // Normalize path
        String absolutePath = new java.io.File(dbPath).getCanonicalPath();

        // Prefer TCP connection
        String tcpUrl = "jdbc:h2:tcp://localhost:29090/" + absolutePath;
        try {
            connection = driver.connect(tcpUrl, new java.util.Properties());
            if (connection != null) {
                return new ActionResult(true, "Connected via TCP");
            }
        } catch (SQLException tcpEx) {
            // TCP connection failed, fall back to embedded mode
        }

        // Fallback: embedded mode
        String embeddedUrl = "jdbc:h2:" + absolutePath + ";AUTO_SERVER=TRUE";
        connection = driver.connect(embeddedUrl, new java.util.Properties());

        return new ActionResult(true, "Connected (embedded)");
    } catch (Exception e) {
        return new ActionResult(false, "Connection failed: " + e.getMessage());
    }
}
```

There are 3 points to note in connection processing.

1. **Direct Instantiation**: Use `new org.h2.Driver()` instead of `DriverManager.getConnection()`. Since the plugin is loaded from URLClassLoader, DriverManager cannot find the H2 driver.

2. **Path Normalization**: Convert relative paths to absolute paths with `getCanonicalPath()`. If you don't specify the same path as the log server, you'll open a different database file.

3. **TCP Priority**: By connecting to the log server, you can read real-time logs during workflow execution.

### GPU Information Aggregation Implementation

To aggregate GPU information, search the log database for logs containing `GPU INFO`, parse nvidia-smi output, and format into table format.

```java
private String buildGpuSummary(long sessionId) throws SQLException {
    String sql = "SELECT node_id, message FROM logs " +
                 "WHERE session_id = ? AND message LIKE '%GPU INFO%' " +
                 "ORDER BY node_id, timestamp";

    Map<String, GpuFullInfo> nodeGpus = new LinkedHashMap<>();

    try (PreparedStatement ps = connection.prepareStatement(sql)) {
        ps.setLong(1, sessionId);
        try (ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                String nodeId = rs.getString("node_id");
                String message = rs.getString("message");
                GpuFullInfo gpuInfo = nodeGpus.computeIfAbsent(nodeId, k -> new GpuFullInfo());

                for (String line : message.split("\n")) {
                    String cleanLine = line.replaceFirst("^\\[node-[^\\]]+\\]\\s*", "").trim();

                    // Parse CUDA_VERSION line
                    if (cleanLine.startsWith("CUDA_VERSION:")) {
                        gpuInfo.cudaVersion = cleanLine.replaceFirst("CUDA_VERSION:\\s*", "").trim();
                        continue;
                    }

                    // Parse nvidia-smi CSV: name, memory.total, driver_version, compute_cap
                    // Example: "NVIDIA GeForce RTX 4080, 16384 MiB, 550.54.14, 8.9"
                    Pattern nvidiaCsvPattern = Pattern.compile(
                        "^(NVIDIA [^,]+|[^,]*GeForce[^,]*),\\s*(\\d+)\\s*MiB,\\s*([\\d.]+),\\s*([\\d.]+)$"
                    );
                    Matcher m = nvidiaCsvPattern.matcher(cleanLine);
                    if (m.find()) {
                        gpuInfo.name = m.group(1).trim();
                        int vramMB = Integer.parseInt(m.group(2));
                        gpuInfo.vram = (vramMB >= 1024) ? (vramMB / 1024) + "GB" : vramMB + "MB";
                        gpuInfo.driver = m.group(3).trim();
                        gpuInfo.computeCap = m.group(4).trim();
                        continue;
                    }

                    // Parse lspci output for AMD/Intel GPUs
                    Pattern lspciPattern = Pattern.compile(
                        "(?:VGA compatible controller|3D controller):\\s*(.+?)(?:\\s*\\(rev|$)");
                    Matcher lspci = lspciPattern.matcher(cleanLine);
                    if (lspci.find() && gpuInfo.name == null) {
                        gpuInfo.name = lspci.group(1).trim();
                        gpuInfo.driver = gpuInfo.name.contains("AMD") ? "amdgpu" : "-";
                        gpuInfo.vram = "-";
                        gpuInfo.computeCap = "-";
                        gpuInfo.cudaVersion = "-";
                    }
                }
            }
        }
    }

    if (nodeGpus.isEmpty()) return null;

    // Build table
    StringBuilder sb = new StringBuilder();
    sb.append("## GPU Summary\n");
    sb.append("| node | gpu | vram | driver | cuda | compute_cap |\n");
    sb.append("|------|-----|------|--------|------|-------------|\n");

    for (var entry : nodeGpus.entrySet()) {
        String nodeShort = entry.getKey().replaceFirst("^node-", "");
        GpuFullInfo gpu = entry.getValue();
        sb.append(String.format("| %s | %s | %s | %s | %s | %s |%n",
                nodeShort, gpu.name, gpu.vram, gpu.driver,
                gpu.cudaVersion, gpu.computeCap));
    }
    return sb.toString();
}

private static class GpuFullInfo {
    String name;
    String vram;
    String driver;
    String cudaVersion;
    String computeCap;
}
```

This implementation splits log messages by line and parses each line with different regular expressions depending on its format. It recognizes nvidia-smi CSV output, CUDA_VERSION lines, and lspci output, storing them in GpuFullInfo objects. Using LinkedHashMap preserves node order.

### Build

Building with Maven causes maven-shade-plugin to generate a single JAR file containing the H2 database dependencies.

```bash
cd actor-IaC-plugins
mvn package
```

The generated JAR file is approximately 2.6MB and includes the H2 database library. Place this JAR in actor-IaC's `plugins/` directory to use it from workflows.

```
target/actor-IaC-plugins-1.0.0.jar  (approx. 2.6MB, includes H2)
```

### Debugging Tips

Common problems encountered during plugin development and their solutions are summarized below.

| Problem | Cause | Solution |
|---------|-------|----------|
| ClassNotFoundException | JAR not loaded | Check `loadJar` path |
| Not connected | Method called before DB connection | Execute `connect` first |
| Empty result | Regular expression not matching | Check log output and adjust regex |
| Database locked | Conflict in embedded mode | Check if TCP port is available |

If regular expressions aren't matching, check the actual log messages and adjust the regex. You can check log contents with the following query.

```sql
SELECT message FROM logs WHERE session_id = ? AND message LIKE '%GPU%';
```

While viewing these query results, modify the regular expressions to match nvidia-smi and lspci output formats.

## Under the hood

### Available System Actors

actor-IaC provides system actors that can be used from plugins. These can be obtained with `system.getIIActor("actor name")`.

| Actor Name | Description | Main Actions |
|------------|-------------|--------------|
| `logServerApi` | Log server discovery API | `getJdbcUrl`, `discoverServer` |
| `outputMultiplexer` | Output routing | `add` |
| `nodeGroup` | Node group management | `getSessionId`, `createNodeActors` |
| `h2LogReader` | Log reading | `query` |
| `loader` | Plugin loader | `loadJar`, `createChild` |

### logServerApi

An actor that provides the log server discovery API. When connecting to an H2 database, use this actor to obtain the JDBC URL.

```java
private String getJdbcUrl(String dbPath) {
    IIActorRef<?> logServerApi = system.getIIActor("logServerApi");
    if (logServerApi == null) {
        // Fallback: if logServerApi is not available
        return "jdbc:h2:" + dbPath + ";AUTO_SERVER=TRUE";
    }

    ActionResult result = logServerApi.callByActionName("getJdbcUrl", dbPath);
    if (result.isSuccess()) {
        return result.getResult();  // TCP URL or embedded URL
    }
    return null;
}
```

When actor-IaC is running with multiple instances, each may start a log server on different TCP ports (29090, 29091, ...). The `logServerApi` actor automatically detects the correct port and returns the appropriate JDBC URL. Do not hardcode port numbers.

```java
// Bad example: hardcoded port number
String jdbcUrl = "jdbc:h2:tcp://localhost:29090/" + dbPath;  // NG!
```

### outputMultiplexer

An actor that outputs to console, file, and database all at once. Use it to display plugin processing results to users.

```java
private void reportResult(String data) {
    IIActorRef<?> multiplexer = system.getIIActor("outputMultiplexer");
    if (multiplexer == null) {
        throw new IllegalStateException("outputMultiplexer actor not found");
    }

    JSONObject arg = new JSONObject();
    arg.put("source", "my-plugin");      // Plugin name
    arg.put("type", "plugin-result");    // Output type
    arg.put("data", data);               // Output data

    ActionResult result = multiplexer.callByActionName("add", arg.toString());
}
```

Using `outputMultiplexer` automatically routes to appropriate output destinations according to `--quiet` option and `--file-log` option settings.

### Best Practices

#### Check System Actor Existence

Always check for system actor existence and implement fallback processing when they don't exist.

```java
IIActorRef<?> actor = system.getIIActor("actorName");
if (actor == null) {
    logger.warning("actorName not found, using fallback");
    return fallbackBehavior();
}
```

#### Proper Use of ActionResult

Return appropriate `ActionResult` for success and failure cases.

```java
// On success
return new ActionResult(true, "Result string");

// On failure
return new ActionResult(false, "Error message");
```

#### Logging

Use `java.util.logging.Logger` to output logs. This ensures logs are properly routed through `outputMultiplexer`.

```java
private static final Logger logger = Logger.getLogger(MyPlugin.class.getName());

private ActionResult doAction(String args) {
    logger.entering(CLASS_NAME, "doAction", args);
    // Processing
    logger.exiting(CLASS_NAME, "doAction", result);
    return result;
}
```

#### Proper Resource Release

Provide actions that explicitly release resources such as database connections.

```java
private ActionResult disconnect() {
    if (connection != null && !connection.isClosed()) {
        connection.close();
        connection = null;
    }
    return new ActionResult(true, "Disconnected");
}
```
