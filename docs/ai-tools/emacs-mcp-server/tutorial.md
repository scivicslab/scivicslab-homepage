---
sidebar_position: 2
title: "Tutorial: Setup & First Steps"
description: "Step-by-step guide to installing Emacs, enabling server mode, and connecting it to Claude via MCP"
---

# Tutorial: Setting Up Emacs MCP Server

This tutorial walks through every step — from installing Emacs on a fresh Ubuntu 24.04 system to controlling your editor from Claude via MCP.

## 1. Installing Emacs

Emacs MCP Server controls Emacs through `emacsclient`, which requires Emacs to be compiled with **server mode support**. The standard Ubuntu 24.04 package (`emacs-gtk`) includes this out of the box.

```bash
sudo apt update
sudo apt install emacs
```

Verify the installation:

```bash
emacs --version
# GNU Emacs 29.3
```

### Avoid the Snap package

Ubuntu also offers `snap install emacs`, but the Snap version has sandboxing restrictions that interfere with `emacsclient` socket communication. Use the apt package instead.

```bash
# If the Snap version is installed, remove it first
sudo snap remove emacs
sudo apt install emacs
```

## 2. Enabling Emacs Server Mode

Emacs MCP Server communicates with Emacs through `emacsclient`. For this to work, Emacs must be running in **server mode**.

Configuration differs between vanilla Emacs and Doom Emacs.

### Vanilla Emacs

#### Option A: Add to init.el (recommended)

Add the following to `~/.emacs.d/init.el` (or `~/.emacs`):

```elisp
(server-start)
```

Server mode will start automatically every time you launch Emacs.

#### Option B: Start manually

Run `M-x server-start` inside Emacs. You need to do this every time you start Emacs.

### Doom Emacs

