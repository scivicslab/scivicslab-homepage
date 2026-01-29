---
id: workflow-name-section
title: WorkflowNameSection
sidebar_position: 1
---

# WorkflowNameSection

A section builder that outputs the workflow name.

## Output Example

```
[Workflow Name]
main-cluster-status
```

## Usage

```yaml
- actor: loader
  method: createChild
  arguments: ["reportBuilder", "wfName", "com.scivicslab.actoriac.report.sections.basic.WorkflowNameSectionIIAR"]
```

## Behavior

1. Gets the `name` field from the workflow YAML
2. If `name` is not set, falls back to the workflow filename
3. If neither can be obtained, outputs `(unknown)`

## Classes

| Type | Class Name |
|------|------------|
| POJO | `WorkflowNameSection` |
| IIAR | `WorkflowNameSectionIIAR` |

## Practical Example with ReportBuilder

Workflow that generates a report by combining multiple SectionBuilders:

```yaml
name: k8s-cluster-status
description: Collect Kubernetes cluster status and generate report

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
        arguments: ["reportBuilder", "wfFile", "com.scivicslab.actoriac.report.sections.basic.WorkflowFileSectionIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "wfDesc", "com.scivicslab.actoriac.report.sections.basic.WorkflowDescriptionSectionIIAR"]

  - states: ["1", "2"]
    note: Collect cluster data
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runWorkflow
          arguments: ["collect-k8s-info.yaml"]

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
k8s-cluster-status

[Workflow File]
workflows/k8s-cluster-status.yaml

[Description]
  Collect Kubernetes cluster status and generate report

================================================================================
```

Individual SectionBuilders handle simple functionality, but by having ReportBuilder arrange child actors in order, a formatted report is generated.
