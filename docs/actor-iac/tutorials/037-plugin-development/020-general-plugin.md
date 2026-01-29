---
id: general-plugin
title: Creating General Plugins
sidebar_position: 2
---

# Creating General Plugins

Plugins that implement arbitrary functionality callable from workflows.

## Use Cases

- Data aggregation and analysis from log DB
- External API integration
- Custom calculations and transformations
- File operations

## Complete Implementation Example

### POJO

```java
package com.example.plugin;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

/**
 * POJO for custom aggregation functionality.
 * No framework dependencies.
 */
public class LogAnalyzer {

    private static final Logger logger = Logger.getLogger(LogAnalyzer.class.getName());

    private Connection connection;
    private long sessionId = -1;

    // ========================================================================
    // Setters (called from IIAR)
    // ========================================================================

    public void setConnection(Connection connection) {
        this.connection = connection;
    }

    public void setSessionId(long sessionId) {
        this.sessionId = sessionId;
    }

    // ========================================================================
    // Business Logic
    // ========================================================================

    /**
     * Aggregate logs matching the specified pattern.
     *
     * @param pattern Search pattern
     * @return Aggregation result
     */
    public String analyze(String pattern) {
        if (connection == null || sessionId < 0) {
            logger.warning("LogAnalyzer: connection or sessionId not set");
            return "";
        }

        try {
            return doAnalyze(pattern);
        } catch (Exception e) {
            logger.warning("LogAnalyzer: error: " + e.getMessage());
            return "Error: " + e.getMessage();
        }
    }

    private String doAnalyze(String pattern) throws Exception {
        List<String> results = new ArrayList<>();

        String sql = "SELECT node_id, message, timestamp FROM logs " +
                     "WHERE session_id = ? AND message LIKE ? " +
                     "ORDER BY timestamp";

        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            ps.setLong(1, sessionId);
            ps.setString(2, "%" + pattern + "%");

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    String nodeId = rs.getString("node_id");
                    String message = rs.getString("message");
                    results.add(nodeId + ": " + message);
                }
            }
        }

        if (results.isEmpty()) {
            return "No matches found for: " + pattern;
        }

        StringBuilder sb = new StringBuilder();
        sb.append("[Log Analysis: ").append(pattern).append("]\n");
        for (String result : results) {
            sb.append(result).append("\n");
        }
        sb.append("\nTotal: ").append(results.size()).append(" entries\n");

        return sb.toString();
    }

    /**
     * Get count of error logs.
     *
     * @return Error count
     */
    public int countErrors() {
        if (connection == null || sessionId < 0) {
            return -1;
        }

        try {
            String sql = "SELECT COUNT(*) FROM logs " +
                         "WHERE session_id = ? AND level = 'SEVERE'";

            try (PreparedStatement ps = connection.prepareStatement(sql)) {
                ps.setLong(1, sessionId);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        return rs.getInt(1);
                    }
                }
            }
        } catch (Exception e) {
            logger.warning("LogAnalyzer: countErrors error: " + e.getMessage());
        }
        return -1;
    }
}
```

### IIAR

