---
sidebar_position: 3
title: Architecture
---

# Architecture

This page explains how actor-IaC is structured internally and how its components work together to execute workflows across remote nodes. Understanding the architecture helps you write more effective workflows and troubleshoot issues when they arise.

## System Overview

actor-IaC is built on top of the POJO-actor framework, which provides the actor model foundation for concurrent execution. The tool adds infrastructure-specific capabilities like SSH execution, inventory management, and distributed logging.

The architecture follows a hierarchical pattern where a single NodeGroupInterpreter manages multiple NodeIIAR actors, each representing a connection to a remote node. This structure mirrors how the tool operates: from a central operation terminal to multiple remote servers.

```
┌─────────────────────────────────────────────────────────┐
│                   Operation Terminal                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              IIActorSystem                        │   │
│  │                                                   │   │
│  │  ┌─────────────────────────────────────────┐     │   │
│  │  │       NodeGroupInterpreter              │     │   │
│  │  │       (main workflow executor)          │     │   │
│  │  └──────────────┬──────────────────────────┘     │   │
│  │                 │                                 │   │
│  │      ┌──────────┼──────────┬──────────┐          │   │
│  │      │          │          │          │          │   │
│  │  ┌───┴───┐  ┌───┴───┐  ┌───┴───┐  ┌───┴───┐     │   │
│  │  │NodeIIAR│  │NodeIIAR│  │NodeIIAR│  │NodeIIAR│     │   │
│  │  │node-01 │  │node-02 │  │node-03 │  │node-04 │     │   │
│  │  └───┬───┘  └───┬───┘  └───┬───┘  └───┬───┘     │   │
│  │      │          │          │          │          │   │
│  └──────┼──────────┼──────────┼──────────┼──────────┘   │
│         │          │          │          │              │
│  ┌──────┴──────────┴──────────┴──────────┴──────────┐   │
│  │              H2 Log Database                      │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
          │          │          │          │
          │ SSH      │ SSH      │ SSH      │ SSH
          ▼          ▼          ▼          ▼
     ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
     │Remote  │ │Remote  │ │Remote  │ │Remote  │
     │Node 1  │ │Node 2  │ │Node 3  │ │Node 4  │
     └────────┘ └────────┘ └────────┘ └────────┘
```

## Core Components

### IIActorSystem

The IIActorSystem is the foundation that manages all actors in the workflow execution. It provides a work-stealing thread pool for CPU-bound operations and coordinates message passing between actors. When you start actor-IaC, it creates an IIActorSystem with a configurable number of worker threads (default is 4).

The system maintains a registry of all actors, allowing workflows to reference actors by name. This enables the hierarchical path notation used in workflow definitions, such as `./node-*` to reference all child actors matching a pattern.

### NodeGroup and NodeGroupInterpreter

The NodeGroup class represents a collection of target nodes loaded from an inventory file. It parses Ansible-compatible INI files and provides methods to filter nodes by group name or individual host patterns.

The NodeGroupInterpreter is the main workflow executor. It wraps a standard POJO-actor Interpreter and adds capabilities specific to node-based execution:

- Creating child NodeIIAR actors for each target node
- Routing actions to specific nodes based on path patterns
- Collecting results from multiple nodes and aggregating them

When you run a workflow with an inventory, the NodeGroupInterpreter reads the inventory file, creates a NodeIIAR for each target host, and then executes the workflow. Each workflow step can target specific nodes using path patterns like `./node-web-*` or all nodes with `./all`.

### NodeIIAR

NodeIIAR is an actor that represents a single remote node. It maintains the SSH connection to the node and translates workflow actions into SSH commands. When a workflow step includes an action like `shell` or `script`, the NodeIIAR executes that command on the remote host via SSH and returns the result.

Each NodeIIAR has a name that corresponds to the hostname or IP address from the inventory. This name is used in log entries to identify which node produced each message.

### SSH Execution

actor-IaC uses the JSch library for SSH connections. By default, it uses SSH agent forwarding, which means it relies on your local SSH agent for key-based authentication. This is the recommended approach because it avoids storing credentials.

For environments where SSH agent is not available, you can use the `--ask-pass` option to prompt for a password. The password is used for all nodes in the workflow, so all target hosts must accept the same credentials.

SSH connections are established on-demand when a node actor needs to execute a command. The connection is kept alive for the duration of the workflow to avoid reconnection overhead.

