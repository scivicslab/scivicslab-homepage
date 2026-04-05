---
slug: 2026-04-05-quarkus-chat-ui-intro
title: "quarkus-chat-ui: A Web Front-End for LLMs, and a Real-World Case for POJO-actor"
authors: [devteam]
date: 2026-04-05
tags: [quarkus-chat-ui, pojo-actor, llm, mcp, quarkus]
---

quarkus-chat-ui is a web UI for LLMs where multiple instances can talk to each other — built as a real-world use case for [POJO-actor](https://github.com/scivicslab/pojo-actor).

Each quarkus-chat-ui instance exposes an HTTP MCP server at `/mcp`, so Instance A can call tools on Instance B, and Instance B can reply by calling tools back on A. The LLM backend — Claude Code CLI, Codex, or a local model via claw-code-local — acts as an MCP client that can reach these endpoints. The question was how to wire that up over HTTP, and how to handle the fact that LLM responses take tens of seconds and arrive as a stream.

[quarkus-chat-ui](https://github.com/scivicslab/quarkus-chat-ui) is the bridge that makes this work. Each instance wraps one LLM backend and exposes it as an HTTP MCP server at `/mcp`. For multi-agent communication, use a backend with MCP client capability: Claude Code CLI, Codex, or claw-code-local (which brings MCP support to Ollama, vLLM, and other local models). The `openai-compat` provider works for single-agent use but cannot call other MCP servers. Agents call each other by name. Humans can watch both sides of the conversation in their browsers.

<!-- truncate -->

Once the async communication layer was in place, a capable web UI and a prompt queue came along naturally. The browser gives you a stable place to type — your input won't vanish when the AI responds, and paste and multi-line just work. If you need an LLM front-end and happen to be a Java developer, those turn out to be useful in their own right.

This post is about quarkus-chat-ui as a tool you can use. Companion posts cover:
- The internal design — how [POJO-actor](https://github.com/scivicslab/pojo-actor) keeps the concurrency clean → quarkus-chat-ui (2): The Actor Design Behind LLM-to-LLM Communication (coming soon)
- Scaling beyond two agents — why quarkus-mcp-gateway becomes necessary → quarkus-chat-ui (3): Scaling Multi-Agent Communication with MCP Gateway (coming soon)

---

## What it does

### 1. LLM instances talking to each other via MCP

Each quarkus-chat-ui instance exposes an HTTP MCP server at `/mcp`. The tools are `submitPrompt`, `getPromptStatus`, `getPromptResult`, `cancelRequest`, and a few others.

`submitPrompt` accepts a `_caller` parameter. When Instance B receives a prompt with `_caller` pointing back to A, it enriches the prompt with position awareness and reply instructions before forwarding it to its LLM:

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

The LLM reads this, formulates a reply, and calls `submitPrompt` on Instance A. The conversation continues autonomously.

```
Browser A (port 28010)             Browser B (port 28020)
──────────────────────             ──────────────────────
[MCP from localhost:28020]         [MCP from localhost:28010]
What should we work on today? ←→   Let's start with the API layer.
                                   [MCP from localhost:28010]
[MCP from localhost:28020]         ...
Good idea. Let's define...
```

You can also put a [quarkus-mcp-gateway](https://github.com/scivicslab/quarkus-mcp-gateway) in front of many instances, routing by name instead of port. Service discovery scans a port range and registers all running agents automatically.

### 2. Written in Quarkus — streaming made simple

LLM tooling tends to be Python. If you want to customise how prompts are enriched, add a new backend, or change the queue policy, quarkus-chat-ui is a straightforward Quarkus Maven project.

Adding a new LLM backend means implementing one interface:

```java
public interface LlmProvider {
    String id();
    void sendPrompt(String prompt, String model,
                    Consumer<ChatEvent> emitter, ProviderContext ctx);
    void cancel();
    // ...
}
```

SSE streaming, queue management, MCP server, and conversation history are already there.

Quarkus made the streaming part almost trivial. Exposing an SSE endpoint is a matter of returning `Multi<T>` from a JAX-RS method:

```java
@GET @Path("/events/{sessionId}")
@Produces(MediaType.SERVER_SENT_EVENTS)
@RestStreamElementType(MediaType.APPLICATION_JSON)
public Multi<ChatEvent> events(@PathParam("sessionId") String sessionId) {
    return chatService.getEventStream(sessionId);
}
```

That is all. The framework handles chunked encoding, keep-alive, and client reconnection. Backpressure flows naturally through Mutiny's reactive streams. There is no manual buffer management, no explicit flush calls, no thread-pool tuning. You return a `Multi`, Quarkus streams it.

### 3. A prompt queue that does the obvious thing

When the LLM is busy and you want to queue your next question, you can. When the current response finishes, the queued prompt runs automatically.

```
[LLM is processing "Explain this code"]

You type: "Now write the tests"    →  added to queue
You type: "And the documentation"  →  added to queue

[Response arrives]
→ "Now write the tests" runs automatically
[Response arrives]
→ "And the documentation" runs automatically
```

The queue is visible in the UI, persistent across page reloads, and editable — reorder or delete items before they run.

Cancel works correctly in the multi-agent case too. Pressing Cancel stops the current generation and removes MCP-sourced messages from the backend queue. Messages you typed yourself stay in the queue and run after the cancel.

---

## Why the concurrency is manageable

Multi-agent HTTP conversation sounds like a concurrency nightmare: SSE streams arriving from multiple agents, a queue draining as responses land, cancel signals that need to reach the right places. In practice it is not, because the design is explicit about who owns what state.

Each concern — chat session, side questions, queue management, stall detection — runs in its own actor backed by [POJO-actor](https://github.com/scivicslab/pojo-actor). Blocking I/O runs on virtual threads that report back to the actor when done. The actors communicate through `tell()` and `ask()` calls. There are no `synchronized` blocks in the application code.

The companion post goes into detail: quarkus-chat-ui (2): The Actor Design Behind LLM-to-LLM Communication (coming soon).

---

## Quick start

Three providers are supported:

| `chat-ui.provider` | What it wraps | Requires |
|--------------------|---------------|---------|
| `claude` | [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) | `ANTHROPIC_API_KEY` |
| `codex` | [OpenAI Codex CLI](https://github.com/openai/codex) | `OPENAI_API_KEY` |
| `openai-compat` | Any OpenAI-compatible HTTP server (vLLM, Ollama, …) | running local server |

### Preparing a local LLM (openai-compat)

If you want to run a local model instead of a cloud API, [Ollama](https://ollama.com/) is the easiest way to get started:

```bash
# Install Ollama, then pull a model
ollama pull qwen2.5-coder:7b

# Ollama listens on http://localhost:11434 by default
# Use -Dchat-ui.servers=http://localhost:11434/v1 when starting quarkus-chat-ui
```

For GPU-accelerated inference, [vLLM](https://docs.vllm.ai/) serves any HuggingFace-compatible model on the same OpenAI-compatible API:

```bash
vllm serve Qwen/Qwen2.5-Coder-7B-Instruct --port 8000
# Use -Dchat-ui.servers=http://localhost:8000
```

### Option 1: Native executable (no JDK required)

Java traditionally requires a JVM to run. You install a JDK, compile your code to bytecode, and the JVM interprets or JIT-compiles it at runtime. This is why "installing Java" has always been a prerequisite for running Java applications.

GraalVM native image changes this. It compiles Java bytecode ahead-of-time into a native executable for your OS and CPU architecture. The result is a standalone binary — just like a C or Go program. No JVM, no JDK, no `JAVA_HOME`. Download, run, done.

This is where Quarkus shines again. Traditional Java frameworks rely heavily on runtime reflection, making native image compilation painful — you end up maintaining long lists of reflection configuration by hand. Quarkus was designed from the start with native compilation in mind. It moves reflection and configuration processing to build time, and its extensions generate the necessary GraalVM hints automatically. You just run `mvn package -Dnative` and it works.

Pre-built native executables are available on the [Releases](https://github.com/scivicslab/quarkus-chat-ui/releases) page.

| Platform | Binary |
|----------|--------|
| Linux x86_64 | `quarkus-chat-ui-linux-amd64` |
| Linux ARM64 | `quarkus-chat-ui-linux-arm64` |
| macOS Intel | `quarkus-chat-ui-macos-amd64` |
| macOS Apple Silicon (M1/M2/M3) | `quarkus-chat-ui-macos-arm64` |
| Windows x64 | `quarkus-chat-ui-windows-amd64.exe` |

```bash
# Linux x86_64
./quarkus-chat-ui-linux-amd64 -Dchat-ui.provider=claude -Dquarkus.http.port=28010

# Linux ARM64
./quarkus-chat-ui-linux-arm64 -Dchat-ui.provider=claude -Dquarkus.http.port=28010

# macOS Intel
./quarkus-chat-ui-macos-amd64 -Dchat-ui.provider=claude -Dquarkus.http.port=28010

# macOS Apple Silicon (M1/M2/M3)
./quarkus-chat-ui-macos-arm64 -Dchat-ui.provider=claude -Dquarkus.http.port=28010
```

```powershell
# Windows PowerShell
.\quarkus-chat-ui-windows-amd64.exe -Dchat-ui.provider=claude -Dquarkus.http.port=28010
```

### Option 2: Build from source

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

Run with vLLM or Ollama (OpenAI-compatible API):

```bash
java -Dchat-ui.provider=openai-compat \
     -Dchat-ui.openai-compat.base-url=http://localhost:11434/v1 \
     -Dquarkus.http.port=28010 \
     -jar app/target/quarkus-app/quarkus-run.jar
```

Open `http://localhost:28010` in a browser.

For all providers (`claude`, `codex`, `openai-compat`) and configuration options, see the [README](https://github.com/scivicslab/quarkus-chat-ui#configuration).

---

## Setting up two agents to talk (Claude Code CLI)

This section walks through the exact steps to make two quarkus-chat-ui instances communicate with each other. Both use Claude Code CLI as the LLM backend.

### Understanding the architecture

Two separate systems are involved:

1. **MCP server** — quarkus-chat-ui exposes tools at `/mcp` (e.g., `submitPrompt`). External callers can invoke these tools via HTTP.
2. **LLM tools** — Claude Code CLI has its own tool system (`Read`, `Write`, `Bash`, etc.). It can also call registered MCP servers using tools like `mcp__servername__toolname`.

For Alice's LLM to call Bob's `submitPrompt`, Alice's Claude Code CLI must have Bob's MCP endpoint registered. This is done with `claude mcp add`.

### Step 1: Start two instances

Open two terminals.

**Terminal 1 (Alice on port 28010):**

```bash
export ANTHROPIC_API_KEY=sk-ant-...
java -Dchat-ui.provider=claude \
     -Dquarkus.http.port=28010 \
     -jar app/target/quarkus-app/quarkus-run.jar
```

**Terminal 2 (Bob on port 28020):**

```bash
export ANTHROPIC_API_KEY=sk-ant-...
java -Dchat-ui.provider=claude \
     -Dquarkus.http.port=28020 \
     -jar app/target/quarkus-app/quarkus-run.jar
```

At this point, both instances are running, but their LLMs cannot call each other's MCP endpoints.

### Step 2: Register MCP endpoints

Claude Code CLI's MCP registration is user-level (stored in `~/.claude.json`). Register each instance's MCP endpoint:

```bash
# Register Bob's MCP endpoint (so Alice can call Bob)
claude mcp add bob --transport http http://localhost:28020/mcp

# Register Alice's MCP endpoint (so Bob can call Alice)
claude mcp add alice --transport http http://localhost:28010/mcp
```

Verify the registration:

```bash
claude mcp list
```

You should see both `alice` and `bob` in the list.

### Step 3: Restart the instances

The Claude Code CLI subprocess reads `~/.claude.json` at startup. Restart both quarkus-chat-ui instances so they pick up the new MCP registrations.

### Step 4: Test the communication

Open two browser windows:
- Alice: `http://localhost:28010`
- Bob: `http://localhost:28020`

In Alice's browser, type:

```
Send a greeting to bob using the mcp__bob__submitPrompt tool. Include _caller parameter set to http://localhost:28010 so bob knows where to reply.
```

Alice's Claude Code CLI will call:

```
mcp__bob__submitPrompt(prompt="Hello Bob!", _caller="http://localhost:28010")
```

In Bob's browser, you should see:

```
[MCP from localhost:28010] Hello Bob!
```

Bob's LLM receives the enriched prompt with reply instructions and can respond using `mcp__alice__submitPrompt`.

### What can go wrong

| Symptom | Cause | Fix |
|---------|-------|-----|
| "I don't have access to mcp__bob__submitPrompt" | MCP endpoint not registered | Run `claude mcp add bob ...` |
| MCP registered but LLM doesn't see it | Instance started before registration | Restart the instance |
| Bob receives message but can't reply | Alice's endpoint not registered with Bob | Run `claude mcp add alice ...` |
| Connection refused | Wrong port or instance not running | Check port numbers |

### The `_caller` parameter

When calling `submitPrompt`, always include `_caller` with the sender's URL:

```
mcp__bob__submitPrompt(
  prompt="Hello!",
  _caller="http://localhost:28010"  ← tells Bob where to reply
)
```

quarkus-chat-ui enriches the prompt with this information, so Bob's LLM knows where to send replies.

### Beyond two agents

With two agents, you register two endpoints. With three, you need six registrations. With *n* agents, you need *n(n-1)* registrations — quadratic growth.

For three or more agents, use [quarkus-mcp-gateway](https://github.com/scivicslab/quarkus-mcp-gateway). Agents register once with the gateway; the gateway routes by name.

---

## Links

- [quarkus-chat-ui on GitHub](https://github.com/scivicslab/quarkus-chat-ui)
- [quarkus-mcp-gateway on GitHub](https://github.com/scivicslab/quarkus-mcp-gateway)
- [POJO-actor on GitHub](https://github.com/scivicslab/pojo-actor)
