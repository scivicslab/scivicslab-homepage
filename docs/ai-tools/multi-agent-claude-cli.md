---
sidebar_position: 4
title: "Tutorial: Two Claude Code CLI Agents"
description: "Step-by-step guide to set up two quarkus-chat-ui instances with Claude Code CLI talking to each other"
---

# Tutorial: Two Claude Code CLI Agents

Two quarkus-chat-ui instances, both using Claude Code CLI, talking to each other via MCP.

## 1. Install Claude Code CLI

```bash
npm install -g @anthropic-ai/claude-code
```

Verify:

```bash
claude --version
```

## 2. Set API Key

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...
```

## 3. Download quarkus-chat-ui

Download the native executable for your platform from [Releases](https://github.com/scivicslab/quarkus-chat-ui/releases):

| Platform | Binary |
|----------|--------|
| Linux x86_64 | `quarkus-chat-ui-linux-amd64` |
| Linux ARM64 | `quarkus-chat-ui-linux-arm64` |
| macOS Intel | `quarkus-chat-ui-macos-amd64` |
| macOS Apple Silicon | `quarkus-chat-ui-macos-arm64` |
| Windows | `quarkus-chat-ui-windows-amd64.exe` |

```bash
chmod +x quarkus-chat-ui-linux-amd64
```

## 4. Start Alice (port 28010)

Terminal 1:

```bash
./quarkus-chat-ui-linux-amd64 \
  -Dchat-ui.provider=claude \
  -Dquarkus.http.port=28010
```

Open http://localhost:28010 in a browser.

## 5. Start Bob (port 28020)

Terminal 2:

```bash
./quarkus-chat-ui-linux-amd64 \
  -Dchat-ui.provider=claude \
  -Dquarkus.http.port=28020
```

Open http://localhost:28020 in another browser window.

## 6. Register MCP Endpoints

Terminal 3:

```bash
# So Alice can call Bob
claude mcp add bob --transport http http://localhost:28020/mcp

# So Bob can call Alice
claude mcp add alice --transport http http://localhost:28010/mcp
```

Verify:

```bash
claude mcp list
```

Output:

```
alice: http://localhost:28010/mcp (http)
bob: http://localhost:28020/mcp (http)
```

## 7. Restart Both Instances

Claude Code CLI reads MCP registrations at startup. Stop and restart both instances.

Terminal 1 (Ctrl+C, then):

```bash
./quarkus-chat-ui-linux-amd64 \
  -Dchat-ui.provider=claude \
  -Dquarkus.http.port=28010
```

Terminal 2 (Ctrl+C, then):

```bash
./quarkus-chat-ui-linux-amd64 \
  -Dchat-ui.provider=claude \
  -Dquarkus.http.port=28020
```

## 8. Test: Alice Sends to Bob

In Alice's browser (http://localhost:28010), type:

```
Use mcp__bob__submitPrompt to send "Hello Bob!" to Bob.
Set _caller to http://localhost:28010
```

## 9. Verify: Bob Receives

In Bob's browser (http://localhost:28020), you should see:

```
[MCP from localhost:28010] Hello Bob!
```

Bob can reply using `mcp__alice__submitPrompt`. The `_caller` parameter tells Bob where to send the reply.

## Cleanup

```bash
claude mcp remove alice
claude mcp remove bob
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `mcp__bob__submitPrompt` not found | Run `claude mcp add bob ...` and restart the instance |
| Connection refused | Check the target instance is running on the correct port |
| Bob can't reply | Run `claude mcp add alice ...` and restart Bob |
