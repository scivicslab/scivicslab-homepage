---
id: native-binary
title: Building Native Binary
sidebar_position: 7
---

## Problem Definition

Build actor-IaC as a native binary.
This enables execution in environments where JDK is not installed.


## How to do it

### Prerequisites

GraalVM version 21 or higher must be installed.

```bash
sdk install java 21.0.2-graalce
```

Verify that the native-image command is available.

```bash
native-image --version
```

```
native-image 21.0.2 2024-01-16
GraalVM Runtime Environment GraalVM CE 21.0.2+13.1 (build 21.0.2+13-jvmci-23.1-b30)
```

### Build

Build the uber JAR in the actor-IaC directory.

```bash
cd ~/actor-IaC
mvn clean package
```

Build the native binary with native-image.

```bash
native-image \
  -jar target/actor-IaC-2.14.0.jar \
  -o actor-iac \
  --no-fallback \
  -H:+ReportExceptionStackTraces \
  --initialize-at-build-time=org.yaml.snakeyaml \
  --initialize-at-run-time=com.jcraft.jsch
```

The build takes several minutes. When complete, `actor-iac` is generated.

### Usage

```bash
chmod +x actor-iac
./actor-iac --help
```

The native binary requires neither JVM nor JBang. You can copy it to any directory and use it.


## Under the hood

### Meaning of native-image Options

| Option | Meaning |
|--------|---------|
| `--no-fallback` | Disable JVM fallback. Generate a pure native binary |
| `-H:+ReportExceptionStackTraces` | Display stack traces when exceptions occur |
| `--initialize-at-build-time=org.yaml.snakeyaml` | Initialize SnakeYAML at build time. Speeds up startup |
| `--initialize-at-run-time=com.jcraft.jsch` | Initialize JSch (SSH) at runtime. For native image compatibility |

### Startup Time Comparison

| Method | Startup Time (approximate) |
|--------|---------------------------|
| Direct JAR execution | 1-2 seconds |
| JBang launcher | 1-2 seconds (after cache) |
| Native binary | Less than 0.1 seconds |

Native binaries have fast startup but take time to build. It is common to use direct JAR execution or JBang during development and use native binaries for production distribution.
