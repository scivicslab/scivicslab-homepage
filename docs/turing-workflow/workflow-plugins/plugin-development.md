---
id: plugin-development
sidebar_position: 110
title: "Plugin Development"
description: "Turing-workflow plugin development guide. Covers the two plugin types (General Plugin and SectionBuilder), POJO + IIAR architecture, and how plugins are loaded via the loader actor."
keywords:
  - Turing-workflow
  - plugin development
  - SectionBuilder
  - POJO-actor
  - IIAR
  - loader actor
---

# Plugin Development

Turing-workflow can be extended through a plugin architecture. This document explains plugin types, design principles, loading mechanisms, and available system resources.

## Plugin Types

Turing-workflow has two types of plugins.

### General Plugin

A plugin that provides arbitrary functionality. It is called during workflow execution and can implement any processing such as data transformation, external service integration, or custom logic.

### SectionBuilder (Report Section Builder)

A specialized plugin for generating report sections. It builds each section of the report from workflow execution results. It implements the `SectionBuilder` interface and defines the section's title, content, and display order.

## POJO + IIAR Architecture Principles

Plugins follow the POJO-actor framework's IIAR (Input-Input-Action-Response) pattern.

- **POJO (Plain Old Java Object)**: Plugins minimize dependencies on special framework classes, ensuring testability
- **IIAR**: A message-passing pattern based on the actor model where each plugin operates as an independent actor
- **Immutability**: Messages are designed as immutable objects to ensure thread safety
- **Single Responsibility**: Each plugin focuses on one clear function

## Plugin Loading

Plugins are dynamically loaded through the loader actor.

### `loadJar` - Loading JAR Files

The loader actor's `loadJar` method adds plugin classes from external JAR files to the classpath.

```
loader.loadJar("path/to/my-plugin.jar")
```

### `createChild` - Creating Plugin Actors

The `createChild` method creates plugin actors from loaded classes. The generated actors are managed as child actors of the actor system.

```
loader.createChild("com.example.MyPlugin")
```

This two-step process allows the actor system to centrally manage plugin lifecycles.

## Available System Resources

The following system resources are available to plugins.

### DB Connection (`DistributedLogStore`)

Database connections to H2 can be obtained through the `DistributedLogStore` interface. It is used for reading and writing workflow execution logs and persisting custom data. For details, see `database-connection`.

### Session ID

A unique ID that identifies the current workflow execution session. It is used for log association and session-specific data management.

### Actor System (`IIActorSystem`)

A reference to the POJO-actor framework's actor system. It provides access to actor model features such as sending messages to other actors and creating new actors.

## Reference Implementation

A basic report section builder implementation is provided as a reference for plugin development.

```
com.scivicslab.turingworkflow.plugins.report.sections.basic
```

This package contains standard section builders such as:

- Summary Section: Generates a workflow execution overview
- Node Status Section: Lists execution results for each node
- Timeline Section: Visualizes execution time

Use these implementations as references for developing your own SectionBuilders. General Plugins can be implemented following similar patterns.
