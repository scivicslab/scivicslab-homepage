---
slug: pojo-actor-journey-v1.0-to-v2.12
title: "The POJO-actor Journey: From v1.0.0 to v2.12.0"
authors: [devteam]
date: 2026-01-26T07:00:00
tags: [release, pojo-actor, retrospective]
---

:::info[Links]
- **Original**: [scivicslab.com](https://scivicslab.com/blog/pojo-actor-journey-v1.0-to-v2.12)
- **Documentation**: [POJO-actor Docs](https://scivicslab.com/docs/pojo-actor/introduction)
- **GitHub**: [scivicslab/POJO-actor](https://github.com/scivicslab/POJO-actor)
- **Javadoc**: [API Reference](https://scivicslab.github.io/POJO-actor/)
- **Maven Central**: [com.scivicslab:pojo-actor](https://central.sonatype.com/artifact/com.scivicslab/pojo-actor)
:::

A retrospective on the evolution of POJO-actor, the lightweight actor model library for Java. This post covers the major milestones from the initial release (v1.0.0) through v2.12.0.

<!-- truncate -->

## What is POJO-actor?

POJO-actor is a lightweight actor model library that turns any Plain Old Java Object into a concurrent actor. Key design principles:

- **Zero dependencies**: No base classes to extend, no interfaces to implement
- **Virtual Thread native**: Built for Java 21+, each actor runs on its own virtual thread
- **GraalVM compatible**: No reflection in core features
- **Workflow engine**: YAML/JSON/XML-based workflow definitions
- **Distributed support**: Multi-node actor communication via lightweight HTTP

## v1.0.0 (October 12, 2025) - The Beginning

The first release established the core actor model.

### Core Components

- **ActorSystem**: Manages actor lifecycle and message routing
- **ActorRef**: Reference to an actor for message sending
- **Root**: The root actor of the system

### Basic Messaging

```java
// Create an actor from any POJO
IIActorRef<MyService> actor =
    new IIActorRef<>("service", new MyService(), system);

// Asynchronous messaging
actor.tell(s -> s.process("data"));

// Synchronous request-response
String result = actor.ask(s -> s.compute(42)).get();
```

**Tests**: Basic test suite implemented

---

## v1.1.0 (October 12, 2025) - Immediate Execution

Added bypass methods for urgent operations.

### tellNow / askNow

```java
// Bypass the message queue for urgent operations
actor.tellNow(s -> s.emergencyStop());
String result = actor.askNow(s -> s.getStatus());
```

These methods execute immediately without waiting in the message queue—useful for time-critical operations.

**Tests**: 17 tests (including 6 new tests for tellNow/askNow)

---

## v2.0.0 (October 12, 2025) - Workflow Engine Integration

A major release that integrated the workflow engine and dynamic actor loading.

### Workflow Engine

YAML/JSON-based workflow definitions for data-driven actor coordination:

```yaml
name: my-workflow
steps:
  - states: ["0", "1"]
    actions:
      - actor: processor
        method: initialize

  - states: ["1", "2"]
    actions:
      - actor: processor
        method: process
        arguments: ["data"]
```

### Dynamic Actor Loading

- **CallableByActionName**: String-based actor invocation interface
- **DynamicActorLoader**: ServiceLoader pattern for runtime actor loading
- **ActorProvider**: Plugin implementation interface

### Plugin Architecture

```java
// Implement ActorProvider for plugin discovery
public class MyActorProvider implements ActorProvider {
    @Override
    public String getName() { return "myActor"; }

    @Override
    public Object createActor() { return new MyActor(); }
}
```

**Tests**: 35 tests

---

## v2.5.0 (October 12, 2025) - Distributed Actors & Scheduler

A major feature release adding distributed capabilities.

### Sub-Workflow Patterns

```java
// Pattern A: New interpreter per call
SubWorkflowCaller caller = new SubWorkflowCaller(system);
caller.call("sub-workflow.yaml");

// Pattern B: Reusable interpreter
ReusableSubWorkflowCaller reusable = new ReusableSubWorkflowCaller(system);
reusable.call("sub-workflow.yaml");
reusable.reset();  // Reset for reuse
```

### Scheduler

```java
// Schedule periodic tasks
Scheduler scheduler = new Scheduler(system);
scheduler.scheduleAtFixedRate(
    () -> actor.tell(a -> a.healthCheck()),
    0, 30, TimeUnit.SECONDS
);
```

### Distributed Actor System

Multi-node actor communication using lightweight HTTP:

```java
// Start distributed system
DistributedActorSystem distributed =
    DistributedActorSystem.create("node1", 8080);

// Get remote actor reference
RemoteActorRef remote = distributed.getRemoteActor(
    "node2:8080", "processor"
);

// Transparent remote messaging
remote.tell("process", "data");
```

Features:
- Automatic node discovery
- JSON-based string protocol
- No Kafka, no middleware dependencies
- Works on Slurm, Kubernetes, bare metal

**Tests**: 120 tests (100% pass rate)

---

## v2.6.0 (November 25, 2025) - XML & XSLT Support

### XML Workflow Format

```xml
<workflow name="deploy">
  <step states="0,1">
    <action actor="deployer" method="prepare"/>
  </step>
  <step states="1,2">
    <action actor="deployer" method="execute"/>
  </step>
</workflow>
```

### XSLT Visualization

Transform workflows to HTML visualizations:

```java
WorkflowXsltTransformer transformer = new WorkflowXsltTransformer();
String html = transformer.toTableView("workflow.xml");
String graph = transformer.toGraphView("workflow.xml");
```

### DynamicActorLoaderActor

A built-in actor for loading plugins from workflows:

```yaml
# Load actor from JAR at runtime
- actor: loader
  method: loadFromJar
  arguments: ["/plugins/my-actor.jar", "MyActor", "myActor"]

# Create from ServiceLoader provider
- actor: loader
  method: createFromProvider
  arguments: ["mathPlugin"]
```

**Tests**: 150+ tests

---

## v2.7.0 (December 31, 2025) - Execution Modes

### ExecutionMode Selection

```java
// POOL: Work-stealing pool execution (default)
Action action = new Action("actor", "method", args, ExecutionMode.POOL);

// DIRECT: Synchronous execution
Action action = new Action("actor", "method", args, ExecutionMode.DIRECT);
```

### Unified Action Format

Consistent Action object format across YAML, JSON, and XML—enabling type-safe execution with execution mode specification.

**Tests**: 257 tests

---

## v2.8.0 (January 2, 2026) - Sub-Workflows & Pattern Matching

### Sub-Workflow Execution

```yaml
# Call sub-workflow
- actor: this
  method: call
  arguments: ["sub-workflow.yaml"]

# Apply action to child actors
- actor: this
  method: apply
  arguments:
    - actor: "Species-*"
      method: mutate
      arguments: [0.05, 0.02, 0.5]
```

### Actor Name Wildcards

```java
// Find matching actors in system
List<ActorRef> actors = system.findMatchingActors("node-*");

// Patterns supported: *, prefix-*, *-suffix
```

### State Pattern Matching

| Pattern | Example | Description |
|---------|---------|-------------|
| Exact | `"1"` | Exact state match |
| Wildcard | `"*"` | Any state |
| Negation | `"!end"` | Not this state |
| OR | `"1\|2\|3"` | Any of these states |
| Comparison | `">=5"` | Numeric comparison |
| JEXL | `"jexl:state =~ 'error.*'"` | Regular expression |

**Tests**: 272 tests

---

## v2.9.0 (January 7, 2026) - YAML Overlay

Kustomize-style workflow customization:

```yaml
# base.yaml
name: deploy-workflow
steps:
  - states: ["0", "1"]
    actions:
      - actor: deployer
        method: deploy
        arguments: ["app-v1.0"]

# production-overlay.yaml
patches:
  - target: steps[0].actions[0].arguments
    value: ["app-v1.0-prod"]
```

### PatchEntry Class

Apply partial modifications to base workflows for environment-specific customization (dev/staging/production).

**Tests**: 280+ tests

---

## v2.10.0 (January 10, 2026) - JSON State API

XPath-style state access for hierarchical data:

```java
// Set nested state
actor.setState("/config/timeout", 30);
actor.setState("/config/retry/max", 3);

// Get state values
int timeout = actor.getState("/config/timeout");
```

This enables intuitive access to complex state structures within workflows.

**Tests**: 290+ tests

---

## v2.11.0 (January 11, 2026) - Maven Central

Stable release published to Maven Central:

```xml
<dependency>
    <groupId>com.scivicslab</groupId>
    <artifactId>pojo-actor</artifactId>
    <version>2.11.0</version>
</dependency>
```

Published artifacts:
- Main JAR
- Javadoc JAR
- Sources JAR

**Tests**: 290+ tests

---

## v2.12.0 (January 18, 2026) - Terminology Refresh

### Renamed Concepts

| Old | New | Reason |
|-----|-----|--------|
| Vertex | Transition | Better represents state transitions |
| ControllableWorkStealingPool | ManagedThreadPool | Hides implementation details |

### ROOT Actor Pattern

Clarified actor hierarchy with the root actor as the starting point for plugin integration.

### Workflow Definition Flexibility

```yaml
# Both keys now supported
steps:        # Preferred
transitions:  # Also valid

# Documentation support
- states: ["0", "1"]
  note: "Initialize the system"  # New property
  actions:
    - actor: init
      method: setup
```

**Tests**: 300+ tests

---

## Evolution Summary

### Feature Timeline

| Version | Date | Key Features | Tests |
|---------|------|--------------|-------|
| v1.0.0 | 2025-10-12 | Basic actor model, Javadoc | - |
| v1.1.0 | 2025-10-12 | tellNow/askNow immediate execution | 17 |
| v2.0.0 | 2025-10-12 | Workflow engine, dynamic loading | 35 |
| v2.5.0 | 2025-10-12 | Distributed actors, scheduler | 120 |
| v2.6.0 | 2025-11-25 | XML/XSLT, DynamicActorLoaderActor | 150+ |
| v2.7.0 | 2025-12-31 | ExecutionMode, unified format | 257 |
| v2.8.0 | 2026-01-02 | Sub-workflows, state patterns | 272 |
| v2.9.0 | 2026-01-07 | YAML overlay (Kustomize-style) | 280+ |
| v2.10.0 | 2026-01-10 | JSON State API (XPath-style) | 290+ |
| v2.11.0 | 2026-01-11 | Maven Central publication | 290+ |
| v2.12.0 | 2026-01-18 | Transition, ManagedThreadPool, ROOT | 300+ |

### Core Architectural Principles

1. **Lightweight**: Minimal external dependencies
2. **GraalVM Native Image compatible**: No reflection in core features
3. **Virtual Threads**: Each actor runs on its own virtual thread
4. **POJO-centric**: Use existing Java objects as actors
5. **Incremental adoption**: Gradually introduce into existing codebases

## What's Next?

Check out [POJO-actor v2.13.0](/blog/pojo-actor-v2.13.0) for the latest features including JSON State variable expansion fixes, Java plugin support, and the CallableByActionName interface.

## Links

- [GitHub Repository](https://github.com/scivicslab/POJO-actor)
- [Maven Central](https://central.sonatype.com/artifact/com.scivicslab/pojo-actor)
- [actor-IaC](https://github.com/scivicslab/actor-IaC) - Infrastructure automation built on POJO-actor
