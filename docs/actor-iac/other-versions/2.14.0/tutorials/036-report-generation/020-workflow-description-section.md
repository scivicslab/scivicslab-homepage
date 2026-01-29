---
id: workflow-description-section
title: WorkflowDescriptionSection
sidebar_position: 2
---

# WorkflowDescriptionSection

A section builder that outputs the workflow description.

## Output Example

```
[Description]
  Main workflow to collect Kubernetes cluster status.
  This workflow gathers node, namespace, and pod information.
```

## Usage

```yaml
- actor: loader
  method: createChild
  arguments: ["reportBuilder", "wfDesc", "com.scivicslab.actoriac.report.sections.basic.WorkflowDescriptionSectionIIAR"]
```

## Behavior

1. Gets the `description` field from the workflow YAML
2. Adds indentation (2 spaces) to the beginning of each line
3. If `description` is not set, this section is skipped (returns empty string)

## Classes

| Type | Class Name |
|------|------------|
| POJO | `WorkflowDescriptionSection` |
| IIAR | `WorkflowDescriptionSectionIIAR` |
