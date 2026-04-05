---
id: PluginLlm_260403_oo01
sidebar_position: 60
title: "plugin-llm: LLM Integration via MCP"
description: "A plugin that provides an MCP (Model Context Protocol) Streamable HTTP client for sending prompts to and receiving responses from LLM services."
keywords:
  - LLM
  - MCP
  - Model Context Protocol
  - JSON-RPC
  - AI integration
---

# plugin-llm

A plugin that provides an MCP (Model Context Protocol) Streamable HTTP client. It sends prompts to LLM services (default: `quarkus-chat-ui-claude`) and retrieves responses.

## What is MCP (Model Context Protocol)?

MCP is a protocol that standardizes communication with LLM services. It uses JSON-RPC over HTTP to invoke tools and send prompts.

`plugin-llm` implements MCP's "Streamable HTTP Transport" (protocol version `2025-03-26`).

## Usage

### Basic Prompt Sending

```yaml
# Usage example in workflow YAML
states:
  ask-llm:
    code:
      - action: setUrl
        args: ["http://192.168.5.15:8090"]
      - action: prompt
        args: ["Please write a script to check this server's status"]
```

### `@Action` Methods

| Action | Arguments | Description |
|---|---|---|
| `setUrl` | `"http://host:port"` | Set the MCP server base URL. Changing this resets the session |
| `prompt` | `"prompt text"` | Send a prompt and return the LLM response |
| `status` | none | Get MCP server status |
| `listTools` | none | Get list of available MCP tools |

### Argument Formats

Arguments accept the following formats:

- Quoted string: `"http://localhost:8090"`
- JSON array: `["http://localhost:8090"]`
- Bare string: `http://localhost:8090`

## Internal Operation

### Session Management

1. MCP session is initialized on the first `prompt` call
2. Session ID is obtained via `initialize` request (response header `Mcp-Session-Id`)
3. Subsequent requests include the session ID
4. Session is reset when URL is changed via `setUrl`

### Communication Flow

```
LlmActor                         MCP Server
   |                                  |
   |-- initialize (JSON-RPC) -------->|
   |<-- session-id (header) ----------|
   |                                  |
   |-- notifications/initialized ---->|
   |                                  |
   |-- tools/call: sendPrompt ------->|
   |<-- result: {content: [{text}]} --|
```

### HTTP Configuration

| Setting | Value |
|---|---|
| Connection timeout | 10 seconds |
| Request timeout | 5 minutes |
| Content-Type | `application/json` |
| Accept | `application/json, text/event-stream` |

### Response Extraction

Extracts entries with `type: "text"` from the `result.content` array in the MCP response and concatenates the text to return.

```json
{
  "result": {
    "content": [
      {"type": "text", "text": "Here is the script..."}
    ]
  }
}
```

## Real-time Output

When an output listener is set, callbacks are invoked in real-time upon response reception.

```java
llmActor.setOutputListener(text -> System.out.println("[LLM] " + text));
```

## Default Settings

| Setting | Default Value |
|---|---|
| Base URL | `http://localhost:8090/mcp` |
| Protocol version | `2025-03-26` |
| MCP version | `1.0` |

## Library Dependencies

- JDK `java.net.http.HttpClient` (built-in) - No external HTTP dependencies
- No dependencies on other plugins
