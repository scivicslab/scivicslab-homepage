---
id: session-detail
title: Checking Session Details
sidebar_position: 30
---

## Problem Definition

You've identified the target session from the session list. Next, you want to check the detailed information for that session. Specifically, you want to know the execution result summary and which actors output logs.

**What to achieve:**
- Check execution result summary for a specific session
- Get list of actors that output logs within the session
- Understand log output volume for each actor


## How to do it

### Display Session Summary

Specifying a session ID with the `--session` option displays a summary for that session.

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 2
```

Output example:
```
Session #2: main-collect-sysinfo
  Status:    COMPLETED
  Inventory: inventory.ini
  Started:   2026-01-15T14:30:00+09:00
  Ended:     2026-01-15T14:30:45+09:00
  Duration:  45 seconds
  Nodes:     6
  Log lines: 342
```

### Display Actor List

Adding the `--list-actors` option displays the list of actors within the session.

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 2 --list-actors
```

Output example:
```
Actors in session #2 (main-collect-sysinfo):
======================================================================
ACTOR                          LOG_LINES
----------------------------------------------------------------------
cli                            15
node-node13                    57
node-node14                    57
node-node15                    57
node-node21                    57
node-node22                    57
node-node23                    57
nodeGroup                      17
======================================================================
Total: 8 actors
```


## Under the hood

**What is an Actor:**

actor-IaC operates based on the actor model. All log output sources are identified as "actors".

| Actor Type | Naming Convention | Role |
|------------|-------------------|------|
| CLI | `cli` | Command-line processing, workflow loading |
| Node Group | `nodeGroup` | Apply workflows to subordinate nodes |
| Node | `node-{node-name}` | Execute commands on remote hosts |
| Other | Arbitrary | Custom actors |

**Meaning of LOG_LINES:**

`LOG_LINES` indicates the number of log lines output by that actor. From this value, you can judge:

- Extremely low → Possibly failed early (SSH connection error, etc.)
- Similar to others → Possibly executed normally
- Extremely high → Had a lot of output (error loop, etc.)

For example, if a node's `LOG_LINES` is only 3 lines, there's a high possibility it failed at the SSH connection stage.
