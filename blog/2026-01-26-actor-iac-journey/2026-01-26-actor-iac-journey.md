---
slug: actor-iac-journey-v2.6-to-v2.12
title: "The actor-IaC Journey: From v2.6.0 to v2.12.0"
authors: [devteam]
date: 2026-01-26T08:00:00
tags: [release, actor-iac, retrospective]
---

A retrospective on the evolution of actor-IaC, the Infrastructure-as-Code tool built on POJO-actor. This post covers the major milestones from the initial release (v2.6.0) through v2.12.0.

<!-- truncate -->

## What is actor-IaC?

actor-IaC is an Infrastructure-as-Code tool that leverages the POJO-actor workflow engine for infrastructure automation. It executes commands on remote nodes via SSH and records all operations in an H2 database for complete traceability.

Key design principles:
- **POJO-actor foundation**: Inherits the state-machine workflow engine
- **SSH-focused**: Specialized for SSH-based remote execution
- **H2 logging**: Full traceability with local database
- **Ansible-compatible**: Supports INI inventory file format
- **AI-Native**: YAML-based state machines that AI agents can easily generate

## v2.6.0 (December 31, 2025) - The Beginning

The first release established the core architecture.

### Core Components

**Node**: A POJO managing SSH connections to a single node.

**NodeGroup** (formerly Cluster): Manages multiple nodes and batch operations.

```yaml
# Example: Execute on all nodes in a group
- actor: nodeGroup
  method: apply
  arguments:
    actor: "node-*"
    method: executeCommand
    arguments: ["hostname"]
```

### SSH Execution

- JSch/Mina-based command execution
- ssh-agent or password authentication
- Host-specific variables support

### HashiCorp Vault Integration

Secure management of SSH keys and sudo passwords through Vault integration.

### Design Philosophy

The three-level usage pattern was documented:
- **Level 1**: Pure POJOs without ActorSystem/ActorRef
- **Level 2**: ActorRef-based coordination
- **Level 3**: Full actor system with supervision

---

## v2.7.0 (December 31, 2025) - ExecutionMode

Added support for POJO-actor 2.7.0's ExecutionMode feature.

```java
// Choose between POOL (thread pool) or DIRECT execution
ActorSystem system = ActorSystem.create(ExecutionMode.POOL);
```

---

## v2.8.0 (January 3, 2026) - Parallel Execution

### NodeGroupInterpreter

A dedicated workflow interpreter for node groups, enabling parallel command execution across multiple nodes.

```yaml
# Parallel execution across nodes
- actor: nodeGroup
  method: apply
  arguments:
    actor: "node-*"
    method: runWorkflow
    arguments: ["setup.yaml"]
```

### Error Handling Options

- **continue-on-failure**: Continue processing other nodes even if some fail
- **fail-fast**: Stop at the first error (optional)

This was crucial for real-world deployments where some nodes might be unreachable.

---

## v2.9.0 (January 6, 2026) - Major CLI and Logging Overhaul

This release transformed actor-IaC from a library into a practical CLI tool.

### YAML Overlay Support

Kustomize-style environment customization:

```yaml
# base.yaml
steps:
  - states: ["0", "1"]
    actions:
      - actor: this
        method: executeCommand
        arguments: ["echo 'Hello'"]

# production-overlay.yaml
patches:
  - target: steps[0].actions[0].arguments
    value: ["echo 'Hello Production'"]
```

### H2 Database Logging

All workflow executions are now logged by default:
- Session management (start/end time, status)
- Per-node log entries
- Complete command output history

### JBang CLI Wrapper

The `actor_iac.java` script made it easy to run workflows:

```bash
./actor_iac.java run -w workflow.yaml -i inventory.ini
```

### New CLI Options

| Option | Description |
|--------|-------------|
| `--limit` | Filter target nodes |
| `--ask-pass` | Prompt for SSH password |
| `-v/--verbose` | Verbose output mode |

### SSH Improvements

- Prioritized ssh-agent usage (Ed25519 key support)
- ProxyJump (bastion/jump host) support

---

## v2.10.0 (January 10, 2026) - Centralized Logging

### H2 Log Server

A centralized log server for multi-process environments:

```bash
# Start log server
./actor_iac.java log-serve

# Run workflow (auto-discovers server)
./actor_iac.java run -w workflow.yaml -i inventory.ini
```

The server runs on TCP port 29090 by default, allowing multiple workflow processes to write to a single log database.

