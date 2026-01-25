---
id: plugin-usage
title: Using Standard Plugins
sidebar_position: 10
---

# Using Standard Plugins

## Problem Definition

Aggregate GPU information in table format using actor-IaC-plugins.

## How to do it

This tutorial uses the `connect` action and `summarize-gpus` action provided by the SystemInfoAggregator in actor-IaC-plugins. For all actions provided by the plugin, refer to the [actor-IaC-plugins README](https://github.com/scivicslab/actor-IaC-plugins).

### Installing the Plugin

actor-IaC-plugins is a standard plugin collection provided with actor-IaC. Clone from GitHub, build, and place it in the actor-IaC `plugins/` directory.

```bash
# Clone the repository
git clone https://github.com/scivicslab/actor-IaC-plugins

# Build
cd actor-IaC-plugins
mvn package

# Place in plugins/ directory
mkdir -p ~/proj-POJO-actor/actor-IaC-examples/plugins
cp target/actor-IaC-plugins-1.0.0.jar ~/proj-POJO-actor/actor-IaC-examples/plugins/
```

After placement, the directory structure looks like this. The plugin JAR is placed in the `plugins/` directory and can be referenced from workflows.

```
~/proj-POJO-actor/actor-IaC-examples/
├── actor_iac.java
├── plugins/
│   └── actor-IaC-plugins-1.0.0.jar   ← Plugin
└── sysinfo/
    ├── collect-sysinfo.yaml
    └── main-collect-and-analyze.yaml
```

### Using Plugins in Workflows

To use a plugin from a workflow, execute the following 4 steps.

#### 1. Load the Plugin JAR

First, call the `loader` actor's `loadJar` method to load the plugin JAR into the JVM. Specify the relative path to the JAR file as the argument.

```yaml
- states: ["0", "1"]
  note: Load plugin JAR
  actions:
    - actor: loader
      method: loadJar
      arguments: ["plugins/actor-IaC-plugins-1.0.0.jar"]
```

#### 2. Add the Plugin Actor to the Actor Tree

Next, call the `loader` actor's `createChild` method to create an actor from the plugin class. Arguments are specified in the order: "parent actor name", "new actor name", "fully qualified class name".

```yaml
- states: ["1", "2"]
  note: Create aggregator actor
  actions:
    - actor: loader
      method: createChild
      arguments: ["loader", "aggregator", "com.scivicslab.actoriac.plugins.h2analyzer.SystemInfoAggregator"]
```

This operation creates the `aggregator` actor as a child of `loader` and adds it to the actor tree.

```
ROOT
├── loader
│   └── aggregator    ← Plugin actor
├── nodeGroup
│   ├── node-stonefly513
│   └── ...
└── h2LogReader
```

#### 3. Connect to the Database

After the plugin actor is created, call the `connect` method to connect to the log database. Specify the database file path as the argument. The plugin connects to actor-IaC's log server (H2 TCP server, port 29090) and can access log data.

```yaml
- states: ["2", "3"]
  note: Connect to database
  actions:
    - actor: aggregator
      method: connect
      arguments: ["./actor-iac-logs"]
```

#### 4. Call the Aggregation Method

Finally, call the `summarize-gpus` method to aggregate GPU information. This method extracts GPU-related logs from the log database, parses them, and formats them into a table.

```yaml
- states: ["3", "end"]
  note: Summarize GPU info
  actions:
    - actor: aggregator
      method: summarize-gpus
      arguments: []
```

### Complete Workflow Example

Below is a complete example of a workflow that collects system information from each node and aggregates GPU information with the plugin. The first step executes a sub-workflow on all nodes, then loads the plugin and performs aggregation.

```yaml
name: main-collect-and-analyze

steps:
  - states: ["0", "1"]
    note: Collect system info on all nodes
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runWorkflow
          arguments: ["collect-sysinfo.yaml"]

  - states: ["1", "2"]
    note: Load plugin JAR
    actions:
      - actor: loader
        method: loadJar
        arguments: ["plugins/actor-IaC-plugins-1.0.0.jar"]

  - states: ["2", "3"]
    note: Create aggregator actor
    actions:
      - actor: loader
        method: createChild
        arguments: ["loader", "aggregator", "com.scivicslab.actoriac.plugins.h2analyzer.SystemInfoAggregator"]

  - states: ["3", "4"]
    note: Connect to database
    actions:
      - actor: aggregator
        method: connect
        arguments: ["./actor-iac-logs"]

  - states: ["4", "end"]
    note: Summarize GPU info
    actions:
      - actor: aggregator
        method: summarize-gpus
        arguments: []
```

### Execution Example

To execute the workflow, use the `actor_iac.java` command. Specify the workflow file with `-w`, inventory file with `-i`, and target group with `-g`.

```bash
cd ~/proj-POJO-actor/actor-IaC-examples
./actor_iac.java run -w ./sysinfo/main-collect-and-analyze.yaml -i inventory.ini -g compute
```

When executed, GPU information from each node is output in Markdown table format. For NVIDIA GPUs, VRAM, driver version, CUDA version, and Compute Capability are displayed. For AMD GPUs, CUDA-related items show `-`.

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

## Under the hood

### DynamicActorLoader

actor-IaC's plugin mechanism is based on POJO-actor's **DynamicActorLoader**. DynamicActorLoader provides the functionality to dynamically load POJO classes from external JAR files and run them as actors.

Design features are as follows:

- **JDK Standard APIs Only**: Uses URLClassLoader, no additional frameworks like OSGi or JPMS required
- **Simple Structure**: Works without additional libraries
- **String-Based Action Calls**: Dispatches actions using switch statements, not Reflection

### Internal Operation of loadJar and createChild

When `loader.loadJar` is called in a workflow, the following processing occurs:

```
loader.loadJar("plugins/actor-IaC-plugins-1.0.0.jar")
    │
    └─→ Create URLClassLoader
          │
          ├─ jarPath.toUri().toURL()
          └─ Parent ClassLoader: actor-IaC's ClassLoader (to reference POJO-actor classes)
```

Subsequently, when `loader.createChild` is called, it instantiates a class from the loaded JAR and adds it to the actor tree:

```
loader.createChild("loader", "aggregator", "com.scivicslab...SystemInfoAggregator")
    │
    ├─→ Class<?> clazz = loader.loadClass(className)
    │
    ├─→ Object instance = clazz.getDeclaredConstructor().newInstance()
    │
    └─→ Register as "loader/aggregator" in the actor tree
```

By setting actor-IaC's ClassLoader as the parent ClassLoader, plugin code can reference POJO-actor classes (ActorRef, ActionResult, etc.).

### CallableByActionName Interface

Plugin classes in actor-IaC-plugins implement the `CallableByActionName` interface. This interface enables calling actions by string from workflows.

```java
public interface CallableByActionName {
    ActionResult callByActionName(String actionName, String args);
}
```

Inside the plugin, switch statements dispatch from action names to corresponding methods:

```java
@Override
public ActionResult callByActionName(String actionName, String args) {
    return switch (actionName) {
        case "connect" -> connect(args);
        case "summarize-gpus" -> summarizeGpus(args);
        case "disconnect" -> disconnect();
        default -> new ActionResult(false, "Unknown action: " + actionName);
    };
}
```

Benefits of this approach:

| Aspect | Description |
|--------|-------------|
| Execution Speed | Fast because it doesn't use Reflection |
| Serialization | Action names and arguments are all strings, so they can be written in YAML/JSON |
| Native Image Compatibility | Switch statements are AOT-compilable |

### Position of actor-IaC-plugins

actor-IaC-plugins is a standard plugin collection that utilizes the DynamicActorLoader mechanism. Users can immediately use plugin functionality just by cloning and building this repository.

If aggregation processing not supported by standard plugins is needed, you can develop your own plugins using the same mechanism. For details, see "[Creating Custom Plugins](./020-plugin-development.md)".

For detailed specifications of DynamicActorLoader, refer to the POJO-actor documentation "[Dynamic Actor Loader](/POJO-actor/spec_by_examples/core/DynamicActorLoader_251012_oo01)".
