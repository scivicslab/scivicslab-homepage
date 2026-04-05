---
sidebar_position: 3
title: "MCP Gateway"
description: "quarkus-mcp-gateway: name-based reverse proxy for MCP servers with caller identification and session metadata"
---

# MCP Gateway

[quarkus-mcp-gateway](https://github.com/scivicslab/quarkus-mcp-gateway) is a lightweight reverse proxy for MCP (Model Context Protocol) servers. Instead of remembering port numbers for each server, you register servers by name and route requests through a single gateway endpoint.

## Problem It Solves

When running multiple MCP servers locally, each listens on a different port:

```
chat-ui       → localhost:8090/mcp
quarkus-workflow-editor  → localhost:8091/mcp
emacs-mcp-server         → localhost:8092/mcp
```

Every MCP client needs to be configured with each address. Adding, removing, or restarting a server means updating configuration files everywhere. The gateway centralises this:

```
All MCP clients → localhost:8888/mcp/{serverName}
```

Beyond simple routing, the gateway also answers the question **"who is calling?"** — a problem that MCP itself does not solve. When multiple services call each other through the gateway, each request is enriched with caller metadata that the receiver can inspect on demand.

## Features

- **Name-based routing** — `POST /mcp/{serverName}` proxies to the registered backend
- **Server registry** — register/unregister via REST API or pre-configure in `servers.yaml`
- **Session management** — tracks `Mcp-Session-Id` per client automatically
- **Caller identification (HATEOAS)** — injects a metadata URL into MCP requests; receivers fetch caller details on demand
- **Session metadata API** — `GET /api/sessions/{id}` exposes per-session caller and routing information
- **Health check** — periodic health monitoring of registered servers
- **HTML dashboard** — view all registered servers at `http://localhost:8888/`
- **Pure Java** — single Quarkus JAR, no Docker, no Python

## Quick Start

```bash
git clone https://github.com/scivicslab/quarkus-mcp-gateway
cd quarkus-mcp-gateway
mvn package

java -Dquarkus.http.port=8888 -jar target/quarkus-app/quarkus-run.jar
```

Open `http://localhost:8888` for the server dashboard.

## Pre-configuring Servers

Create `servers.yaml` in the working directory:

```yaml
servers:
  - name: chat-ui
    url: http://localhost:8090
    description: LLM Console - Claude

  - name: workflow-editor
    url: http://localhost:8091
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

# Lookup a specific server
curl http://localhost:8888/api/servers/my-agent

# Unregister
curl -X DELETE http://localhost:8888/api/servers/my-agent
```

## Caller Identification (HATEOAS)

MCP requests routed through the gateway are automatically enriched with caller information. This solves a fundamental limitation of MCP: the protocol has no built-in mechanism to identify who is making a request.

### How it works

1. An MCP client sends `initialize` with `clientInfo.name` to identify itself (e.g., `"workflow-editor"`)
2. The gateway records the caller name for the session
3. On `tools/call` requests, the gateway injects `_caller` into `arguments` — a HATEOAS URL pointing to the session metadata
4. The receiver can fetch that URL to get full caller details, or ignore it entirely

### What the receiver sees

The `tools/call` `arguments` will contain an additional `_caller` field:

```json
{
  "name": "sendPrompt",
  "arguments": {
    "prompt": "Hello!",
    "_caller": "http://localhost:8888/api/sessions/abc123"
  }
}
```

When the receiver GETs that URL:

```json
{
  "sessionId": "abc123",
  "caller": "workflow-editor",
  "remoteAddress": "127.0.0.1:45926",
  "targetServer": "chat-ui",
  "registered": true,
  "callerUrl": "http://localhost:8091"
}
```

- `caller` — the `clientInfo.name` from `initialize` (`"unknown"` if not provided)
- `registered` — whether the caller name matches a Registered Server
- `callerUrl` — if registered, the server's URL from the registry

### Display examples

The LLM Console browser UI shows caller information like this:

```
[MCP from workflow-editor (http://localhost:8091)] Hello! This is a prompt from the workflow.
```

For a client that did not identify itself:

```
[MCP from unknown@127.0.0.1:45926] Anonymous request.
```

For a direct call that bypasses the gateway:

```
[MCP] Direct call without gateway.
```

### Implementing caller awareness in your service

Handling `_caller` is optional. If a service ignores the `_caller` field, everything works as before. To use it, accept `_caller` as a `String` parameter and make an HTTP GET request to retrieve the metadata:

```java
@Tool(description = "My tool")
String myTool(
    @ToolArg(description = "...") String input,
    @ToolArg(description = "Caller info (optional)") String _caller
) {
    String callerLabel = fetchCallerInfo(_caller); // HTTP GET to _caller URL
    // ...
}
```

### Design philosophy

Services that register with the gateway identify themselves through `clientInfo.name` — a self-declaration. The gateway cross-references this name against the Registered Servers list to attach verified metadata (URL, description). Unregistered clients appear as `"unknown"` with their IP address.

This design is intentionally simple:
- **Self-built services** declare who they are; the gateway enriches with registered server info
- **Third-party clients** that don't identify themselves get `"unknown"` — and that's fine
- **No authentication required** — this is identity metadata, not access control

## Session Metadata API

The gateway exposes per-session metadata:

```bash
curl http://localhost:8888/api/sessions/{sessionId}
```

Response:

```json
{
  "sessionId": "chat-ui:abc123",
  "caller": "workflow-editor",
  "remoteAddress": "127.0.0.1:45926",
  "targetServer": "chat-ui",
  "registered": true,
  "callerUrl": "http://localhost:8091"
}
```

Future extensions can add call chain tracing (A → B → C) and access control information to this API without changing the MCP protocol.

## Connecting Claude Desktop

Add a single entry to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "gateway": {
      "url": "http://localhost:8888/mcp/chat-ui"
    }
  }
}
```

Or add each server by name:

```json
{
  "mcpServers": {
    "chat-ui": { "url": "http://localhost:8888/mcp/chat-ui" },
    "workflow-editor": { "url": "http://localhost:8888/mcp/workflow-editor" },
    "emacs": { "url": "http://localhost:8888/mcp/emacs" }
  }
}
```

## Architecture

```
MCP Client (Claude Code, LLM Console, Workflow Editor, ...)
        │
        │  POST /mcp/{serverName}
        │  + clientInfo.name (self-identification)
        ▼
quarkus-mcp-gateway (:8888)
  ├── Caller identification (clientInfo.name → Registered Servers lookup)
  ├── _caller URL injection (HATEOAS)
  ├── Session metadata management
  └── Proxy → registered backends
        │
        ├── /mcp/chat-ui  →  :8090
        ├── /mcp/workflow-editor     →  :8091
        └── /mcp/emacs               →  :8092
```

The gateway is not just a reverse proxy — it serves as the **caller metadata provider** in the MCP ecosystem. Services query the gateway on demand to learn who is calling them, without any changes to the MCP protocol itself.
