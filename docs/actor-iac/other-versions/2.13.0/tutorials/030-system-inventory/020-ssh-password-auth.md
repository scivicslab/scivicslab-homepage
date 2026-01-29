---
id: ssh-password-auth
title: SSH Connection with Password Authentication
sidebar_position: 20
---

:::caution Newer Version Available
This is documentation for version 2.13.0. [See the latest version](/docs/actor-iac/introduction).
:::

## Problem Definition

**Goal:** Enable SSH connection from actor-IaC to remote nodes using password authentication.

actor-IaC supports two SSH authentication methods: public key authentication and password authentication. Password authentication is a method that can be used without setting up SSH key pairs. While public key authentication is recommended, password authentication can be used in environments where key setup is not complete or when temporary connections are needed.


## How to do it

### 1. Install the sshpass package

To use password authentication, you need to install the `sshpass` package on the operator terminal. `sshpass` is a utility for passing SSH passwords non-interactively.

On Ubuntu/Debian, you can install it with the following command.

```bash
sudo apt install sshpass
```

### 2. Execute the workflow with the --ask-pass option

When you specify the `--ask-pass` option when running actor-IaC, actor-IaC prompts for password input only once at startup. The entered password is used for SSH connections to all nodes defined in the inventory.

The following command is an example of executing a workflow with the `--ask-pass` option.

```bash
./actor_iac.java run -w sysinfo/main-collect-sysinfo.yaml -i inventory.ini -g compute --ask-pass
```

When you execute the command, actor-IaC displays a prompt requesting password input. After entering the password, workflow execution begins.


## Under the hood

### Current Implementation Constraints

The current implementation uses the same password for all nodes. You cannot specify different passwords for each node.

Also, the password is held in the actor-IaC process memory and used when connecting to each node.

### Future Improvement Direction

This functionality may be improved in the future through integration with secret management systems such as HashiCorp Vault. Using a secret management system allows you to securely manage different authentication credentials for each node and retrieve them only when needed.
