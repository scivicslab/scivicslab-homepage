---
id: plugin-aggregation
title: Advanced Aggregation with Plugins
sidebar_position: 37
---

# Advanced Aggregation with Plugins

## Problem Definition

**Goal:** Implement advanced aggregation processing that cannot be achieved with WorkflowReporter using plugins.

WorkflowReporter simply collects lines with the `%` prefix. Develop a plugin when the following processing is required:

- Parsing and structuring log data
- Cross-aggregation of data from multiple nodes
- Output in formatted table format
- Comparison between multiple sessions

For example, when you want to output GPU information from 6 nodes in a table format like the following:

```
## GPU Summary
| node | gpu | vram | driver | cuda | compute_cap |
|------|-----|------|--------|------|-------------|
| 192.168.5.13 | NVIDIA GeForce RTX 4080 | 16GB | 550.54.14 | 12.4 | 8.9 |
| 192.168.5.14 | NVIDIA GeForce RTX 4080 | 16GB | 550.54.14 | 12.4 | 8.9 |
| 192.168.5.15 | NVIDIA GB10 | 128GB | 550.54.14 | 12.4 | 10.0 |
| 192.168.5.21 | NVIDIA Quadro P400 | 2GB | 535.154.05 | 12.2 | 6.1 |
| 192.168.5.22 | NVIDIA Quadro P400 | 2GB | 535.154.05 | 12.2 | 6.1 |
| 192.168.5.23 | AMD Radeon RX 7900 XTX | - | amdgpu | - | - |

Summary: 5 NVIDIA, 1 AMD
```

Such formatted output requires a plugin that extracts GPU information from logs, parses it, and converts it to table format.


## Section Structure

1. **Standard Plugin Usage** - Procedure to install actor-IaC-plugins and use them from workflows

2. **Creating Custom Plugins** - Implementation guide for developing your own plugins


## Standard Plugin Usage

### Installing actor-IaC-plugins

Clone and build the actor-IaC-plugins repository:

```bash
git clone https://github.com/scivicslab/actor-IaC-plugins.git
cd actor-IaC-plugins
mvn clean install
```

### Loading Plugins in Workflows

Use the `loader` actor to dynamically load plugin classes:

```yaml
- states: ["0", "1"]
  note: Load GPU aggregation plugin
  actions:
    - actor: loader
      method: createChild
      arguments: ["ROOT", "gpuReporter", "com.scivicslab.actoriac.plugins.GpuReporter"]
```

### Calling Plugin Methods

After loading the plugin, call its methods like any other actor:

```yaml
- states: ["2", "end"]
  note: Generate GPU report
  actions:
    - actor: gpuReporter
      method: generateReport
      arguments:
        format: "table"
        includeDriverInfo: true
```


## Creating Custom Plugins

### Plugin Structure

A plugin is a Java class that implements the `CallableByActionName` interface:

```java
package com.example.plugins;

import com.scivicslab.pojoactor.core.ActionResult;
import com.scivicslab.pojoactor.core.CallableByActionName;

public class MyPlugin implements CallableByActionName {

    @Override
    public ActionResult callByActionName(String actionName, String args) {
        switch (actionName) {
            case "myAction":
                return performMyAction(args);
            default:
                return new ActionResult(false, "Unknown action: " + actionName);
        }
    }

    private ActionResult performMyAction(String args) {
        // Implementation here
        return new ActionResult(true, "Action completed successfully");
    }
}
```

### Accessing Log Database

To access the log database from a plugin, inject the `H2LogReader`:

```java
public class MyPlugin implements CallableByActionName {
    private H2LogReader logReader;

    public void setLogReader(H2LogReader logReader) {
        this.logReader = logReader;
    }

    private ActionResult aggregateLogs(String sessionId) {
        List<LogEntry> logs = logReader.readLogsBySession(sessionId);
        // Process logs
        return new ActionResult(true, result);
    }
}
```

### Registering with Actor System

The plugin is loaded via the `loader` actor's `createChild` method. The plugin class must be on the classpath (either in the main JAR or in a plugin JAR).

### Best Practices

1. **Implement `CallableByActionName`** - Required for workflow integration
2. **Return `ActionResult`** - Provides success/failure status and result data
3. **Handle errors gracefully** - Return meaningful error messages
4. **Document available actions** - List supported action names and parameters
5. **Keep plugins focused** - Each plugin should have a single responsibility
