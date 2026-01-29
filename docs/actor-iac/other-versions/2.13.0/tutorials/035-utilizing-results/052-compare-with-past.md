---
id: compare-with-past
title: Comparing with Past Execution Results
sidebar_position: 52
---

# Comparing with Past Execution Results

## Problem Definition

**Goal:** Compare results of periodically executed workflows with the past to detect changes.

When running system information collection periodically, you may want to detect changes like "has memory usage increased compared to a week ago" or "has disk capacity decreased."

Since the log database stores all past execution results, you can retrieve results from any point in time and compare them.


## How to do it

### Find Past Sessions

Display one week's worth of system information collection sessions:

```bash
./actor_iac.java log-info --db ./actor-iac-logs --since 1w --like main-collect-sysinfo
```

```
Sessions:
================================================================================
#5    main-collect-sysinfo           COMPLETED
      Started:   2026-01-15T10:00:00+09:00
--------------------------------------------------------------------------------
#3    main-collect-sysinfo           COMPLETED
      Started:   2026-01-12T10:00:00+09:00
--------------------------------------------------------------------------------
#1    main-collect-sysinfo           COMPLETED
      Started:   2026-01-08T10:00:00+09:00
--------------------------------------------------------------------------------
```

### Compare Past and Present

Memory information for node13 from one week ago (session #1):

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 1 --node node-node13 | grep -A3 "MEMORY INFO"
```

```
[2026-01-08T10:00:12+09:00] INFO  [node-node13] ===== MEMORY INFO =====
[2026-01-08T10:00:12+09:00] INFO  [node-node13]               total        used        free
[2026-01-08T10:00:12+09:00] INFO  [node-node13] Mem:           62Gi       5.1Gi        48Gi
```

Memory information for node13 today (session #5):

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 5 --node node-node13 | grep -A3 "MEMORY INFO"
```

```
[2026-01-15T10:00:12+09:00] INFO  [node-node13] ===== MEMORY INFO =====
[2026-01-15T10:00:12+09:00] INFO  [node-node13]               total        used        free
[2026-01-15T10:00:12+09:00] INFO  [node-node13] Mem:           62Gi       8.2Gi        45Gi
```

Memory usage increased from 5.1Gi to 8.2Gi over one week. Some process may be continuously consuming memory.


## Under the hood

### --since Option

Formats that can be specified with the `--since` option:

| Format | Description | Example |
|--------|-------------|---------|
| `Nh` | From N hours ago | `--since 1h` |
| `Nd` | From N days ago | `--since 7d` |
| `Nw` | From N weeks ago | `--since 1w` |
| ISO 8601 | From specific date/time | `--since "2026-01-08T10:00:00"` |

### --like Option

The `--like` option filters by partial match on workflow name. It works like SQL's `LIKE` clause.

```bash
# Sessions with workflows containing "sysinfo"
./actor_iac.java log-info --db ./actor-iac-logs --like sysinfo

# Sessions with workflows containing "update"
./actor_iac.java log-info --db ./actor-iac-logs --like update
```

### Shell Script Example for Comparison

For regular comparisons, you can automate with a shell script:

```bash
#!/bin/bash
# Compare latest with previous session

LATEST=$(./actor_iac.java log-info --db ./actor-iac-logs --like sysinfo | grep "^#" | head -1 | awk '{print $1}' | tr -d '#')
PREVIOUS=$(./actor_iac.java log-info --db ./actor-iac-logs --like sysinfo | grep "^#" | head -2 | tail -1 | awk '{print $1}' | tr -d '#')

echo "Comparing session #$LATEST with #$PREVIOUS"

for node in node13 node14 node15; do
    echo "=== $node ==="
    echo "Previous:"
    ./actor_iac.java log-info --db ./actor-iac-logs --session $PREVIOUS --node node-$node | grep -A2 "MEMORY INFO"
    echo "Latest:"
    ./actor_iac.java log-info --db ./actor-iac-logs --session $LATEST --node node-$node | grep -A2 "MEMORY INFO"
done
```
