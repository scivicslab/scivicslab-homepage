---
sidebar_position: 4
title: "LLM Console (Local)"
description: "Multi-tenant browser UI for local LLM servers — vLLM, Ollama, OpenAI-compatible API"
---

# LLM Console (Local)

[quarkus-llm-console](https://github.com/scivicslab/quarkus-llm-console) is a multi-tenant Web UI for local LLM servers. Connect to vLLM, Ollama, or any OpenAI-compatible `/v1/chat/completions` endpoint and chat from your browser.

Each user (identified by HTTP Basic Auth) gets an isolated conversation history and SSE stream.

## Features

- **Multi-tenant** — per-user conversation history and SSE connections via BasicAuth
- **OpenAI-compatible** — works with vLLM, Ollama, and any server exposing `/v1/chat/completions`
- **Multiple servers** — connect to several LLM servers simultaneously; select per prompt
- **Prompt queue** — queue prompts while the AI is responding
- **URL fetch** — paste a URL, click Fetch, and the page content is prepended as context (RAG-style)
- **Image OCR** — paste or drag-and-drop images; sent to vision-capable models for analysis
- **Real-time streaming** (SSE) with Markdown rendering

## Prerequisites

- Java 21+ (or use native image)
- A running LLM server: [vLLM](https://github.com/vllm-project/vllm), [Ollama](https://ollama.com), or compatible

## Configuration

Edit `application.properties` (or pass as system properties):

```properties
# Comma-separated list of LLM server URLs
llm-chat.servers=http://192.168.5.15:8000,http://192.168.5.13:8000

# Max conversation history per user (default: 50)
llm-chat.max-history=50

# Application title shown in the UI
llm-chat.title=LLM Chat
```

Override at runtime:

```bash
java -Dllm-chat.servers=http://localhost:11434/v1 \
     -jar target/quarkus-app/quarkus-run.jar
```

## Build and Run

```bash
git clone https://github.com/scivicslab/quarkus-llm-console
cd quarkus-llm-console
mvn package
java -jar target/quarkus-app/quarkus-run.jar
```

Open `http://localhost:8090` in your browser.

## Example: vLLM

Operation has been confirmed with vLLM. Point the console at your vLLM server:

```bash
java -Dllm-chat.servers=http://192.168.5.15:8000 \
     -jar target/quarkus-app/quarkus-run.jar
```

## Other OpenAI-compatible Servers

Any server that exposes `/v1/chat/completions` should work in principle. For example, with Ollama:

```bash
java -Dllm-chat.servers=http://localhost:11434/v1 \
     -jar target/quarkus-app/quarkus-run.jar
```

> **Note:** Only vLLM has been verified by the author. Other servers (Ollama, LM Studio, etc.) follow the same OpenAI-compatible API, but compatibility is not guaranteed — please test with your own setup.
