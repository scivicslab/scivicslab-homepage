---
slug: pojo-actor-tutorial-part2-workflow-basics
title: "POJO-actor Tutorial Part 2 (First Half): Workflow Language Basics"
authors: [devteam]
tags: [pojo-actor, tutorial]
image: /img/blog-pojo-actor-workflow.svg
---

![POJO-actor Workflow](/img/blog-pojo-actor-workflow.svg)

Our second tutorial article about POJO-actor has been published on CoderLegion! This article introduces the workflow engine (actor-WF) added in POJO-actor version 2.x.

<!-- truncate -->

## Article Overview

This tutorial covers the foundational concepts of the POJO-actor workflow language:

### From Actors to Agents

Learn how Virtual Threads in JDK 21+ enable thousands of concurrent actors, making it practical to build agent-based simulations and autonomous systems.

### Workflow Language Design

Actor-WF uses a beautifully simple three-element model:

> "Send this message to this actor"

All workflow steps can be expressed uniformly through consistent actor, method, and argument specifications.

### Turing Machine Foundation

The workflow system is grounded in Turing machine theory, enabling complex logic through state transitions rather than custom syntax.

## Core Concepts

- **State Transitions**: Workflows progress through defined states with clear transition rules
- **Conditional Branching**: Multiple rows sharing the same starting state enable if-else logic
- **Termination**: Workflows complete when reaching an "end" state or finding no matching row

## Practical Examples

The tutorial includes hands-on examples implementing historical Turing machines that generate binary sequences, demonstrating how abstract computational theory applies to modern workflow automation.

## Read the Full Article

Check out the complete tutorial on CoderLegion:

**[POJO-actor Tutorial Part 2 (First Half): Workflow Language Basics](https://coderlegion.com/9131/pojo-actor-tutorial-part-2-first-half-workflow-language-basics)**

Stay tuned for the second half of this tutorial!
