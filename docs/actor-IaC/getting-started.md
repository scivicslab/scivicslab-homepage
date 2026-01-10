---
sidebar_position: 2
title: Getting Started
---

# Getting Started

This guide walks you through setting up actor-IaC and running your first workflow. By the end, you will have executed a simple workflow that collects system information from your local machine.

## Prerequisites

actor-IaC requires Java 21 or later because it uses virtual threads for efficient concurrent execution. You can verify your Java version with the following command:

```bash
java --version
```

The output should show version 21 or higher. If you need to install or update Java, download it from [Adoptium](https://adoptium.net/) or use your system's package manager.

## Installation

actor-IaC is distributed as a single-file Java program that can be executed directly using JBang or the Java source launcher.

### Option 1: Direct Execution

Download `actor_iac.java` and make it executable:

```bash
chmod +x actor_iac.java
./actor_iac.java --version
```

### Option 2: Using JBang

If you have JBang installed, you can run actor-IaC directly:

```bash
jbang actor_iac.java --version
```

## Project Structure

A typical actor-IaC project has the following structure:

```
my-project/
├── actor_iac.java          # The CLI tool
├── inventory.ini           # Ansible-compatible inventory file
└── workflows/
    ├── collect-info.yaml   # A workflow definition
    └── deploy.yaml         # Another workflow definition
```

## Creating Your First Workflow

Let's create a simple workflow that prints a message and collects basic system information.

### Step 1: Create the Workflow Directory

```bash
mkdir -p workflows
```

### Step 2: Write a Workflow Definition

Create `workflows/hello-world.yaml` with the following content:

```yaml
name: hello-world
description: A simple workflow that demonstrates basic actor-IaC functionality.

steps:
  # First step: print a welcome message
  - states: ["0", "1"]
    vertexName: welcome
    description: Print a welcome message to the console.
    actions:
      - actor: this
        method: print
        arguments: "Hello from actor-IaC!"

  # Second step: run a shell command to get the hostname
  - states: ["1", "2"]
    vertexName: get-hostname
    description: Execute the hostname command and capture the output.
    actions:
      - actor: this
        method: shell
        arguments: ["hostname"]

  # Final step: print completion message
  - states: ["2", "end"]
    vertexName: done
    description: Print a completion message.
    actions:
      - actor: this
        method: print
        arguments: "Workflow completed successfully!"
```

This workflow defines three steps that execute in sequence. The `states` field specifies the source and target states for each transition, and the `actions` field defines what to do during that transition.

### Step 3: List Available Workflows

Before running, you can verify that actor-IaC discovers your workflow:

```bash
./actor_iac.java list -d ./workflows
```

This command scans the `workflows` directory recursively and displays all discovered workflow files along with their names as defined in the YAML.

### Step 4: Run the Workflow

Execute the workflow with the `run` command:

```bash
./actor_iac.java run -d ./workflows -w hello-world
```

You should see output similar to:

```
Logging to: actor-iac-202601111030.log
Log database: ./workflows/actor-iac-logs.mv.db (embedded mode)
Scanning workflow directory: /home/user/my-project/workflows
Loading workflow: /home/user/my-project/workflows/hello-world.yaml
Starting workflow execution...
--------------------------------------------------
Hello from actor-IaC!
Workflow completed successfully!
--------------------------------------------------
Workflow completed successfully: end
```

### Step 5: View the Logs

actor-IaC automatically creates a log database. You can query it with the `log-search` command:

```bash
./actor_iac.java log-search --db ./workflows/actor-iac-logs --list
```

This shows all workflow execution sessions. To see the logs for the most recent session:

```bash
./actor_iac.java log-search --db ./workflows/actor-iac-logs --summary
```

## Working with Remote Nodes

To execute workflows on remote servers, you need an inventory file that lists the target hosts.

### Creating an Inventory File

Create `inventory.ini` with your target hosts:

```ini
[webservers]
192.168.1.10 ansible_user=deploy
192.168.1.11 ansible_user=deploy

[databases]
192.168.1.20 ansible_user=admin

[all:vars]
ansible_ssh_common_args='-o StrictHostKeyChecking=no'
```

The inventory file uses Ansible's INI format. Hosts are organized into groups (in brackets), and you can specify per-host or per-group variables.

### Running a Workflow on Remote Nodes

To execute a workflow on all hosts in a specific group:

```bash
./actor_iac.java run -d ./workflows -w collect-info -i inventory.ini -g webservers
```

The `-i` flag specifies the inventory file, and `-g` specifies which host group to target. If you omit `-g`, the workflow runs against all hosts.

### SSH Authentication

By default, actor-IaC uses your SSH agent for authentication. Make sure your SSH key is loaded:

```bash
ssh-add -l
```

If you need to use password authentication instead, add the `-k` or `--ask-pass` flag:

```bash
./actor_iac.java run -d ./workflows -w deploy -i inventory.ini -g webservers -k
```

This will prompt you for the SSH password before starting the workflow.

## Verbose Mode

For troubleshooting or understanding workflow execution, enable verbose mode with the `-v` flag:

```bash
./actor_iac.java run -d ./workflows -w hello-world -v
```

Verbose mode increases the log level to FINE, showing detailed information about each step execution, actor invocations, and state transitions.

## Next Steps

Now that you have run your first workflow, explore these topics:

- [Architecture](./architecture) - Understand how actor-IaC works internally
- [Commands](./commands/) - Reference for all CLI commands
- [Workflow Overlay](/docs/pojo-actor/workflow-framework/workflow-overlay) - Learn how to customize workflows for different environments
