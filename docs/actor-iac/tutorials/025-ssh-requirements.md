---
id: ssh-requirements
title: SSH Connection with Public Key Authentication
sidebar_position: 25
---

## Problem Definition

**Goal:** Enable SSH connection from actor-IaC to remote nodes using public key authentication.

actor-IaC supports two SSH authentication methods: public key authentication and password authentication. Public key authentication uses SSH key pairs and is recommended for security and convenience. This tutorial explains how to configure public key authentication.


## How to do it

There are two aspects to configuring public key authentication.

1. **Network location**: The connection method differs depending on whether the operator terminal is inside or outside the cluster
2. **Passphrase**: Additional configuration is required depending on whether the private key has a passphrase

### 1. ~/.ssh/config Configuration (Connection Method Based on Network Location)

The connection method to compute nodes differs depending on the location of the operator terminal. If the operator terminal is inside the cluster, you can SSH directly to each node. If the operator terminal is outside the cluster, you need to SSH to each node via a gateway, using SSH's ProxyJump feature.

actor-IaC reads the `~/.ssh/config` file on the operator terminal and automatically uses the connection settings. Depending on the location of the operator terminal, write one of the following configurations in `~/.ssh/config`.

#### When Operator Terminal is Inside the Cluster (Direct Connection)

If the operator terminal is inside the cluster, you can SSH directly to each compute node. Write the following content in `~/.ssh/config`.

```
Host 192.168.5.*
    User youruser
    IdentityFile ~/.ssh/id_ed25519_cluster
```

With this configuration, SSH connections to hosts matching `192.168.5.*` will use the username `youruser` and key file `~/.ssh/id_ed25519_cluster`.

#### When Operator Terminal is Outside the Cluster (Via Gateway)

If the operator terminal is outside the cluster, you access each compute node via a gateway. Using SSH's ProxyJump feature, you can perform the connection to the gateway and the connection to the compute node in a single command. Write the following content in `~/.ssh/config`.

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

In this configuration, first define the connection to the gateway using the host alias `gateway`. Then add the `ProxyJump gateway` directive to connections to `192.168.5.*`. This causes the SSH client to first connect to the gateway when connecting to `192.168.5.*`, then perform a multi-hop connection from there to the target node.


### 2. Registering Keys with ssh-agent (Configuration Based on Passphrase Presence)

Additional configuration is required depending on whether a passphrase is set on the private key.

#### Keys Without Passphrase

If no passphrase is set on the private key, the `~/.ssh/config` configuration is sufficient. actor-IaC automatically reads and uses the key file specified in `~/.ssh/config`.

#### Keys With Passphrase

If a passphrase is set on the private key, in addition to the `~/.ssh/config` configuration, you need to register the private key with ssh-agent. ssh-agent is a daemon process that keeps the passphrase entered by the user in memory. By registering the private key with ssh-agent, actor-IaC can use the private key through ssh-agent, eliminating passphrase prompts during workflow execution.

Execute the following commands on the operator terminal to start ssh-agent and register the private key. When executing the `ssh-add` command, you will be prompted to enter the passphrase.

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_cluster
```

:::note
**Ed25519 keys require ssh-agent registration.** Regardless of passphrase presence, Ed25519 format private keys must be registered with ssh-agent. See the Under the hood section for the reason.
:::


### Troubleshooting

#### Isolating SSH Connection Problems

If SSH connection errors occur when running actor-IaC, first test the connection to the remote node directly with the ssh command without going through actor-IaC. If the following command succeeds, the SSH configuration is correct and the problem may be actor-IaC specific. If it fails, there is a problem with the SSH configuration itself.

```bash
ssh -o BatchMode=yes youruser@192.168.5.13 "echo OK"
```

#### Error-Specific Remedies

The following shows main errors that occur when running actor-IaC and their remedies.

| Error | Cause | Remedy |
|-------|-------|--------|
| `Connection refused` | SSH server not running | Execute `sudo systemctl start sshd` on remote |
| `Permission denied` | SSH authentication failed | Check key registration with `ssh-add -l`, register with `ssh-add` if not registered |


## Under the hood

### How actor-IaC Reads ~/.ssh/config

actor-IaC uses the JSch (Java Secure Channel) library for SSH connections. JSch parses the `~/.ssh/config` file and automatically applies host-specific connection settings (username, key file path, ProxyJump, etc.). If you write the settings in `~/.ssh/config`, you don't need to specify connection settings individually in actor-IaC inventory files or command line.

### Why Ed25519 Keys Require ssh-agent Registration

JSch does not support the ability to directly read Ed25519 format private key files. JSch can directly read RSA and DSA format key files, but does not support Ed25519 format. Therefore, when using Ed25519 keys, you need to register them with ssh-agent and use the keys through ssh-agent.

### About BatchMode

The `ssh -o BatchMode=yes` option used in troubleshooting instructs the ssh command to disable interactive password input. actor-IaC internally performs SSH connections in a mode equivalent to BatchMode. Therefore, if you cannot connect with the ssh command using this option, actor-IaC also cannot connect. Connection testing with BatchMode accurately simulates the actor-IaC operating environment.
