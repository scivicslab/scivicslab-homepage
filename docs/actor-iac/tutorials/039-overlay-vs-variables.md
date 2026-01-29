---
id: overlay-vs-variables
title: Overlay vs Variables - Choosing Configuration Methods
sidebar_position: 39
---

# Overlay vs Variables - Choosing Configuration Methods

## Problem Definition

### Supporting Multi-User, Multi-Environment

There are situations where you want to share workflows among multiple users or environments. For example, on a shared server, two users alice and bob each want to build and deploy their own Docusaurus documentation.

When analyzing the differences in workflows, they can be categorized as follows:

```
Types of differences:
├── [A] Account name (alice / bob)
├── [B] Document list file path
└── [C] Environment-specific settings (deploy target server, etc.)
```

Without properly handling these differences, you end up copying entire workflow files for each user. As copies increase, you need to update all files when changing common logic, severely degrading maintainability.

### Two Approaches

actor-IaC provides two mechanisms for workflow customization.

**Variable Substitution**: Values defined in the `vars` section of `overlay-conf.yaml` are expanded into `${variableName}` placeholders in workflows. This is simple string replacement—no conditionals or loops.

```yaml
# overlay-conf.yaml
vars:
  username: alice

# In workflow
- "echo Hello, ${username}"
# → Expands to "echo Hello, alice"
```

**Overlay (Patch)**: Overwrites, adds, or deletes specific steps in the base workflow entirely. Differences can be applied at the YAML structure level.

```yaml
# patch.yaml
steps:
  - vertexName: deploy-docs
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - "rsync -av ./build/ remote-server:/var/www/"
```

How to use these two is the key to maintainable workflow design.

---

## How to do it

### When to Use Variables

Variables are suited for simple value substitution. Choose variables when the same value is used in multiple places or when conditionals are not needed.

| Use Case | Example |
|----------|---------|
| Username / Account name | `${username}` → alice, bob |
| File path | `${doclist_path}` → /path/to/list.txt |
| Server name / URL | `${server}` → localhost, 192.168.5.1 |
| Configuration value | `${retention_days}` → 7, 30 |

The base workflow references variables:

```yaml
# setup-sub.yaml (base workflow)
name: DocuSearchSetupWorkflow

steps:
  - states: ["0", "1"]
    vertexName: check-doclist
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            DOCLIST=$HOME/docu-search/overlays/${username}/document_list-${username}.txt
            if [ -f "$DOCLIST" ]; then
              echo "[OK] Document list found"
            else
              echo "[ERROR] Document list not found: $DOCLIST"
              exit 1
            fi
```

Each user's overlay configuration only needs `vars` definitions:

```yaml
# overlays/alice/overlay-conf.yaml
apiVersion: pojoactor.scivicslab.com/v1
kind: OverlayConf

bases:
  - ../..

vars:
  username: alice
```

```yaml
# overlays/bob/overlay-conf.yaml
apiVersion: pojoactor.scivicslab.com/v1
kind: OverlayConf

bases:
  - ../..

vars:
  username: bob
```

This centralizes build logic in the base workflow. Changes to common logic only require modifying the base.

### When to Use Overlay (Patch)

Overlays are suited for structural changes. Choose overlays when you need to add/delete steps or significantly change processing content.

| Use Case | Approach |
|----------|----------|
| Change step processing content | Match by `vertexName` and overwrite `actions` |
| Add new step | Add new step in patch |
| Delete unnecessary step | Use `$delete: true` marker |
| Change multiple fields simultaneously | Overwrite entire structure with patch |

**Example 1: Only bob wants to deploy to remote server**

Alice deploys to local `~/public_html`, but bob wants to deploy to a different server. In this case, the deploy step content itself differs, so a patch is needed.

```yaml
# overlays/bob/patch.yaml
steps:
  - vertexName: deploy-to-public-html
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            DOCLIST=$HOME/docu-search/overlays/${username}/document_list-${username}.txt
            while IFS= read -r path || [ -n "$path" ]; do
              case "$path" in '#'*|'') continue ;; esac
              DOC_NAME=$(basename "$path")
              echo "=== Deploying $DOC_NAME to remote server ==="
              rsync -av "$path/build/" bob@192.168.5.1:/home/bob/public_html/$DOC_NAME/
            done < "$DOCLIST"
```

**Example 2: Only bob wants to delete a specific step**

Bob's environment doesn't use OpenSearch, so he wants to delete the installation step.

```yaml
# overlays/bob/patch.yaml
steps:
  - vertexName: install-opensearch
    $delete: true
```

