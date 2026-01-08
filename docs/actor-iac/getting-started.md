---
sidebar_position: 2
title: Getting Started
---

# Getting Started with actor-IaC

This guide will help you set up actor-IaC and create your first infrastructure workflow.

## Prerequisites

- Java 21 or later
- Maven (for building from source)

## Installation

### Download Release

Download the latest release JAR from [GitHub Releases](https://github.com/scivicslab/actor-IaC/releases).

### Build from Source

```bash
git clone https://github.com/scivicslab/actor-IaC.git
cd actor-IaC
mvn clean package
```

The JAR will be available at `target/actor-IaC-<version>.jar`.

## Creating Your First Workflow

### Step 1: Create a Workflow Directory

```bash
mkdir my-workflow
cd my-workflow
```

### Step 2: Create the Main Workflow

Create `main-workflow.yaml`:

```yaml
name: MyFirstWorkflow

steps:
  # Initialize accumulator for collecting results
  - states: ["0", "1"]
    vertexName: create-accumulator
    actions:
      - actor: nodeGroup
        method: createAccumulator
        arguments:
          - streaming

  # Create node actors
  - states: ["1", "2"]
    vertexName: create-nodes
    actions:
      - actor: nodeGroup
        method: createNodeActors
        arguments:
          - local

  # Run sub-workflow on all nodes
  - states: ["2", "3"]
    vertexName: run-workflow
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runWorkflow
          arguments: ["setup.yaml"]

  # Get results
  - states: ["3", "end"]
    vertexName: get-results
    actions:
      - actor: nodeGroup
        method: getAccumulatorSummary
```

### Step 3: Create the Sub-workflow

Create `setup.yaml`:

```yaml
name: SetupWorkflow

steps:
  - states: ["0", "1"]
    vertexName: check-system
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - "uname -a"

  - states: ["1", "2"]
    vertexName: check-disk
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - "df -h"

  - states: ["2", "end"]
    vertexName: check-memory
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - "free -m"
```

### Step 4: Execute the Workflow

```bash
java -jar actor-IaC.jar workflow -w main-workflow.yaml
```

## CLI Commands

### List Available Workflows

```bash
java -jar actor-IaC.jar workflow --list
```

### Execute with Database Logging

```bash
java -jar actor-IaC.jar workflow -w main-workflow.yaml --db ./logs
```

### Query Logs

```bash
# Show session summary
java -jar actor-IaC.jar logs --db ./logs --summary

# Show logs for specific node
java -jar actor-IaC.jar logs --db ./logs --node node-localhost

# Show only error logs
java -jar actor-IaC.jar logs --db ./logs --level ERROR
```

## Working with Remote Nodes

### Define Node List

Create `nodes.txt`:

```
192.168.1.10
192.168.1.11
192.168.1.12
```

### Create Node Actors from File

```yaml
steps:
  - states: ["0", "1"]
    actions:
      - actor: nodeGroup
        method: createNodeActorsFromFile
        arguments:
          - "nodes.txt"
```

### Execute Commands with Sudo

For commands requiring sudo, set the `SUDO_PASSWORD` environment variable:

```bash
export SUDO_PASSWORD="your-password"
java -jar actor-IaC.jar workflow -w main-workflow.yaml
```

## Next Steps

- Check the [actor-IaC Javadoc](https://scivicslab.github.io/actor-IaC/) for API details
- Explore the [GitHub repository](https://github.com/scivicslab/actor-IaC) for examples
