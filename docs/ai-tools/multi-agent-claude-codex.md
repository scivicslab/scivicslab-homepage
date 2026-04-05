---
sidebar_position: 5
title: "Tutorial: Claude Code CLI + Codex"
description: "Step-by-step guide to set up quarkus-chat-ui with Claude Code CLI and OpenAI Codex talking to each other"
---

# Tutorial: Claude Code CLI + Codex

This tutorial walks through setting up two quarkus-chat-ui instances — one using Claude Code CLI (Anthropic) and one using Codex (OpenAI) — that can communicate via MCP.

## Prerequisites

- `ANTHROPIC_API_KEY` environment variable (for Claude)
- `OPENAI_API_KEY` environment variable (for Codex)
- quarkus-chat-ui JAR or native executable ([download](https://github.com/scivicslab/quarkus-chat-ui/releases))
- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)
- Codex CLI installed (`npm install -g @openai/codex`)

## Architecture Overview

```
┌─────────────────────────┐          ┌─────────────────────────┐
│  quarkus-chat-ui        │          │  quarkus-chat-ui        │
│  (Alice, port 28010)    │          │  (Bob, port 28020)      │
│  provider: claude       │          │  provider: codex        │
│                         │          │                         │
│  ┌───────────────────┐  │          │  ┌───────────────────┐  │
│  │ Claude Code CLI   │  │   MCP    │  │ Codex CLI         │  │
│  │ (Anthropic)       │◄─┼──────────┼─►│ (OpenAI)          │  │
│  └───────────────────┘  │          │  └───────────────────┘  │
│           │             │          │           │             │
│  ┌────────▼──────────┐  │          │  ┌────────▼──────────┐  │
│  │ MCP Server /mcp   │  │          │  │ MCP Server /mcp   │  │
│  └───────────────────┘  │          │  └───────────────────┘  │
└─────────────────────────┘          └─────────────────────────┘
```

Both Claude Code CLI and Codex support MCP, so they can call each other's MCP endpoints once registered.

## Step 1: Start Two Instances

Open two terminals.

**Terminal 1 (Alice with Claude Code CLI):**

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...

java -Dchat-ui.provider=claude \
     -Dquarkus.http.port=28010 \
     -jar quarkus-chat-ui.jar
```

**Terminal 2 (Bob with Codex):**

```bash
export OPENAI_API_KEY=sk-...

java -Dchat-ui.provider=codex \
     -Dquarkus.http.port=28020 \
     -jar quarkus-chat-ui.jar
```

Verify both are running:
- Alice (Claude): http://localhost:28010
- Bob (Codex): http://localhost:28020

## Step 2: Register MCP Endpoints

### For Claude Code CLI (Alice's side)

Claude Code CLI stores registrations in `~/.claude.json`:

```bash
# Register Bob's MCP endpoint so Alice can call Bob
claude mcp add bob --transport http http://localhost:28020/mcp
```

### For Codex (Bob's side)

Codex stores registrations in `~/.codex/config.json`:

```bash
# Register Alice's MCP endpoint so Bob can call Alice
codex mcp add alice --transport http http://localhost:28010/mcp
```

Verify registrations:

```bash
claude mcp list   # Should show: bob
codex mcp list    # Should show: alice
```

## Step 3: Restart Both Instances

Both CLIs read their configuration at startup. Restart to pick up the new registrations.

```bash
# Terminal 1 (Alice with Claude)
# Ctrl+C, then:
java -Dchat-ui.provider=claude \
     -Dquarkus.http.port=28010 \
     -jar quarkus-chat-ui.jar

# Terminal 2 (Bob with Codex)
# Ctrl+C, then:
java -Dchat-ui.provider=codex \
     -Dquarkus.http.port=28020 \
     -jar quarkus-chat-ui.jar
```

## Step 4: Test Communication

Open two browser windows:
- http://localhost:28010 (Alice / Claude)
- http://localhost:28020 (Bob / Codex)

### Alice (Claude) sends to Bob (Codex)

In Alice's browser:

```
Use mcp__bob__submitPrompt to ask Bob: "Hi Bob! I'm Claude. What model are you running on?"
Include _caller=http://localhost:28010 so Bob can reply.
```

### Bob (Codex) receives and replies

In Bob's browser, you should see:

```
[MCP from localhost:28010] Hi Bob! I'm Claude. What model are you running on?
```

Bob's Codex LLM sees the enriched prompt with reply instructions and responds using `mcp__alice__submitPrompt`.

In Alice's browser:

```
[MCP from localhost:28020] Hello Claude! I'm running on OpenAI's GPT-4...
```

## Provider-Specific Notes

### Claude Code CLI

- Default model: `claude-sonnet-4-5`
- MCP tools appear as `mcp__servername__toolname`
- Configuration: `~/.claude.json`

### Codex

- Default model: `gpt-4o`
- MCP tools appear as `mcp__servername__toolname` (same convention)
- Configuration: `~/.codex/config.json`

### Common MCP Tool Format

Both CLIs use the same naming convention for MCP tools:

```
mcp__<server-name>__<tool-name>

Examples:
  mcp__bob__submitPrompt
  mcp__alice__getStatus
  mcp__bob__cancelRequest
```

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| Claude can't find `mcp__bob__*` | Bob not registered in Claude | `claude mcp add bob --transport http http://localhost:28020/mcp` |
| Codex can't find `mcp__alice__*` | Alice not registered in Codex | `codex mcp add alice --transport http http://localhost:28010/mcp` |
| Tool registered but not visible | CLI started before registration | Restart the quarkus-chat-ui instance |
| One direction works, other doesn't | Only one side registered | Register both directions |

## Cleaning Up

```bash
claude mcp remove bob
codex mcp remove alice
```

## Why Mix Providers?

Using different providers enables:

1. **Cost optimization** — Use cheaper models for simpler tasks
2. **Capability comparison** — See how Claude and GPT-4 approach the same problem
3. **Redundancy** — If one provider is down, the other can continue
4. **Specialization** — Some models excel at different tasks

## Next Steps

- [Tutorial: Claude Code CLI + Local LLM](./multi-agent-claude-local.md) — using claw-code-local with Ollama
- [MCP Gateway](./mcp-gateway.md) — for 3+ agents, use name-based routing
