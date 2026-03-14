---
sidebar_position: 6
title: "Emacs MCP Server"
description: "MCP server for Emacs — control your editor from Claude or any MCP client via emacsclient"
---

# Emacs MCP Server

[emacs-mcp-server](https://github.com/scivicslab/emacs-mcp-server) is an MCP (Model Context Protocol) server that controls Emacs via `emacsclient`. It lets Claude (or any MCP client) open files, evaluate Lisp, navigate definitions, and manage buffers in your running Emacs instance.

Three implementations are provided — Python, TypeScript, and Java (Quarkus) — all exposing the same tools.

## Prerequisites

- Emacs with server mode running:
  ```elisp
  ;; in init.el
  (server-start)
  ```
  Or start it interactively: `M-x server-start`
- `emacsclient` available in PATH

## Tools

| Tool | Description |
|------|-------------|
| `open_file` | Open a file in Emacs, optionally at a specific line |
| `eval_elisp` | Evaluate an Emacs Lisp expression |
| `list_buffers` | List all open buffers |
| `goto_definition` | Jump to a symbol definition via xref |
| `save_buffer` | Save a buffer by file path |

## Usage

### Java (Quarkus) — recommended for integration with MCP Gateway

```bash
cd java-quarkus
mvn package

# Start on a specific port (recommended)
java -Dquarkus.http.port=8092 -jar target/quarkus-app/quarkus-run.jar
```

Register with Claude CLI:

```bash
claude mcp add emacs -- java -Dquarkus.http.port=8092 \
  -jar /path/to/java-quarkus/target/quarkus-app/quarkus-run.jar
```

Or register with the [MCP Gateway](./mcp-gateway):

```bash
curl -X POST http://localhost:8888/api/servers \
  -H 'Content-Type: application/json' \
  -d '{"name": "emacs", "url": "http://localhost:8092", "description": "Emacs MCP Server"}'
```

### Python

```bash
cd python
pip install -r requirements.txt
python emacs_mcp_server.py
```

```bash
claude mcp add emacs -- python /path/to/python/emacs_mcp_server.py
```

### TypeScript

```bash
cd typescript
npm install
npx tsx src/index.ts
```

```bash
claude mcp add emacs -- npx tsx /path/to/typescript/src/index.ts
```

## Example Interaction

Once registered, Claude can open files directly in your editor while working on a task:

```
User: Open the ActorSystem.java file in Emacs at line 42.
Claude: [calls open_file("src/main/java/.../ActorSystem.java", 42)]
```

This is particularly useful when Claude Code is navigating large codebases — you can ask it to open any file it references and jump to the relevant line in your running Emacs instance.
