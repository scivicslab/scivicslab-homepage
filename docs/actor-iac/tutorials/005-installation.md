---
id: installation
title: "Tutorial: Installing actor-IaC"
sidebar_position: 5
---

This tutorial explains the steps for users to install actor-IaC and make it ready for use.

## Prerequisites

Users need the following software to use actor-IaC:

| Software | Version | Purpose |
|----------|---------|---------|
| Java (JDK) | 21 or higher | Runtime environment for actor-IaC |
| Maven | 3.8 or higher | Building actor-IaC |
| Git | Any | Obtaining actor-IaC source code |

The following software is optional:

| Software | Version | Purpose |
|----------|---------|---------|
| JBang | 0.100 or higher | Executing launcher scripts |
| GraalVM | 21 or higher | Compiling to native binary |

### Verify Java Installation

Users execute the following command in the terminal to check the Java version:

```bash
java -version
```

The JVM displays output like the following:

```
openjdk version "21.0.2" 2024-01-16
OpenJDK Runtime Environment (build 21.0.2+13-Ubuntu-222.04.1)
OpenJDK 64-Bit Server VM (build 21.0.2+13-Ubuntu-222.04.1, mixed mode, sharing)
```

If the Java version is below 21, users are recommended to install Java using [SDKMAN](https://sdkman.io/). If users plan to use native compilation, users are recommended to install GraalVM from the start.

Users execute the following commands to install SDKMAN:

```bash
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
```

Users execute the following command to check available GraalVM versions in SDKMAN:

```bash
sdk list java | grep graal
```

SDKMAN displays output like the following:

```
 GraalVM CE    |     | 25.0.1       | graalce |            | 25.0.1-graalce
               |     | 24.0.2       | graalce | installed  | 24.0.2-graalce
               |     | 21.0.2       | graalce |            | 21.0.2-graalce
 GraalVM Oracle|     | 25.0.1       | graal   |            | 25.0.1-graal
               |     | 21.0.9       | graal   |            | 21.0.9-graal
```

Each column in the output shows, from left to right: "distribution name", "status flag", "version", "vendor", "installation status", and "identifier". Users install Java using the rightmost identifier (e.g., `21.0.2-graalce`):

```bash
sdk install java 21.0.2-graalce   # To install GraalVM CE 21
sdk install java 21-tem           # To install Temurin 21
```

If users plan to use native compilation, users install GraalVM. GraalVM includes the native-image command.

### Install Maven

Users execute the following command to check available Maven versions in SDKMAN:

```bash
sdk list maven
```

SDKMAN displays output like the following:

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

Users specify the latest 3.x version (e.g., `3.9.12`) to install Maven:

```bash
sdk install maven 3.9.12
```

Users execute the following command to verify the Maven installation:

```bash
mvn -version
```

Maven displays output like the following:

```
Apache Maven 3.9.6
Maven home: /home/user/.sdkman/candidates/maven/current
Java version: 21.0.2, vendor: GraalVM Community
```

---

## Installation Steps

### Step 1: Obtain the Source Code

Users execute the following command to clone the actor-IaC source code from the GitHub repository `https://github.com/scivicslab/actor-IaC.git`:

```bash
cd ~
git clone https://github.com/scivicslab/actor-IaC.git
cd actor-IaC
```

:::note[About the directory]
This tutorial uses `~/actor-IaC` as the clone destination. Users can clone to any directory. In subsequent explanations, the clone destination directory may be referred to as `<ACTOR_IAC_DIR>`.
:::

### Step 2: Build actor-IaC

Users execute the following command in the `~/actor-IaC` directory to build actor-IaC:

```bash
mvn clean install
```

After the build completes, Maven generates the uber JAR at `~/actor-IaC/target/actor-IaC-2.12.0.jar`.

:::note[What is an uber JAR]
An uber JAR (also called fat JAR) is an executable JAR that bundles the application itself and all dependency libraries into a single JAR file. Users can directly execute the uber JAR using the `java -jar` command. There is no need to install dependency libraries separately.
:::

:::note[About version numbers]
This tutorial uses version `2.12.0` as an example. The actual version number varies depending on the release at the time of build. Users should check the JAR filename in the `target/` directory and use the appropriate version number.
:::

---

## Three Startup Methods

actor-IaC has three startup methods. Users can choose the startup method according to their use case.

| Method | Command Example | Features |
|--------|-----------------|----------|
| JAR Direct Execution | `java -jar actor-IaC-2.12.0.jar` | Works with JDK only. The simplest method. The JAR file is built with `mvn install`. |
| JBang Launcher | `./actor_iac.java` | Automatically resolves JAR file path. Convenient during development. The `actor_iac.java` file is included when git cloning. |
| Native Binary | `./actor-iac` | Fast startup. No JDK required. For production environments. The `actor-iac` file is created by building with native-image. (described later) |

---

## Method 1: JAR Direct Execution (Basic)

Users can execute actor-IaC using the uber JAR file `~/actor-IaC/target/actor-IaC-2.12.0.jar` built by Maven.

Users execute the following command in the `~/actor-IaC` directory to display actor-IaC help:

```bash
java -jar ~/actor-IaC/target/actor-IaC-2.12.0.jar --help
```

actor-IaC displays output like the following:

```
actor-IaC 2.12.0
Usage: java -jar actor-IaC-2.12.0.jar [COMMAND]   (JAR)
      ./actor_iac.java [COMMAND]                 (JBang)
      ./actor-iac [COMMAND]                      (Native)
AI-native Infrastructure as Code workflow automation tool.
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

Users can display detailed help for each subcommand by adding the `--help` option after the subcommand name.

Users execute the following command to display help for the `run` subcommand:

```bash
java -jar ~/actor-IaC/target/actor-IaC-2.12.0.jar run --help
```

actor-IaC displays output like the following (excerpt):

```
Usage: actor-iac run [-hkLqvV] [--embedded] [--no-db-log] [--no-log]
                     -d=<workflowDir> ...
Execute actor-IaC workflows defined in YAML, JSON, or XML format.
  -d, --dir=<workflowDir>    Directory containing workflow files
  -w, --workflow=<workflowName>
                             Name of the main workflow to execute
  -i, --inventory=<inventoryFile>
                             Path to Ansible inventory file
  -o, --overlay=<overlayDir> Overlay directory for environment-specific config
  -v, --verbose              Enable verbose output
  -q, --quiet, --no-console-log
                             Suppress all console output
  ...
```

---

## Method 2: JBang Launcher (Optional)

### How the JBang Launcher Works

The JBang launcher script `actor_iac.java` is a thin wrapper that automatically detects and executes the actor-IaC JAR file. `actor_iac.java` searches for the JAR file in the following order:

1. Path specified by the environment variable `ACTOR_IAC_JAR`
2. Maven local repository `~/.m2/repository/com/scivicslab/actor-IaC/<VERSION>/actor-IaC-<VERSION>.jar`

Typically, users execute the `mvn install` command to install the JAR file to the Maven local repository. If users want to place the JAR file in a different location, users can override the search location by setting the environment variable `ACTOR_IAC_JAR` to the JAR file path.

### Install JBang

Users execute the following command to install JBang (when using SDKMAN):

```bash
sdk install jbang
```

If users are not using SDKMAN, users execute the following command to install JBang directly:

```bash
curl -Ls https://sh.jbang.dev | bash -s - app setup
```

Users execute the following command to verify the JBang installation:

```bash
jbang --version
```

### Place the Launcher Script

Users copy `actor_iac.java` to a directory in PATH or to the workflow directory:

```bash
cp ~/actor-IaC/actor_iac.java ~/bin/        # Executable from anywhere if PATH is set
cp ~/actor-IaC/actor_iac.java ~/my-workflows/  # Execute as ./actor_iac.java in workflow directory
```

---

## Method 3: Native Binary (Optional)

Users can compile actor-IaC to a native binary using GraalVM native-image. Native binaries significantly reduce startup time compared to JAR files. Native binaries do not require a JVM, making distribution easier.

### Prerequisites

Users must have GraalVM installed.

Users execute the following command to verify the native-image command installation:

```bash
native-image --version
```

### Build the Native Binary

Users execute the following command to move to the `~/actor-IaC` directory:

```bash
cd ~/actor-IaC
```

Users execute the following command to build the uber JAR:

```bash
mvn clean package
```

Users execute the following command to build the native binary `~/actor-IaC/actor-iac` from the JAR file `~/actor-IaC/target/actor-IaC-2.12.0.jar`:

```bash
native-image \
  -jar target/actor-IaC-2.12.0.jar \
  -o actor-iac \
  --no-fallback \
  -H:+ReportExceptionStackTraces \
  --initialize-at-build-time=org.yaml.snakeyaml \
  --initialize-at-run-time=com.jcraft.jsch
```

The native-image command takes several minutes to build. After the build completes, the native-image command generates the executable file `~/actor-IaC/actor-iac`.

### Use the Native Binary

Users execute the following command to grant execute permission to the file `~/actor-IaC/actor-iac`:

```bash
chmod +x ~/actor-IaC/actor-iac
```

Users execute the following command to verify the native binary operation:

```bash
~/actor-IaC/actor-iac --help
```

The native binary requires neither JVM nor JBang.

---

## Verification: Hello World Workflow

Users create a simple workflow to verify actor-IaC operation.

### 1. Create and Navigate to Workflow Directory

Users execute the following command in the terminal to create a workflow directory:

```bash
mkdir -p ~/my-workflows
cd ~/my-workflows
```

:::note[About workflow directory]
This tutorial uses `~/my-workflows` as the workflow directory. Users can use any directory.
:::

### 2. Create the Hello World Workflow

Users create the file `hello-world.yaml` with the following content in the current directory (`~/my-workflows`):

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

### 3. Execute the Workflow

Users execute one of the following commands in the workflow directory (`~/my-workflows`).

**For JAR direct execution**, users execute the following command:

```bash
java -jar ~/actor-IaC/target/actor-IaC-2.12.0.jar run -d . -w hello-world
```

**For JBang launcher**, users need to create the `actor_iac.java` symbolic link in advance (see Method 2). Users execute the following command:

```bash
./actor_iac.java run -d . -w hello-world
```

**For native binary**, users need to build the native binary with native-image in advance (see Method 3). Users execute the following command:

```bash
~/actor-IaC/actor-iac run -d . -w hello-world
```

The actor-IaC process displays output like the following:

```
Logging to: actor-iac-202601121830.log
Started background log server on port 29090
Log database: localhost:29090 (TCP mode, auto-shutdown enabled)
...
Hello, actor-IaC!
...
Workflow completed successfully
```

After execution, the actor-IaC process creates a log file `actor-iac-YYYYMMDDHHmm.log` and a log database `actor-iac-logs.mv.db` in the current directory.
