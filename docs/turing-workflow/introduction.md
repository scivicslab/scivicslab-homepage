---
sidebar_position: 1
title: "Introduction"
description: "Introduction to Turing-workflow: a YAML-based workflow engine built on POJO-actor"
---

# Introduction to Turing-workflow

[![Java Version](https://img.shields.io/badge/java-21+-blue.svg)](https://openjdk.java.net/)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/scivicslab/Turing-workflow/blob/main/LICENSE)
[![Javadoc](https://img.shields.io/badge/javadoc-3.0.0-brightgreen.svg)](https://javadoc.io/doc/com.scivicslab/turing-workflow/3.0.0)
[![Maven Central](https://img.shields.io/maven-central/v/com.scivicslab/turing-workflow.svg)](https://central.sonatype.com/artifact/com.scivicslab/turing-workflow)

Turing-workflow is a YAML-based workflow engine built on POJO-actor. It provides a Turing-complete state machine interpreter with dynamic actor loading, subworkflows, YAML overlays, and distributed execution.

## Overview

In the traditional actor model, actors are passive entities — they wait for messages and react to them. While this simplifies concurrent programming by eliminating locks, actors themselves don't decide what to do next; they only respond to external stimuli.

Turing-workflow changes this. By attaching a workflow to an actor, you give it complex behavioral patterns: conditional branching, loops, and state-driven decisions. The actor becomes an agent — an autonomous entity that observes its environment and acts according to its own logic.

With Virtual Threads since JDK 21, you can create tens of thousands of such autonomous agents. This combination — complex behavior per actor, massive scale — was impractical before and opens up new applications: large-scale agent-based simulations, infrastructure platforms that monitor and self-repair, AI agent pipelines, and more.

> An agent is anything that can be viewed as perceiving its environment through sensors and acting upon that environment through actuators.
> — Russell & Norvig, "Artificial Intelligence: A Modern Approach"

## How It Works

Turing-workflow externalizes the control flow of your application. Instead of hard-coding sequences of operations in Java, you define them in YAML configuration files that can be modified without recompilation.

A workflow is modeled as a matrix of state transitions. Each row specifies a source state, a target state, and a list of actions to execute during the transition. The workflow engine starts at state `"0"` by default and processes transitions until it reaches the terminal `"end"` state.

Each action in a step is a message sent to an actor — just three elements: `actor`, `method`, and `arguments`. This follows the same mental model as `tell()`/`ask()` in Java code:

```yaml
name: my-workflow
steps:
  - states: ["0", "1"]
    actions:
      - actor: dataProcessor
        method: process
        arguments: "data.csv"
  - states: ["1", "end"]
    actions:
      - actor: log
        method: info
        arguments: "Done"
```

## Why Turing-Complete?

The combination allows complex logic that traditional YAML-based workflow languages struggle with — without introducing custom syntax. Because the workflow is essentially a Turing machine, conditional branching and loops are expressed as state transitions. Multiple transitions from the same source state provide conditional branching; the first one whose actions all succeed wins.

## Feature List

- **YAML Workflow** — Define workflows in YAML format
- **Turing-complete** — Conditional branching and loops via state transitions
- **`@Action` annotation** — Simple method-level action registration
- **Dynamic Actor Loading** — Load actors from external JARs at runtime via Maven coordinates
- **Subworkflows** — Split and reuse workflow definitions
- **YAML Overlay** — Environment-specific configuration (dev/staging/prod)
- **Distributed Execution** — Inter-node workflow execution
- **Breakpoints** — Pause/resume workflow execution
- **CLI** — Command-line interface for workflow execution

## Requirements

- Java 21 or higher
- Maven 3.6+
- POJO-actor 3.0.0

## References

- **Javadoc**: [API Reference](https://javadoc.io/doc/com.scivicslab/turing-workflow/3.0.0)
- **POJO-actor**: [GitHub](https://github.com/scivicslab/POJO-actor)
- **Turing-workflow-plugins**: [GitHub](https://github.com/scivicslab/Turing-workflow-plugins)
