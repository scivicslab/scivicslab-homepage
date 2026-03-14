---
sidebar_position: 4
title: "Workflow Editor"
description: "quarkus-workflow-editor: a browser-based YAML workflow editor with live actor inspection and MCP server integration"
---

# Workflow Editor

[quarkus-workflow-editor](https://github.com/scivicslab/quarkus-workflow-editor) is a browser-based tool for writing and managing Turing-workflow YAML files. It runs as a Quarkus application and provides a live view of registered actors and their available actions.

## Features

- **Registered Actors panel** — Shows all actors loaded in the current `IIActorSystem`, with their `@Action` methods listed per actor
- **Javadoc links** — Each `@Action` method links directly to the corresponding Javadoc page, so you can check argument types while writing YAML
- **YAML editor** — Edit workflow files with syntax highlighting
- **MCP server** — Built-in Model Context Protocol server so an LLM assistant (e.g., Claude) can query actor/action metadata and help write YAML

## Quick Start

```bash
git clone https://github.com/scivicslab/quarkus-workflow-editor
cd quarkus-workflow-editor
./mvnw quarkus:dev
```

Open `http://localhost:8080` in your browser.

## Registered Actors Panel

The Actors panel on the left side lists every actor registered in the running `IIActorSystem`. Expanding an actor shows its `@Action`-annotated methods. Click a method name to open the Javadoc page for that method in a new tab.

The Javadoc URL is resolved using a `META-INF/javadoc.properties` file bundled inside each actor JAR:

```properties
# META-INF/javadoc.properties
javadoc.baseUrl=https://scivicslab.github.io/Turing-workflow-plugins/plugin-llm/apidocs
```

When this file is present, method names become clickable links of the form:

```
{javadoc.baseUrl}/{package/ClassName}.html#{methodName}({ParamType,...})
```

## MCP Server

The workflow editor exposes an MCP (Model Context Protocol) endpoint at `/mcp`. An LLM assistant connected to this endpoint can:

- List all registered actors and actions
- Retrieve actor descriptions and Javadoc URLs
- Help generate or validate workflow YAML

### Connecting Claude Desktop

Add the following to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "workflow-editor": {
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

Once connected, you can ask Claude to write workflows referencing the actual actors and methods running in your editor instance.

## Adding Javadoc Support to Your Actor JAR

To enable clickable Javadoc links for your own actors, add `META-INF/javadoc.properties` under `src/main/resources`:

```properties
javadoc.baseUrl=https://your-org.github.io/your-repo/apidocs
```

Publish the Javadoc to GitHub Pages (or any stable URL), and the workflow editor will automatically render links for all `@Action` methods found in that JAR.
