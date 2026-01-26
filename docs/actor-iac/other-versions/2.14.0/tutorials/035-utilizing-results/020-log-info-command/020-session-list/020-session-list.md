---
id: session-list
title: Displaying and Searching Session List
sidebar_position: 20
---

## Problem Definition

Multiple workflow executions (sessions) are recorded in the log database. To investigate past execution results, you first need to identify the target session.

**What to achieve:**
- Check the list of past executed sessions
- Filter sessions by workflow name and execution time
- Get the ID of a specific session to investigate details


## How to do it

### Display Session List

Running the `log-info` command without a session ID displays the session list.

```bash
./actor_iac.java log-info --db ./actor-iac-logs
```

Output example:
```
Sessions:
================================================================================
#3    main-collect-sysinfo           FAILED
      Inventory: inventory.ini
      Started:   2026-01-15T16:45:00+09:00
      Ended:     2026-01-15T16:45:32+09:00
      CWD:       /home/devteam/works/testcluster-iac
      Git:       a1b2c3d (main)
      Command:   run -w main-collect-sysinfo -i inventory.ini -g compute
      actor-IaC: 2.12.0 (commit: e4f5g6h)
--------------------------------------------------------------------------------
#2    main-collect-sysinfo           COMPLETED
      Started:   2026-01-15T14:30:00+09:00
      ...
```

### Filter by Workflow Name

```bash
# Exact match
./actor_iac.java log-info --db ./actor-iac-logs -w ./sysinfo/main-collect-sysinfo.yaml

# Partial match
./actor_iac.java log-info --db ./actor-iac-logs --like main-collect
./actor_iac.java log-info --db ./actor-iac-logs --like sysinfo
```

### Filter by Time

```bash
# Relative time
./actor_iac.java log-info --db ./actor-iac-logs --since 24h   # Past 24 hours
./actor_iac.java log-info --db ./actor-iac-logs --since 3d    # Past 3 days
./actor_iac.java log-info --db ./actor-iac-logs --since 1w    # Past 1 week

# Absolute time (ISO 8601 format)
./actor_iac.java log-info --db ./actor-iac-logs --after 2026-01-15T00:00:00
```

Units available with `--since`:

| Unit | Meaning | Example |
|------|---------|---------|
| `m` | Minutes | `30m` = From 30 minutes ago |
| `h` | Hours | `12h` = From 12 hours ago |
| `d` | Days | `3d` = From 3 days ago |
| `w` | Weeks | `1w` = From 1 week ago |


## Under the hood

The following information is automatically recorded for each session.

| Item | Description | Use |
|------|-------------|-----|
| Session ID | Unique identifier (#1, #2, #3...) | Used for session specification |
| Workflow | Executed workflow name | Search/filtering |
| Status | COMPLETED / FAILED / PARTIAL | Check success/failure |
| Started / Ended | Start/end time | Time filtering |
| CWD | Current directory at execution | Needed for reproduction |
| Git | git commit / branch of workflow | Version tracking |
| Command | Full execution command | Used for re-execution |
| actor-IaC | Tool version and commit | Debug information |

This information allows re-executing past sessions under the same conditions. With Git commit information, workflow definition change history can also be tracked.

**Search mechanism:**
- `-w` (exact match): SQL `WHERE workflow_name = ?`
- `--like` (partial match): SQL `WHERE workflow_name LIKE '%pattern%'`
- `--since` / `--after`: SQL `WHERE started_at >= ?`
