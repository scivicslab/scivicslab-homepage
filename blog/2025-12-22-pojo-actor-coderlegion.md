---
slug: pojo-actor-v1-introduction
title: "POJO-actor v1.0: A Lightweight Actor Model Library for Java"
authors: [devteam]
tags: [pojo-actor, announcement, release]
image: /img/blog-pojo-actor.svg
---

![POJO-actor](/img/blog-pojo-actor.svg)

We are pleased to announce that our introductory article about POJO-actor v1.0 has been published on CoderLegion!

<!-- truncate -->

## Article Overview

The article provides a comprehensive introduction to POJO-actor, covering:

- **Core Philosophy**: Turn any existing Java object into an actor without modification
- **Virtual Thread Architecture**: Leverage Java 21's virtual threads for massive concurrency
- **Work-Stealing Pools**: Efficiently handle CPU-intensive tasks
- **Zero Dependencies**: Built entirely with standard JDK APIs, GraalVM Native Image ready

## Code Examples

The article includes practical examples demonstrating:

1. Basic Counter Actor with tell/ask patterns
2. Using ArrayList as an actor (zero code changes!)
3. Scaling to 10,000 concurrent actors
4. Matrix multiplication with work-stealing pools
5. Custom thread pool configuration

## Read the Full Article

Check out the complete article on CoderLegion:

**[POJO-actor v1.0: A Lightweight Actor Model Library for Java](https://coderlegion.com/8748/pojo-actor-v1-0-a-lightweight-actor-model-library-for-java)**

We hope this helps you get started with actor-based concurrency in Java!
