---
sidebar_position: 6
title: "Tutorial: Claude Code CLI + Local LLM"
description: "Step-by-step guide to set up quarkus-chat-ui with Claude Code CLI and a local LLM via claw-code-local"
---

# Tutorial: Claude Code CLI + Local LLM (claw-code-local)

One quarkus-chat-ui instance using Claude Code CLI, another using a local LLM (Ollama) via claw-code-local, talking to each other via MCP.

[claw-code-local](https://github.com/codetwentyfive/claw-code-local) provides Claude Code CLI-compatible interface for local LLMs, including MCP support.

## 1. Install Claude Code CLI

```bash
npm install -g @anthropic-ai/claude-code
```

Verify:

```bash
claude --version
```

## 2. Install Ollama

Linux:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

macOS:

```bash
brew install ollama
```

Start Ollama:

```bash
ollama serve
```

## 3. Pull a Model

```bash
ollama pull qwen2.5-coder:7b
```

Verify:

```bash
curl http://localhost:11434/v1/models
```

## 4. Install claw-code-local

```bash
git clone https://github.com/codetwentyfive/claw-code-local
cd claw-code-local
npm install -g .
```

Verify:

```bash
claw --version
```

## 5. Configure claw-code-local

```bash
mkdir -p ~/.claw
cat > ~/.claw/config.json << 'EOF'
{
  "provider": "ollama",
  "baseUrl": "http://localhost:11434",
  "model": "qwen2.5-coder:7b"
}
EOF
```

## 6. Set API Key (for Claude)

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...
```

## 7. Download quarkus-chat-ui

Download from [Releases](https://github.com/scivicslab/quarkus-chat-ui/releases).

```bash
chmod +x quarkus-chat-ui-linux-amd64
```

## 8. Start Alice with Claude (port 28010)

Terminal 1:

```bash
./quarkus-chat-ui-linux-amd64 \
  -Dchat-ui.provider=claude \
  -Dquarkus.http.port=28010
```

Open http://localhost:28010

## 9. Start Bob with claw-code-local (port 28020)

Terminal 2:

```bash
./quarkus-chat-ui-linux-amd64 \
  -Dchat-ui.provider=claw \
  -Dquarkus.http.port=28020
```

Open http://localhost:28020

Note: If `claw` provider is not available in your version, check the [quarkus-chat-ui README](https://github.com/scivicslab/quarkus-chat-ui) for alternative setup.

## 10. Register MCP Endpoints

For Claude Code CLI:

```bash
claude mcp add bob --transport http http://localhost:28020/mcp
```

For claw-code-local:

```bash
claw mcp add alice --transport http http://localhost:28010/mcp
```

## 11. Restart Both Instances

Terminal 1 (Ctrl+C, then):

```bash
./quarkus-chat-ui-linux-amd64 \
  -Dchat-ui.provider=claude \
  -Dquarkus.http.port=28010
```

Terminal 2 (Ctrl+C, then):

```bash
./quarkus-chat-ui-linux-amd64 \
  -Dchat-ui.provider=claw \
  -Dquarkus.http.port=28020
```

## 12. Test: Alice (Claude) Sends to Bob (Local LLM)

In Alice's browser (http://localhost:28010):

```
Use mcp__bob__submitPrompt to send "Hello Bob! What model are you running?" to Bob.
Set _caller to http://localhost:28010
```

## 13. Verify: Bob (Local LLM) Receives

In Bob's browser (http://localhost:28020):

```
[MCP from localhost:28010] Hello Bob! What model are you running?
```

Bob (Qwen via Ollama) can reply using `mcp__alice__submitPrompt`.

## Cleanup

```bash
claude mcp remove bob
claw mcp remove alice
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Ollama connection refused | Start Ollama: `ollama serve` |
| Model not found | Pull model: `ollama pull qwen2.5-coder:7b` |
| claw command not found | `npm install -g .` in claw-code-local directory |
| Local LLM doesn't use tools | Use a larger or more capable model |
| Slow responses | Normal for local inference; use smaller model or GPU |
