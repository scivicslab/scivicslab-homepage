---
sidebar_position: 1
title: "Overview"
description: "Turing-workflow plugins: extend workflow execution with dynamically loadable actor plugins"
---

# Workflow Plugins

[Turing-workflow-plugins](https://github.com/scivicslab/Turing-workflow-plugins) is a collection of actor plugins for Turing-workflow. Each plugin is packaged as a separate JAR and can be loaded at runtime into any workflow using the `DynamicActorLoaderActor`.

## Plugin Architecture

Plugins follow the standard actor pattern:

- Implement `IIActorRef<T>`
- Annotate callable methods with `@Action`
- Bundle `META-INF/javadoc.properties` so the Workflow Editor can display Javadoc links

Plugins are distributed via Maven Central under the group `com.scivicslab.turingworkflow.plugins`.

## Available Plugins

| Plugin | Artifact ID | Description |
|--------|-------------|-------------|
| [plugin-llm](./plugin-llm) | `plugin-llm` | Send prompts to LLM providers (Claude, OpenAI, etc.) |

## Loading a Plugin in YAML

Use `DynamicActorLoaderActor` to load a plugin JAR from Maven Central at workflow runtime:

```yaml
steps:
  - states: ["0", "1"]
    actions:
      - actor: loader
        method: loadJar
        arguments: "com.scivicslab.turingworkflow.plugins:plugin-llm:1.0.0"

  - states: ["1", "2"]
    actions:
      - actor: loader
        method: createChild
        arguments: ["ROOT", "llm", "com.scivicslab.turingworkflow.plugins.llm.LlmActor"]
```

Once loaded, the plugin actor is available by name for the remainder of the workflow.
