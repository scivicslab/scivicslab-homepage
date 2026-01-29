---
id: sudo-execution
title: Configuring sudo Execution
sidebar_position: 30
---

:::caution Newer Version Available
This is documentation for version 2.13.0. [See the latest version](/docs/actor-iac/introduction).
:::

## Problem Definition

**Goal:** Enable execution of commands requiring root privileges within actor-IaC workflows.

In cluster management, operations requiring root privileges, such as package installation and system configuration changes, occur frequently. actor-IaC provides the functionality to execute sudo commands on remote nodes through the `executeSudoCommand` method.


## How to do it

### 1. Set the sudo password in an environment variable

Before running actor-IaC, set the environment variable `SUDO_PASSWORD` in the shell on the operator terminal. The actor-IaC process reads this environment variable at startup and uses it as the sudo password when executing the `executeSudoCommand` method.

```bash
export SUDO_PASSWORD="your-sudo-password"
```

### 2. Use the `executeSudoCommand` method in workflows

In workflow YAML files, use the `executeSudoCommand` method instead of the normal `executeCommand` method. The following example executes the `apt update && apt upgrade -y` command with sudo privileges.

```yaml
steps:
  - states: ["0", "end"]
    actions:
      - actor: this
        method: executeSudoCommand
        arguments:
          - "apt update && apt upgrade -y"
```

The command string passed to the `executeSudoCommand` method does not need to include the `sudo` prefix. The method automatically executes with sudo.

### 3. Execute the workflow

Execute actor-IaC as normal with the environment variable `SUDO_PASSWORD` set.

```bash
./actor_iac.java run -w sysinfo/main-collect-sysinfo.yaml -i inventory.ini -g compute
```


## Troubleshooting

### `SUDO_PASSWORD environment variable is not set` error

If you run actor-IaC without setting the environment variable `SUDO_PASSWORD` and the workflow calls the `executeSudoCommand` method, actor-IaC outputs this error message and aborts processing. Set the environment variable in the shell on the operator terminal before running actor-IaC.

```bash
export SUDO_PASSWORD="your-sudo-password"
```


## Under the hood

### Current Implementation Constraints

In the current implementation, the sudo password is passed in plaintext through an environment variable. This method has security constraints.

- Environment variables may be viewable from process listings
- The password may remain in shell history
- Different sudo passwords cannot be used for multiple nodes

### Future Improvement Direction

This functionality may be improved in the future through integration with secret management systems such as HashiCorp Vault. Using a secret management system allows you to securely store passwords and retrieve them only when needed.
