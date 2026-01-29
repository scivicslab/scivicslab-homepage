---
id: transition-history-section
title: TransitionHistorySection
sidebar_position: 6
---

# TransitionHistorySection

A section builder that outputs workflow state transition history.

## What is a Transition?

Workflows execute by transitioning between states. Each transition either succeeds or fails, and its history is recorded in the database. This section builder outputs that history in human-readable format.

## Output Example

```
[Transition History: nodeGroup]
o [2026-01-30 10:15:23] 0 -> 1 [Initialize]
o [2026-01-30 10:15:24] 1 -> 2 [Collect data]
x [2026-01-30 10:15:25] 2 -> 3 [Process] Connection refused

Summary: 3 transitions, 2 succeeded, 1 failed
```

- `o` = Success
- `x` = Failure

## Usage

Basic (display nodeGroup's transition history):

```yaml
- actor: loader
  method: createChild
  arguments: ["reportBuilder", "transitions", "com.scivicslab.actoriac.report.sections.basic.TransitionHistorySectionIIAR"]
```

Specify target actor (`:` separator):

```yaml
# Specific node's transition history
- actor: loader
  method: createChild
  arguments: ["reportBuilder", "trans:node-server1", "...TransitionHistorySectionIIAR"]
```

Include child nodes (`:children` suffix):

```yaml
# nodeGroup and all child nodes' transition history
- actor: loader
  method: createChild
  arguments: ["reportBuilder", "trans:nodeGroup:children", "...TransitionHistorySectionIIAR"]
```

## Dynamic Configuration

You can change the target or options after creation:

```yaml
- actor: loader
  method: createChild
  arguments: ["reportBuilder", "myTransitions", "...TransitionHistorySectionIIAR"]
- actor: myTransitions
  method: setTargetActor
  arguments: ["node-server1"]
- actor: myTransitions
  method: setIncludeChildren
  arguments: ["true"]
```

## Behavior

1. Gets DB connection from `DistributedLogStore`
2. Gets current session ID from `nodeGroup`
3. Extracts logs containing `Transition` from the log table
4. Formats success/failure, timestamp, state transition, and note
5. Outputs summary (total count, success count, failure count)

## Display Order

`order: 500` (displayed after JsonState section)

## Classes

| Type | Class Name |
|------|------------|
| POJO | `TransitionHistorySection` |
| IIAR | `TransitionHistorySectionIIAR` |

## Practical Example with ReportBuilder

```yaml
name: deployment-report
description: Report deployment execution results

steps:
  - states: ["0", "1"]
    note: Create ReportBuilder with sections
    actions:
      - actor: loader
        method: createChild
        arguments: ["ROOT", "reportBuilder", "com.scivicslab.actoriac.report.ReportBuilderIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "wfName", "com.scivicslab.actoriac.report.sections.basic.WorkflowNameSectionIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "wfDesc", "com.scivicslab.actoriac.report.sections.basic.WorkflowDescriptionSectionIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "checkResults", "com.scivicslab.actoriac.report.sections.basic.CheckResultsSectionIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "trans:nodeGroup:children", "com.scivicslab.actoriac.report.sections.basic.TransitionHistorySectionIIAR"]

  - states: ["1", "2"]
    note: Deploy to all nodes
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runWorkflow
          arguments: ["deploy.yaml"]

  - states: ["2", "end"]
    note: Generate report
    actions:
      - actor: reportBuilder
        method: report
```

**Output example:**

```
================================================================================
                              WORKFLOW REPORT
================================================================================

[Workflow Name]
deployment-report

[Description]
  Report deployment execution results

[Check Results]
server1: [OK] Deployment successful
server2: [ERROR] Deployment failed - disk full

[Transition History: nodeGroup (with children)]

  [nodeGroup]
  o [2026-01-30 10:15:20] 0 -> 1 [Create ReportBuilder]
  o [2026-01-30 10:15:21] 1 -> 2 [Deploy to all nodes]
  o [2026-01-30 10:15:45] 2 -> end [Generate report]

  [node-server1]
  o [2026-01-30 10:15:22] 0 -> 1 [Pull latest code]
  o [2026-01-30 10:15:30] 1 -> 2 [Build application]
  o [2026-01-30 10:15:40] 2 -> end [Start service]

  [node-server2]
  o [2026-01-30 10:15:22] 0 -> 1 [Pull latest code]
  o [2026-01-30 10:15:32] 1 -> 2 [Build application]
  x [2026-01-30 10:15:42] 2 -> end [Start service] No space left on device

Summary: 9 transitions, 8 succeeded, 1 failed

================================================================================
```

Each SectionBuilder handles a simple function, but by having ReportBuilder arrange child actors in `order` sequence, a formatted report is generated.
