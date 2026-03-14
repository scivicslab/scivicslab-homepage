---
sidebar_position: 3
title: "LLM Console (Codex)"
description: "Browser-based Web UI for OpenAI Codex/GPT — real-time streaming, prompt queue, tool execution"
---

# LLM Console (Codex)

[quarkus-llm-console-codex](https://github.com/scivicslab/quarkus-llm-console-codex) is a lightweight Web UI for OpenAI Codex and GPT models. It wraps the OpenAI Codex CLI (or the OpenAI API directly) and streams responses to your browser.

The interface is identical to [LLM Console (Claude)](./llm-console-claude) — prompt queue, tool execution, session persistence, and 10 color themes — but targets OpenAI models.

## Features

- **OpenAI models** — gpt-4o, o4-mini, o3 via Codex CLI or OpenAI API
- **Prompt queue** — queue, reorder, and remove pending prompts
- **Tool execution** — Bash, Read, Write, Edit, Glob, Grep, WebSearch, WebFetch via Codex CLI
- **Interactive permission dialogs** — forwarded to the Web UI
- **Session persistence** — session ID survives server restart
- **Markdown rendering** with syntax highlighting
- **10 color themes** — 5 dark + 5 light

## Authentication

1. **Codex CLI** — if `codex` is on your PATH, it is used directly (recommended)
2. **Environment variable** — `OPENAI_API_KEY`
3. **Config property** — `-Dcoder-agent.api-key=sk-...`
4. **Web UI prompt** — API key dialog at startup

## Installation

### Native Image (recommended)

Download from [Releases](https://github.com/scivicslab/quarkus-llm-console-codex/releases):

| File | Platform |
|------|----------|
| `quarkus-llm-console-codex-vX.Y.Z-linux-x86_64` | Linux (x86_64) |
| `quarkus-llm-console-codex-vX.Y.Z-linux-aarch64` | Linux (aarch64) |
| `quarkus-llm-console-codex-vX.Y.Z-macos-aarch64` | macOS (Apple Silicon) |
| `quarkus-llm-console-codex-vX.Y.Z-macos-x86_64` | macOS (Intel) |
| `quarkus-llm-console-codex-vX.Y.Z-windows-x86_64.exe` | Windows |

```bash
chmod +x quarkus-llm-console-codex-*
./quarkus-llm-console-codex-v1.0.0-linux-x86_64
```

### Build from Source

```bash
git clone https://github.com/scivicslab/quarkus-llm-console-codex
cd quarkus-llm-console-codex
mvn package -DskipTests
java -jar target/quarkus-app/quarkus-run.jar
```

Open `http://localhost:8080` in your browser.
