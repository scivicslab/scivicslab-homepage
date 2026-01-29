---
id: argument-formats
title: Workflow Argument Formats
sidebar_position: 3
---

# Workflow Argument Formats

## Problem Definition

### Background: @Action Method Design

actor-IaC's `@Action` methods are always called with **a single String argument**.

```java
@Action("doSomething")
public ActionResult doSomething(String arg) {
    // arg receives a JSON string
}
```

The content written in the `arguments` field of workflow YAML is converted to a JSON string and passed to this `arg`. It is the method's responsibility to parse it appropriately.

### Conversion Rules

| YAML Format | Value Passed to arg | Parsing Method |
|-------------|---------------------|----------------|
| `arguments: "value"` | `["value"]` | `new JSONArray(arg).getString(0)` |
| `arguments: ["a", "b"]` | `["a", "b"]` | `new JSONArray(arg)` |
| `arguments: {k: v}` | `{"k": "v"}` | `new JSONObject(arg)` |

Strings and arrays are converted to JSON arrays, objects are converted to JSON objects.

### Problem 1: Which Format to Use?

When writing workflow YAML, it's unclear which format to use for a given method's arguments.

```yaml
# Does executeCommand expect a string? Array? Object?
- actor: node
  method: executeCommand
  arguments: ???
```

### Problem 2: Unknown Argument Names

When using object format, it's unclear which field names (keys) are available.

```yaml
- actor: transitionViewer
  method: showTransitions
  arguments:
    ???: ???  # Which field names are available?
```

---

## How to do it

### Answer to Problem 1: Check the @Action Method Definition

How the `@Action` method expects and handles arguments is defined solely in that method.

**Workflow authors should read the Javadoc or source code of the method they want to call.**

```java
/**
 * Executes a shell command on this node.
 *
 * @param arg JSON array containing the command string.
 *            Example: ["ls -la"] or "ls -la" (auto-wrapped to array)
 * @return ActionResult with command output
 */
@Action("executeCommand")
public ActionResult executeCommand(String arg) {
    JSONArray args = new JSONArray(arg);
    String command = args.getString(0);
    // ...
}
```

From this Javadoc, you can see that `executeCommand` accepts arguments in string or array format.

```yaml
- actor: node
  method: executeCommand
  arguments: "ls -la"
```

### Answer to Problem 2: Check the POJO Method Parameter Names

**Rule: JSON object field names should match POJO method parameter names**

`@Action` methods ultimately call POJO methods. Object format field names should match the POJO method's parameter names.

```java
// POJO method
public class TransitionViewer {
    public void showTransitions(String target, long session, boolean includeChildren) {
        // ...
    }
}
```

↓ Corresponding YAML

```yaml
- actor: transitionViewer
  method: showTransitions
  arguments:
    target: "nodeGroup"
    session: 42
    includeChildren: true
```

Looking at the POJO method signature reveals the available field names.

### @Action Method Implementer's Responsibilities

When implementing `@Action` methods, follow these guidelines:

1. **JSON object field names must match POJO method parameter names**
2. **Document expected argument format in Javadoc** - JSON array or JSON object
3. **Include examples in Javadoc** - Concrete YAML usage

```java
/**
 * Shows transition history for specified actor.
 *
 * @param arg JSON object with optional fields:
 *            - target (String): Actor name pattern (default: "")
 *            - session (long): Session ID (default: current session)
 *            - includeChildren (boolean): Include child actors (default: false)
 *
 * Example YAML:
 * <pre>
 * arguments:
 *   target: "nodeGroup"
 *   session: 42
 * </pre>
 */
@Action("showTransitions")
public ActionResult showTransitions(String arg) {
    JSONObject json = new JSONObject(arg);
    String target = json.optString("target", "");
    long session = json.optLong("session", -1);
    boolean includeChildren = json.optBoolean("includeChildren", false);
    // ...
}
```

---

## Under the hood

### @Action Method Responsibilities

`@Action` methods have the following responsibilities:

1. **Receive a String argument** - Signature is `ActionResult method(String arg)`
2. **Parse appropriately** - Convert to `JSONArray` or `JSONObject` based on expected format
3. **Execute processing** - Perform actual processing using parsed values
4. **Return result** - Return success/failure and result message via `ActionResult`
5. **Document argument format in Javadoc** - So workflow authors can reference it

### Interpreter's Conversion Processing

The `Interpreter` class converts YAML arguments to JSON strings:

```java
private String convertArgumentsToJson(Object arguments) {
    if (arguments == null) {
        return "[]";
    }
    if (arguments instanceof String) {
        // String is wrapped in array
        return new JSONArray().put(arguments).toString();
    }
    if (arguments instanceof List) {
        // Array is converted as-is
        return new JSONArray((List<?>) arguments).toString();
    }
    if (arguments instanceof Map) {
        // Object is converted as-is (not wrapped in array)
        return new JSONObject((Map<?, ?>) arguments).toString();
    }
    return arguments.toString();
}
```

### Method Design Conventions

Recommended conventions when implementing new `@Action` methods:

| Case | Recommended Format | Reason |
|------|-------------------|--------|
| Single value (command, path, etc.) | JSONArray | Simple to write |
| Multiple positional arguments | JSONArray | Order is clear |
| Named/optional arguments | JSONObject | Meaning is clear from key names |
