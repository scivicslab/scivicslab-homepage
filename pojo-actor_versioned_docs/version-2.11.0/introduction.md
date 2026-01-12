---
sidebar_position: 1
title: Introduction
---

:::caution Newer Version Available
This is documentation for version 2.11.0. [See the latest version](/docs/pojo-actor/introduction).
:::

# POJO-actor: A Lightweight Actor Model for Java Using Virtual Threads

This document is the official manual and reference for **POJO-actor**.
It currently documents version 2.11.0.


---

Building concurrent systems in Java remains challenging.

Traditional shared-state concurrency relies on careful lock management and is prone to subtle bugs.
At the same time, many established actor frameworks introduce significant runtime overhead and complex abstractions that are unnecessary for a large class of applications.

With the introduction of **virtual threads in Java 21**, it has become possible to build tens of thousands of lightweight, actor-like components without relying on heavyweight frameworks or OS-thread-per-actor designs.

**POJO-actor** is a lightweight Java library that implements a simplified actor model on top of modern JDK features, with a strong focus on virtual threads.

It allows developers to write actor-style components as **plain Java objects (POJOs)**, without reflection, code generation, or framework-specific APIs.
The goal is to enable actor-like reasoning while keeping execution, state, and concurrency semantics explicit and inspectable.


## Background: Actor Model and Modern Java

The actor model is a programming paradigm in which independent entities, called actors, communicate exclusively through message passing.
By avoiding shared mutable state, the actor model eliminates the need for explicit locks and reduces the complexity of concurrent programming.

Historically, practical use of the actor model in Java required specialized frameworks.
Because these frameworks typically mapped actors to operating system threads, the number of actors was effectively limited by the number of available CPU cores.

Recent advancements in the JDK have fundamentally changed this situation.
With virtual threads, even a typical developer machine can now support **tens of thousands of concurrent, lightweight execution contexts**, making a simpler and more direct actor-style design practical without heavy runtime machinery.


## Project Repository

The POJO-actor source code is available on GitHub:

