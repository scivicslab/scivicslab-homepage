---
sidebar_position: 1
title: "Introduction"
description: "AI Tools by Scivics Lab: quarkus-chat-ui, MCP gateway, and Emacs integration"
---

# AI Tools

Scivics Lab provides a suite of lightweight, Java/Quarkus-based tools for working with AI models and the Model Context Protocol (MCP).

## LLM Chat UI

| Tool | Description | GitHub |
|------|-------------|--------|
| [quarkus-chat-ui](./quarkus-chat-ui) | Multi-provider web UI for LLMs — Claude Code CLI, OpenAI Codex CLI, vLLM, Ollama | [quarkus-chat-ui](https://github.com/scivicslab/quarkus-chat-ui) |

A unified browser-based chat interface that supports multiple LLM backends. Real-time SSE streaming, prompt queue, MCP server endpoint for agent-to-agent communication, and 10 color themes.

## MCP Infrastructure

| Tool | Description | GitHub |
|------|-------------|--------|
| [MCP Gateway](./mcp-gateway) | Name-based reverse proxy with caller identification and session metadata | [quarkus-mcp-gateway](https://github.com/scivicslab/quarkus-mcp-gateway) |
| [Emacs MCP Server](./emacs-mcp-server) | MCP server that controls Emacs via `emacsclient` | [emacs-mcp-server](https://github.com/scivicslab/emacs-mcp-server) |

## How They Fit Together

```
Claude Code / quarkus-chat-ui / Workflow Editor
        │  MCP
        ▼
quarkus-mcp-gateway  (:8888)
  ├── /mcp/chat-ui-28010  →  quarkus-chat-ui   (:28010)
  ├── /mcp/chat-ui-28020  →  quarkus-chat-ui   (:28020)
  └── /mcp/emacs          →  emacs-mcp-server  (:8092)
```

The gateway provides **name-based routing** (no need to remember port numbers), **caller identification** (each request carries metadata about who sent it), and a **session metadata API** for on-demand introspection.

Multiple quarkus-chat-ui instances can talk to each other via MCP. When Instance B receives a prompt with `_caller` pointing back to Instance A, it can reply by calling `submitPrompt` back on A. The conversation continues autonomously while humans watch from their browsers.

## Multi-Agent Tutorials

Step-by-step guides for setting up agent-to-agent communication:

| Tutorial | Description |
|----------|-------------|
| [Two Claude Code CLI Agents](./multi-agent-claude-cli) | Two instances both using Claude Code CLI |
| [Claude Code CLI + Codex](./multi-agent-claude-codex) | Heterogeneous setup with Anthropic and OpenAI |
| [Claude Code CLI + Local LLM](./multi-agent-claude-local) | Using claw-code-local with Ollama |

For three or more agents, the [MCP Gateway](./mcp-gateway) provides name-based routing instead of direct peer-to-peer registration.
