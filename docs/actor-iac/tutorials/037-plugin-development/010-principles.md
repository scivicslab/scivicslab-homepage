---
id: principles
title: Plugin Development Principles
sidebar_position: 1
---

# Plugin Development Principles

This document explains the basic principles common to all plugins.

## POJO + IIAR Architecture

Plugins must always consist of two classes:

| Class | Role |
|-------|------|
| **POJO** | Pure Java class containing business logic |
| **IIAR** | Inherits `IIActorRef<POJO>`, exposes methods with `@Action` |

```
┌─────────────────────────────────────────────┐
│  IIAR (MyFeatureIIAR)                       │
│  extends IIActorRef<MyFeature>              │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │  POJO (MyFeature)                     │  │
│  │  - Business logic                     │  │
│  │  - No framework dependencies          │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  @Action("doSomething")                     │
│  public ActionResult doSomething(String)   │
└─────────────────────────────────────────────┘
```

### Why Separate?

1. **Testability**: POJOs are easy to unit test
2. **Reusability**: Business logic can be reused in other contexts
3. **Change Resistance**: Minimizes impact when framework changes

## Project Structure

```
my-plugin/
├── pom.xml
└── src/main/java/com/example/plugin/
    ├── MyFeature.java           # POJO
    └── MyFeatureIIAR.java       # IIAR
```

## pom.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>my-plugin</artifactId>
    <version>1.0.0</version>

    <properties>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
    </properties>

    <dependencies>
        <!-- POJO-actor (provided - host provides) -->
        <dependency>
            <groupId>com.scivicslab</groupId>
            <artifactId>pojo-actor</artifactId>
            <version>2.14.0</version>
            <scope>provided</scope>
        </dependency>

        <!-- actor-IaC (provided - host provides) -->
        <dependency>
            <groupId>com.scivicslab</groupId>
            <artifactId>actor-IaC</artifactId>
            <version>2.14.0</version>
            <scope>provided</scope>
        </dependency>

        <!-- Plugin-specific dependencies (include in JAR) -->
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <version>2.2.224</version>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-shade-plugin</artifactId>
                <version>3.5.1</version>
                <executions>
                    <execution>
                        <phase>package</phase>
                        <goals><goal>shade</goal></goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

### Dependency Scopes

| Dependency | Scope | Reason |
|------------|-------|--------|
| pojo-actor | provided | Host (actor-IaC) provides, not included in JAR |
| actor-IaC | provided | Host provides, not included in JAR |
| Others | compile | Plugin-specific, included in JAR |

Dependencies with `provided` scope are not included in the JAR. Dependencies with `compile` scope are included in the JAR by maven-shade-plugin.

## Basic IIAR Structure

```java
package com.example.plugin;

import com.scivicslab.pojoactor.core.Action;
import com.scivicslab.pojoactor.core.ActionResult;
import com.scivicslab.pojoactor.workflow.IIActorRef;
import com.scivicslab.pojoactor.workflow.IIActorSystem;

public class MyFeatureIIAR extends IIActorRef<MyFeature> {

    public MyFeatureIIAR(String actorName, IIActorSystem system) {
        super(actorName, new MyFeature(), system);
        // Initialization
    }

    @Action("doSomething")
    public ActionResult doSomething(String args) {
        String result = object.doSomething(args);
        return new ActionResult(true, result);
    }
}
```

### Constructor Signature

The IIAR constructor must have the following signature:

```java
public MyFeatureIIAR(String actorName, IIActorSystem system)
```

`loader.createChild` calls this constructor via reflection.

### `@Action` Annotation

Methods callable from workflows must have `@Action`:

```java
@Action("actionName")
public ActionResult methodName(String args) {
    // Argument is always String (for distributed messaging)
    return new ActionResult(success/failure, result string);
}
```

### `object` Field

`IIActorRef<T>` holds the POJO instance in the `object` field. Call POJO methods from IIAR:

```java
String result = object.doSomething(args);
```

## Obtaining DB Connection and Session ID

Many plugins require access to the log DB. Obtain using this pattern:

```java
private void initializeFromSystem() {
    // Get DB connection from DistributedLogStore
    DistributedLogStore logStore = DistributedLogStore.getInstance();
    if (logStore != null) {
        Connection conn = logStore.getConnection();
        if (conn != null) {
            object.setConnection(conn);
        }
    }

    // Get session ID from nodeGroup
    IIActorRef<?> nodeGroup = ((IIActorSystem) actorSystem).getIIActor("nodeGroup");
    if (nodeGroup != null) {
        ActionResult result = nodeGroup.callByActionName("getSessionId", "");
        if (result.isSuccess()) {
            long sessionId = Long.parseLong(result.getResult());
            object.setSessionId(sessionId);
        }
    }
}
```

## Actor Name Encoding

You can embed options in actor names to pass settings at creation time:

```java
public MyFeatureIIAR(String actorName, IIActorSystem system) {
    super(actorName, new MyFeature(), system);
    parseActorName(actorName);
}

private void parseActorName(String actorName) {
    // Format: "myFeature:option1:option2"
    String[] parts = actorName.split(":", 3);
    if (parts.length >= 2) {
        object.setOption1(parts[1]);
    }
    if (parts.length >= 3) {
        object.setOption2(parts[2]);
    }
}
```

Workflow usage:

```yaml
- actor: loader
  method: createChild
  arguments: ["ROOT", "myFeature:value1:value2", "com.example.plugin.MyFeatureIIAR"]
```

## Build and Deploy

### Build

```bash
cd my-plugin
mvn package
```

### Deploy

Place the generated JAR in the `plugins/` directory:

```
actor-IaC/plugins/my-plugin-1.0.0.jar
```

### Workflow Usage

```yaml
# Load JAR
- actor: loader
  method: loadJar
  arguments: ["plugins/my-plugin-1.0.0.jar"]

# Create actor
- actor: loader
  method: createChild
  arguments: ["ROOT", "myFeature", "com.example.plugin.MyFeatureIIAR"]

# Call action
- actor: myFeature
  method: doSomething
  arguments: ["argument"]
```

## Debugging Tips

| Problem | Cause | Solution |
|---------|-------|----------|
| ClassNotFoundException | JAR not loaded | Check `loadJar` path |
| NoSuchMethodException | Wrong constructor signature | Verify `(String, IIActorSystem)` |
| connection is null | `DistributedLogStore` not initialized | Create after workflow execution |
| sessionId is -1 | `nodeGroup` doesn't exist | Create plugin after `nodeGroup` creation |
