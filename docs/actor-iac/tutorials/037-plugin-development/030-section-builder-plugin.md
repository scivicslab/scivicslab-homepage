---
id: section-builder-plugin
title: Creating SectionBuilder Plugins
sidebar_position: 3
---

# Creating SectionBuilder Plugins

Plugins that implement report sections for ReportBuilder.

## What is SectionBuilder

`ReportBuilder` holds multiple SectionBuilders as child actors and generates reports in the order they were added. Each SectionBuilder is responsible for one section.

```
ReportBuilder
├── WorkflowNameSection
├── WorkflowDescriptionSection
├── CheckResultsSection
├── JsonStateSection
├── TransitionHistorySection
├── GpuSummarySection
└── MyCustomSection  ← Custom plugin
```

## SectionBuilder Interface

```java
package com.scivicslab.actoriac.report;

public interface SectionBuilder {

    /**
     * Generate section content.
     * @return Section content string
     */
    String generate();

    /**
     * Get section title.
     * @return Title string (null to include title in generate())
     */
    default String getTitle() { return null; }
}
```

## Complete Implementation Example

### POJO (SectionBuilder Implementation)

```java
package com.example.plugin;

import com.scivicslab.actoriac.report.SectionBuilder;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.logging.Logger;

/**
 * POJO for custom report section.
 * Aggregates and displays command execution time per node.
 */
public class ExecutionTimeSection implements SectionBuilder {

    private static final Logger logger = Logger.getLogger(ExecutionTimeSection.class.getName());

    private Connection connection;
    private long sessionId = -1;

    // ========================================================================
    // Setters
    // ========================================================================

    public void setConnection(Connection connection) {
        this.connection = connection;
    }

    public void setSessionId(long sessionId) {
        this.sessionId = sessionId;
    }

    // ========================================================================
    // SectionBuilder Implementation
    // ========================================================================

    @Override
    public String generate() {
        if (connection == null || sessionId < 0) {
            logger.warning("ExecutionTimeSection: connection or sessionId not set");
            return "";
        }

        try {
            return buildSection();
        } catch (Exception e) {
            logger.warning("ExecutionTimeSection: error: " + e.getMessage());
            return "";
        }
    }

    private String buildSection() throws Exception {
        StringBuilder sb = new StringBuilder();
        sb.append("[Execution Time Summary]\n");

        String sql = "SELECT node_id, " +
                     "MIN(timestamp) as start_time, " +
                     "MAX(timestamp) as end_time, " +
                     "COUNT(*) as log_count " +
                     "FROM logs WHERE session_id = ? " +
                     "GROUP BY node_id ORDER BY node_id";

        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            ps.setLong(1, sessionId);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    String nodeId = rs.getString("node_id");
                    java.sql.Timestamp startTime = rs.getTimestamp("start_time");
                    java.sql.Timestamp endTime = rs.getTimestamp("end_time");
                    int logCount = rs.getInt("log_count");

                    long durationMs = endTime.getTime() - startTime.getTime();
                    String duration = formatDuration(durationMs);

                    sb.append(String.format("%s: %s (%d logs)%n",
                        nodeId, duration, logCount));
                }
            }
        }

        return sb.toString();
    }

    private String formatDuration(long ms) {
        if (ms < 1000) {
            return ms + "ms";
        } else if (ms < 60000) {
            return String.format("%.1fs", ms / 1000.0);
        } else {
            long minutes = ms / 60000;
            long seconds = (ms % 60000) / 1000;
            return String.format("%dm %ds", minutes, seconds);
        }
    }

    @Override
    public String getTitle() {
        return null;  // Title is included in generate()
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
 * IIAR wrapper for ExecutionTimeSection.
 */
public class ExecutionTimeSectionIIAR extends IIActorRef<ExecutionTimeSection> {

    private static final Logger logger = Logger.getLogger(ExecutionTimeSectionIIAR.class.getName());

    public ExecutionTimeSectionIIAR(String actorName, IIActorSystem system) {
        super(actorName, new ExecutionTimeSection(), system);
        initializeFromSystem();
    }

    private void initializeFromSystem() {
        DistributedLogStore logStore = DistributedLogStore.getInstance();
        if (logStore != null) {
            Connection conn = logStore.getConnection();
            if (conn != null) {
                object.setConnection(conn);
            }
        }

        long sessionId = getSessionIdFromNodeGroup();
        if (sessionId >= 0) {
            object.setSessionId(sessionId);
        }
    }

    private long getSessionIdFromNodeGroup() {
        if (actorSystem == null) return -1;

        IIActorRef<?> nodeGroup = ((IIActorSystem) actorSystem).getIIActor("nodeGroup");
        if (nodeGroup == null) return -1;

        ActionResult result = nodeGroup.callByActionName("getSessionId", "");
        if (result.isSuccess()) {
            try {
                return Long.parseLong(result.getResult());
            } catch (NumberFormatException e) {
                // ignore
            }
        }
        return -1;
    }

    // ========================================================================
    // Standard Actions for SectionBuilder
    // ========================================================================

    @Action("generate")
    public ActionResult generate(String args) {
        String content = object.generate();
        return new ActionResult(true, content);
    }

    @Action("getTitle")
    public ActionResult getTitle(String args) {
        String title = object.getTitle();
        return new ActionResult(true, title != null ? title : "");
    }
}
```

