---
sidebar_position: 2
title: "Workflow Overlay"
description: "YAML overlay system for environment-specific workflow configuration in Turing-workflow"
---

# Workflow Overlay

The `WorkflowKustomizer` class implements a Kustomize-like overlay system for Turing-workflow. It allows you to create base workflow definitions that can be customized for different environments (development, staging, production) without duplicating code. This approach keeps your workflows DRY (Don't Repeat Yourself) while enabling environment-specific variations.

The overlay system supports strategic merge patches, variable substitution, and name transformations — features inspired by Kubernetes Kustomize but adapted for workflow definitions.

## Core Concepts

### Base and Overlay Structure

```
workflows/
├── base/
│   ├── deploy.yaml           # Base deployment workflow
│   ├── cleanup.yaml          # Base cleanup workflow
│   └── health-check.yaml     # Base health check workflow
└── overlays/
    ├── development/
    │   ├── overlay-conf.yaml
    │   └── patch-dev.yaml
    ├── staging/
    │   ├── overlay-conf.yaml
    │   └── patch-staging.yaml
    └── production/
        ├── overlay-conf.yaml
        └── patch-prod.yaml
```

The base directory contains complete workflow definitions that work in any environment. The overlay directories contain configuration files that specify which base to use and how to modify it.

### The overlay-conf.yaml File

Each overlay directory must contain an `overlay-conf.yaml` file:

```yaml
apiVersion: pojoactor.scivicslab.com/v1
kind: OverlayConf

bases:
  - ../../base

patches:
  - patch-prod.yaml

vars:
  environment: production
  nodeGroup: webservers
  timeout: 30000

namePrefix: prod-
nameSuffix: -v2
```

## Using WorkflowKustomizer

```java
WorkflowKustomizer kustomizer = new WorkflowKustomizer();

// Build returns a map of filename -> workflow content
Map<String, Map<String, Object>> workflows = kustomizer.build(Path.of("overlays/production"));

// Or get the result as a YAML string
String yamlOutput = kustomizer.buildAsYaml(Path.of("overlays/production"));
```

### Loading in Interpreter

The Interpreter has built-in support for loading workflows with overlays:

```java
Interpreter interpreter = new Interpreter.Builder()
    .loggerName("main")
    .team(system)
    .build();

// Load base workflow with production overlay
interpreter.readYaml(
    Path.of("workflows/base/deploy.yaml"),
    Path.of("workflows/overlays/production")
);
```

## Strategic Merge Patches

Patches modify base workflows using strategic merge logic. The key concept is the `label` field, which identifies which workflow step should be modified.

### Modifying Existing Steps

**Base workflow (base/deploy.yaml):**

```yaml
name: deploy-workflow
steps:
  - states: ["0", "1"]
    label: setup
    actions:
      - actor: deployer
        method: prepare
        arguments:
          timeout: 10000

  - states: ["1", "end"]
    label: deploy
    actions:
      - actor: deployer
        method: deploy
```

**Patch (overlays/production/patch-prod.yaml):**

```yaml
name: deploy-workflow
steps:
  - label: setup
    actions:
      - actor: deployer
        method: prepare
        arguments:
          timeout: 60000      # Override timeout for production
          retries: 5          # Add production-specific retry count
```

**Result after merge:**

```yaml
name: deploy-workflow
steps:
  - states: ["0", "1"]
    label: setup
    actions:
      - actor: deployer
        method: prepare
        arguments:
          timeout: 60000      # Overridden
          retries: 5          # Added

  - states: ["1", "end"]
    label: deploy
    actions:
      - actor: deployer
        method: deploy
```

### Adding New Steps

```yaml
name: deploy-workflow
steps:
  - label: setup           # Anchor: this step exists in base

  - label: validate        # New step: inserted after setup
    states: ["1", "2"]
    actions:
      - actor: validator
        method: validateConfig

  - label: deploy
    states: ["2", "end"]   # Updated states to accommodate new step
```

### Deleting Steps

```yaml
name: deploy-workflow
steps:
  - label: optional-step
    $delete: true
```

### Targeted Patches

```yaml
patches:
  - target: deploy.yaml
    patch: patch-deploy.yaml
  - target: cleanup.yaml
    patch: patch-cleanup.yaml
```

## Variable Substitution

Define variables in overlay-conf.yaml and reference them with `${varName}` syntax:

**overlay-conf.yaml:**

```yaml
vars:
  environment: production
  maxRetries: 5
  serviceUrl: https://api.prod.example.com
```

**Base workflow with variables:**

```yaml
name: api-workflow
steps:
  - states: ["0", "1"]
    label: call-api
    actions:
      - actor: api-client
        method: call
        arguments:
          url: "${serviceUrl}/data"
          retries: ${maxRetries}
          env: "${environment}"
```

### Default Values

```yaml
arguments:
  timeout: "${timeout:-30000}"    # Uses 30000 if timeout is not defined
  region: "${region:-us-east-1}"  # Uses us-east-1 if region is not defined
```

## Name Transformations

```yaml
namePrefix: prod-
nameSuffix: -v2
```

Effect:
- Workflow name `deploy-workflow` becomes `prod-deploy-workflow-v2`
- File name `deploy.yaml` becomes `prod-deploy-v2.yaml`
- References to workflows in `runWorkflow` and `call` actions are automatically updated

## Error Handling

If a patch contains new steps without any anchor steps, the kustomizer throws an `OrphanTransitionException`:

```java
try {
    kustomizer.build(overlayDir);
} catch (OrphanTransitionException e) {
    System.err.println("Patch has no anchor: " + e.getLabel());
    System.err.println("In file: " + e.getPatchFile());
}
```

## Best Practices

1. **Use meaningful labels**: Give each step in your base workflow a descriptive label. This makes patches more maintainable and self-documenting.

2. **Keep bases generic**: Design base workflows to be environment-agnostic. Use variables for any values that might differ between environments.

3. **Layer overlays when needed**: Overlays can reference other overlays in their `bases` field, allowing you to build up configurations in layers.

4. **Document your variables**: Keep a list of required variables for each base workflow so overlay authors know what to define.

5. **Use targeted patches for clarity**: When you have multiple workflow files, use the target/patch format to make it clear which patch applies to which file.
