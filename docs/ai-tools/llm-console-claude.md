---
sidebar_position: 2
title: "LLM Console (Claude)"
description: "Browser-based Web UI for Claude AI — real-time streaming, prompt queue, tool execution"
---

# LLM Console (Claude)

[quarkus-llm-console-claude](https://github.com/scivicslab/quarkus-llm-console-claude) is a lightweight Web UI for Claude models. It wraps the Claude Code CLI (or the Anthropic API directly) and streams responses to your browser in real time.

**Queue prompts while the AI is still thinking.** Type your next prompt, add it to the queue, and it will be sent automatically once the current response finishes.

## Features

- **Claude models** — sonnet, opus, haiku via Claude Code CLI
- **Prompt queue** — queue, reorder, and remove pending prompts without interrupting the current response
- **Tool execution** — Bash, Read, Write, Edit, Glob, Grep, WebSearch, WebFetch forwarded through Claude CLI
- **Interactive permission dialogs** — tool permission requests are forwarded to the Web UI
- **Session persistence** — session ID saved to file; survives server restart
- **Markdown rendering** — responses rendered with syntax highlighting
- **Save to file** — export the conversation as a Markdown file
- **10 color themes** — 5 dark + 5 light

## Authentication

Authentication is resolved in this order:

1. **Claude Code CLI** — if `claude` is on your PATH, it is used directly (recommended)
2. **Environment variable** — `ANTHROPIC_API_KEY`
3. **Config property** — `-Dllm-console.api-key=sk-ant-...`
4. **Web UI prompt** — if none of the above, an API key dialog appears at startup

## Installation

### Native Image (recommended)

Download the binary for your platform from the [Releases](https://github.com/scivicslab/quarkus-llm-console-claude/releases) page:

| File | Platform |
|------|----------|
| `quarkus-llm-console-claude-vX.Y.Z-linux-x86_64` | Linux (x86_64) |
| `quarkus-llm-console-claude-vX.Y.Z-linux-aarch64` | Linux (aarch64) |
| `quarkus-llm-console-claude-vX.Y.Z-macos-aarch64` | macOS (Apple Silicon) |
| `quarkus-llm-console-claude-vX.Y.Z-macos-x86_64` | macOS (Intel) |
| `quarkus-llm-console-claude-vX.Y.Z-windows-x86_64.exe` | Windows |

```bash
chmod +x quarkus-llm-console-claude-*

# Start on a specific port (recommended)
./quarkus-llm-console-claude-v1.0.0-linux-x86_64 -Dquarkus.http.port=8080
```

Open `http://localhost:8080` in your browser.

### Build from Source

```bash
git clone https://github.com/scivicslab/quarkus-llm-console-claude
cd quarkus-llm-console-claude
mvn package

# Start on a specific port (recommended)
java -Dquarkus.http.port=8080 -jar target/quarkus-app/quarkus-run.jar
```

Open `http://localhost:8080` in your browser.

## MCP Server

The console exposes an MCP endpoint at `/mcp`. Register it with the [MCP Gateway](./mcp-gateway) so any MCP client (e.g., Claude Desktop) can send prompts to it by name:

```bash
curl -X POST http://localhost:8888/api/servers \
  -H 'Content-Type: application/json' \
  -d '{"name": "llm-console-claude", "url": "http://localhost:8080", "description": "LLM Console (Claude)"}'
```
