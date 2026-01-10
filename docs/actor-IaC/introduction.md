---
sidebar_position: 1
title: Introduction
---

# Introduction

actor-IaC is an Infrastructure as Code (IaC) workflow automation tool built on the POJO-actor framework. It enables you to define infrastructure operations as declarative YAML workflows and execute them across multiple remote nodes via SSH. Unlike traditional IaC tools that focus on state management, actor-IaC emphasizes orchestrating sequences of operations with full logging and traceability.

The tool is designed for scenarios where you need to run coordinated operations across a fleet of servers, such as deploying applications, collecting system information, or performing maintenance tasks. Each workflow execution is recorded in an H2 database, allowing you to search and analyze logs across sessions and nodes.

## Key Features

actor-IaC provides several capabilities that make infrastructure automation more manageable and traceable.

**YAML-based Workflow Definitions** allow you to define infrastructure operations as state machine workflows. Each workflow consists of steps that transition between states, with each step executing one or more actions on registered actors. This declarative approach separates the what (workflow definition) from the how (actor implementation).

**SSH-based Remote Execution** connects to remote nodes using SSH, either via ssh-agent for key-based authentication or password authentication. The tool reads Ansible-compatible inventory files to discover target hosts and their groupings.

**Overlay System for Environment Customization** lets you create base workflows that can be customized for different environments (development, staging, production) using a Kustomize-style overlay system. Variables, patches, and name transformations enable you to maintain a single source of truth while supporting environment-specific variations.

**Distributed Logging with H2 Database** records all workflow executions in a structured database. Each session captures the workflow name, overlay, inventory, start/end times, and status. Individual log entries include timestamps, node IDs, log levels, and messages. This makes it possible to trace what happened on each node during a workflow run.

**Log Server Mode** enables multiple concurrent workflow processes to write to a shared log database. Instead of each process creating its own embedded database, they connect to a central H2 TCP server running on the operation terminal.

## When to Use actor-IaC

actor-IaC is particularly well-suited for operations that require coordination across multiple servers with detailed audit trails. Common use cases include:

- **Application Deployment**: Rolling out updates to a cluster of application servers, with pre-deployment validation, deployment, and post-deployment verification steps.

- **System Information Collection**: Gathering hardware specifications, software versions, or configuration data from all nodes in an inventory and presenting them in a consolidated report.

- **Maintenance Operations**: Executing maintenance procedures like log rotation, cache clearing, or service restarts across multiple nodes in a controlled sequence.

- **Configuration Management**: Applying configuration changes to groups of servers based on their roles defined in the inventory.

## Architecture Overview

The tool operates from a single operation terminal (your workstation or a bastion host) that connects to remote nodes via SSH. The operation terminal runs the actor-IaC process, which:

1. Reads the workflow definition and inventory
2. Creates child actors for each target node
3. Executes workflow steps by sending SSH commands to nodes
4. Collects results and writes them to the log database

```
[Operation Terminal]
├── actor-IaC Process
│   ├── NodeGroupInterpreter (main workflow)
│   ├── NodeIIAR (node-web-01) ──→ SSH ──→ [Remote Node 1]
│   ├── NodeIIAR (node-web-02) ──→ SSH ──→ [Remote Node 2]
│   └── NodeIIAR (node-db-01)  ──→ SSH ──→ [Remote Node 3]
│
└── H2 Log Database (local)
```

Remote nodes do not need any agent or special software installed. They only need to be accessible via SSH from the operation terminal.

## Next Steps

To get started with actor-IaC, proceed to the [Getting Started](./getting-started) guide, which walks you through installation and your first workflow execution. If you want to understand the internal architecture in more detail, see the [Architecture](./architecture) page.