### Pattern to Avoid: Handling Everything with Overlays

Handling simple value differences with overlays causes code duplication. Here's a bad example:

```yaml
# overlays/bob/patch.yaml (bad example)
steps:
  - vertexName: check-doclist
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            # Just replaced alice with bob...
            DOCLIST=$HOME/docu-search/document_list-bob.txt
            # Same logic as alice follows...
```

With this pattern, you need to update both alice and bob versions whenever you change build logic. Using variables, you only need to modify the base workflow.

### Steps to Add a New User

Here are the steps to add a new user charlie:

```bash
# 1. Create overlay directory
mkdir -p docu-search/overlays/charlie

# 2. Create overlay-conf.yaml (just variable definitions)
cat > docu-search/overlays/charlie/overlay-conf.yaml << 'EOF'
apiVersion: pojoactor.scivicslab.com/v1
kind: OverlayConf

bases:
  - ../..

vars:
  username: charlie
EOF

# 3. Create document list
cat > docu-search/overlays/charlie/document_list-charlie.txt << 'EOF'
/home/charlie/works/doc_ProjectA
/home/charlie/works/doc_ProjectB
EOF

# 4. Execute
./actor_iac.java --dir ./docu-search --workflow setup \
    --overlay ./docu-search/overlays/charlie
```

If charlie needs special settings, add a `patch.yaml` and describe it in the `patches` section of `overlay-conf.yaml`. It can be omitted if not needed.

---

## Under the hood

### Kustomize Philosophy

actor-IaC's overlay feature is based on the philosophy of Kubernetes Kustomize. Kustomize enables per-environment customization while avoiding the complexity of template engines like Helm.

**Base is fully working YAML**: The base workflow is executable standalone and performs meaningful processing without overlays. It's not template hole-filling.

**Overlay describes only differences**: Patches only contain parts you want to change. Unchanged parts use the base as-is.

**Logic doesn't go in YAML**: Conditionals and loops are done in the workflow engine (Interpreter) or shell scripts. YAML focuses on describing data structures.

### Problems with Helm Templates

Taking variable substitution to extremes leads to template engines like Helm, which is what Kustomize tries to avoid.

```yaml
# Helm template (overly complex example)
{{- if .Values.opensearch.enabled }}
steps:
  {{- if eq .Values.environment "production" }}
  - vertexName: install-opensearch-cluster
    actions:
      {{- range $i, $node := .Values.opensearch.nodes }}
      - actor: this
        method: executeCommand
        arguments:
          - |
            {{- if $node.master }}
            ./setup-master.sh {{ $node.host }}
            {{- else }}
            ./setup-data.sh {{ $node.host }}
            {{- end }}
      {{- end }}
  {{- end }}
{{- end }}
```

This template has intertwined conditionals and loops, making the final output unclear just from looking at the YAML. Debugging is also difficult.

### Variable Expansion Mechanism

actor-IaC's variable expansion occurs when loading workflows. Values defined in the `vars` section of `overlay-conf.yaml` replace `${variableName}` in workflow YAML.

```java
// Pseudocode
String workflow = loadYaml("setup-sub.yaml");
Map<String, String> vars = loadOverlayConf("overlay-conf.yaml").getVars();

for (Map.Entry<String, String> entry : vars.entrySet()) {
    workflow = workflow.replace("${" + entry.getKey() + "}", entry.getValue());
}
```

This is simple string replacement with no type checking or conditionals. If complex logic is needed, do it in shell scripts.

### Patch Application Mechanism

Patches match base workflow steps using `vertexName` as the key, overwriting the matched step's content.

```java
// Pseudocode
List<Step> baseSteps = loadWorkflow("setup-sub.yaml").getSteps();
List<Step> patchSteps = loadPatch("patch.yaml").getSteps();

for (Step patchStep : patchSteps) {
    Step baseStep = findByVertexName(baseSteps, patchStep.getVertexName());
    if (baseStep != null) {
        if (patchStep.isDelete()) {
            baseSteps.remove(baseStep);
        } else {
            mergeStep(baseStep, patchStep);  // Overwrite actions, etc.
        }
    } else {
        baseSteps.add(patchStep);  // Add as new step
    }
}
```

### Decision Criteria Summary

| Aspect | Use Variables | Use Overlay |
|--------|---------------|-------------|
| Nature of difference | Simple value (string) | Structural change |
| Frequency | Same value in multiple places | Only specific steps |
| Maintainability | Centralized in base | Describe only for environments needing patches |
| Complexity | Low (string replacement) | Medium (YAML structure manipulation) |
