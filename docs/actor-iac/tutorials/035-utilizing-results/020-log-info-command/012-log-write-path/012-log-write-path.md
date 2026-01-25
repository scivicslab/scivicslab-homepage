---
id: log-write-path
title: Actor Model Log Collection
sidebar_position: 12
---

# Actor Model Log Collection

## Problem Definition

**Goal:** Collect log output from multiple nodes without blocking each node's processing.

When a cluster management tool executes commands in parallel against multiple nodes, how to collect output from each node is an important design issue.

Traditional tools like Ansible connect to each node and execute commands sequentially or in parallel, then aggregate results after completion. In this approach, output collection depends on execution completion, making it difficult to check progress during long-running commands.

actor-IaC adopts the actor model to completely separate each node's processing from output collection.


## Under the hood

### Inter-Actor Message Communication

In actor-IaC, actors corresponding to each node (NodeIIAR) execute commands and send their output as messages to the outputMultiplexer actor.

```
node-node13 ──┐
node-node14 ──┼── Send messages ──→ outputMultiplexer ──→ Each output destination
node-node15 ──┘
```

Each node actor obtains a reference to outputMultiplexer by name from the ActorSystem.

```java
IIActorSystem sys = (IIActorSystem) this.system();
IIActorRef<?> multiplexer = sys.getIIActor("outputMultiplexer");
```

When output occurs during command execution, the node actor sends a JSON-format message to outputMultiplexer.

```java
JSONObject arg = new JSONObject();
arg.put("source", nodeName);    // Source node name
arg.put("type", "stdout");      // Output type
arg.put("data", line);          // Output content
multiplexer.callByActionName("add", arg.toString());
```

### Role of outputMultiplexer

outputMultiplexer distributes received messages to multiple output destinations.

```java
public void add(String source, String type, String data) {
    for (Accumulator target : targets) {
        target.add(source, type, data);
    }
}
```

By default, the following output destinations are registered.

| Output Destination | Role |
|-------------------|------|
| ConsoleAccumulator | Output to console |
| DatabaseAccumulator | Save to H2 database |

When `--file-log` option is specified, FileAccumulator is also added.

### Benefits of Asynchronous Messaging

In the actor model, message sending is asynchronous. After a node actor sends output as a message, it proceeds to the next processing without waiting for outputMultiplexer's processing to complete.

```
Time →
node-node13: [Execute command]──[Send output]──[Next processing]──→
node-node14: [Execute command]──[Send output]──[Next processing]──→
outputMultiplexer:        [Receive]──[Distribute]──[Receive]──[Distribute]──→
```

This design provides the following benefits.

**1. Log output doesn't delay workflow execution**

Node actors proceed to the next processing immediately after sending logs. Even if database writing is slow, it doesn't affect workflow execution speed.

**2. Can process simultaneous output from multiple nodes**

outputMultiplexer has a message queue and processes messages in arrival order. Even if output occurs simultaneously from multiple nodes, they accumulate in the queue and are processed sequentially.

**3. Easy to add/change output destinations**

Just register a new Accumulator to outputMultiplexer to add output destinations. No need to change node actor code.

### Comparison with Ansible

| Aspect | Ansible | actor-IaC |
|--------|---------|-----------|
| Output collection timing | Aggregate after task completion | Real-time collection during execution |
| Progress of long tasks | Difficult to check | Can check at any time |
| Output destination extension | Callback plugins | Register Accumulator |
| Output mixing in parallel execution | Depends on fork count | Order guaranteed by message queue |

actor-IaC's actor model approach is based on a different design philosophy from traditional tools in terms of real-time capability and extensibility.