[Doom Emacs](https://github.com/doomemacs/doomemacs) has its own configuration structure. Do not edit `~/.emacs.d/init.el` directly — `doom sync` will overwrite it.

#### Installing Doom Emacs (if not already installed)

Doom Emacs is installed on top of vanilla Emacs. Install Emacs via apt first, then:

```bash
git clone --depth 1 https://github.com/doomemacs/doomemacs ~/.config/emacs
~/.config/emacs/bin/doom install
```

Add `~/.config/emacs/bin` to your PATH for convenience:

```bash
# Add to ~/.bashrc
export PATH="$HOME/.config/emacs/bin:$PATH"
```

#### Enabling server mode

Add the following to `~/.doom.d/config.el` (or `~/.config/doom/config.el`):

```elisp
(after! server
  (unless (server-running-p)
    (server-start)))
```

The `after! server` block ensures the server starts only after Doom's initialization is complete. Writing `(server-start)` directly at the top level may conflict with Doom's startup sequence.

Apply the changes:

```bash
doom sync
```

Then restart Emacs.

#### Running Doom Emacs as a daemon

A common Doom Emacs pattern is to run it as a background daemon:

```bash
emacs --daemon
```

This automatically enables server mode. Open a GUI frame with `emacsclient -c` when you need one.

To auto-start via systemd:

```bash
# ~/.config/systemd/user/emacs.service
[Unit]
Description=Emacs Daemon

[Service]
Type=forking
ExecStart=/usr/bin/emacs --daemon
ExecStop=/usr/bin/emacsclient --eval "(kill-emacs)"
Restart=on-failure

[Install]
WantedBy=default.target
```

```bash
systemctl --user enable --now emacs
```

#### Notes for Doom Emacs users

- Doom uses `SPC` as the leader key. Instead of `M-x server-start`, you can run `SPC : server-start`
- Doom's `emacsclient` is the same as vanilla. All Doom features are available when connecting via `emacsclient` because Doom's configuration is loaded at Emacs startup
- `~/.doom.d/` and `~/.config/doom/` point to the same location (the former is a symlink). Check which one your system uses

### Verifying server mode

The verification step is the same for both vanilla and Doom Emacs. Run this in a separate terminal:

```bash
emacsclient -e '(+ 1 1)'
# => 2
```

If you see `2`, server mode is running. If you get the following error, server mode has not been started:

```
emacsclient: can't find socket; have you started the server?
```

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `can't find socket` | Server mode not started | Run `M-x server-start` in Emacs (Doom: `SPC : server-start`) |
| `emacsclient: command not found` | emacsclient not in PATH | Run `sudo apt install emacs` again |
| Stale socket file | Previous Emacs crashed | Delete `rm /run/user/$(id -u)/emacs/server` and restart Emacs |
| Doom: `server-start` duplicate error | Daemon mode already started a server | Check with `server-running-p` (the `after!` pattern above handles this) |
| Doom: server not starting after `doom sync` | config.el entry in wrong location | Ensure the code is inside the `after! server` block |

## 3. Installing Emacs MCP Server

There are three implementations — Python, TypeScript, and Java (Quarkus) — all providing the same tools. This tutorial covers **Python** (simplest to get started) and **Java/Quarkus** (best for MCP Gateway integration).

### Cloning the repository

```bash
git clone https://github.com/scivicslab/emacs-mcp-server.git
cd emacs-mcp-server
```

### Python

```bash
cd python
pip install -r requirements.txt
```

Start the server:

```bash
python emacs_mcp_server.py
```

The Python version uses stdio transport and is designed to be launched directly by Claude CLI (see below).

### Java (Quarkus)

Requires Java 21+ and Maven.

```bash
cd java-quarkus
mvn package -DskipTests
```

Start the server:

```bash
java -jar target/quarkus-app/quarkus-run.jar
```

By default it listens on port 8080. To use a different port:

```bash
java -Dquarkus.http.port=8092 -jar target/quarkus-app/quarkus-run.jar
```

The Java version uses HTTP transport (MCP Streamable HTTP) and can be registered with the MCP Gateway.

## 4. Connecting to Claude Code

### Option A: Register directly with Claude CLI (Python)

```bash
claude mcp add emacs -- python /path/to/emacs-mcp-server/python/emacs_mcp_server.py
```

When you start Claude Code, the `emacs` MCP server will be loaded automatically.

### Option B: Register via MCP Gateway (Java — recommended)

Start the Java version of Emacs MCP Server on port 8092:

```bash
java -Dquarkus.http.port=8092 -jar target/quarkus-app/quarkus-run.jar
```

Register it with the MCP Gateway (port 8888):

```bash
curl -X POST http://localhost:8888/api/servers \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "emacs",
    "url": "http://localhost:8092",
    "description": "Emacs MCP Server"
  }'
```

With Gateway registration, every service connected to the Gateway — LLM Console, Workflow Editor, and others — can control Emacs. The Gateway also provides [caller identification](../mcp-gateway#caller-identification-hateoas), so you can see which service sent each request.

### Option C: Register as HTTP server with Claude CLI (Java)

```bash
claude mcp add emacs --transport http --url http://localhost:8092/mcp
```

## 5. Trying It Out

Talk to Claude Code (or LLM Console) and it will control Emacs on your behalf.

### Open a file

```
User: Open the file /home/user/works/MyApp.java at line 42 in Emacs.
Claude: [calls open_file("/home/user/works/MyApp.java", 42)]
        Opened /home/user/works/MyApp.java at line 42
```

Your Emacs window will display `MyApp.java` with the cursor at line 42.

### Evaluate Emacs Lisp

```
User: What's the current Emacs version?
Claude: [calls eval_elisp("emacs-version")]
        "29.3"
```

### List open buffers

```
User: What files do I have open in Emacs?
Claude: [calls list_buffers()]
        *scratch*
        *Messages*
        MyApp.java
        README.md
```

### Jump to a symbol definition

```
User: Go to the definition of "ActorSystem" in Emacs.
Claude: [calls goto_definition("ActorSystem")]
        Searching...
```

Emacs will invoke xref and jump to the definition.

### Save a buffer

```
User: Save MyApp.java in Emacs.
Claude: [calls save_buffer("/home/user/works/MyApp.java")]
        Saved
```

## 6. Practical Usage Patterns

The real power of Emacs MCP Server is that Claude can open files in your editor while working on code. Instead of switching windows and searching for files manually, you can say:

```
User: Fix this bug, then open the file in Emacs so I can review your changes.
Claude: [edits the file]
        [calls open_file("/home/user/works/BuggyClass.java", 73)]
        Fixed. Opened the file in Emacs at the changed line.
```

During code review, Claude can open each file it references so you can follow along in your editor in real time.

## 7. Integration with MCP Gateway

When the Java version is registered with the MCP Gateway, the architecture looks like this:

```
Claude Code / LLM Console / Workflow Editor
        │  MCP
        ▼
quarkus-mcp-gateway  (:8888)
  ├── /mcp/emacs              →  emacs-mcp-server    (:8092)
  ├── /mcp/workflow-editor    →  workflow-editor      (:8091)
  └── /mcp/llm-console-claude →  llm-console         (:8090)
```

In this setup, a workflow running in the Workflow Editor can open files in Emacs as part of its execution — for example, writing results to a file and then opening it in your editor automatically.

The Gateway's [caller identification](../mcp-gateway#caller-identification-hateoas) feature lets the Emacs MCP Server know which service triggered each request. If you check the Emacs MCP Server logs, you can see entries like:

```
[MCP from workflow-editor (http://localhost:8091)] open_file("/tmp/results.txt", 1)
```

## Next Steps

- [Emacs MCP Server Reference](./index.md) — tool list and implementation details
- [MCP Gateway](../mcp-gateway) — registration, caller identification, and session metadata
- [LLM Console (Claude)](../llm-console-claude) — browser-based Claude UI