[https://github.com/scivicslab/POJO-actor](https://github.com/scivicslab/POJO-actor)



## Core Components

POJO-actor implements a simplified actor model using modern Java features (JDK21+).
The original core of POJO-actor (v1.0.0) was intentionally designed as a
compact implementation of approximately **800 lines of code**, capturing
only the essential mechanics of the actor model.(The README for the original v1.0.0 release 
[README for the original ver1.0.0 release](https://coderlegion.com/8748/pojo-actor-v1-0-a-lightweight-actor-model-library-for-java) is available on CoderLegion.)

This minimal core established the architectural foundation for clarity,
performance, and debuggability, while allowing the project to evolve
beyond its initial scope.


The core components are:

- **ActorSystem**
  Manages actor lifecycles and coordinates execution using configurable work-stealing thread pools.

- **ActorRef**
  A reference to an actor that provides `tell()` and `ask()` messaging interfaces.

- **Virtual Threads**
  Each actor executes on its own virtual thread, enabling lightweight and scalable message handling.

- **Work-Stealing Pools**
  Computationally heavy tasks can be delegated to configurable thread pools to avoid blocking actor execution.

- **Zero Reflection**
  The implementation relies exclusively on standard JDK APIs, making it compatible with GraalVM native-image.


## Any POJO Can Become an Actor

One of POJO-actor’s biggest advantages is that you don’t need to design your code specifically for the actor model from the beginning. Any existing Java object can instantly become an actor, including standard library classes:

```
import java.util.ArrayList;
import java.util.concurrent.CompletableFuture;

// Turn a standard ArrayList into an actor - no modifications needed!
ActorSystem system = new ActorSystem("listSystem");
ActorRef<ArrayList<String>> listActor = system.actorOf("myList", new ArrayList<String>());

// Send messages to the ArrayList actor
listActor.tell(list -> list.add("Hello"));
listActor.tell(list -> list.add("World"));
listActor.tell(list -> list.add("from"));
listActor.tell(list -> list.add("POJO-actor"));

// Query the list size
CompletableFuture<Integer> sizeResult = listActor.ask(list -> list.size());
System.out.println("List size: " + sizeResult.get()); // Prints: List size: 4

// Get specific elements
CompletableFuture<String> firstElement = listActor.ask(list -> list.get(0));
System.out.println("First element: " + firstElement.get()); // Prints: First element: Hello

// Even complex operations work
CompletableFuture<String> joinedResult = listActor.ask(list ->
    String.join(" ", list));
System.out.println(joinedResult.get()); // Prints: Hello World from POJO-actor

system.terminate();
```

This means you can:

- Retrofit existing codebases without architectural changes
- Protect any object with actor-based thread safety
- Scale incrementally by converting objects to actors as needed
- Reuse existing POJOs without any modifications



## Virtual Threads and Managed Thread Pools

### The Problem with Traditional Actor Libraries

Traditional actor libraries map each actor to an OS thread. Since OS threads are expensive resources (typically limited to a few thousand), the number of actors was effectively capped by the number of available CPU cores. Creating 10,000 actors was simply impractical.

### POJO-actor's Solution: Virtual Threads

POJO-actor leverages **JDK 21+ virtual threads**—lightweight threads managed by the JVM rather than the OS. This enables:

- **Tens of thousands of actors** on ordinary hardware
- **Minimal memory overhead** per actor
- **Fast context switching** without OS involvement

```java
// Create 10,000 actors effortlessly
ActorSystem system = new ActorSystem("massiveSystem");
for (int i = 0; i < 10_000; i++) {
    system.actorOf("counter-" + i, new Counter());
}
```

### The Caveat: CPU-Intensive Work

Virtual threads excel at lightweight operations (message passing, state updates, I/O waiting), but they **should not perform heavy CPU computations directly**. Blocking a virtual thread with CPU-bound work defeats its purpose.

For CPU-intensive tasks, POJO-actor provides **work-stealing thread pools**:

```java
ActorSystem system = new ActorSystem("system", 4); // 4 CPU threads

// Light operation → virtual thread (default)
actor.tell(a -> a.updateCounter());

// Heavy computation → work-stealing pool
CompletableFuture<Double> result = actor.ask(
    a -> a.performMatrixMultiplication(),
    system.getWorkStealingPool()
);
```

### tell() and ask()

POJO-actor provides two messaging patterns:

- **`tell(action)`**: Fire-and-forget message. The sender does not wait for a response. Returns `CompletableFuture<Void>`.
- **`ask(action)`**: Request-response message. The sender receives a result. Returns `CompletableFuture<R>`.

Both methods have two variants:

| Method | Execution | Use Case |
|--------|-----------|----------|
| `tell(action)` | Virtual thread | Light operations (state changes, I/O) |
| `tell(action, executorService)` | Specified thread pool | CPU-bound operations |
| `ask(action)` | Virtual thread | Light operations with return value |
| `ask(action, executorService)` | Specified thread pool | CPU-bound operations with return value |

### Example: Using Work-Stealing Pool for Heavy Computation

```java
ActorSystem system = new ActorSystem("system", 4); // 4 CPU threads

// Light operation → virtual thread (default)
actor.tell(a -> a.updateCounter());

// Heavy computation → work-stealing pool
CompletableFuture<Double> result = actor.ask(
    a -> a.performMatrixMultiplication(),
    system.getWorkStealingPool()
);

// Fire-and-forget heavy operation
actor.tell(
    a -> a.processLargeDataset(),
    system.getWorkStealingPool()
);
```

This separation keeps your actor system responsive while still enabling parallel computation when needed.



## Workflow Engine: From Actor to Agent

In the traditional actor model, actors are passive entities—they wait for messages and react to them. While this simplifies concurrent programming by eliminating locks, actors themselves don't decide what to do next; they only respond to external stimuli.

POJO-actor's workflow engine changes this paradigm. By attaching a workflow to an actor, you give it complex behavioral patterns: conditional branching, loops, and state-driven decisions. The actor transforms into an **agent**—an autonomous entity that observes its environment and acts according to its own logic.

With Virtual Threads since JDK 21, you can create tens of thousands of such autonomous agents. This combination—complex behavior per actor, massive scale—was impractical before and opens up new applications: large-scale agent-based simulations, infrastructure platforms that monitor and self-repair, and more.

> An agent is anything that can be viewed as perceiving its environment through sensors and acting upon that environment through actuators.
> — Russell & Norvig, "Artificial Intelligence: A Modern Approach"

### Workflow Format

Because the workflow is essentially a Turing machine, conditional branching and loops are expressed as state transitions. And because this is POJO-actor, each step is simply "send this message to this actor"—just three elements: `actor`, `method`, and `arguments`:

```yaml
- states: ["start", "processed"]
  actions:
    - actor: dataProcessor    # actor name
      method: process         # method name
      arguments: "data.csv"   # arguments
```

This follows the same mental model as `tell()`/`ask()` in Java code. The combination allows complex logic that traditional YAML-based workflow languages struggle with—without introducing custom syntax.

### Workflow Example: Turing Machine

The following is a Turing machine that outputs an irrational number. It outputs 001011011101111011111...

Using POJO-actor's workflow format:

```yaml
name: turing87
steps:
- states: ["0", "100"]
  actions:
  - {actor: turing, method: initMachine}
- states: ["100", "1"]
  actions:
  - {actor: turing, method: printTape}
- states: ["1", "2"]
  actions:
  - {actor: turing, method: put, arguments: "e"}
  - {actor: turing, method: move, arguments: "R"}
  - {actor: turing, method: put, arguments: "e"}
  - {actor: turing, method: move, arguments: "R"}
  - {actor: turing, method: put, arguments: "0"}
  - {actor: turing, method: move, arguments: "R"}
  - {actor: turing, method: move, arguments: "R"}
  - {actor: turing, method: put, arguments: "0"}
  - {actor: turing, method: move, arguments: "L"}
  - {actor: turing, method: move, arguments: "L"}
# ... (full workflow continues)
```

This example demonstrates conditional branching using multiple transitions with the same from-state:

```yaml
# From state 2: if current value is "1", stay in state 2
- states: ["2", "2"]
  actions:
    - actor: turing
      method: matchCurrentValue
      arguments: "1"
    # ... subsequent actions

# From state 2: if current value is "0", go to state 3
- states: ["2", "3"]
  actions:
    - actor: turing
      method: matchCurrentValue
      arguments: "0"
```

- If `matchCurrentValue("1")` returns true → Execute first transition, remain in state 2
- If `matchCurrentValue("1")` returns false → Abort this transition, try next transition
- If `matchCurrentValue("0")` returns true → Transition to state 3

POJO-actor's workflow engine is based on the same design philosophy as Turing machines. Any complexity of processing can be expressed through combinations of state transitions and actions.

For complete workflow examples, see the [actor-WF-examples](https://github.com/scivicslab/actor-WF-examples) repository.


## Feature Overview

### Core
- **POJO Actor Model** — Turn any Java object into an actor
- **Virtual Threads** — Massive actor scalability with lightweight virtual threads
- **Work-Stealing Pool** — Dedicated thread pool for CPU-intensive tasks
- **Job Cancellation** — Cancel pending jobs per actor
- **Immediate Execution** — Bypass message queues with tellNow/askNow
- **Actor Hierarchies** — Parent-child relationships for actor supervision

### Distributed
- **Distributed Actor System** — Inter-node communication via HTTP
- **Remote Actor Reference** — Transparent access to actors on remote nodes
- **Node Discovery** — Auto-detection for Slurm/Kubernetes/Grid Engine environments

### Workflow Engine
- **YAML Workflow** — Define workflows in YAML format
- **Subworkflows** — Split and reuse workflow definitions
- **YAML Overlay** — Environment-specific configuration (dev/staging/prod)

### Extensibility
- **Dynamic Actor Loading** — Load actors from external JARs at runtime
- **Plugin Architecture** — Register plugins via ServiceLoader
- **GraalVM Native Image** — Full support for native image compilation


## Next Steps

- [Getting Started](./getting-started) — Installation and first steps
- [Core Components](./core-components/actor-system) — Detailed API documentation
- [Workflow Framework](./workflow-framework/interpreter) — Workflow engine reference
- [GitHub Repository](https://github.com/scivicslab/POJO-actor) — Source code and examples
