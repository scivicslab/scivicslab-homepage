---
sidebar_position: 2
title: "quarkus-chat-ui"
description: "Multi-provider web UI for LLMs — Claude Code, Codex, vLLM, Ollama"
---

# quarkus-chat-ui

[quarkus-chat-ui](https://github.com/scivicslab/quarkus-chat-ui) is a multi-provider web UI for Large Language Models. It wraps Claude Code CLI, OpenAI Codex CLI, or any OpenAI-compatible HTTP server (vLLM, Ollama) and streams responses to your browser in real time.

Multiple instances can talk to each other via MCP — enabling autonomous agent-to-agent conversations while humans watch from their browsers.

## Features

- **Multiple LLM providers** — Claude Code CLI, OpenAI Codex CLI, vLLM, Ollama, any OpenAI-compatible API
- **Streaming responses** — Server-Sent Events (SSE) for real-time token streaming
- **Prompt queue** — Queue multiple prompts; they execute automatically in order
- **MCP server** — Each instance exposes itself at `/mcp` for agent-to-agent communication
- **Multi-agent conversation** — Instances can call each other; replies flow back automatically
- **Tool execution** — Bash, Read, Write, Edit, Glob, Grep, WebSearch, WebFetch (CLI providers)
- **Interactive permission dialogs** — Tool permission requests forwarded to the Web UI
- **Theme support** — 10 built-in themes (5 dark + 5 light)
- **Slash commands** — Provider-specific commands (`/model`, `/compact`, `/clear`, …)
- **Keyboard modes** — Default, Mac, and Vim keybindings
- **URL fetch** — Fetch and extract text from URLs for inclusion in prompts

## Providers

| `chat-ui.provider` | Backend | Auth |
|--------------------|---------|------|
| `claude` | [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) | `ANTHROPIC_API_KEY` |
| `codex` | [OpenAI Codex CLI](https://github.com/openai/codex) | `OPENAI_API_KEY` |
| `openai-compat` | Any OpenAI-compatible HTTP server (vLLM, Ollama, …) | optional API key |

## Quick Start

### Native Executable (no JDK required)

Pre-built native executables are available on the [Releases](https://github.com/scivicslab/quarkus-chat-ui/releases) page. No JVM, no JDK — just download and run.

| Platform | Binary |
|----------|--------|
| Linux x86_64 | `quarkus-chat-ui-linux-amd64` |
| Linux ARM64 | `quarkus-chat-ui-linux-arm64` |
| macOS Intel | `quarkus-chat-ui-macos-amd64` |
| macOS Apple Silicon (M1/M2/M3) | `quarkus-chat-ui-macos-arm64` |
| Windows x64 | `quarkus-chat-ui-windows-amd64.exe` |

```bash
# Linux / macOS
./quarkus-chat-ui-linux-amd64 -Dchat-ui.provider=claude -Dquarkus.http.port=28010
```

```powershell
# Windows PowerShell
.\quarkus-chat-ui-windows-amd64.exe -Dchat-ui.provider=claude -Dquarkus.http.port=28010
```

### Build from Source

Prerequisites: JDK 21+ and Maven 3.x

```bash
git clone https://github.com/scivicslab/quarkus-chat-ui
cd quarkus-chat-ui
mvn install -DskipTests
```

Run with Claude Code CLI:

```bash
java -Dchat-ui.provider=claude \
     -Dquarkus.http.port=28010 \
     -jar app/target/quarkus-app/quarkus-run.jar
```

Run with vLLM or Ollama:

```bash
java -Dchat-ui.provider=openai-compat \
     -Dchat-ui.servers=http://localhost:11434/v1 \
     -Dquarkus.http.port=28010 \
     -jar app/target/quarkus-app/quarkus-run.jar
```

Open `http://localhost:28010` in a browser.

## Configuration

All properties can be passed as `-D` flags or set in `application.properties`.

| Property | Default | Description |
|----------|---------|-------------|
| `chat-ui.provider` | `claude` | LLM provider: `claude`, `codex`, or `openai-compat` |
| `chat-ui.servers` | `http://localhost:8000` | Server URLs for `openai-compat` (comma-separated) |
| `chat-ui.default-model` | *(provider default)* | Model name override |
| `chat-ui.api-key` | *(env var)* | API key (prefer env vars) |
| `chat-ui.title` | `Coder Agent` | Browser tab and header title |
| `chat-ui.keybind` | `default` | Keyboard mode: `default`, `mac`, or `vim` |
| `chat-ui.gateway-url` | *(none)* | MCP Gateway URL for multi-agent routing |
| `quarkus.http.port` | `8090` | HTTP listen port |

## MCP Server

Each instance exposes itself as an HTTP MCP server at `/mcp`. Available tools:

| Tool | Description |
|------|-------------|
| `submitPrompt` | Send a prompt to the LLM (queued, async). Accepts `_caller` for agent-to-agent replies. |
| `getPromptStatus` | Check if the LLM is still processing |
| `getPromptResult` | Retrieve the completed response |
| `cancelRequest` | Interrupt the current LLM request |
| `getStatus` | Current model, session ID, and busy state |
| `listModels` | Available model names |

Register with Claude Code:

```bash
claude mcp add --transport http chat-ui-28010 http://localhost:28010/mcp
```

Register with the [MCP Gateway](./mcp-gateway):

```bash
curl -X POST http://localhost:8888/api/servers \
  -H 'Content-Type: application/json' \
  -d '{"name": "chat-ui-28010", "url": "http://localhost:28010", "description": "Chat UI on port 28010"}'
```

## Multi-Agent Conversation

When Instance B receives a prompt with `_caller` pointing back to Instance A, it enriches the prompt with position awareness and reply instructions:

```
[Context]
You are running on: http://localhost:28020
Received via MCP from: localhost:28010

[Message]
What should we work on today?

[How to Reply]
Use callMcpServer tool:
- serverUrl: http://localhost:28010
- toolName: submitPrompt
- arguments: {"prompt": "your reply", "_caller": "http://localhost:28020"}
```

The LLM reads this, formulates a reply, and calls `submitPrompt` on Instance A. The conversation continues autonomously while humans watch from their browsers.

## Architecture

Built on [POJO-actor](https://github.com/scivicslab/pojo-actor), a lightweight actor-model library for Java 21. Each concern — chat session, side questions, queue management, stall detection — runs in its own actor. Blocking I/O runs on virtual threads. There are no `synchronized` blocks in the application code.

See the blog post: [quarkus-chat-ui: A Web Front-End for LLMs, and a Real-World Case for POJO-actor](/blog/2026-04-05-quarkus-chat-ui-intro)
