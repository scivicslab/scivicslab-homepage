---
id: subworkflow-debugging
title: Debugging Sub-workflow Execution
sidebar_position: 46
---

# Debugging Sub-workflow Execution

## Problem Definition

**Goal:** Identify the cause when unexpected behavior occurs in a structure where the main workflow calls sub-workflows.

In a structure where the main workflow calls sub-workflows with `runWorkflow`, problems can occur at multiple layers:

- Main workflow step transitions
- Specific steps in the sub-workflow
- Command execution within the sub-workflow

```
main-workflow.yaml
    │
    ├─ step 0→1: Initialization
    ├─ step 1→2: runWorkflow("sub-workflow.yaml")  ← Sub-workflow executed here
    │       │
    │       └─ sub-workflow.yaml
    │              ├─ step 0→1: Command A
    │              ├─ step 1→2: Command B    ← Problem occurs here?
    │              └─ step 2→end: Output results   ← Not reaching here?
    │
    └─ step 2→end: Report generation
```

**Important Principle: Look at Logs, Not Print Debugging**

Infrastructure as Code programs may make changes to the system with each execution. The debugging technique of "adding print statements and re-running" is dangerous. The log database already contains the necessary information, so investigate the logs first.


## How to do it

### 1. Check the Session and Actor List

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 17 --list-actors
```

```
Nodes in session #17 (main-cluster-status):
======================================================================
NODE_ID                        STATUS     LOG_LINES
----------------------------------------------------------------------
cli                            COMPLETED  12
nodeGroup                      COMPLETED  45
node-stonefly514               COMPLETED  128
workflowReporter               COMPLETED  8
======================================================================
Total: 4 actors
```

Check the `LOG_LINES` for each actor. If the node actor that executed the sub-workflow (`node-stonefly514`) has fewer log lines than expected, it may have failed midway.

### 2. Check the Logs of the Node that Executed the Sub-workflow

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 17 --node node-stonefly514
```

Each step in the sub-workflow is recorded in the logs with the following pattern:

```
[2026-01-29T04:33:40+09:00] INFO  [node-stonefly514] --- Transition: 0 → 1 ---
[2026-01-29T04:33:40+09:00] INFO  [node-stonefly514] Executing: Collect cluster info and nodes
[2026-01-29T04:33:41+09:00] INFO  [node-stonefly514] {"cluster":"https://...","hostname":"stonefly514",...}
[2026-01-29T04:33:41+09:00] INFO  [node-stonefly514] --- Transition: 1 → 2 ---
[2026-01-29T04:33:41+09:00] INFO  [node-stonefly514] Executing: Collect pods and PVCs per namespace
...
```

### 3. Extract Logs for a Specific Step

Use `grep` to extract step transitions and see how far execution progressed:

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 17 --node node-stonefly514 | grep "Transition"
```

```
[2026-01-29T04:33:40+09:00] INFO  [node-stonefly514] --- Transition: 0 → 1 ---
[2026-01-29T04:33:41+09:00] INFO  [node-stonefly514] --- Transition: 1 → 2 ---
```

If the `2 → end` transition is missing, Step 3 (`printYaml`) was not reached. Step 2's `1 → 2` may have failed, or Step 3 was not executed.

### 4. Check for Errors

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 17 --node node-stonefly514 --level ERROR
```

Or, look at the logs around a specific step in detail:

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 17 --node node-stonefly514 | grep -A10 "Transition: 1 → 2"
```

### 5. Check Command Output

Standard output and standard error from commands executed in sub-workflows are also recorded in the logs:

```bash
./actor_iac.java log-info --db ./actor-iac-logs --session 17 --node node-stonefly514 | grep -i "error\|failed\|exception"
```

You may find JSON parsing errors, jq errors, kubectl errors, etc.


## Under the hood

### Information Recorded in Logs

When executing sub-workflows, the following information is recorded in logs:

| Information | Recording Timing | Purpose |
|-------------|-----------------|---------|
| Step transitions | At start of each step | Check how far execution progressed |
| Action name | Before action execution | Check what was executed |
| Command output | During `executeCommand` | Check command results |
| ActionResult | At action completion | Check success/failure |

### Why Print Debugging is Inappropriate

Infrastructure as Code workflows may affect the system with each execution:

| Workflow Type | Re-execution Risk |
|---------------|-------------------|
| Information gathering (`kubectl get`, etc.) | Low (read-only) |
| Configuration changes (`kubectl apply`, etc.) | Medium-High (modifies state) |
| Resource creation/deletion | High (duplicate creation or accidental deletion if not idempotent) |

The log database already contains detailed information, so there's no need to re-execute for print debugging.

### Basic Debugging Strategy

```
1. Check the log database
   ↓
2. Trace step transitions
   ↓
3. Identify the failed step
   ↓
4. Look at that step's output in detail
   ↓
5. Identify the cause and fix the workflow
   ↓
6. Re-execute after fixing (only once)
```

Instead of repeatedly "adding print statements and re-executing," proceed with "look at logs to identify the cause, fix it, then re-execute."
