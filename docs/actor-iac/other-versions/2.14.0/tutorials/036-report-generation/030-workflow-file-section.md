---
id: workflow-file-section
title: WorkflowFileSection
sidebar_position: 3
---

# WorkflowFileSection

A section builder that outputs the workflow file path.

## Output Example

```
[Workflow File]
workflows/main-cluster-status.yaml
```

## Usage

```yaml
- actor: loader
  method: createChild
  arguments: ["reportBuilder", "wfFile", "com.scivicslab.actoriac.report.sections.basic.WorkflowFileSectionIIAR"]
```

## Behavior

1. Gets the workflow file path from `nodeGroup`
2. If the path cannot be obtained, outputs `(unknown)`

## Classes

| Type | Class Name |
|------|------------|
| POJO | `WorkflowFileSection` |
| IIAR | `WorkflowFileSectionIIAR` |
