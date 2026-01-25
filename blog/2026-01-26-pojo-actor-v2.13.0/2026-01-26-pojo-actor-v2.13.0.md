---
slug: pojo-actor-v2.13.0
title: POJO-actor v2.13.0 Released
authors: [devteam]
date: 2026-01-26
tags: [release, pojo-actor]
---

:::info[Links]
- **Original**: [scivicslab.com](https://scivicslab.com/blog/pojo-actor-v2.13.0)
- **Documentation**: [POJO-actor Docs](https://scivicslab.com/docs/pojo-actor/introduction)
- **GitHub**: [scivicslab/POJO-actor](https://github.com/scivicslab/POJO-actor)
- **Javadoc**: [API Reference](https://scivicslab.github.io/POJO-actor/)
- **Maven Central**: [com.scivicslab:pojo-actor](https://central.sonatype.com/artifact/com.scivicslab/pojo-actor)
:::

We are pleased to announce the release of **POJO-actor v2.13.0**.

This release brings JSON State variable expansion fixes and Java plugin support enhancements.

<!-- truncate -->

## JSON State Variable Expansion Fix

Fixed `${json.key}` variable expansion in `ActorRef.expandVariables()` to properly strip the `json.` prefix before lookup. This ensures reliable data passing between workflow steps.

Previously, `${json.hostname}` would fail to expand because the code was looking for a key literally named `json.hostname`. Now it correctly strips the prefix and looks up `hostname` in the JSON state.

## JSON State API

Added `putJson`/`getJson` methods to ActorRef for workflow state management:

```java
// Store values in JSON state
actor.putJson("hostname", "server01");
actor.putJson("config/timeout", 30);

// Retrieve values
String host = actor.getJson("hostname");
```

In workflows, you can now use both `${result}` (previous action result) and `${json.key}` (stored state):

```yaml
# Store hostname in JSON state
- actor: this
  method: putJson
  arguments:
    path: hostname
    value: "${result}"

# Use stored value later
- actor: checker
  method: check
  arguments:
    hostname: "${json.hostname}"
```

## CallableByActionName Interface

A new interface for string-based action invocation, making it easy to implement plugins that can be called from workflows:

```java
public class MyPlugin implements CallableByActionName {
    @Override
    public ActionResult callByActionName(String actionName, String args) {
        return switch (actionName) {
            case "check" -> doCheck(args);
            default -> new ActionResult(false, "Unknown action");
        };
    }
}
```

## DynamicActorLoaderActor Improvements

Enhanced with JAR loading and child actor creation capabilities:

- `loadJar(path)`: Dynamically load external JARs at runtime
- `createChild(parent, name, className)`: Create plugin actors from loaded classes

```yaml
# Load plugin JAR
- states: ["0", "1"]
  actions:
    - actor: loader
      method: loadJar
      arguments: ["../plugins/my-plugin.jar"]

# Create plugin actor
- states: ["1", "2"]
  actions:
    - actor: loader
      method: createChild
      arguments: ["this", "myPlugin", "com.example.MyPlugin"]
```

## Testing

Added 6 new unit tests for variable expansion:
- JSON prefix variable expansion (`${json.key}`)
- Direct variable expansion (`${key}`)
- Nested path expansion
- Multiple variables in single string
- Unknown variable handling
- Result variable expansion (`${result}`)

**Total tests: 310+**

## Upgrade

Update your `pom.xml`:

```xml
<dependency>
    <groupId>com.scivicslab</groupId>
    <artifactId>pojo-actor</artifactId>
    <version>2.13.0</version>
</dependency>
```

## Links

- [GitHub Release](https://github.com/scivicslab/POJO-actor/releases/tag/v2.13.0)
- [Maven Central](https://central.sonatype.com/artifact/com.scivicslab/pojo-actor/2.13.0)
