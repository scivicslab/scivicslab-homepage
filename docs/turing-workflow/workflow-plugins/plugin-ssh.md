---
id: PluginSsh_260403_oo01
sidebar_position: 10
title: "plugin-ssh: SSH Connection and Command Execution"
description: "A plugin providing JSch-based SSH connection management, remote/local command execution, session reuse, ProxyJump support, and sudo execution."
keywords:
  - SSH
  - JSch
  - remote execution
  - ProxyJump
  - sudo
  - virtual threads
---

# plugin-ssh

A plugin that provides SSH connection management and remote/local command execution. It uses the JSch library and features session reuse, ProxyJump support, and `~/.ssh/config` parsing.

## 3-Level Architecture

| Level | Class | Role |
|---|---|---|
| POJO | `Node` | Core SSH connection and command execution |
| Actor | `NodeActor` | Callable from workflows via `@Action` methods |
| Interpreter | `NodeInterpreter` | Integration with the workflow state machine |

## `Node` Class (POJO)

`Node` is the core class for SSH connections and command execution. It is designed as a pure Java class with no framework dependencies.

### Constructors

```java
// Basic (port 22, SSH connection mode)
Node node = new Node("192.168.1.10", "admin");

// With port specification
Node node = new Node("192.168.1.10", "admin", 2222);

// Local mode (local execution without SSH)
Node node = new Node("localhost", "user", 22, true);

// Password authentication
Node node = new Node("192.168.1.10", "admin", 22, false, "password");
```

### Command Execution

```java
// Basic execution
Node.CommandResult result = node.executeCommand("ls -la");
System.out.println(result.getStdout());
System.out.println("Exit code: " + result.getExitCode());
System.out.println("Success: " + result.isSuccess());

// With real-time streaming
Node.CommandResult result = node.executeCommand("tail -f /var/log/syslog",
    new Node.OutputCallback() {
        @Override
        public void onStdout(String line) { System.out.println("[OUT] " + line); }
        @Override
        public void onStderr(String line) { System.err.println("[ERR] " + line); }
    });

// Sudo execution (requires SUDO_PASSWORD environment variable)
Node.CommandResult result = node.executeSudoCommand("systemctl restart nginx");
```

### Resource Management

```java
// Cleanup after use (disconnects cached SSH sessions)
node.cleanup();
```

## SSH Connection Mechanism

### Session Reuse

`Node` caches SSH sessions and reuses them across multiple command executions. Channels are created and destroyed per command, but the TCP session is maintained.

```
Node
  └── cachedSession (SSH Session - reused)
        ├── ChannelExec (command 1 - disposable)
        ├── ChannelExec (command 2 - disposable)
        └── ...
```

Sessions are automatically recreated if disconnected. `getOrCreateSession()` is thread-safe (`synchronized`).

### Authentication Priority

1. **ssh-agent** - Connects to a running ssh-agent via `SSH_AUTH_SOCK`
2. **`~/.ssh/config` `IdentityFile`** - Retrieves key path from the config file
3. **Default key files** - Falls back in order: `~/.ssh/id_ed25519` > `~/.ssh/id_rsa` > `~/.ssh/id_ecdsa`
4. **Password authentication** - If specified in the constructor

### `~/.ssh/config` Support

`Node` parses `~/.ssh/config` and respects the following settings:

- `Hostname` - Overrides the actual connection hostname/IP
- `User` - Overrides the SSH username
- `Port` - Overrides the port number
- `IdentityFile` - Key file path
- `ProxyJump` - Connection via jump host

The config file is parsed only once on first access and cached thereafter.

### Host Key Verification

- If `~/.ssh/known_hosts` exists: `StrictHostKeyChecking=yes` (rejects unknown hosts)
- If `~/.ssh/known_hosts` does not exist: `StrictHostKeyChecking=accept-new` (records on first connection)

### ProxyJump Support

When `ProxyJump` is configured in `~/.ssh/config`, a port-forwarding tunnel via the jump host is automatically established.

```
[Local] → [Jump Host (SSH Session)] → Port Forward → [Target Host (SSH Session)]
```