## Usage in ReportBuilder

```yaml
name: report-with-custom-section
description: Report with custom section

steps:
  - states: ["0", "1"]
    note: Load plugin and create ReportBuilder
    actions:
      # Load plugin
      - actor: loader
        method: loadJar
        arguments: ["plugins/execution-time-section-1.0.0.jar"]

      # Create ReportBuilder
      - actor: loader
        method: createChild
        arguments: ["ROOT", "reportBuilder", "com.scivicslab.actoriac.report.ReportBuilderIIAR"]

      # Add standard sections
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "wfName", "com.scivicslab.actoriac.report.sections.basic.WorkflowNameSectionIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "checkResults", "com.scivicslab.actoriac.report.sections.basic.CheckResultsSectionIIAR"]

      # Add custom section
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "execTime", "com.example.plugin.ExecutionTimeSectionIIAR"]

  - states: ["1", "2"]
    note: Run workflow
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runWorkflow
          arguments: ["some-workflow.yaml"]

  - states: ["2", "end"]
    note: Generate report
    actions:
      - actor: reportBuilder
        method: report
```

## Output Example

```
================================================================================
                              WORKFLOW REPORT
================================================================================

[Workflow Name]
report-with-custom-section

[Check Results]
node-192.168.5.13: [OK] Deployment successful
node-192.168.5.14: [OK] Deployment successful

[Execution Time Summary]
node-192.168.5.13: 12.3s (45 logs)
node-192.168.5.14: 15.7s (52 logs)
nodeGroup: 18.2s (23 logs)

================================================================================
```

## Passing Parameters via Actor Name

You can encode options in the actor name:

```java
public ExecutionTimeSectionIIAR(String actorName, IIActorSystem system) {
    super(actorName, new ExecutionTimeSection(), system);
    parseActorName(actorName);
    initializeFromSystem();
}

private void parseActorName(String actorName) {
    // Format: "execTime:detailed" or "execTime:summary"
    String[] parts = actorName.split(":", 2);
    if (parts.length >= 2) {
        object.setDetailLevel(parts[1]);
    }
}
```

Workflow:

```yaml
# Detailed mode
- actor: loader
  method: createChild
  arguments: ["reportBuilder", "execTime:detailed", "...ExecutionTimeSectionIIAR"]

# Summary mode
- actor: loader
  method: createChild
  arguments: ["reportBuilder", "execTime:summary", "...ExecutionTimeSectionIIAR"]
```

## Reference Standard SectionBuilders

For implementation reference, check the source code of standard SectionBuilders:

| Class | Description | Reference Point |
|-------|-------------|-----------------|
| `CheckResultsSection` | Collects % notation lines | Pattern extraction from logs |
| `JsonStateSection` | Outputs JsonState as YAML | Getting actor references |
| `TransitionHistorySection` | Transition history | Complex SQL aggregation |
| `GpuSummarySection` | GPU info summary | Parsing log messages |

Package: `com.scivicslab.actoriac.report.sections.basic`
