---
sidebar_position: 1
title: "Introduction"
description: "AI Tools by Scivics Lab: LLM consoles, MCP gateway, and Emacs integration"
---

# AI Tools

Scivics Lab provides a suite of lightweight, Java/Quarkus-based tools for working with AI models and the Model Context Protocol (MCP).

## LLM Consoles

Browser-based chat interfaces for different LLM providers. All share the same UX: real-time SSE streaming, prompt queue, tool execution forwarded to the Web UI, and 10 color themes.

| Tool | Backend | GitHub |
|------|---------|--------|
| [LLM Console (Claude)](./llm-console-claude) | Claude Code CLI / Anthropic API | [quarkus-llm-console-claude](https://github.com/scivicslab/quarkus-llm-console-claude) |
| [LLM Console (Codex)](./llm-console-codex) | OpenAI Codex CLI / OpenAI API | [quarkus-llm-console-codex](https://github.com/scivicslab/quarkus-llm-console-codex) |
| [LLM Console (Local)](./llm-console-local) | vLLM, Ollama, OpenAI-compatible | [quarkus-llm-console](https://github.com/scivicslab/quarkus-llm-console) |

## MCP Infrastructure

| Tool | Description | GitHub |
|------|-------------|--------|
| [MCP Gateway](./mcp-gateway) | Name-based reverse proxy for MCP servers — register once, reach by name | [quarkus-mcp-gateway](https://github.com/scivicslab/quarkus-mcp-gateway) |
| [Emacs MCP Server](./emacs-mcp-server) | MCP server that controls Emacs via `emacsclient` (Python / TypeScript / Java) | [emacs-mcp-server](https://github.com/scivicslab/emacs-mcp-server) |

## How They Fit Together

```
Claude Desktop / Claude Code
        │  MCP
        ▼
quarkus-mcp-gateway  (:8888)
  ├── /mcp/workflow-editor  →  quarkus-workflow-editor  (:8081)
  ├── /mcp/coder-agent      →  quarkus-coder-agent      (:8090)
  └── /mcp/emacs            →  emacs-mcp-server         (:8092)

Browser
  ├── quarkus-llm-console-claude  (:8080)  — chat with Claude
  ├── quarkus-llm-console-codex   (:8080)  — chat with Codex/GPT
  └── quarkus-llm-console         (:8090)  — chat with local LLMs
```
