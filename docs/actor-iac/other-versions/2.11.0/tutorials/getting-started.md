---
sidebar_position: 1
title: Installation Guide
---

:::caution Newer Version Available
This is documentation for version 2.11.0. [See the latest version](/docs/actor-iac/introduction).
:::

# Installation Guide

This tutorial explains the procedure for the user to install actor-IaC and make it ready for use.

## Prerequisites

The user requires the following software to use actor-IaC:

| Software | Version | Purpose |
|----------|---------|---------|
| Java (JDK) | 21 or later | Runtime environment for actor-IaC |
| Maven | 3.8 or later | Building actor-IaC |
| Git | Any | Obtaining actor-IaC source code |

The following software is optional:

| Software | Version | Purpose |
|----------|---------|---------|
| JBang | 0.100 or later | Running the launcher script |
| GraalVM | 21 or later | Compiling to native binary |

### Verifying Java Installation

The user executes the following command in the terminal to verify the Java version:

```bash
java -version
```

The JVM displays output similar to the following:

```
openjdk version "21.0.2" 2024-01-16
OpenJDK Runtime Environment (build 21.0.2+13-Ubuntu-222.04.1)
OpenJDK 64-Bit Server VM (build 21.0.2+13-Ubuntu-222.04.1, mixed mode, sharing)
```

