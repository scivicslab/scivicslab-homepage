---
id: plugin-development
title: Creating Your Own Plugins
sidebar_position: 37
---

# Creating Your Own Plugins

This section explains how to create custom plugins that extend actor-IaC functionality.

## Plugin Types

actor-IaC supports different types of plugins depending on the use case.

| Type | Purpose | Implementation |
|------|---------|----------------|
| **General Plugin** | Any functionality callable from workflows | POJO + IIAR |
| **SectionBuilder** | Report sections for ReportBuilder | `SectionBuilder` implementation + IIAR |

## Documentation Structure

### [1. Principles](./010-principles)

Basic principles common to all plugins:
- POJO + IIAR architecture
- pom.xml configuration
- Build and deployment

### [2. General Plugin](./020-general-plugin)

Implement arbitrary functionality callable from workflows:
- Data aggregation using DB connections
- External API integration
- Custom processing

### [3. SectionBuilder Plugin](./030-section-builder-plugin)

Implement report sections for ReportBuilder:
- `SectionBuilder` interface
- `generate()`, `getTitle()`
- Registration with ReportBuilder

## Common Prerequisites

### Loading and Creating with Actor Names

Plugins are loaded and created through the `loader` actor.

```yaml
# Load JAR
- actor: loader
  method: loadJar
  arguments: ["plugins/my-plugin-1.0.0.jar"]

# Create actor
- actor: loader
  method: createChild
  arguments: ["parentActorName", "actorName", "fully.qualified.ClassName"]
```

### Available System Resources

Major resources available from plugins:

| Resource | How to Obtain | Purpose |
|----------|---------------|---------|
| DB Connection | `DistributedLogStore.getInstance().getConnection()` | Log DB queries |
| Session ID | `nodeGroup.callByActionName("getSessionId", "")` | Current workflow session |
| Actor System | Constructor argument | Access to other actors |

### Reference Implementations

Standard implementations included in actor-IaC serve as references for plugin development:

| Package | Contents |
|---------|----------|
| `com.scivicslab.actoriac.report.sections.basic` | Standard SectionBuilders |
| `com.scivicslab.actoriac.report` | ReportBuilder itself |
