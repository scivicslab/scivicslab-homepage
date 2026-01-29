---
id: json-state-section
title: JsonStateSection
sidebar_position: 5
---

# JsonStateSection

A section builder that outputs any actor's JsonState in YAML format.

## What is JsonState?

`IIActorRef` can hold JsonState. During workflow execution, you can save values in `${key}=value` format or accumulate sub-workflow results. This section builder outputs the specified actor's JsonState in human-readable YAML format.

## Output Example

```
[JsonState: nodeGroup]
cluster:
  name: production
  nodes:
    - hostname: server1
      cpu: 8
      memory: 32Gi
    - hostname: server2
      cpu: 16
      memory: 64Gi
```

## Usage

Specify the target actor with `:` separator in the actor name:

```yaml
# Output nodeGroup's JsonState
- actor: loader
  method: createChild
  arguments: ["reportBuilder", "state:nodeGroup", "com.scivicslab.actoriac.report.sections.basic.JsonStateSectionIIAR"]
```

You can also specify a JSON path to output only part of it:

```yaml
# Output only cluster.nodes from nodeGroup's JsonState
- actor: loader
  method: createChild
  arguments: ["reportBuilder", "state:nodeGroup:cluster.nodes", "com.scivicslab.actoriac.report.sections.basic.JsonStateSectionIIAR"]
```

## Dynamic Configuration

You can also change the target actor or path after creation:

```yaml
- actor: loader
  method: createChild
  arguments: ["reportBuilder", "myState", "...JsonStateSectionIIAR"]
- actor: myState
  method: setTargetActor
  arguments: ["nodeGroup"]
- actor: myState
  method: setJsonPath
  arguments: ["cluster.nodes"]
```

## Behavior

1. Parse actor name to extract target actor and JSON path
2. Get target actor's JsonState when `generate` is called
3. Convert to YAML format with `JsonState.toStringOfYaml(path)`
4. Output with title

## Display Order

`order: 400` (displayed after check results section)

## Classes

| Type | Class Name |
|------|------------|
| POJO | `JsonStateSection` |
| IIAR | `JsonStateSectionIIAR` |

## Practical Example with ReportBuilder

```yaml
name: cluster-inventory-report
description: Collect cluster inventory information and generate report

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
        arguments: ["reportBuilder", "state:nodeGroup", "com.scivicslab.actoriac.report.sections.basic.JsonStateSectionIIAR"]

  - states: ["1", "2"]
    note: Collect cluster inventory
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runWorkflow
          arguments: ["collect-inventory.yaml"]

  - states: ["2", "end"]
    note: Generate report
    actions:
      - actor: reportBuilder
        method: report
```

**collect-inventory.yaml (executed on each node):**

```yaml
name: collect-inventory

steps:
  - states: ["0", "end"]
    note: Collect and store inventory data
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            HOSTNAME=$(hostname -s)
            CPU=$(nproc)
            MEM=$(free -h | awk '/Mem:/{print $2}')
            echo "%$HOSTNAME: [OK] Inventory collected"
      # Store in JsonState (aggregated by parent workflow)
      - actor: this
        method: setJsonStateValue
        arguments:
          key: "inventory.${hostname}"
          value: |
            hostname: ${hostname}
            cpu: ${cpu}
            memory: ${mem}
```

**Output example:**

```
================================================================================
                              WORKFLOW REPORT
================================================================================

[Workflow Name]
cluster-inventory-report

[Description]
  Collect cluster inventory information and generate report

[Check Results]
server1: [OK] Inventory collected
server2: [OK] Inventory collected

[JsonState: nodeGroup]
inventory:
  server1:
    hostname: server1
    cpu: 8
    memory: 32Gi
  server2:
    hostname: server2
    cpu: 16
    memory: 64Gi

================================================================================
```

Each SectionBuilder handles a simple function, but by having ReportBuilder arrange child actors in `order` sequence, a formatted report is generated.
