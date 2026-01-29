---
id: actor-tree-in-report
title: Including Actor Tree in Report
sidebar_position: 8
---

# Including Actor Tree in Report

How to include the actor hierarchy structure during workflow execution in reports.

## Challenge

The actor tree changes dynamically during execution. For example:

- At workflow start: Only `ROOT`, `loader`, `nodeGroup`
- After node connection: `node-*` actors are created under `nodeGroup`
- After plugin load: Plugin actors are created under `loader`
- At report generation: SectionBuilder actors are created under `reportBuilder`

Therefore, you need to explicitly specify "at which point you want to output the actor tree to the report."

## Solution: Use % Notation

Actor trees are collected by `CheckResultsSection` using **% notation**, not a dedicated SectionBuilder.

### Flow

1. Call `ROOT.printTree` at the point you want to include in the report
2. Output the result to logs using % notation
3. CheckResultsSection collects % notation lines and includes them in the report

### Implementation Method

To output `printTree` results with % notation, use OutputMultiplexer:

```yaml
- states: ["2", "3"]
  note: Output actor tree to report
  actions:
    # Get printTree result
    - actor: ROOT
      method: printTree
      store: actorTree

    # Output with % notation (add % to each line)
    - actor: outputMultiplexer
      method: writeLines
      arguments:
        prefix: "%[Actor Tree] "
        content: "${actorTree}"
```

Or, for simple single-line output:

```yaml
- actor: outputMultiplexer
  method: writeLine
  arguments: ["%[Actor Tree]\n${actorTree}"]
```

## Complete Workflow Example

```yaml
name: deployment-with-tree
description: Report with deployment results and actor tree

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

  - states: ["2", "3"]
    note: Capture actor tree after deployment
    actions:
      - actor: ROOT
        method: printTree
        store: actorTree
      - actor: outputMultiplexer
        method: writeLine
        arguments: ["%[Actor Tree]\n%${actorTree}"]

  - states: ["3", "end"]
    note: Generate report
    actions:
      - actor: reportBuilder
        method: report
```

## Output Example

```
================================================================================
                              WORKFLOW REPORT
================================================================================

[Workflow Name]
deployment-with-tree

[Check Results]
[Actor Tree]
ROOT
├── loader
├── nodeGroup
│   ├── node-192.168.5.13
│   ├── node-192.168.5.14
│   └── node-192.168.5.15
├── outputMultiplexer
└── reportBuilder
    ├── wfName
    ├── checkResults
    └── trans:nodeGroup:children

[Transition History: nodeGroup (with children)]
...

================================================================================
```

## Actor Trees at Multiple Points

You can also compare actor trees at different points.

```yaml
- states: ["1", "2"]
  note: Capture initial tree
  actions:
    - actor: ROOT
      method: printTree
      store: initialTree
    - actor: outputMultiplexer
      method: writeLine
      arguments: ["%[Initial Actor Tree]\n%${initialTree}"]

- states: ["3", "4"]
  note: Capture tree after plugin load
  actions:
    - actor: ROOT
      method: printTree
      store: afterPluginTree
    - actor: outputMultiplexer
      method: writeLine
      arguments: ["%[After Plugin Load]\n%${afterPluginTree}"]

- states: ["5", "6"]
  note: Capture final tree
  actions:
    - actor: ROOT
      method: printTree
      store: finalTree
    - actor: outputMultiplexer
      method: writeLine
      arguments: ["%[Final Actor Tree]\n%${finalTree}"]
```

**Output example:**

```
[Check Results]
[Initial Actor Tree]
ROOT
├── loader
├── nodeGroup
└── outputMultiplexer

[After Plugin Load]
ROOT
├── loader
│   └── systemInfoAggregator
├── nodeGroup
│   ├── node-192.168.5.13
│   └── node-192.168.5.14
└── outputMultiplexer

[Final Actor Tree]
ROOT
├── loader
│   └── systemInfoAggregator
├── nodeGroup
│   ├── node-192.168.5.13
│   └── node-192.168.5.14
├── outputMultiplexer
└── reportBuilder
    ├── wfName
    └── checkResults
```

## Why Not Make It a SectionBuilder?

1. **Dynamic nature**: The actor tree is constantly changing during workflow execution. The tree at the point when SectionBuilder's `generate()` is called (report generation time) is likely different from the point the user wants to see.

2. **Flexibility**: Using % notation, you can output the tree at any point, any number of times. With a SectionBuilder, it would be fixed to "once at report generation time."

3. **Simplicity**: It can be achieved by combining the existing `printTree` action with % notation, so there's no need to create a new SectionBuilder.

## Related Documents

- `ActorTreeVisualization_260119_oo01` - Details on the `printTree` action
- `CheckResultsSection_260130_oo01` - % notation collection