## Sudo Execution

`executeSudoCommand()` retrieves the password from the `SUDO_PASSWORD` environment variable and writes it to stdin of `sudo -S`.

- **Remote mode**: Sends password via `ChannelExec`'s `OutputStream`
- **Local mode**: Sends via `ProcessBuilder`'s `Process.getOutputStream()`

Since the password is not included in the shell command string, it is not exposed in `/proc/<pid>/cmdline`.

## `NodeActor` `@Action` Methods

A list of actions callable from workflow YAML.

### Workflow Control

| Action | Arguments | Description |
|---|---|---|
| `readYaml` | `["path/to/workflow.yaml"]` | Load a YAML workflow file |
| `readJson` | `["path/to/workflow.json"]` | Load a JSON workflow |
| `readXml` | `["path/to/workflow.xml"]` | Load an XML workflow |
| `execCode` | none | Execute the current step's code |
| `runUntilEnd` | `[maxIterations]` (optional) | Run workflow to completion |
| `runWorkflow` | `["workflow.yaml", maxIterations]` | Load and execute in one call |
| `call` | `["sub-workflow.yaml"]` | Call a sub-workflow |
| `reset` | none | Reset interpreter state |
| `apply` | none | Apply state to the interpreter |

### Command Execution

| Action | Arguments | Description |
|---|---|---|
| `executeCommand` | `["ls -la"]` | Execute command (sends result to `outputMultiplexer`) |
| `executeCommandQuiet` | `["ls -la"]` | Execute command (no output sent) |
| `executeSudoCommand` | `["systemctl restart nginx"]` | Execute command with sudo |
| `executeSudoCommandQuiet` | `["systemctl restart nginx"]` | Execute with sudo (no output sent) |

### Document Change Detection

| Action | Arguments | Description |
|---|---|---|
| `detectDocumentChanges` | `["doc-list.txt"]` | Detect document changes via Git diff |
| `cloneChangedDocuments` | `["doc-list.txt"]` | Clone changed documents |
| `buildChangedDocuments` | `["doc-list.txt"]` | Run `yarn install && yarn build` |
| `deployChangedDocuments` | `["doc-list.txt"]` | Copy to `~/public_html` |

### Miscellaneous

| Action | Arguments | Description |
|---|---|---|
| `sleep` | `[milliseconds]` | Sleep for specified milliseconds |
| `print` | `["message"]` | Display message to stdout |
| `printJson` | none | Send state as JSON to `outputMultiplexer` |
| `printYaml` | none | Send state as YAML to `outputMultiplexer` |
| `doNothing` | any | Do nothing (returns arguments unchanged) |

## Utility Classes

### `ActorHelper`

Provides static utility methods shared by `NodeActor` and `NodeGroupActor`.

| Method | Description |
|---|---|
| `sendToMultiplexer(system, sourceName, formatted)` | Send message to `outputMultiplexer` |
| `parseMaxIterations(arg, defaultValue)` | Parse max iterations from argument |
| `getFirst(args)` | Get first element of JSON array (lenient) |
| `extractCommandFromArgs(arg)` | Get first element of JSON array (strict) |
| `combineOutput(result)` | Combine stdout and stderr |
| `extractRootCauseMessage(e)` | Get root cause of `ExecutionException` |

### `CommandExecutor` Interface

An abstract interface for command execution.

| Implementation | Description |
|---|---|
| `SshCommandExecutor` | Delegates to `Node` for execution via SSH |
| `LocalCommandExecutor` | Local execution via `ProcessBuilder` (timeout: 5 minutes) |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUDO_PASSWORD` | For sudo execution | Sudo password |
| `FORCE_FULL_BUILD` | Optional | Set to `true` to treat all documents as changed |

## Dependencies

- `com.github.mwiede:jsch:0.2.16` - SSH2 client
- `net.i2p.crypto:eddsa:0.3.0` - Ed25519 key support
- `com.kohlschutter.junixsocket:junixsocket-core:2.9.1` - Unix socket for ssh-agent
- `org.json:json:20231013` - JSON parsing
- `plugin-log-output` (provided)
