---
id: installation
sidebar_position: 1
title: "Installation"
description: "How to install Turing-workflow. Covers building from source, three execution methods, and generating native binaries."
keywords:
  - Turing-workflow
  - installation
  - JBang
  - native-image
  - GraalVM
---

# Installation

## Problem Definition

Build Turing-workflow from source code and verify that it works correctly. Turing-workflow offers three execution methods: direct JAR execution, JBang launcher, and native binary. Choose the appropriate method based on your use case.

## How to do it

### Prerequisites

The following software is required.

| Software | Version | Purpose |
|----------|---------|---------|
| Java (JDK) | 21 or later | Runtime environment for Turing-workflow |
| Maven | 3.8 or later | Building Turing-workflow |
| Git | Any | Obtaining the source code |

Verify your Java version.

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

### Building from Source

Clone the source code and build it.

```bash
git clone https://github.com/scivicslab/Turing-workflow.git
cd Turing-workflow
mvn clean install
```

When the build completes, `target/Turing-workflow-3.0.0.jar` is generated.

### Three Execution Methods

Turing-workflow offers three execution methods.

| Method | Command | Characteristics |
|--------|---------|-----------------|
| Direct JAR execution | `java -jar target/Turing-workflow-3.0.0.jar` | Requires only JDK |
| JBang launcher | `./turing_workflow.java` | Automates JAR path resolution |
| Native binary | `./turing-workflow` | Fast startup, no JDK required |

First, verify operation using direct JAR execution.

```bash
java -jar target/Turing-workflow-3.0.0.jar --help
```

```
Turing-workflow 3.0.0
Usage: java -jar Turing-workflow-3.0.0.jar [COMMAND]
Commands:
  run         Execute Turing-workflow workflows
  list        List workflows
  describe    Display workflow descriptions
  log-info    Display workflow execution logs
  merge-logs  Merge log databases
```

### Verification (Hello World Workflow)

Run a Hello World workflow to verify that everything works correctly.

```bash
mkdir -p ~/my-workflows
cd ~/my-workflows
```

Create a file named `hello-world.yaml`.

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
          - "Hello, Turing-workflow!"
```

Execute the workflow.

```bash
java -jar ~/Turing-workflow/target/Turing-workflow-3.0.0.jar run -w hello-world.yaml
```

```
Hello, Turing-workflow!
Workflow completed successfully
```

### JBang Launcher

When you clone Turing-workflow, a JBang script called `turing_workflow.java` is included. To use JBang, install it beforehand.

```bash
sdk install jbang
```

Copy `turing_workflow.java` to your workflow directory and use it.

```bash
cp ~/Turing-workflow/turing_workflow.java ~/my-workflows/
cd ~/my-workflows
./turing_workflow.java run -w hello-world.yaml
```

JBang compiles and caches the script on first execution. Subsequent runs use the cache, resulting in faster startup.

### Building a Native Binary

Building as a native binary enables execution on environments without JDK installed.

#### Prerequisites

GraalVM version 21 or later must be installed.

```bash
sdk install java 21.0.2-graalce
```

Verify that the `native-image` command is available.

```bash
native-image --version
```

```
native-image 21.0.2 2024-01-16
GraalVM Runtime Environment GraalVM CE 21.0.2+13.1 (build 21.0.2+13-jvmci-23.1-b30)
```

#### Building

In the Turing-workflow directory, build the uber JAR and generate the native binary with `native-image`.

```bash
cd ~/Turing-workflow
mvn clean package
```

```bash
native-image \
  -jar target/Turing-workflow-3.0.0.jar \
  -o turing-workflow \
  --no-fallback \
  -H:+ReportExceptionStackTraces \
  --initialize-at-build-time=org.yaml.snakeyaml \
  --initialize-at-run-time=com.jcraft.jsch
```

The build takes several minutes. When complete, `turing-workflow` is generated.

#### Usage

```bash
chmod +x turing-workflow
./turing-workflow --help
```

The native binary requires neither JVM nor JBang. You can copy it to any directory and use it.

## Under the Hood

### How the JBang Launcher Works

`turing_workflow.java` is a JBang script that automatically detects and runs the Turing-workflow JAR file. The JAR file search order is as follows.

1. Path specified by the `TURING_WORKFLOW_JAR` environment variable
2. Maven local repository `~/.m2/repository/com/scivicslab/turingworkflow/Turing-workflow/<VERSION>/Turing-workflow-<VERSION>.jar`

Running `mvn install` installs the JAR file to the Maven local repository. The JBang launcher automatically finds and runs the JAR from the Maven local repository.

### Meaning of native-image Options

| Option | Meaning |
|--------|---------|
| `--no-fallback` | Disables JVM fallback. Generates a pure native binary |
| `-H:+ReportExceptionStackTraces` | Displays stack traces when exceptions occur |
| `--initialize-at-build-time=org.yaml.snakeyaml` | Initializes SnakeYAML at build time. Speeds up startup |
| `--initialize-at-run-time=com.jcraft.jsch` | Initializes JSch (SSH) at runtime. Required for native image compatibility |

### Startup Time Comparison

| Method | Startup Time (approximate) |
|--------|---------------------------|
| Direct JAR execution | 1-2 seconds |
| JBang launcher | 1-2 seconds (after caching) |
| Native binary | Less than 0.1 seconds |

Native binaries start quickly but take time to build. It is common to use direct JAR execution or JBang during development and native binaries for production distribution.
