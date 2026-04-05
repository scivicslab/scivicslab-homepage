---
id: utilizing-results
sidebar_position: 4
title: "Utilizing Workflow Result Logs"
description: "Learn about workflow execution log destinations (console, file, H2 database), database operations, debugging techniques, and log analysis methods."
keywords:
  - Turing-workflow
  - logging
  - H2 database
  - debug
  - log analysis
  - output multiplexer
---

# Utilizing Workflow Result Logs

## Overview

When you execute a workflow, output from each node is displayed in real-time on the console. Output includes a `[node-name]` prefix so you can identify which node produced it. ASCII art in cowsay format is displayed at step boundaries.

Turing-workflow automatically saves all logs to an H2 database. The log database is automatically created as `turing-workflow-logs.mv.db` in the current directory, so users do not need to configure it in advance. Thanks to H2's `AUTO_SERVER` mode, multiple terminals can execute workflows simultaneously and write to the same database.

## Output Destinations

Workflow execution logs are sent to the following three destinations.

| Destination | Description | Configuration |
|-------------|-------------|---------------|
| Console | View execution status in real-time | Enabled by default |
| File | Save logs to a text file | Specify with `--file-log` option |
| Database | Save structured logs to H2 database | Enabled by default (`turing-workflow-logs.mv.db`) |

Output is distributed to each destination through the `outputMultiplexer`. You can configure custom output destinations by adding them to the `outputMultiplexer` in the workflow.

## Database Operations

### Writing from Multiple Processes

With H2's `AUTO_SERVER` mode, multiple Turing-workflow processes can simultaneously write to the same database file. The first process to connect functions as the server, and subsequent processes connect via TCP. Users do not need to be aware of the server.

### Database Write Mechanism

Writes are performed through asynchronous batch processing, so they do not affect workflow execution speed. Log tasks queued in a `BlockingQueue` are processed together by a dedicated writer thread. The batch size is up to 100 tasks, and commits are performed per batch.

### Reading from the Database

Use the `log-info` command to query the database and perform the following operations.

- Display session list
- Display details of a specific session
- Extract logs by node
- Filter by log level

## Debugging

### Troubleshooting

When problems occur during workflow execution, you can investigate the cause using the following methods.

- **Check console output**: Identify the target node by the `[node-name]` prefix and check the error message
- **Log level filtering**: Use the `log-info` command to extract only logs at `ERROR` level or above
- **Session comparison**: Compare logs from past successful sessions with failed sessions

### Debugging Sub-workflows

When problems occur in sub-workflows, re-run the workflow with the `--verbose` option to display the entire JSON State at each transition. This helps identify problems by showing how the JSON State changes at each step of the state transition.

## Log Analysis

### Extracting Logs for a Specific Node

By specifying a node ID with the `log-info` command, you can extract only the execution logs for that specific node. This is useful for investigating causes when only some nodes among multiple nodes have failed.

### Comparing with Past Execution Results

You can query past execution logs by specifying a session ID and compare them with current execution results. Use this to verify differences before and after configuration changes or to check trends in periodic execution results.

### Checking Error Logs

When some nodes fail, the failure reason is recorded in the `node_results` table of the log database. Use the `log-info` command to display the list of node results in a session and check the failure reason for failed nodes.

### Clearing the Database

Use the `db-clear` command to delete all data in the database. Use this when logs have accumulated and the database file has grown large.

```bash
./turing_workflow.java db-clear
```
