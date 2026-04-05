---
sidebar_position: 5
title: "Tutorial: Claude Code CLI + Codex"
description: "Step-by-step guide to set up quarkus-chat-ui with Claude Code CLI and OpenAI Codex talking to each other"
---

# Tutorial: Claude Code CLI + Codex

One quarkus-chat-ui instance using Claude Code CLI (Anthropic), another using Codex (OpenAI), talking to each other via MCP.

## 1. Install Claude Code CLI

```bash
npm install -g @anthropic-ai/claude-code
```

Verify:

```bash
claude --version
```

## 2. Install Codex CLI

```bash
npm install -g @openai/codex
```

Verify:

```bash
codex --version
```

## 3. Set API Keys

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...
export OPENAI_API_KEY=sk-...
```

## 4. Download quarkus-chat-ui

Download from [Releases](https://github.com/scivicslab/quarkus-chat-ui/releases).

```bash
chmod +x quarkus-chat-ui-linux-amd64
```

## 5. Start Alice with Claude (port 28010)

Terminal 1:

```bash
./quarkus-chat-ui-linux-amd64 \
  -Dchat-ui.provider=claude \
  -Dquarkus.http.port=28010
```

Open http://localhost:28010

## 6. Start Bob with Codex (port 28020)

Terminal 2:

```bash
./quarkus-chat-ui-linux-amd64 \
  -Dchat-ui.provider=codex \
  -Dquarkus.http.port=28020
```

Open http://localhost:28020

## 7. Register MCP Endpoints

For Claude Code CLI (so Alice can call Bob):

```bash
claude mcp add bob --transport http http://localhost:28020/mcp
```

For Codex (so Bob can call Alice):

```bash
codex mcp add alice --transport http http://localhost:28010/mcp
```

Verify:

```bash
claude mcp list   # shows: bob
codex mcp list    # shows: alice
```

## 8. Restart Both Instances

Both CLIs read MCP registrations at startup.

Terminal 1 (Ctrl+C, then):

```bash
./quarkus-chat-ui-linux-amd64 \
  -Dchat-ui.provider=claude \
  -Dquarkus.http.port=28010
```

Terminal 2 (Ctrl+C, then):

```bash
./quarkus-chat-ui-linux-amd64 \
  -Dchat-ui.provider=codex \
  -Dquarkus.http.port=28020
```

## 9. Test: Alice (Claude) Sends to Bob (Codex)

In Alice's browser (http://localhost:28010):

```
Use mcp__bob__submitPrompt to send "Hello Bob! I'm Claude." to Bob.
Set _caller to http://localhost:28010
```

## 10. Verify: Bob (Codex) Receives

In Bob's browser (http://localhost:28020):

```
[MCP from localhost:28010] Hello Bob! I'm Claude.
```

Bob (Codex) can reply using `mcp__alice__submitPrompt`.

## Cleanup

```bash
claude mcp remove bob
codex mcp remove alice
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Claude can't find `mcp__bob__*` | `claude mcp add bob ...` and restart Alice |
| Codex can't find `mcp__alice__*` | `codex mcp add alice ...` and restart Bob |
| One direction works, other doesn't | Both sides need MCP registration |
