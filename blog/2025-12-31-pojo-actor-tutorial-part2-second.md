---
slug: pojo-actor-tutorial-part2-creating-workflows
title: "POJO-actor Tutorial Part 2 (Second Half): Creating Workflows"
authors: [devteam]
tags: [pojo-actor, tutorial]
image: /img/blog-pojo-actor-workflow.svg
---

![POJO-actor Workflow](/img/blog-pojo-actor-workflow.svg)

The second half of our POJO-actor Tutorial Part 2 is now available on CoderLegion! This article teaches you how to integrate plain Java classes into workflow systems.

<!-- truncate -->

## Article Overview

This tutorial covers the practical implementation of workflows using the POJO-actor framework.

### Four-Step Implementation Process

1. **POJO Creation** - Write ordinary Java classes with business logic, independent of workflow concerns
2. **IIActorRef Implementation** - Create an adapter bridging YAML workflows and Java methods
3. **YAML Workflow Definition** - Define state-machine-based workflows
4. **Execution Application** - Assemble and execute complete workflows

### Key Concepts

The tutorial demonstrates how the `callByActionName` method serves as the bridge between YAML workflows and Java code. The framework uses `ActionResult` returns to enable conditional branching—success allows progression while failure triggers alternative execution paths.

## Practical Example: Turing Machine

The article walks through a complete Turing machine implementation:

- **Turing.java** - Core business logic with methods like `initMachine()`, `put()`, and `move()`
- **TuringIIAR.java** - Adapter translating YAML actions to method calls
- **turing83.yaml** - State-transition workflow controlling machine execution
- **TuringWorkflowApp.java** - Complete runnable application

## Design Philosophy

> Keep workflows simple while maintaining complexity at the POJO level.

This separation of concerns makes both the workflow definitions and the business logic easier to understand and maintain.

## Read the Full Article

Check out the complete tutorial on CoderLegion:

**[POJO-actor Tutorial Part 2 (Second Half): Creating Workflows](https://coderlegion.com/9132/pojo-actor-tutorial-part-2-second-half-creating-workflows)**

Future posts will cover sub-workflow composition and more advanced patterns!
