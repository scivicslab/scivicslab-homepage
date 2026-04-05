---
id: PluginInventory_260403_oo01
sidebar_position: 20
title: "plugin-inventory: Inventory Parsing and Node Group Management"
description: "A plugin that parses Ansible INI-format inventory files and provides node group creation and workflow control."
keywords:
  - inventory
  - Ansible
  - INI
  - node group
  - host management
  - variable precedence
---

# plugin-inventory

A plugin that parses Ansible INI-format inventory files and generates `Node` objects from `plugin-ssh`. It provides node group management, variable precedence control, and parallel workflow execution.

## 3-Level Architecture

| Level | Class | Role |
|---|---|---|
| POJO | `InventoryParser`, `NodeGroup` | Inventory parsing and node generation |
| Actor | `NodeGroupActor` | Child actor creation and parallel orchestration |
| Interpreter | `NodeGroupInterpreter` | Integration with the workflow state machine |

## Inventory File Format

Uses Ansible-compatible INI format.

```ini
# Comments (# or ;)

[all:vars]
ansible_user=admin
ansible_port=22

[webservers:vars]
actoriac_user=deploy

[webservers]
web1 ansible_host=192.168.1.10
web2 ansible_host=192.168.1.11 ansible_port=2222

[dbservers]
db1 ansible_host=192.168.1.20

[local]
localhost ansible_connection=local
```

### Supported Variables

The `actoriac_*` prefix takes priority, but compatibility with `ansible_*` is maintained.

| actoriac_ | ansible_ | Description |
|---|---|---|
| `actoriac_host` | `ansible_host` | Actual connection hostname/IP |
| `actoriac_user` | `ansible_user` | SSH username |
| `actoriac_port` | `ansible_port` | SSH port number |
| `actoriac_connection` | `ansible_connection` | Connection mode (`ssh` or `local`) |

### Variable Precedence

Variables are applied in order: **host-specific > group > global**.

```ini
[all:vars]
ansible_user=global_user        # Priority: low
ansible_port=1111

[web:vars]
ansible_user=group_user         # Priority: medium
ansible_port=2222

[web]
server1 ansible_user=host_user  # Priority: high
```

In this example, `server1`'s user is `host_user` and port is `2222`.

When both `actoriac_*` and `ansible_*` are defined for the same variable, `actoriac_*` takes precedence.

### Unsupported Features (with warnings)

The parser generates warning messages when it detects the following features.

| Feature | Warning |
|---|---|
| `:children` groups | Nested groups are not supported |
| Range patterns `[01:50]` | Hostname range expansion is not supported |
| `ansible_become` | Recommend using `SUDO_PASSWORD` environment variable |
| `ansible_python_interpreter` | Not needed as it runs without Python |
| `ansible_ssh_*` | Recommend using `~/.ssh/config` |

## `InventoryParser` Class

A static class for parsing inventory files.

```java
// Parse inventory from file
try (InputStream is = new FileInputStream("inventory.ini")) {
    InventoryParser.ParseResult result = InventoryParser.parse(is);

    if (result.hasWarnings()) {
        for (String warning : result.getWarnings()) {
            System.err.println("WARNING: " + warning);
        }
    }

    InventoryParser.Inventory inv = result.getInventory();

    // List hosts in a group
    List<String> hosts = inv.getHosts("webservers");

    // Get variables
    Map<String, String> globalVars = inv.getGlobalVars();
    Map<String, String> groupVars = inv.getGroupVars("webservers");
    Map<String, String> hostVars = inv.getHostVars("web1");

    // All groups
    Map<String, List<String>> allGroups = inv.getAllGroups();
}
```

## `NodeGroup` Class

A POJO that generates `Node` objects from inventory.

```java
// Builder pattern
NodeGroup ng = new NodeGroup.Builder()
    .withInventory(new FileInputStream("inventory.ini"))
    .build();

// Generate Node list from group
List<Node> nodes = ng.createNodesForGroup("webservers");

// Node for localhost
List<Node> local = ng.createLocalNode();

// Host limiting
ng.setHostLimit("web1,web2");
List<Node> filtered = ng.createNodesForGroup("webservers");

// Set SSH password (applied to all nodes)
ng.setSshPassword("password");

// Check parse warnings
if (ng.hasParseWarnings()) {
    ng.getParseWarnings().forEach(System.err::println);
}
```

## `NodeGroupActor` `@Action` Methods

### Node Management

| Action | Arguments | Description |
|---|---|---|
| `createNodeActors` | `["webservers"]` | Create child `NodeActor` for each host in the group |
| `createNodeActors` | `["local"]` | Create a single `NodeActor` for localhost |
| `hasInventory` | none | Check if inventory is loaded |

### Parallel Execution

| Action | Arguments | Description |
|---|---|---|
| `apply` | `{"actor":"node-*", "method":"runWorkflow", "arguments":["deploy.yaml"]}` | Execute action in parallel on child actors matching the wildcard |
| `executeCommandOnAllNodes` | `["ls -la"]` | Execute command sequentially on all child nodes |

`apply` uses `CompletableFuture` for parallel execution and returns combined results from all nodes.

### Child Actor Hierarchy

The structure created by `createNodeActors` is as follows:

```
nodeGroup (NodeGroupActor)
  +-- node-web1 (NodeActor wrapping NodeInterpreter)
  +-- node-web2 (NodeActor wrapping NodeInterpreter)
  +-- node-db1  (NodeActor wrapping NodeInterpreter)
```

Each child actor has an independent `Node` instance and manages its own SSH session.

### Workflow Control

| Action | Arguments | Description |
|---|---|---|
| `readYaml` | `["workflow.yaml"]` | Load workflow YAML |
| `execCode` | none | Execute the current step's code |
| `runUntilEnd` | `[maxIterations]` | Run workflow to completion |
| `runWorkflow` | `["workflow.yaml", maxIterations]` | Load and execute |

### Output and State

| Action | Arguments | Description |
|---|---|---|
| `hasAccumulator` | none | Check if `outputMultiplexer` is registered |
| `getAccumulatorSummary` | none | Get summary from `outputMultiplexer` |
| `printSessionSummary` | none | Display session validation result summary from log store |
| `getSessionId` | none | Get current session ID |
| `printJson` / `printYaml` | none | Output state as JSON/YAML |

## `NodeGroupInterpreter` Features

`NodeGroupInterpreter` wraps `NodeGroup` and provides the following additional features:

- **cowsay display**: Shows current step with ASCII art during workflow transitions
- **Asynchronous logging**: Automatic action result logging to `DistributedLogStore`
- **verbose mode**: Displays full YAML state at each transition
- **Overlay directory**: Directory for workflow configuration overrides

## Plugin Dependencies

- `plugin-ssh` (provided) - Uses `Node` class
- `plugin-log-db` (provided) - Logging functionality
- `plugin-log-output` (provided) - Output multiplexer
