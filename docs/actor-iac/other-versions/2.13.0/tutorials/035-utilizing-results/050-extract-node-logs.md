---
id: extract-node-logs
title: Extracting Logs for Specific Nodes
sidebar_position: 50
---

:::caution Newer Version Available
This is documentation for version 2.13.0. [See the latest version](/docs/actor-iac/introduction).
:::

# Extracting Logs for Specific Nodes

## Problem Definition

**Goal:** Extract specific node information from interleaved logs during parallel execution.

When executing workflows in parallel across multiple nodes, each node's output is interleaved. There may be cases where you want to "check only node15's GPU information" or "compare GPU information across all nodes" after execution, requiring extraction of needed information from interleaved logs.

By combining the log database with `grep`, you can efficiently extract needed information.


## How to do it

### Check Specific Information for a Specific Node

To check node15's GPU information:

```bash
./actor_iac.java log-info --db ./actor-iac-logs --node node-node15 | grep -A5 "GPU INFO"
```

```
[2026-01-15T10:00:25+09:00] INFO  [node-node15] ===== GPU INFO =====
[2026-01-15T10:00:25+09:00] INFO  [node-node15] NVIDIA GeForce RTX 4090, 24564 MiB, 545.23.08
```

This shows that node15 has an RTX 4090 installed.

### Check List of Log Output Headers

To list the types of information (headers) output by the workflow:

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 2 | grep "=====" | sort -u
```

```
[2026-01-15T10:00:12+09:00] INFO  [node-node13] ===== CPU INFO =====
[2026-01-15T10:00:12+09:00] INFO  [node-node13] ===== DISK USAGE =====
[2026-01-15T10:00:12+09:00] INFO  [node-node13] ===== GPU INFO =====
[2026-01-15T10:00:12+09:00] INFO  [node-node13] ===== MEMORY INFO =====
[2026-01-15T10:00:12+09:00] INFO  [node-node13] ===== NETWORK INFO =====
[2026-01-15T10:00:12+09:00] INFO  [node-node13] ===== OS INFO =====
```

This output shows the information categories collected by the workflow:

| Header | Content |
|--------|---------|
| `CPU INFO` | CPU model, core count, architecture |
| `DISK USAGE` | Disk usage status |
| `GPU INFO` | GPU model, VRAM, driver version |
| `MEMORY INFO` | Memory capacity and usage |
| `NETWORK INFO` | Network interface information |
| `OS INFO` | OS name, kernel version |

### Compare Specific Information Across All Nodes

To compare GPU information across all nodes:

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 5 | grep "GPU INFO" -A1
```

```
[2026-01-15T10:00:15+09:00] INFO  [node-node13] ===== GPU INFO =====
[2026-01-15T10:00:15+09:00] INFO  [node-node13] NVIDIA GeForce RTX 3090, 24576 MiB, 525.147.05
[2026-01-15T10:00:18+09:00] INFO  [node-node14] ===== GPU INFO =====
[2026-01-15T10:00:18+09:00] INFO  [node-node14] NVIDIA GeForce RTX 3090, 24576 MiB, 525.147.05
[2026-01-15T10:00:25+09:00] INFO  [node-node15] ===== GPU INFO =====
[2026-01-15T10:00:25+09:00] INFO  [node-node15] NVIDIA GeForce RTX 4090, 24564 MiB, 545.23.08
[2026-01-15T10:00:28+09:00] INFO  [node-node23] ===== GPU INFO =====
[2026-01-15T10:00:28+09:00] INFO  [node-node23] No NVIDIA GPU detected via lspci
```

From this output:
- node13, node14: RTX 3090 (driver 525.147.05)
- node15: RTX 4090 (driver 545.23.08)
- node23: No GPU

Only node23 lacks a GPU. For workflows requiring GPU computation, node23 needs to be excluded.


## Under the hood

### log-info Output Format

The `log-info` command output goes to standard output, so it can be piped to Unix commands like `grep` or `sort`.

```
log-info → stdout → grep/sort/uniq etc. → Needed information
```

### Combining --node and --session Options

| Option | Description |
|--------|-------------|
| `--session N` | Target session N logs |
| `--node NAME` | Output only specified node's logs |
| `--session N --node NAME` | Only specified node's logs from session N |

If `--session` is omitted, the latest session is targeted.

### grep Context Options

| Option | Description |
|--------|-------------|
| `-A N` | Also output N lines after match |
| `-B N` | Also output N lines before match |
| `-C N` | Also output N lines before and after match |

A common pattern is matching header lines (`=====`) and getting the following content.