If the Java version is less than 21, the user is recommended to install Java using [SDKMAN](https://sdkman.io/). If the user plans to use native compilation, the user is recommended to install GraalVM from the start.

The user executes the following commands to install SDKMAN:

```bash
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
```

The user executes the following command to check available GraalVM versions in SDKMAN:

```bash
sdk list java | grep graal
```

SDKMAN displays output similar to the following:

```
 GraalVM CE    |     | 25.0.1       | graalce |            | 25.0.1-graalce
               |     | 24.0.2       | graalce | installed  | 24.0.2-graalce
               |     | 21.0.2       | graalce |            | 21.0.2-graalce
 GraalVM Oracle|     | 25.0.1       | graal   |            | 25.0.1-graal
               |     | 21.0.9       | graal   |            | 21.0.9-graal
```

Each column in the output shows, from left to right: "Distribution Name", "Status Flag", "Version", "Vendor", "Installation Status", and "Identifier". The user installs Java using the Identifier shown at the right end (e.g., `21.0.2-graalce`):

```bash
sdk install java 21.0.2-graalce   # To install GraalVM CE 21
sdk install java 21-tem           # To install Temurin 21
```

If the user plans to use native compilation, the user installs GraalVM. GraalVM includes the native-image command.

### Installing Maven

The user executes the following command to check available Maven versions in SDKMAN:

```bash
sdk list maven
```

SDKMAN displays output similar to the following:

```
================================================================================
Available Maven Versions
================================================================================
     4.0.0-rc-5          3.8.9               3.5.2
     4.0.0-rc-4          3.8.8               3.5.0
     3.9.12              3.8.7               3.3.9
 > * 3.9.11              3.8.6               3.3.3
     ...
================================================================================
+ - local version
* - installed
> - currently in use
================================================================================
```

The user installs Maven by specifying the latest version of the 3.x series (e.g., `3.9.12`):

```bash
sdk install maven 3.9.12
```

The user executes the following command to verify the Maven installation:

```bash
mvn -version
```

Maven displays output similar to the following:

```
Apache Maven 3.9.6
Maven home: /home/user/.sdkman/candidates/maven/current
Java version: 21.0.2, vendor: GraalVM Community
```

---

## Installation Procedure

### Step 1: Obtaining the Source Code

The user executes the following commands to clone the actor-IaC source code from the GitHub repository `https://github.com/scivicslab/actor-IaC.git`:

```bash
cd ~
git clone https://github.com/scivicslab/actor-IaC.git
cd actor-IaC
```

:::note[About the Directory]
This tutorial uses `~/actor-IaC` as the clone destination. The user can clone to any directory. In the following explanations, the clone destination directory may be referred to as `<ACTOR_IAC_DIR>`.
:::

### Step 2: Building actor-IaC

The user executes the following command in the directory `~/actor-IaC` to build actor-IaC:

```bash
mvn clean install
```

Maven generates an uber JAR at the file `~/actor-IaC/target/actor-IaC-2.11.0.jar` after the build completes.

:::note[What is an uber JAR?]
An uber JAR (also called a fat JAR) is an executable JAR that bundles the application itself and all dependency libraries into a single JAR file. The user can execute the uber JAR directly with the `java -jar` command. There is no need to install dependency libraries separately.
:::

:::note[About Version Numbers]
This tutorial uses version `2.11.0` as an example. The actual version number differs depending on the release at the time of building. The user checks the JAR file name in the `target/` directory and uses the appropriate version number.
:::

---

## Three Execution Methods

actor-IaC has three execution methods. The user can choose the execution method according to the use case.

| Method | Command Example | Characteristics |
|--------|-----------------|-----------------|
| Direct JAR Execution | `java -jar actor-IaC-2.11.0.jar` | Works with JDK only. The simplest method. The JAR file is built with `mvn install`. |
| JBang Launcher | `./actor_iac.java` | Automatically resolves the JAR file path. Convenient during development. The `actor_iac.java` file is included when git clone is performed. |
| Native Binary | `./actor-iac` | Fast startup. JDK not required. For production environments. The `actor-iac` file is created by building with native-image. (described later) |

---

## Method 1: Direct JAR Execution (Basic)

The user can execute actor-IaC using the uber JAR file `~/actor-IaC/target/actor-IaC-2.11.0.jar` built by Maven.

The user executes the following command in the directory `~/actor-IaC` to display the actor-IaC help:

```bash
java -jar ~/actor-IaC/target/actor-IaC-2.11.0.jar --help
```

actor-IaC displays output similar to the following:

```
actor-IaC 2.10.0
Usage: actor-iac [COMMAND]
Infrastructure as Code workflow automation tool.
  -h, --help      Show this help message and exit.
  -V, --version   Print version information and exit.
Commands:
  run         Execute actor-IaC workflows defined in YAML, JSON, or XML format.
  list        List workflows discovered under --dir.
  describe    Display workflow and step descriptions.
  log-search  Search workflow execution logs from H2 database.
  log-serve   Serve H2 TCP server for centralized workflow logging.
  log-merge   Merge scattered log databases into a single database.
```

### Subcommand Help

The user can display detailed help for each subcommand by appending the `--help` option after the subcommand name.

The user executes the following command to display the help for the `run` subcommand:

```bash
java -jar ~/actor-IaC/target/actor-IaC-2.11.0.jar run --help
```

actor-IaC displays output similar to the following (excerpt):

```
Usage: actor-iac run [-hkLqvV] [--embedded] [--no-log-db] [--no-log]
                     -d=<workflowDir> ...
Execute actor-IaC workflows defined in YAML, JSON, or XML format.
  -d, --dir=<workflowDir>    Directory containing workflow files
  -w, --workflow=<workflowName>
                             Name of the main workflow to execute
  -i, --inventory=<inventoryFile>
                             Path to Ansible inventory file
  -o, --overlay=<overlayDir> Overlay directory for environment-specific config
  -v, --verbose              Enable verbose output
  -q, --quiet
                             Suppress all console output
  ...
```

---

## Method 2: JBang Launcher (Optional)

### How the JBang Launcher Works

The JBang launcher script `actor_iac.java` is a thin wrapper that automatically detects and executes the actor-IaC JAR file. `actor_iac.java` searches for the JAR file in the following order:

1. The path specified by the environment variable `ACTOR_IAC_JAR`
2. The Maven local repository `~/.m2/repository/com/scivicslab/actor-IaC/<VERSION>/actor-IaC-<VERSION>.jar`

Normally, the user executes the `mvn install` command to install the JAR file to the Maven local repository. If the user wants to place the JAR file in a different location, the user can override the search location by setting the path to the JAR file in the environment variable `ACTOR_IAC_JAR`.

### Installing JBang

The user executes the following command to install JBang (when using SDKMAN):

```bash
sdk install jbang
```

If the user is not using SDKMAN, the user executes the following command to install JBang directly:

```bash
curl -Ls https://sh.jbang.dev | bash -s - app setup
```

The user executes the following command to verify the JBang installation:

```bash
jbang --version
```

### Placing the Launcher Script

The user copies `actor_iac.java` to a directory in PATH or to the workflow directory:

```bash
cp ~/actor-IaC/actor_iac.java ~/bin/        # Executable from anywhere if PATH is set
cp ~/actor-IaC/actor_iac.java ~/my-workflows/  # Execute as ./actor_iac.java within the workflow directory
```

---

## Method 3: Native Binary (Optional)

The user can compile actor-IaC to a native binary using GraalVM native-image. The native binary significantly reduces startup time compared to the JAR file. The native binary does not require the JVM, making distribution easier.

### Prerequisites

The user must have GraalVM installed.

The user executes the following command to verify that the native-image command is installed:

```bash
native-image --version
```

### Building the Native Binary

The user executes the following command to change to the directory `~/actor-IaC`:

```bash
cd ~/actor-IaC
```

The user executes the following command to build the uber JAR:

```bash
mvn clean package
```

The user executes the following command to build the native binary `~/actor-IaC/actor-iac` from the JAR file `~/actor-IaC/target/actor-IaC-2.11.0.jar`:

```bash
native-image \
  -jar target/actor-IaC-2.11.0.jar \
  -o actor-iac \
  --no-fallback \
  -H:+ReportExceptionStackTraces \
  --initialize-at-build-time=org.yaml.snakeyaml \
  --initialize-at-run-time=com.jcraft.jsch
```

The native-image command takes several minutes to build. The native-image command generates the executable file `~/actor-IaC/actor-iac` after the build completes.

### Using the Native Binary

The user executes the following command to grant execution permission to the file `~/actor-IaC/actor-iac`:

```bash
chmod +x ~/actor-IaC/actor-iac
```

The user executes the following command to verify the native binary operation:

```bash
~/actor-IaC/actor-iac --help
```

The native binary requires neither JVM nor JBang.

---

## Verification: Hello World Workflow

Create a simple workflow to verify that actor-IaC is working.

### 1. Creating and Moving to the Workflow Directory

The user executes the following commands in the terminal to create the workflow directory:

```bash
mkdir -p ~/my-workflows
cd ~/my-workflows
```

:::note[About the Workflow Directory]
This tutorial uses `~/my-workflows` as the workflow directory. The user can use any directory.
:::

### 2. Creating the Hello World Workflow

The user creates a file `hello-world.yaml` in the current directory (`~/my-workflows`) with the following content:

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

### 3. Executing the Workflow

The user executes one of the following commands in the workflow directory (`~/my-workflows`).

**For direct JAR execution**, the user executes the following command:

```bash
java -jar ~/actor-IaC/target/actor-IaC-2.11.0.jar run -d . -w hello-world
```

**For the JBang launcher**, the user needs to have copied `actor_iac.java` beforehand (see Method 2). The user executes the following command:

```bash
./actor_iac.java run -d . -w hello-world
```

**For the native binary**, the user needs to have built the native binary with native-image beforehand (see Method 3). The user executes the following command:

```bash
~/actor-IaC/actor-iac run -d . -w hello-world
```

The actor-IaC process displays output similar to the following:

```
Logging to: actor-iac-202601121830.log
Started background log server on port 29090
Log database: localhost:29090 (TCP mode, auto-shutdown enabled)
...
Hello, actor-IaC!
...
Workflow completed successfully
```

The actor-IaC process creates a log file `actor-iac-YYYYMMDDHHmm.log` in the current directory and a log database `actor-iac-logs.mv.db` in the workflow directory (specified by the `-d` option) after execution.
