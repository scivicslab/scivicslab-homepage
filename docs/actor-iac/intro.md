---
sidebar_position: 1
title: Introduction
---

# actor-IaC

**Infrastructure as Code powered by the Actor Model**

actor-IaC is an infrastructure automation tool built on top of POJO-actor. It enables you to define and execute infrastructure workflows across multiple nodes using a declarative YAML-based approach.

## Key Features

- **Actor-based Architecture**: Each node is represented as an actor, enabling parallel execution
- **YAML Workflow Definitions**: Declarative infrastructure workflows with state machine semantics
- **Multi-node Support**: Execute commands across local and remote nodes simultaneously
- **Overlay System**: Customize workflows for different environments without duplication
- **Built-in Logging**: H2 database-backed logging with per-node query capabilities
- **Idempotent Operations**: Design workflows that can be safely re-run

## Quick Example

Define an infrastructure workflow:

```yaml
name: setup-webserver

steps:
  - states: ["0", "1"]
    vertexName: install-nginx
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: executeSudoCommand
          arguments: ["apt-get install -y nginx"]

  - states: ["1", "2"]
    vertexName: start-nginx
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: executeSudoCommand
          arguments: ["systemctl start nginx"]

  - states: ["2", "end"]
    vertexName: verify
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: executeCommand
          arguments: ["curl -s http://localhost"]
```

Execute with the CLI:

```bash
java -jar actor-IaC.jar workflow -w setup-webserver.yaml
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  actor-IaC CLI                   │
├─────────────────────────────────────────────────┤
│              Workflow Interpreter                │
│         (YAML → State Machine → Actions)        │
├─────────────────────────────────────────────────┤
│                  NodeGroup Actor                 │
│    ┌──────────┬──────────┬──────────┐          │
│    │  Node-1  │  Node-2  │  Node-N  │          │
│    │  Actor   │  Actor   │  Actor   │          │
│    └──────────┴──────────┴──────────┘          │
├─────────────────────────────────────────────────┤
│              H2 Distributed Log Store            │
└─────────────────────────────────────────────────┘
```

## Getting Started

Check out the [Getting Started](./getting-started) guide to begin automating your infrastructure.

## Use Cases

- **Server Provisioning**: Automate software installation across multiple nodes
- **Configuration Management**: Apply consistent configurations to server fleets
- **Deployment Pipelines**: Orchestrate multi-step deployment workflows
- **Maintenance Tasks**: Run maintenance scripts across infrastructure
