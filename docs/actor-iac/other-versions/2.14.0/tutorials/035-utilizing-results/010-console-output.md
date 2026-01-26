---
id: console-output
title: Verifying Execution Results on Console
sidebar_position: 10
---

## Problem Definition

When a workflow is executed, information collected from each node is output to the console. However, in parallel execution to multiple nodes, outputs are mixed, so it is necessary to identify which node the output came from.

**What to achieve:**
- Verify console output in real-time during workflow execution
- Identify specific node information from mixed output


## How to do it

When a workflow is executed, all output lines are prefixed with `[actor-name]` format.

```
$ ./actor_iac.java run -w sysinfo/main-collect-sysinfo.yaml -i inventory.ini -g compute
[cli] 2026-01-15 10:00:00 INFO Loading workflow: main-collect-sysinfo.yaml
[cli] 2026-01-15 10:00:00 INFO Created 6 node actors for group 'compute'
[nodeGroup]  ________________________________
[nodeGroup] / [main-collect-sysinfo]         \
[nodeGroup]         \   ^__^
[nodeGroup]          \  (oo)\_______
...
[node-node13] ===== HOSTNAME =====
[node-node13] node13.local
[node-node13] ===== CPU INFO =====
[node-node13] CPU(s):                  32
[node-node13] Model name:              AMD Ryzen 9 5950X 16-Core Processor
[node-node14] ===== HOSTNAME =====
[node-node14] node14.local
...
```

To view only the output from a specific node, filter with `grep`.

```bash
# Display only node13 output
./actor_iac.java run -w sysinfo/main-collect-sysinfo.yaml -i inventory.ini -g compute | grep "^\[node-node13\]"
```

For more detailed searches or later reference, use the log database (see log-info command).


### Cowsay (Step Markers)

Cowsay-format ASCII art is displayed at the beginning of each step. This allows visual identification of step boundaries in the log.

```
[nodeGroup]  ________________________________
[nodeGroup] / [main-collect-sysinfo]         \
[nodeGroup] | - states: ["0", "1"]           |
[nodeGroup] |  actions:                      |
[nodeGroup] \  - actor: nodeGroup ...        /
[nodeGroup]  --------------------------------
[nodeGroup]         \   ^__^
[nodeGroup]          \  (oo)\_______
[nodeGroup]             (__)\       )\/\
[nodeGroup]                 ||----w |
[nodeGroup]                 ||     ||
```

The cowsay character can be changed with the `--cowfile` option (see cowsay characters tutorial).


## Under the hood

actor-IaC operates based on the actor model. Each actor is an independent entity, and each has its own name.

| Actor Name | Role |
|------------|------|
| `cli` | CLI process. Responsible for loading workflows and generating actors |
| `nodeGroup` | Node group management. Responsible for applying workflows to child node actors |
| `node-{node-name}` | Individual node. Connects to remote host via SSH and executes commands |

When each actor outputs logs, actor-IaC automatically adds the actor name as a prefix. This allows identification of which actor the output came from, even when outputs are mixed in parallel execution.

```
[cli]        → Output from cli actor
[nodeGroup]  → Output from nodeGroup actor (including cowsay)
[node-node13] → Output from node-node13 actor (remote command results)
```

In parallel execution, each node actor executes remote commands simultaneously. Outputs are displayed in order of arrival, so outputs from different nodes may be mixed line by line.


## Derived Problems and Solutions

### Problem: Performance Degradation with Large Output

Java's console output (`System.out`) is slow. Even using `java.util.logging` does not provide significant improvement. When information is output simultaneously from many nodes, console output becomes a bottleneck and slows down overall workflow execution speed.

### Solution: Suppress Console Output

You can suppress console output with the `--quiet` option. Logs are recorded in the database, so you can check them later with the `log-info` command.

```bash
# Execute with console output suppressed
./actor_iac.java run -w sysinfo/main-collect-sysinfo.yaml -i inventory.ini -g compute --quiet

# Check logs after execution
./actor_iac.java log-info --db ./actor-iac-logs
```

For execution on large clusters (tens to hundreds of nodes), use of the `--quiet` option is recommended.
