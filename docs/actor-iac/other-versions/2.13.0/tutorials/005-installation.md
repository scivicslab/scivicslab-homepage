---
id: installation
title: Installing actor-IaC
sidebar_position: 5
---

:::caution Newer Version Available
This is documentation for version 2.13.0. [See the latest version](/docs/actor-iac/introduction).
:::

## Problem Definition

Build actor-IaC from source code and complete verification of operation.


## How to do it

### Prerequisites

The following software is required.

| Software | Version | Purpose |
|----------|---------|---------|
| Java (JDK) | 21 or higher | Runtime environment for actor-IaC |
| Maven | 3.8 or higher | Building actor-IaC |
| Git | Any | Obtaining source code |

Verify the Java version.

```bash
java -version
```

```
openjdk version "21.0.2" 2024-01-16
OpenJDK Runtime Environment (build 21.0.2+13-Ubuntu-222.04.1)
OpenJDK 64-Bit Server VM (build 21.0.2+13-Ubuntu-222.04.1, mixed mode, sharing)
```

If Java 21 is not installed, install it using SDKMAN.

```bash
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk install java 21-tem      # Temurin 21
sdk install maven 3.9.12
```

### Build

Obtain and build the source code.

```bash
git clone https://github.com/scivicslab/actor-IaC.git
cd actor-IaC
mvn clean install
```

After the build completes, Maven generates `target/actor-IaC-2.12.0.jar`.

### Startup Methods

actor-IaC has three startup methods.

| Method | Command | Features |
|--------|---------|----------|
| Direct JAR execution | `java -jar target/actor-IaC-2.12.0.jar` | Works with JDK only |
| JBang launcher | `./actor_iac.java` | Automatically resolves JAR path |
| Native binary | `./actor-iac` | Fast startup, no JDK required |

First, verify operation with direct JAR execution.

```bash
java -jar target/actor-IaC-2.12.0.jar --help
```

```
actor-IaC 2.12.0
Usage: java -jar actor-IaC-2.12.0.jar [COMMAND]
Commands:
  run         Execute actor-IaC workflows
  list        List workflows
  describe    Display workflow descriptions
  log-info    Display workflow execution logs
  log-server  Serve H2 TCP server for logging
  merge-logs  Merge log databases
```

### Verification

Execute a Hello World workflow.

```bash
mkdir -p ~/my-workflows
cd ~/my-workflows
```

Create the file `hello-world.yaml`.

```yaml
name: Hello World Workflow
steps:
  - transitionName: say-hello
    states: ["0", "1"]
    actions:
      - actor: nodeGroup
        method: localExec
        arguments:
          - "echo"
          - "Hello, actor-IaC!"
```

Execute the workflow.

```bash
java -jar ~/actor-IaC/target/actor-IaC-2.12.0.jar run -w hello-world.yaml
```

```
Hello, actor-IaC!
Workflow completed successfully
```


## Under the hood

### How the JBang Launcher Works

When you git clone actor-IaC, a JBang script called `actor_iac.java` is included. This script automatically detects and executes the actor-IaC JAR file.

JAR file search order:

1. Path specified by the environment variable `ACTOR_IAC_JAR`
2. Maven local repository `~/.m2/repository/com/scivicslab/actor-IaC/<VERSION>/actor-IaC-<VERSION>.jar`

When you execute `mvn install`, the JAR file is installed to the Maven local repository. The JBang launcher automatically finds and executes this JAR.

To use JBang, install JBang in advance.

```bash
sdk install jbang
```

Copy `actor_iac.java` to your workflow directory and use it.

```bash
cp ~/actor-IaC/actor_iac.java ~/my-workflows/
cd ~/my-workflows
./actor_iac.java run -w hello-world.yaml
```

JBang compiles the script and caches it on the first run. Subsequent runs use the cache, making startup faster.
