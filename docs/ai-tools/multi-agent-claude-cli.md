---
sidebar_position: 4
title: "Tutorial: Two Claude Code CLI Agents"
description: "Step-by-step guide to set up two quarkus-chat-ui instances with Claude Code CLI talking to each other"
---

# Tutorial: Two Claude Code CLI Agents

This tutorial walks through setting up two quarkus-chat-ui instances, both using Claude Code CLI, that can send messages to each other via MCP.

## Prerequisites

- `ANTHROPIC_API_KEY` environment variable set
- quarkus-chat-ui JAR or native executable ([download](https://github.com/scivicslab/quarkus-chat-ui/releases))
- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)

## Architecture Overview

```
┌─────────────────────────┐          ┌─────────────────────────┐
│  quarkus-chat-ui        │          │  quarkus-chat-ui        │
│  (Alice, port 28010)    │          │  (Bob, port 28020)      │
│                         │          │                         │
│  ┌───────────────────┐  │          │  ┌───────────────────┐  │
│  │ Claude Code CLI   │  │   MCP    │  │ Claude Code CLI   │  │
│  │ (subprocess)      │◄─┼──────────┼─►│ (subprocess)      │  │
│  └───────────────────┘  │          │  └───────────────────┘  │
│           │             │          │           │             │
│  ┌────────▼──────────┐  │          │  ┌────────▼──────────┐  │
│  │ MCP Server /mcp   │  │          │  │ MCP Server /mcp   │  │
│  └───────────────────┘  │          │  └───────────────────┘  │
└─────────────────────────┘          └─────────────────────────┘
         ▲                                      ▲
         │        Browser (human watches)       │
         └──────────────────────────────────────┘
```

Key insight: **MCP server** (what quarkus-chat-ui exposes) and **LLM tools** (what Claude Code CLI can use) are separate systems. For Alice's Claude Code CLI to call Bob's MCP endpoint, Bob must be registered as an MCP server in Claude Code CLI's configuration.

## Step 1: Start Two Instances

Open two terminals.

**Terminal 1 (Alice):**

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...

# Using JAR
java -Dchat-ui.provider=claude \
     -Dquarkus.http.port=28010 \
     -jar quarkus-chat-ui.jar

# Or using native executable
./quarkus-chat-ui -Dchat-ui.provider=claude -Dquarkus.http.port=28010
```

**Terminal 2 (Bob):**

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...

java -Dchat-ui.provider=claude \
     -Dquarkus.http.port=28020 \
     -jar quarkus-chat-ui.jar
```

Verify both are running:
- Alice: http://localhost:28010
- Bob: http://localhost:28020

At this point, both instances expose MCP servers at `/mcp`, but their LLMs cannot call each other yet.

## Step 2: Register MCP Endpoints

Claude Code CLI stores MCP server registrations in `~/.claude.json`. Register each instance:

```bash
# Register Bob's MCP endpoint (so Alice's LLM can call Bob)
claude mcp add bob --transport http http://localhost:28020/mcp

# Register Alice's MCP endpoint (so Bob's LLM can call Alice)
claude mcp add alice --transport http http://localhost:28010/mcp
```

Verify:

```bash
claude mcp list
```

Expected output:

```
bob: http://localhost:28020/mcp (http)
alice: http://localhost:28010/mcp (http)
```

## Step 3: Restart Both Instances

Claude Code CLI reads `~/.claude.json` at startup. The running instances won't see the new registrations until restarted.

**In both terminals, press Ctrl+C, then restart:**

```bash
# Terminal 1 (Alice)
java -Dchat-ui.provider=claude \
     -Dquarkus.http.port=28010 \
     -jar quarkus-chat-ui.jar

# Terminal 2 (Bob)
java -Dchat-ui.provider=claude \
     -Dquarkus.http.port=28020 \
     -jar quarkus-chat-ui.jar
```

## Step 4: Test Communication

Open two browser windows side by side:
- http://localhost:28010 (Alice)
- http://localhost:28020 (Bob)

### Alice sends a message to Bob

In Alice's browser, type:

```
Use the mcp__bob__submitPrompt tool to send "Hello Bob! What's your favorite programming language?" to Bob. Set _caller to http://localhost:28010 so Bob knows where to reply.
```

Alice's Claude Code CLI will execute:

```
mcp__bob__submitPrompt(
  prompt: "Hello Bob! What's your favorite programming language?",
  _caller: "http://localhost:28010"
)
```

### Bob receives and replies

In Bob's browser, you should see:

```
[MCP from localhost:28010] Hello Bob! What's your favorite programming language?
```

Bob's LLM receives an enriched prompt:

```
[Context]
You are running on: http://localhost:28020
Received via MCP from: localhost:28010

[Message]
Hello Bob! What's your favorite programming language?

[How to Reply]
Use mcp__alice__submitPrompt tool with _caller=http://localhost:28020
```

Bob's LLM formulates a reply and calls `mcp__alice__submitPrompt`. Alice's browser shows:

```
[MCP from localhost:28020] I really enjoy Rust for its safety guarantees...
```

The conversation can continue back and forth.

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| "I don't have access to mcp__bob__submitPrompt" | MCP not registered | Run `claude mcp add bob --transport http http://localhost:28020/mcp` |
| MCP registered but tool not available | Instance started before registration | Restart the instance |
| "Connection refused" | Target instance not running | Check port and restart if needed |
| Bob can't reply to Alice | Alice's MCP not registered | Run `claude mcp add alice --transport http http://localhost:28010/mcp` |
| Message received but no `[MCP from ...]` tag | `_caller` parameter missing | Include `_caller` in the tool call |

## Cleaning Up

To remove the MCP registrations:

```bash
claude mcp remove bob
claude mcp remove alice
```

## Next Steps

- [Tutorial: Claude Code CLI + Codex](./multi-agent-claude-codex.md) — heterogeneous agent setup
- [Tutorial: Claude Code CLI + Local LLM](./multi-agent-claude-local.md) — using claw-code-local with Ollama
- [MCP Gateway](./mcp-gateway.md) — for 3+ agents, use name-based routing instead of direct registration
