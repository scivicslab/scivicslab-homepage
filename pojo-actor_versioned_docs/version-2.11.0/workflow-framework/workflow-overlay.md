---
sidebar_position: 5
title: Workflow Overlay
---

:::caution Newer Version Available
This is documentation for version 2.11.0. [See the latest version](/docs/pojo-actor/introduction).
:::

# Workflow Overlay

The `WorkflowKustomizer` class implements a Kustomize-like overlay system for POJO-actor workflows. It allows you to create base workflow definitions that can be customized for different environments (development, staging, production) without duplicating code. This approach keeps your workflows DRY (Don't Repeat Yourself) while enabling environment-specific variations.

The overlay system supports strategic merge patches, variable substitution, and name transformations—features inspired by Kubernetes Kustomize but adapted for workflow definitions.

## Core Concepts

### Base and Overlay Structure

A typical project structure separates base workflows from environment-specific overlays:

```
workflows/
├── base/
│   ├── deploy.yaml           # Base deployment workflow
│   ├── cleanup.yaml          # Base cleanup workflow
│   └── health-check.yaml     # Base health check workflow
└── overlays/
    ├── development/
    │   ├── overlay-conf.yaml # Development configuration
    │   └── patch-dev.yaml    # Development-specific patches
    ├── staging/
    │   ├── overlay-conf.yaml
    │   └── patch-staging.yaml
    └── production/
        ├── overlay-conf.yaml
        └── patch-prod.yaml
```

The base directory contains complete workflow definitions that work in any environment. The overlay directories contain configuration files that specify which base to use and how to modify it for that specific environment.

### The overlay-conf.yaml File

Each overlay directory must contain an `overlay-conf.yaml` file that tells the kustomizer what to do. This file specifies the base workflows to use, which patches to apply, variable values, and name transformations.

```yaml
apiVersion: pojoactor.scivicslab.com/v1
kind: OverlayConf

# Reference to the base workflows (relative path)
bases:
  - ../../base

# Patches to apply (in order)
patches:
  - patch-prod.yaml

# Variable substitutions
vars:
  environment: production
  nodeGroup: webservers
  timeout: 30000

# Optional name transformations
namePrefix: prod-
nameSuffix: -v2
```

## Using WorkflowKustomizer

The WorkflowKustomizer processes an overlay directory and produces merged workflow definitions that combine the base workflows with the overlay's patches and transformations.

### Basic Usage

```java
WorkflowKustomizer kustomizer = new WorkflowKustomizer();

// Build returns a map of filename -> workflow content
Map<String, Map<String, Object>> workflows = kustomizer.build(Path.of("overlays/production"));

// Or get the result as a YAML string
String yamlOutput = kustomizer.buildAsYaml(Path.of("overlays/production"));
```

### Loading in Interpreter

The Interpreter class has built-in support for loading workflows with overlays:

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

Patches modify base workflows using strategic merge logic. The key concept is the `vertexName` field, which identifies which workflow step should be modified.

### Modifying Existing Steps

To modify an existing step, create a patch with the same `vertexName`. The patch's content will be merged with the base step.

**Base workflow (base/deploy.yaml):**

```yaml
name: deploy-workflow
steps:
  - states: ["0", "1"]
    vertexName: setup
    actions:
      - actor: deployer
        method: prepare
        arguments:
          timeout: 10000

  - states: ["1", "end"]
    vertexName: deploy
    actions:
      - actor: deployer
        method: deploy
```

**Patch (overlays/production/patch-prod.yaml):**

```yaml
name: deploy-workflow
steps:
  - vertexName: setup
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
    vertexName: setup
    actions:
      - actor: deployer
        method: prepare
        arguments:
          timeout: 60000      # Overridden
          retries: 5          # Added

  - states: ["1", "end"]
    vertexName: deploy
    actions:
      - actor: deployer
        method: deploy
```

### Adding New Steps

To add a new step, include it in the patch after a step with an existing `vertexName` (called an anchor). The new step will be inserted immediately after the anchor.

**Patch with new step:**

```yaml
name: deploy-workflow
steps:
  - vertexName: setup           # Anchor: this step exists in base
    # No changes to setup itself

  - vertexName: validate        # New step: inserted after setup
    states: ["1", "2"]
    actions:
      - actor: validator
        method: validateConfig

  - vertexName: deploy
    states: ["2", "end"]        # Updated states to accommodate new step
```

### Deleting Steps

To delete a step from the base workflow, add `$delete: true` to the patch:

```yaml
name: deploy-workflow
steps:
  - vertexName: optional-step
    $delete: true
```

### Targeted Patches

You can apply patches to specific workflow files by using the target/patch format in overlay-conf.yaml:

```yaml
patches:
  - target: deploy.yaml
    patch: patch-deploy.yaml
  - target: cleanup.yaml
    patch: patch-cleanup.yaml
```

This is useful when you have multiple workflows and want different patches for each.

## Variable Substitution

Variables allow you to parameterize workflows with environment-specific values. Define variables in overlay-conf.yaml and reference them in workflows using `${varName}` syntax.

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
    vertexName: call-api
    actions:
      - actor: api-client
        method: call
        arguments:
          url: "${serviceUrl}/data"
          retries: ${maxRetries}
          env: "${environment}"
```

**Result after substitution:**

```yaml
name: api-workflow
steps:
  - states: ["0", "1"]
    vertexName: call-api
    actions:
      - actor: api-client
        method: call
        arguments:
          url: "https://api.prod.example.com/data"
          retries: 5
          env: "production"
```

### Default Values

Variables support default values using the `${VAR:-default}` syntax:

```yaml
arguments:
  timeout: "${timeout:-30000}"    # Uses 30000 if timeout is not defined
  region: "${region:-us-east-1}"  # Uses us-east-1 if region is not defined
```

## Name Transformations

Name transformations add prefixes or suffixes to workflow names and file names. This is useful for distinguishing workflows from different environments or versions.

**overlay-conf.yaml:**

```yaml
namePrefix: prod-
nameSuffix: -v2
```

**Effect:**
- Workflow name `deploy-workflow` becomes `prod-deploy-workflow-v2`
- File name `deploy.yaml` becomes `prod-deploy-v2.yaml`
- References to workflows in `runWorkflow` and `call` actions are automatically updated

## Complete Example

### Base Workflow (base/deploy.yaml)

```yaml
name: deploy-workflow
steps:
  - states: ["0", "1"]
    vertexName: prepare
    actions:
      - actor: deployer
        method: prepare
        arguments:
          environment: "${environment}"
          timeout: ${timeout}

  - states: ["1", "2"]
    vertexName: deploy
    actions:
      - actor: deployer
        method: deploy
        arguments:
          target: "${deployTarget}"

  - states: ["2", "end"]
    vertexName: verify
    actions:
      - actor: deployer
        method: verify
```

### Production Overlay (overlays/production/overlay-conf.yaml)

```yaml
apiVersion: pojoactor.scivicslab.com/v1
kind: OverlayConf

bases:
  - ../../base

patches:
  - patch-prod.yaml

vars:
  environment: production
  timeout: 60000
  deployTarget: prod-cluster

namePrefix: prod-
```

### Production Patch (overlays/production/patch-prod.yaml)

```yaml
name: deploy-workflow
steps:
  - vertexName: prepare
    # No changes, just acts as anchor

  - vertexName: backup
    states: ["1", "1.5"]
    actions:
      - actor: backup-service
        method: createBackup
        arguments:
          retention: 30

  - vertexName: deploy
    states: ["1.5", "2"]
    # States updated for new backup step
```

### Using the Overlay

```java
WorkflowKustomizer kustomizer = new WorkflowKustomizer();

// Build the production workflow
String yaml = kustomizer.buildAsYaml(Path.of("overlays/production"));
System.out.println(yaml);

// The output will be:
// - Named "prod-deploy-workflow"
// - Include the backup step between prepare and deploy
// - Have all variables substituted with production values
```

## Error Handling

### Orphan Vertex Exception

If a patch contains new steps without any anchor steps (existing steps with matching vertexName), the kustomizer throws an `OrphanVertexException`. This prevents accidentally adding steps to the wrong position.

```java
try {
    kustomizer.build(overlayDir);
} catch (OrphanVertexException e) {
    System.err.println("Patch has no anchor: " + e.getVertexName());
    System.err.println("In file: " + e.getPatchFile());
}
```

To fix this, ensure your patch includes at least one step with a vertexName that exists in the base workflow.

## Best Practices

1. **Use meaningful vertexNames**: Give each step in your base workflow a descriptive vertexName. This makes patches more maintainable and self-documenting.

2. **Keep bases generic**: Design base workflows to be environment-agnostic. Use variables for any values that might differ between environments.

3. **Layer overlays when needed**: Overlays can reference other overlays in their `bases` field, allowing you to build up configurations in layers.

4. **Document your variables**: Keep a list of required variables for each base workflow so overlay authors know what to define.

5. **Use targeted patches for clarity**: When you have multiple workflow files, use the target/patch format to make it clear which patch applies to which file.
