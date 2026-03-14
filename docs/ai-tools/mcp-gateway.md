---
sidebar_position: 5
title: "MCP Gateway"
description: "quarkus-mcp-gateway: name-based reverse proxy for MCP servers — register once, reach by name"
---

# MCP Gateway

[quarkus-mcp-gateway](https://github.com/scivicslab/quarkus-mcp-gateway) is a lightweight reverse proxy for MCP (Model Context Protocol) servers. Instead of remembering port numbers for each server, you register servers by name and route requests through a single gateway endpoint.

## Problem It Solves

When running multiple MCP servers locally, each listens on a different port:

```
quarkus-coder-agent       → localhost:8090/mcp
quarkus-workflow-editor   → localhost:8081/mcp
emacs-mcp-server          → localhost:8092/mcp
```

Claude Desktop (or any MCP client) needs to be configured with each address. Adding, removing, or restarting a server means updating configuration files. The gateway centralises this:

```
All MCP clients → localhost:8888/mcp/{serverName}
```

## Features

- **Name-based routing** — `POST /mcp/{serverName}` proxies to the registered backend
- **Server registry** — register/unregister via REST API or pre-configure in `servers.yaml`
- **Session management** — tracks `Mcp-Session-Id` per client automatically
- **HTML dashboard** — view all registered servers at `http://localhost:8888/`
- **Pure Java** — single Quarkus JAR, no Docker, no Python

## Quick Start

```bash
git clone https://github.com/scivicslab/quarkus-mcp-gateway
cd quarkus-mcp-gateway
mvn package

# Start on a specific port (recommended)
java -Dquarkus.http.port=8888 -jar target/quarkus-app/quarkus-run.jar
```

Open `http://localhost:8888` for the server dashboard.

## Pre-configuring Servers

Create `servers.yaml` in the working directory:

```yaml
servers:
  - name: coder-agent
    url: http://localhost:8090
    description: Quarkus Coder Agent (Claude AI)

  - name: workflow-editor
    url: http://localhost:8081
    description: Turing Workflow Editor

  - name: emacs
    url: http://localhost:8092
    description: Emacs MCP Server
```

## Runtime Registration

```bash
# Register a server
curl -X POST http://localhost:8888/api/servers \
  -H 'Content-Type: application/json' \
  -d '{"name": "my-agent", "url": "http://localhost:9090", "description": "My agent"}'

# List registered servers
curl http://localhost:8888/api/servers

# Unregister
curl -X DELETE http://localhost:8888/api/servers/my-agent
```

## Connecting Claude Desktop

Add a single entry to your Claude Desktop MCP configuration that covers all registered servers:

```json
{
  "mcpServers": {
    "gateway": {
      "url": "http://localhost:8888/mcp/coder-agent"
    }
  }
}
```

Or add each server by name:

```json
{
  "mcpServers": {
    "coder-agent": { "url": "http://localhost:8888/mcp/coder-agent" },
    "workflow-editor": { "url": "http://localhost:8888/mcp/workflow-editor" },
    "emacs": { "url": "http://localhost:8888/mcp/emacs" }
  }
}
```