## Logging Architecture

actor-IaC uses an H2 database for structured logging. This provides several advantages over traditional text log files:

- Logs are queryable by session, node, time range, or log level
- Each session is a distinct entity with metadata like workflow name and status
- Node-level results are tracked separately for easy analysis

### Database Schema

The log database contains three main tables:

**sessions** stores metadata about each workflow execution:
- Session ID, start time, end time
- Workflow name, overlay name, inventory name
- Number of nodes and final status

**logs** contains individual log entries:
- Timestamp, node ID, log level, message
- Optional label and action name for context
- Exit code and duration for command executions

**node_results** tracks the final status of each node in a session:
- Node ID and status (SUCCESS, FAILED, SKIPPED)
- Reason for failure if applicable

### Log Server Mode

When running multiple workflow processes concurrently, each process would normally create its own embedded H2 database, which can lead to confusion and scattered logs. Log Server Mode solves this by running a central H2 TCP server that all workflow processes connect to.

```
┌─────────────────────────────────────────────────┐
│              Operation Terminal                  │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │        H2 Log Server (TCP)             │     │
│  │        Port 29090                       │     │
│  └─────────────────┬──────────────────────┘     │
│                    │                             │
│    ┌───────────────┼───────────────┐            │
│    │               │               │            │
│  ┌─┴─┐           ┌─┴─┐           ┌─┴─┐         │
│  │WF1│           │WF2│           │WF3│         │
│  └───┘           └───┘           └───┘         │
│  Process A       Process B       Process C      │
│                                                  │
└──────────────────────────────────────────────────┘
```

To use Log Server Mode:

1. Start the log server in one terminal:
   ```bash
   ./actor_iac.java log-serve --db ./logs/shared
   ```

2. Run workflows with the `--log-serve` option in other terminals:
   ```bash
   ./actor_iac.java run -d ./workflows -w deploy --log-serve=localhost:29090
   ```

The log server also provides an HTTP API at port 28890 (TCP port - 200) that returns server information in JSON format.

## Workflow Execution Flow

When you run a workflow, actor-IaC follows this execution flow:

1. **Initialization**: The CLI parses command-line options and creates an IIActorSystem. It scans the workflow directory to build a cache of available workflow files.

2. **Inventory Loading**: If an inventory file is specified, it is parsed to create a NodeGroup. The CLI validates that the specified group exists in the inventory.

3. **Actor Creation**: For each target node, a NodeIIAR actor is created and registered with the system. These actors are children of the main NodeGroupInterpreter.

4. **Workflow Loading**: The workflow YAML file is loaded, optionally with an overlay applied. The overlay system performs variable substitution and strategic merge patching.

5. **Session Start**: A new session is recorded in the log database with the workflow name, overlay, inventory, and node count.

6. **Execution**: The interpreter starts at state "0" and processes steps until it reaches "end" or encounters an error. Each step may invoke actions on specific nodes.

7. **Result Collection**: As nodes complete actions, results are logged to the database. Node-level success/failure is tracked separately.

8. **Session End**: The session is marked complete (or failed) with an end timestamp. The system gracefully shuts down all actors.

## Overlay System Integration

actor-IaC integrates with POJO-actor's WorkflowKustomizer to support environment-specific workflow customization. When you specify an overlay directory with `-o`, the tool:

1. Reads the `overlay-conf.yaml` file in the overlay directory
2. Loads the base workflows referenced in the configuration
3. Applies patches, variable substitutions, and name transformations
4. Uses the resulting merged workflow for execution

This allows you to maintain a single base workflow that works across environments while keeping environment-specific details (like timeouts, retry counts, or target URLs) in separate overlay configurations.

## Error Handling

actor-IaC handles errors at multiple levels:

**Action-level errors**: If an individual action fails (e.g., a shell command returns a non-zero exit code), the action result is marked as failed. The workflow can define fallback paths by having multiple steps with the same source state.

**Node-level errors**: If a node becomes unreachable or fails to execute actions, its status is recorded as FAILED in the node_results table. Other nodes continue execution independently.

**Workflow-level errors**: If the interpreter cannot find a valid transition from the current state, or if a required action fails without a fallback, the workflow stops and is marked as FAILED.

All errors are logged to the H2 database with timestamps and context, making it possible to diagnose issues after the fact.
