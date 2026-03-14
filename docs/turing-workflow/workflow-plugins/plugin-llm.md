---
sidebar_position: 2
title: "plugin-llm"
description: "LLM plugin for Turing-workflow: send prompts to Claude, OpenAI, and other providers from YAML workflows"
---

# plugin-llm

`plugin-llm` provides a Turing-workflow actor that sends prompts to LLM providers (Claude, OpenAI, etc.) and returns the response as a workflow action result.

## Maven Dependency

```xml
<dependency>
    <groupId>com.scivicslab.turingworkflow.plugins</groupId>
    <artifactId>plugin-llm</artifactId>
    <version>1.0.0</version>
</dependency>
```

## Actions

See the [Javadoc](https://scivicslab.github.io/Turing-workflow-plugins/plugin-llm/apidocs) for full argument specifications.

| Action | Description |
|--------|-------------|
| `setProvider` | Set the LLM provider (`claude`, `openai`, …) |
| `setModel` | Set the model name (e.g. `claude-opus-4-6`) |
| `setApiKey` | Set the API key (or read from environment variable) |
| `prompt` | Send a prompt string and return the LLM response |

## Usage in YAML

```yaml
name: llm-example
steps:
  # Load and instantiate the LLM actor
  - states: ["0", "1"]
    actions:
      - actor: loader
        method: loadJar
        arguments: "com.scivicslab.turingworkflow.plugins:plugin-llm:1.0.0"

  - states: ["1", "2"]
    actions:
      - actor: loader
        method: createChild
        arguments: ["ROOT", "llm", "com.scivicslab.turingworkflow.plugins.llm.LlmActor"]

  # Configure the actor
  - states: ["2", "3"]
    actions:
      - actor: llm
        method: setProvider
        arguments: "claude"
      - actor: llm
        method: setModel
        arguments: "claude-opus-4-6"

  # Send a prompt
  - states: ["3", "end"]
    actions:
      - actor: llm
        method: prompt
        arguments: "Summarize the actor model in one sentence."
```

## MCP Gateway Integration

`plugin-llm` works with `quarkus-mcp-gateway` to route LLM calls through an MCP server. When configured with an MCP gateway URL, the actor forwards prompts to the gateway instead of calling the LLM provider directly, enabling tool use and multi-step agent workflows within a single YAML workflow execution.

## References

- **GitHub**: [Turing-workflow-plugins](https://github.com/scivicslab/Turing-workflow-plugins)
- **Javadoc**: [plugin-llm API Reference](https://scivicslab.github.io/Turing-workflow-plugins/plugin-llm/apidocs)
- **Maven Central**: [com.scivicslab.turingworkflow.plugins:plugin-llm](https://central.sonatype.com/artifact/com.scivicslab.turingworkflow.plugins/plugin-llm)
