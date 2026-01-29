---
id: ssh-setup
title: SSH Connection with Public Key Authentication
sidebar_position: 1
---

## Problem Definition

**Goal:** Enable SSH connection from actor-IaC to remote nodes using public key authentication.

actor-IaC supports two SSH authentication methods: public key authentication and password authentication. Public key authentication uses SSH key pairs and is recommended from security and convenience perspectives. This tutorial explains how to configure public key authentication.

For network configuration, refer to the "Network Configuration Prerequisites" in the parent document ([Collecting Cluster System Information](./)).


## How to do it

There are two aspects to consider when setting up public key authentication:

1. **Network location**: The connection method differs depending on whether the operation terminal is inside or outside the cluster
2. **Passphrase**: Additional configuration is required depending on whether the private key has a passphrase

### 1. ~/.ssh/config Settings (Connection Method Based on Network Location)

The connection method to compute nodes differs based on the operation terminal's location. When the operation terminal is inside the cluster, you can SSH directly to each node. When the operation terminal is outside the cluster, you need to SSH to each node via a gateway, using SSH's ProxyJump feature.

actor-IaC reads the `~/.ssh/config` file from the operation terminal and automatically uses the connection settings. Users should add one of the following configurations to `~/.ssh/config` based on their terminal's location.

#### When Operation Terminal is Inside the Cluster (Direct Connection)

When the operation terminal is inside the cluster, you can SSH directly to each compute node. Add the following to `~/.ssh/config`:

```
Host 192.168.5.*
    User youruser
    IdentityFile ~/.ssh/id_ed25519_cluster
```

With this setting, SSH connections to hosts matching `192.168.5.*` will use the username `youruser` and key file `~/.ssh/id_ed25519_cluster`.

#### When Operation Terminal is Outside the Cluster (Via Gateway)

When the operation terminal is outside the cluster, you access each compute node via a gateway. Using SSH's ProxyJump feature, you can connect to the gateway and compute node with a single command. Add the following to `~/.ssh/config`:

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

This configuration first defines the connection to the gateway using the host alias `gateway`. Then, it adds the `ProxyJump gateway` directive to connections to `192.168.5.*`. This causes the SSH client to first connect to the gateway, then connect to the target node from there, performing a multi-hop connection.


### 2. Registering Keys with ssh-agent (Based on Passphrase Presence)

Additional configuration is required depending on whether the private key has a passphrase.

#### Keys Without Passphrase

If the private key has no passphrase, only the `~/.ssh/config` configuration is needed. actor-IaC automatically reads and uses the key file specified in `~/.ssh/config`.

#### Keys With Passphrase

If the private key has a passphrase, you need to register the private key with ssh-agent in addition to the `~/.ssh/config` configuration. ssh-agent is a daemon process that keeps the passphrase entered by the user in memory. When you register a private key with ssh-agent, actor-IaC can use the private key through ssh-agent, and you won't be prompted for the passphrase during workflow execution.

Run the following commands on the operation terminal to start ssh-agent and register the private key. You'll be prompted to enter the passphrase when running `ssh-add`:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_cluster
```

:::note
**Ed25519 keys require ssh-agent registration.** Regardless of passphrase presence, Ed25519 format private keys must be registered with ssh-agent. See the Under the hood section for the reason.
:::


### Troubleshooting

#### Isolating SSH Connection Issues

When SSH connection errors occur during actor-IaC execution, first test the connection to the remote node directly with the ssh command, without using actor-IaC. If the following command succeeds, the SSH settings are correct, and the problem may be actor-IaC specific. If it fails, there's an issue with the SSH settings themselves:

```bash
ssh -o BatchMode=yes youruser@192.168.5.13 "echo OK"
```

#### Error-Specific Solutions

Here are the main errors that occur during actor-IaC execution and their solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `Connection refused` | SSH server not running | Run `sudo systemctl start sshd` on remote |
| `Permission denied` | SSH authentication failed | Check key registration with `ssh-add -l`, register if not found |


## Under the hood

### How actor-IaC Reads ~/.ssh/config

actor-IaC uses the JSch (Java Secure Channel) library for SSH connections. JSch parses the `~/.ssh/config` file and automatically applies host-specific connection settings (username, key file path, ProxyJump, etc.). As long as users write their settings in `~/.ssh/config`, they don't need to specify connection settings individually in the actor-IaC inventory file or command line.

### Why Ed25519 Keys Require ssh-agent Registration

JSch doesn't support directly reading Ed25519 format private key files. JSch can directly read RSA and DSA format key files, but doesn't support Ed25519 format. Therefore, when using Ed25519 keys, you must register them with ssh-agent and use them through ssh-agent.

### About BatchMode

The `ssh -o BatchMode=yes` option used in troubleshooting instructs the ssh command to disable interactive password input. actor-IaC internally performs SSH connections in a mode equivalent to BatchMode. Therefore, if you can't connect with this option on the ssh command, actor-IaC also won't be able to connect. Connection testing with BatchMode accurately simulates actor-IaC's operating environment.
