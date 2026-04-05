---
sidebar_position: 6
title: "Tutorial: Claude Code CLI + Local LLM"
description: "Step-by-step guide to set up quarkus-chat-ui with Claude Code CLI and a local LLM via claw-code-local"
---

# Tutorial: Claude Code CLI + Local LLM (claw-code-local)

This tutorial walks through setting up two quarkus-chat-ui instances — one using Claude Code CLI and one using a local LLM (Ollama) via claw-code-local — that can communicate via MCP.

## What is claw-code-local?

[claw-code-local](https://github.com/codetwentyfive/claw-code-local) is a project that provides a Claude Code CLI-compatible interface for local LLMs. It wraps Ollama, LM Studio, llama.cpp, or any OpenAI-compatible endpoint and exposes the same tool system that Claude Code CLI uses — including MCP support.

This means local LLMs can:
- Use tools like `Read`, `Write`, `Bash`, `Grep`
- Call registered MCP servers via `mcp__servername__toolname`
- Participate in multi-agent conversations

## Prerequisites

- `ANTHROPIC_API_KEY` environment variable (for Claude)
- [Ollama](https://ollama.com/) installed with a model pulled
- [claw-code-local](https://github.com/codetwentyfive/claw-code-local) installed
- quarkus-chat-ui JAR or native executable ([download](https://github.com/scivicslab/quarkus-chat-ui/releases))
- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)

## Architecture Overview

```
┌─────────────────────────┐          ┌─────────────────────────┐
│  quarkus-chat-ui        │          │  quarkus-chat-ui        │
│  (Alice, port 28010)    │          │  (Bob, port 28020)      │
│  provider: claude       │          │  provider: claw         │
│                         │          │                         │
│  ┌───────────────────┐  │          │  ┌───────────────────┐  │
│  │ Claude Code CLI   │  │   MCP    │  │ claw-code-local   │  │
│  │ (Anthropic API)   │◄─┼──────────┼─►│ (Ollama backend)  │  │
│  └───────────────────┘  │          │  └───────────────────┘  │
│           │             │          │           │             │
│  ┌────────▼──────────┐  │          │  ┌────────▼──────────┐  │
│  │ MCP Server /mcp   │  │          │  │ MCP Server /mcp   │  │
│  └───────────────────┘  │          │  └───────────────────┘  │
└─────────────────────────┘          └─────────────────────────┘
         │                                      │
         │              ┌───────────┐           │
         │              │  Ollama   │           │
         │              │  :11434   │◄──────────┘
         │              └───────────┘
         ▼
    Anthropic API
```

## Step 1: Set Up Ollama

Install Ollama and pull a capable model:

```bash
# Install Ollama (see https://ollama.com/download)
curl -fsSL https://ollama.com/install.sh | sh

# Pull a code-capable model
ollama pull qwen2.5-coder:7b

# Or a larger model if you have the VRAM
ollama pull qwen2.5-coder:32b
```

Verify Ollama is running:

```bash
curl http://localhost:11434/v1/models
```

## Step 2: Install claw-code-local

```bash
# Clone and install
git clone https://github.com/codetwentyfive/claw-code-local
cd claw-code-local
npm install -g .

# Verify installation
claw --version
```

Configure claw-code-local to use Ollama:

```bash
# Create config file
mkdir -p ~/.claw
cat > ~/.claw/config.json << 'EOF'
{
  "provider": "ollama",
  "baseUrl": "http://localhost:11434",
  "model": "qwen2.5-coder:7b"
}
EOF
```

## Step 3: Start Two quarkus-chat-ui Instances

**Terminal 1 (Alice with Claude Code CLI):**

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...

java -Dchat-ui.provider=claude \
     -Dquarkus.http.port=28010 \
     -jar quarkus-chat-ui.jar
```

**Terminal 2 (Bob with claw-code-local):**

quarkus-chat-ui supports claw-code-local via the `claw` provider:

```bash
java -Dchat-ui.provider=claw \
     -Dquarkus.http.port=28020 \
     -jar quarkus-chat-ui.jar
```

If the `claw` provider is not yet available in your version, you can use claw-code-local directly and point quarkus-chat-ui to it. Check the [quarkus-chat-ui README](https://github.com/scivicslab/quarkus-chat-ui) for the latest provider support.

Verify both are running:
- Alice (Claude): http://localhost:28010
- Bob (Local LLM): http://localhost:28020

## Step 4: Register MCP Endpoints

### For Claude Code CLI (Alice's side)

```bash
# Register Bob's MCP endpoint
claude mcp add bob --transport http http://localhost:28020/mcp
```

### For claw-code-local (Bob's side)

claw-code-local uses the same MCP registration format as Claude Code CLI:

```bash
# Register Alice's MCP endpoint
claw mcp add alice --transport http http://localhost:28010/mcp
```

Verify:

```bash
claude mcp list   # Should show: bob
claw mcp list     # Should show: alice
```

## Step 5: Restart Both Instances

```bash
# Terminal 1 - Ctrl+C, then restart
java -Dchat-ui.provider=claude \
     -Dquarkus.http.port=28010 \
     -jar quarkus-chat-ui.jar

# Terminal 2 - Ctrl+C, then restart
java -Dchat-ui.provider=claw \
     -Dquarkus.http.port=28020 \
     -jar quarkus-chat-ui.jar
```

## Step 6: Test Communication

Open two browsers:
- http://localhost:28010 (Alice / Claude)
- http://localhost:28020 (Bob / Local LLM)

### Alice (Claude) sends to Bob (Local LLM)

In Alice's browser:

```
Use mcp__bob__submitPrompt to send this message to Bob:
"Hi! I'm Claude running on Anthropic's API. What model are you running locally?"
Include _caller=http://localhost:28010
```

### Bob (Local LLM) receives and replies

In Bob's browser:

```
[MCP from localhost:28010] Hi! I'm Claude running on Anthropic's API. What model are you running locally?
```

Bob's local LLM (e.g., Qwen) processes the enriched prompt and replies using `mcp__alice__submitPrompt`.

In Alice's browser:

```
[MCP from localhost:28020] Hello Claude! I'm Qwen 2.5 Coder running locally via Ollama...
```

## Model Recommendations for Local LLMs

For multi-agent conversations, the local LLM needs to understand:
1. Tool calling syntax
2. Following instructions in the enriched prompt
3. Generating appropriate responses

Recommended models (as of early 2026):

| Model | Size | Notes |
|-------|------|-------|
| `qwen2.5-coder:7b` | 7B | Good balance of speed and capability |
| `qwen2.5-coder:32b` | 32B | Better reasoning, needs more VRAM |
| `deepseek-coder-v2:16b` | 16B | Strong code understanding |
| `codellama:13b` | 13B | Good for code tasks |

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| Local LLM doesn't call tools | Model too small or not instruction-tuned | Use a larger or code-specific model |
| claw-code-local not found | Not installed globally | `npm install -g .` in claw-code-local directory |
| Ollama connection refused | Ollama not running | Start Ollama: `ollama serve` |
| Slow responses from local LLM | Model too large for hardware | Use a smaller model or quantized version |
| Local LLM ignores `_caller` | Model doesn't follow enriched prompt | Try a more capable model |

## Performance Considerations

- **Latency**: Local LLMs are typically slower than cloud APIs (especially on CPU)
- **Quality**: Smaller models may struggle with complex multi-turn conversations
- **Cost**: After initial hardware investment, local inference is free

For production multi-agent setups, consider using local LLMs for high-volume, simpler tasks and cloud APIs for complex reasoning.

## Cleaning Up

```bash
claude mcp remove bob
claw mcp remove alice
```

## Next Steps

- [MCP Gateway](./mcp-gateway.md) — for 3+ agents, use name-based routing instead of direct registration
- [Tutorial: Two Claude Code CLI Agents](./multi-agent-claude-cli.md) — homogeneous cloud setup
- [Tutorial: Claude Code CLI + Codex](./multi-agent-claude-codex.md) — multi-vendor cloud setup
