---
id: ssh-setup
sidebar_position: 2
title: "SSH Connection Setup"
description: "How to configure SSH connections from Turing-workflow to remote nodes. Covers public key authentication, ProxyJump, ssh-agent, and Ed25519 key considerations."
keywords:
  - Turing-workflow
  - SSH
  - public key authentication
  - ProxyJump
  - ssh-agent
  - Ed25519
  - JSch
---

# SSH Connection Setup

## Problem Definition

Configure Turing-workflow to connect to remote nodes via SSH using public key authentication. Turing-workflow supports two SSH authentication methods: public key authentication and password authentication. Public key authentication uses SSH key pairs and is recommended for security and convenience.

There are two configuration considerations.

1. **Network location**: The connection method differs depending on whether the workstation is inside or outside the cluster
2. **Passphrase**: Additional configuration is required depending on whether the private key has a passphrase

## How to do it

### 1. ~/.ssh/config Configuration (Connection Method Based on Network Location)

The connection method to compute nodes differs based on the workstation's location. Turing-workflow reads the `~/.ssh/config` file on the workstation and automatically uses the connection settings. Users should write one of the following configurations in `~/.ssh/config` based on the workstation's location.

#### When the Workstation is Inside the Cluster (Direct Connection)

When the workstation is inside the cluster, you can connect directly to each compute node via SSH. Add the following content to `~/.ssh/config`.

```
Host 192.168.5.*
    User youruser
    IdentityFile ~/.ssh/id_ed25519_cluster
```

For SSH connections to hosts matching `192.168.5.*`, the username `youruser` and key file `~/.ssh/id_ed25519_cluster` are used.

#### When the Workstation is Outside the Cluster (Via ProxyJump)

When the workstation is outside the cluster, access compute nodes through a gateway. Using SSH's ProxyJump feature, you can connect to the gateway and compute nodes with a single command. Add the following content to `~/.ssh/config`.

```
Host gateway
    HostName 192.168.5.1
    User youruser
    IdentityFile ~/.ssh/id_ed25519_cluster

Host 192.168.5.*
    User youruser
    IdentityFile ~/.ssh/id_ed25519_cluster
    ProxyJump gateway
```

Define the gateway connection using the host alias `gateway`. Add the `ProxyJump gateway` directive to connections to `192.168.5.*`. When connecting to `192.168.5.*`, the SSH client first connects to the gateway, then performs a multi-hop connection to the target node from there.

### 2. Registering Keys with ssh-agent (Configuration Based on Passphrase Presence)

Additional configuration is required depending on whether the private key has a passphrase.

#### Keys Without a Passphrase

If the private key does not have a passphrase, only the `~/.ssh/config` configuration is needed. Turing-workflow automatically reads and uses the key file specified in `~/.ssh/config`.

#### Keys With a Passphrase

If the private key has a passphrase, you need to register the private key with ssh-agent in addition to the `~/.ssh/config` configuration. ssh-agent is a daemon process that holds the passphrase entered by the user in memory. By registering the private key with ssh-agent, Turing-workflow can use the private key through ssh-agent, eliminating the need for passphrase input during workflow execution.

Run the following commands on your workstation to start ssh-agent and register the private key. When executing the `ssh-add` command, you will be prompted to enter the passphrase.

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_cluster
```

:::note
**Ed25519 keys require ssh-agent registration.** Regardless of whether they have a passphrase, Ed25519 format private keys must be registered with ssh-agent. See the Under the Hood section for the reason.
:::

### Troubleshooting

#### Isolating SSH Connection Problems

If SSH connection errors occur when running Turing-workflow, first test the connection to the remote node directly with the ssh command without going through Turing-workflow. If the following command succeeds, the SSH configuration is correct and the problem may be specific to Turing-workflow. If it fails, there is an issue with the SSH configuration itself.

```bash
ssh -o BatchMode=yes youruser@192.168.5.13 "echo OK"
```

#### Solutions by Error Type

The following table shows common errors that occur when running Turing-workflow and their solutions.

| Error | Cause | Solution |
|-------|-------|----------|
| `Connection refused` | SSH server is not running | Run `sudo systemctl start sshd` on the remote host |
| `Permission denied` | SSH authentication failed | Check key registration with `ssh-add -l` and register the key with `ssh-add` if not registered |
| `No route to host` | Network unreachable | Check network configuration and firewall |
| `Connection timed out` | Host not responding | Check host status and network route |
| `Auth fail` | JSch could not read the key | For Ed25519 keys, verify registration with ssh-agent using `ssh-add -l` |

## Under the Hood

### How Turing-workflow Reads ~/.ssh/config

Turing-workflow uses the JSch (Java Secure Channel) library for SSH connections. JSch parses the `~/.ssh/config` file and automatically applies host-specific connection settings (username, key file path, ProxyJump, etc.). If users configure settings in `~/.ssh/config`, there is no need to specify connection settings individually in Turing-workflow inventory files or command-line arguments.

### Why Ed25519 Keys Require ssh-agent Registration

JSch does not support directly reading Ed25519 format private key files. While JSch can directly read RSA and DSA format key files, it does not support the Ed25519 format. When using Ed25519 keys, you must register the key with ssh-agent and use the key through ssh-agent.

### About BatchMode

The `ssh -o BatchMode=yes` option used in troubleshooting instructs the ssh command to disable interactive password input. Turing-workflow internally performs SSH connections in a mode equivalent to BatchMode. Testing connections with BatchMode accurately simulates Turing-workflow's operating environment. If you cannot connect with the ssh command using BatchMode, Turing-workflow also cannot connect.
