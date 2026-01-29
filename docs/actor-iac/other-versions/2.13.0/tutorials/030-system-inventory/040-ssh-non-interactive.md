---
id: ssh-non-interactive
title: SSH Authentication from Non-Interactive Shells (Claude Code CLI)
sidebar_position: 40
---

:::caution Newer Version Available
This is documentation for version 2.13.0. [See the latest version](/docs/actor-iac/introduction).
:::

# SSH Authentication from Non-Interactive Shells

## Problem Definition

**Goal:** When executing actor-IaC workflows from Claude Code, the internal process runs SSH authentication required by actor-IaC workflows using SSH keys with or without passphrases from a non-interactive shell. Enable this SSH authentication.

In non-interactive shells, passphrase input prompts cannot be displayed, so a method to programmatically pass the passphrase is needed.

### What to Achieve

1. SSH authentication succeeds from non-interactive shells
2. actor-IaC workflows can be executed against remote nodes from Claude Code

---

## How to do it

### Prerequisites

SSH keys must already be created, and the key file to use for the target host must be specified in `~/.ssh/config`. Check the key file path by reading `~/.ssh/config`.


### Procedure (1): Without Passphrase

If the key does not have a passphrase set, no special handling is needed, and you can execute commands normally.

```bash
./actor_iac.java run -w <workflow> -i <inventory> -g <group>
```

#### Execution Example

When executing the sysinfo workflow on the w206 internal network:

```bash
cd ~/proj-POJO-actor/actor-IaC-examples && ./actor_iac.java run -w ./sysinfo/main-collect-and-analyze.yaml -i inventory.ini -g compute
```


### Procedure (2): With Passphrase

Execute the following one-liner.

| Placeholder | Description |
|-------------|-------------|
| `<passphrase>` | Passphrase of the SSH key |
| `<key-file>` | Path to the SSH key (e.g., `~/.ssh/id_ed25519_xxx`) |
| `<command-to-execute>` | Workflow execution command, etc. |

```bash
eval $(ssh-agent -s) && SSH_ASKPASS_REQUIRE=force SSH_ASKPASS="echo <passphrase>" ssh-add <key-file> && <command-to-execute>
```

#### Execution Example

When executing the sysinfo workflow on the w206 internal network:

```bash
eval $(ssh-agent -s) && SSH_ASKPASS_REQUIRE=force SSH_ASKPASS="echo <passphrase>" ssh-add ~/.ssh/id_ed25519_youruser_w206 && cd ~/proj-POJO-actor/actor-IaC-examples && ./actor_iac.java run -w ./sysinfo/main-collect-and-analyze.yaml -i inventory.ini -g compute
```

---

## Under the hood

Role of each command

| Part | Description |
|------|-------------|
| `eval $(ssh-agent -s)` | Start ssh-agent and set environment variables (`SSH_AUTH_SOCK`, etc.) in the current shell |
| `SSH_ASKPASS_REQUIRE=force` | Force use of `SSH_ASKPASS` even when not interactive |
| `SSH_ASKPASS="echo <passphrase>"` | Specify a command that returns the passphrase to standard output |
| `ssh-add <key-file>` | Register the specified key with ssh-agent |
| `<command-to-execute>` | Execution of workflow, etc. |

By connecting everything with `&&`, the `SSH_AUTH_SOCK` environment variable is inherited within the same shell session. If commands are executed separately, the environment variable is lost and connection to ssh-agent becomes impossible.