```java
package com.example.plugin;

import com.scivicslab.actoriac.log.DistributedLogStore;
import com.scivicslab.pojoactor.core.Action;
import com.scivicslab.pojoactor.core.ActionResult;
import com.scivicslab.pojoactor.workflow.IIActorRef;
import com.scivicslab.pojoactor.workflow.IIActorSystem;

import java.sql.Connection;
import java.util.logging.Logger;

/**
 * IIAR wrapper for LogAnalyzer.
 */
public class LogAnalyzerIIAR extends IIActorRef<LogAnalyzer> {

    private static final Logger logger = Logger.getLogger(LogAnalyzerIIAR.class.getName());

    public LogAnalyzerIIAR(String actorName, IIActorSystem system) {
        super(actorName, new LogAnalyzer(), system);
        initializeFromSystem();
    }

    private void initializeFromSystem() {
        // Get DB connection
        DistributedLogStore logStore = DistributedLogStore.getInstance();
        if (logStore != null) {
            Connection conn = logStore.getConnection();
            if (conn != null) {
                object.setConnection(conn);
                logger.fine("LogAnalyzerIIAR: initialized database connection");
            }
        }

        // Get session ID
        long sessionId = getSessionIdFromNodeGroup();
        if (sessionId >= 0) {
            object.setSessionId(sessionId);
            logger.fine("LogAnalyzerIIAR: initialized sessionId=" + sessionId);
        }
    }

    private long getSessionIdFromNodeGroup() {
        if (actorSystem == null) {
            return -1;
        }

        IIActorRef<?> nodeGroup = ((IIActorSystem) actorSystem).getIIActor("nodeGroup");
        if (nodeGroup == null) {
            return -1;
        }

        ActionResult result = nodeGroup.callByActionName("getSessionId", "");
        if (result.isSuccess()) {
            try {
                return Long.parseLong(result.getResult());
            } catch (NumberFormatException e) {
                logger.warning("LogAnalyzerIIAR: invalid sessionId");
            }
        }
        return -1;
    }

    // ========================================================================
    // Actions
    // ========================================================================

    @Action("analyze")
    public ActionResult analyze(String args) {
        String result = object.analyze(args != null ? args : "");
        return new ActionResult(true, result);
    }

    @Action("countErrors")
    public ActionResult countErrors(String args) {
        int count = object.countErrors();
        if (count < 0) {
            return new ActionResult(false, "Failed to count errors");
        }
        return new ActionResult(true, String.valueOf(count));
    }
}
```

## Workflow Usage

```yaml
name: analyze-logs
description: Analyze logs

steps:
  - states: ["0", "1"]
    note: Load plugin and create analyzer
    actions:
      - actor: loader
        method: loadJar
        arguments: ["plugins/log-analyzer-1.0.0.jar"]
      - actor: loader
        method: createChild
        arguments: ["ROOT", "analyzer", "com.example.plugin.LogAnalyzerIIAR"]

  - states: ["1", "2"]
    note: Run some workflow that generates logs
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runWorkflow
          arguments: ["some-workflow.yaml"]

  - states: ["2", "3"]
    note: Analyze ERROR logs
    actions:
      - actor: analyzer
        method: analyze
        arguments: ["ERROR"]

  - states: ["3", "end"]
    note: Count errors
    actions:
      - actor: analyzer
        method: countErrors
```

## Plugins with Multiple Actions

You can define multiple actions in one plugin:

```java
@Action("analyze")
public ActionResult analyze(String args) { ... }

@Action("countErrors")
public ActionResult countErrors(String args) { ... }

@Action("summarize")
public ActionResult summarize(String args) { ... }

@Action("export")
public ActionResult export(String args) { ... }
```

## External API Integration Example

```java
public class ApiClient {

    private String apiEndpoint;

    public void setApiEndpoint(String endpoint) {
        this.apiEndpoint = endpoint;
    }

    public String fetchData(String query) {
        // Call external API with HTTP client
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(apiEndpoint + "?q=" + URLEncoder.encode(query, UTF_8)))
            .GET()
            .build();

        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());

        return response.body();
    }
}
```

Set endpoint in IIAR:

```java
public ApiClientIIAR(String actorName, IIActorSystem system) {
    super(actorName, new ApiClient(), system);
    parseActorName(actorName);
}

private void parseActorName(String actorName) {
    // Format: "apiClient:https://api.example.com"
    String[] parts = actorName.split(":", 2);
    if (parts.length >= 2) {
        object.setApiEndpoint(parts[1]);
    }
}
```

Workflow:

```yaml
- actor: loader
  method: createChild
  arguments: ["ROOT", "apiClient:https://api.example.com", "...ApiClientIIAR"]

- actor: apiClient
  method: fetchData
  arguments: ["search query"]
```

## Stateful Plugins

Plugins can maintain state. Useful for sharing data between actions:

```java
public class StatefulPlugin {
    private List<String> collectedData = new ArrayList<>();

    public void collect(String data) {
        collectedData.add(data);
    }

    public String getAll() {
        return String.join("\n", collectedData);
    }

    public void clear() {
        collectedData.clear();
    }
}
```

Collect data progressively in workflow:

```yaml
- actor: collector
  method: collect
  arguments: ["data1"]

- actor: collector
  method: collect
  arguments: ["data2"]

- actor: collector
  method: getAll
  # Result: "data1\ndata2"
```