### CLI Refactoring

Verb-based command naming:

```bash
# Old
./actor_iac.java --describe workflow.yaml

# New
./actor_iac.java describe workflow.yaml
./actor_iac.java run -w workflow.yaml
./actor_iac.java log-show
./actor_iac.java log-serve
```

### Log Merge

Consolidate distributed logs into a single database:

```bash
./actor_iac.java merge-logs node1.db node2.db -o combined.db
```

### Enhanced Log Queries

```bash
# Filter by relative time
./actor_iac.java log-show --since 1h

# Filter by end time
./actor_iac.java log-show --ended-since 30m

# List nodes in a session
./actor_iac.java log-show --list-nodes --session 42
```

---

## v2.11.0 (January 11, 2026) - Maven Central & Auto-Discovery

### Log Server Auto-Discovery

The log server now starts automatically in the background and is discovered by workflow runners without configuration.

### Maven Central Publication

actor-IaC became available on Maven Central:

```xml
<dependency>
    <groupId>com.scivicslab</groupId>
    <artifactId>actor-IaC</artifactId>
    <version>2.11.0</version>
</dependency>
```

---

## v2.12.0 (January 18, 2026) - Terminology & Patterns

### Terminology Unification

Aligned with POJO-actor 2.12.0's terminology changes:

| Old | New |
|-----|-----|
| Vertex | Transition |
| vertex_name | label |

This made the workflow DSL more intuitive.

### MultiplexerAccumulator Pattern

Unified log output management with simultaneous writes to multiple destinations:

```java
MultiplexerAccumulator acc = new MultiplexerAccumulator();
acc.addTarget(consoleOut);
acc.addTarget(fileOut);
acc.addTarget(h2Logger);
```

### Automatic Node Actor Creation

Nodes are now automatically created as actors from inventory:

```ini
# inventory.ini
[compute]
server01 ansible_host=192.168.1.1
server02 ansible_host=192.168.1.2
```

```yaml
# These actors are auto-created
- actor: node-server01
  method: executeCommand
  arguments: ["hostname"]
```

### Other Improvements

- `-l/--log` option for opt-in text logging
- `--cowfile` option for cowsay character selection
- ISO 8601 timestamp format
- Enhanced SSH diagnostic messages

---

## Evolution Summary

### Feature Timeline

| Version | Date | Key Features |
|---------|------|--------------|
| v2.6.0 | 2025-12-31 | Initial release, SSH execution, NodeGroup |
| v2.7.0 | 2025-12-31 | ExecutionMode support |
| v2.8.0 | 2026-01-03 | NodeGroupInterpreter, continue-on-failure |
| v2.9.0 | 2026-01-06 | YAML overlay, H2 logging, JBang CLI |
| v2.10.0 | 2026-01-10 | Log server, merge-logs, describe |
| v2.11.0 | 2026-01-11 | Auto-discovery, Maven Central |
| v2.12.0 | 2026-01-18 | Transition terminology, MultiplexerAccumulator |

### POJO-actor Correspondence

actor-IaC versions are aligned with POJO-actor versions:

| actor-IaC | POJO-actor | Integration Feature |
|-----------|------------|---------------------|
| v2.6.0 | v2.6.0 | Workflow engine |
| v2.7.0 | v2.7.0 | ExecutionMode |
| v2.8.0 | v2.8.0 | Sub-workflows, state patterns |
| v2.9.0 | v2.9.0 | YAML overlay |
| v2.10.0 | v2.10.0 | JSON State API |
| v2.11.0 | v2.11.0 | Simultaneous Maven Central release |
| v2.12.0 | v2.12.0 | Transition terminology, ManagedThreadPool |

## What's Next?

Check out [actor-IaC v2.13.0](/blog/actor-iac-v2.13.0) for the latest features including WorkflowReporter, Java plugin support, and the AptLockChecker plugin.

## References

- **Documentation**: [actor-IaC Docs](https://scivicslab.com/docs/actor-iac/introduction)
- **GitHub**: [scivicslab/actor-IaC](https://github.com/scivicslab/actor-IaC)
- **Javadoc**: [API Reference](https://scivicslab.github.io/actor-IaC/)
- **Maven Central**: [com.scivicslab:actor-IaC](https://central.sonatype.com/artifact/com.scivicslab/actor-IaC)
- **POJO-actor**: [https://github.com/scivicslab/POJO-actor](https://github.com/scivicslab/POJO-actor)
