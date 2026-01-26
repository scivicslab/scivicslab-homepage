---
id: check-error-logs
title: Checking Error Logs in Bulk
sidebar_position: 54
---

# Checking Error Logs in Bulk

## Problem Definition

**Goal:** Check only error logs in bulk for early detection of problems in large clusters.

When executing workflows on many nodes, a large volume of logs is output. There may be cases where you want to extract and check only errors from those logs.

Using the `--level` option, you can extract only logs at or above the specified log level.


## How to do it

### Display Only Error Logs

```bash
./actor_iac.java log-info --db ./actor-iac-logs --level ERROR
```

```
Logs (level >= ERROR):
================================================================================
[2026-01-15T10:00:01+09:00] ERROR [node-node21] SSH connection failed: Connection refused
[2026-01-15T10:00:31+09:00] ERROR [node-node22] SSH connection failed: Connection timed out
[2026-01-15T10:00:25+09:00] ERROR [node-node15] Command failed: nvidia-smi: command not found
================================================================================
Total: 3 lines
```

This shows there are 3 errors.

### Check Error Details

Check the context around node15's error:

```bash
./actor_iac.java log-info --db ./actor-iac-logs --node node-node15 | grep -B5 -A5 "nvidia-smi"
```

```
[2026-01-15T10:00:24+09:00] INFO  [node-node15] ===== GPU INFO =====
[2026-01-15T10:00:24+09:00] INFO  [node-node15] Checking NVIDIA GPU...
[2026-01-15T10:00:25+09:00] ERROR [node-node15] Command failed: nvidia-smi: command not found
[2026-01-15T10:00:25+09:00] INFO  [node-node15] No NVIDIA GPU detected via lspci
[2026-01-15T10:00:25+09:00] INFO  [node-node15] ===== NETWORK INFO =====
```

The `nvidia-smi` command was not found (NVIDIA driver may not be installed).

### Display WARN and Above Logs

To display WARN and above logs:

```bash
./actor_iac.java log-info --db ./actor-iac-logs --level WARN
```

```
Logs (level >= WARN):
================================================================================
[2026-01-15T10:00:10+09:00] WARN  [node-node14] Disk usage over 80%: /dev/sda1 (85%)
[2026-01-15T10:00:01+09:00] ERROR [node-node21] SSH connection failed: Connection refused
[2026-01-15T10:00:31+09:00] ERROR [node-node22] SSH connection failed: Connection timed out
[2026-01-15T10:00:25+09:00] ERROR [node-node15] Command failed: nvidia-smi: command not found
================================================================================
Total: 4 lines
```

An additional warning about node14's disk usage exceeding 80% is now displayed.


## Under the hood

### --level Option

Log levels that can be specified with the `--level` option:

| Level | Description | Included Logs |
|-------|-------------|---------------|
| `DEBUG` | Debug information | DEBUG, INFO, WARN, ERROR |
| `INFO` | Normal information | INFO, WARN, ERROR |
| `WARN` | Warnings | WARN, ERROR |
| `ERROR` | Errors | ERROR only |

Logs at or above the specified level are displayed.

### Log Level Usage

In actor-IaC workflow execution, log levels are used as follows:

| Level | When Output |
|-------|-------------|
| `INFO` | Normal progress information, command output |
| `WARN` | Situations that require attention but processing continues |
| `ERROR` | Situations where processing failed |

### Combining with --limit Option

When there are many errors, you can limit output count with `--limit`:

```bash
# Only the latest 100 errors
./actor_iac.java log-info --db ./actor-iac-logs --level ERROR --limit 100
```

### Periodic Error Checking

Example script for periodic error checking with notification using cron:

```bash
#!/bin/bash
ERRORS=$(./actor_iac.java log-info --db ./actor-iac-logs --level ERROR --since 1h 2>/dev/null | grep -c "ERROR")
if [ "$ERRORS" -gt 0 ]; then
    echo "Found $ERRORS errors in the last hour"
    ./actor_iac.java log-info --db ./actor-iac-logs --level ERROR --since 1h
fi
```
