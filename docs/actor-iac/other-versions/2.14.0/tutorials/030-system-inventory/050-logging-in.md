---
id: logging-in
title: "Login Configuration Reference"
sidebar_position: 5
---

# Login Configuration Reference

This document is a detailed reference for login configuration in inventory files.

## Inventory File Basics

Define hosts and connection information in an INI format similar to Ansible.

```ini
[webservers]
web1.example.com
web2.example.com

[all:vars]
ansible_user=admin
ansible_port=22
```

## Different Login Names for Each Node

You can specify different connection parameters for each host.

```ini
[webservers]
web1.example.com ansible_user=webadmin
web2.example.com ansible_port=2222

[dbservers]
db1.example.com ansible_user=postgres ansible_port=5432
db2.example.com

[all:vars]
ansible_user=admin
ansible_port=22
```

### Variable Priority

**Host-specific variables > Group variables > Global variables**

In the example above:
- `web1.example.com` → User `webadmin` (host-specific), Port `22` (global)
- `web2.example.com` → User `admin` (global), Port `2222` (host-specific)
- `db1.example.com` → User `postgres`, Port `5432` (both host-specific)
- `db2.example.com` → User `admin`, Port `22` (both global)

## Centrally Managed Environments (LDAP, etc.)

In environments where accounts are centrally managed by LDAP or Active Directory, the same username is used across all nodes. You only need to write common settings in `[all:vars]`.

```ini
[webservers]
web1.example.com
web2.example.com

[dbservers]
db1.example.com
db2.example.com

[all:vars]
ansible_user=myldapuser
ansible_port=22
```

### Changing Settings per Group

If you want to change settings for only specific groups, override with group variables:

```ini
[webservers]
web1.example.com
web2.example.com

[dbservers]
db1.example.com
db2.example.com

[all:vars]
ansible_user=myldapuser
ansible_port=22

[dbservers:vars]
ansible_port=2222
```

## Accessing the Same Host with Multiple Accounts

When a single cluster has multiple accounts (e.g., regular user and administrator), put the same hosts in different groups to separate users:

```ini
# cluster - oogasawa account
[cluster-oogasawa]
192.168.5.1
192.168.5.13
192.168.5.14
192.168.5.15

[cluster-oogasawa:vars]
ansible_user=oogasawa

# cluster - devteam account
[cluster-devteam]
192.168.5.1
192.168.5.13
192.168.5.14
192.168.5.15

[cluster-devteam:vars]
ansible_user=devteam

# Parent group containing both (optional)
[cluster:children]
cluster-oogasawa
cluster-devteam

[all:vars]
ansible_port=22
```

### Structure

```
[cluster-oogasawa]  ← ansible_user=oogasawa
[cluster-devteam]   ← ansible_user=devteam
       ↓
[cluster:children]  ← Parent group containing both (optional)
```

### Usage Example

```bash
# Execute workflow with oogasawa account
java -jar actor-IaC.jar -d ./workflows -w deploy \
    -i inventory.ini -g cluster-oogasawa

# Execute workflow with devteam account
java -jar actor-IaC.jar -d ./workflows -w deploy \
    -i inventory.ini -g cluster-devteam
```

By selecting the group with the `-g` option, you can access the same hosts with different accounts.

## Usage Examples in Java Code

### Level 1 (POJO)

```java
// Create NodeGroup (Builder pattern)
NodeGroup nodeGroup = new NodeGroup.Builder()
    .withInventory(new FileInputStream("inventory.ini"))
    .build();

// Create Node POJOs for each group
List<Node> webservers = nodeGroup.createNodesForGroup("webservers");
List<Node> dbservers = nodeGroup.createNodesForGroup("dbservers");

// Each Node has the configured username and port
for (Node node : webservers) {
    Node.CommandResult result = node.executeCommand("uptime");
    System.out.println(node.getHostname() + ": " + result.getStdout());
}
```

### Level 2 (Actor)

```java
ActorSystem system = new ActorSystem("iac", 4);

// Create NodeGroup POJO
NodeGroup nodeGroup = new NodeGroup.Builder()
    .withInventory(new FileInputStream("inventory.ini"))
    .build();

// Convert NodeGroup to actor (parent actor)
ActorRef<NodeGroup> nodeGroupActor = system.actorOf("nodeGroup", nodeGroup);

// Create Node POJOs and register as child actors
List<Node> nodes = nodeGroup.createNodesForGroup("webservers");
for (Node node : nodes) {
    nodeGroupActor.createChild("node-" + node.getHostname(), node);
}

// Execute command on all child actors (in parallel)
Set<String> childNames = nodeGroupActor.getNamesOfChildren();
List<CompletableFuture<Node.CommandResult>> futures = new ArrayList<>();

for (String name : childNames) {
    ActorRef<Node> nodeActor = system.getActor(name);
    futures.add(nodeActor.ask(node -> node.executeCommand("uptime")));
}

CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
system.terminate();
```

## Practical Scenario: Accessing a Compute Cluster

This section explains specific configuration methods using a compute cluster with the following structure as an example.

### Cluster Configuration

```
External Network (10.xxx.xxx.xxx)
        │
        ▼
┌─────────────────┐
│   Gateway       │
│ External: 10.1.2.3  │
│ Internal: 192.168.5.1│
└─────────────────┘
        │
        ▼
Internal Network (192.168.5.0/24)
        │
   ┌────┼────┬────┬─── ... ───┐
   ▼    ▼    ▼    ▼           ▼
node001 node002 node003 ... node100
.5.101  .5.102  .5.103      .5.200
```

- 100 compute nodes (192.168.5.101 - 192.168.5.200)
- External access via gateway
- Both public key and password authentication enabled
- One user with two accounts (myuser, myuser-admin)

### Step 1: Create SSH Config File

Add the following to `~/.ssh/config`:

```
# Common settings for cluster internal network
Host 192.168.5.*
    User myuser
    IdentityFile ~/.ssh/id_ed25519_myuser_cluster
    IdentitiesOnly yes
    AddKeysToAgent yes

# For myuser-admin account (manage with separate file or Match clause)
```

**Key points**:
- `IdentitiesOnly yes`: Use only the specified key (don't try extra keys)
- `AddKeysToAgent yes`: Automatically add successfully authenticated keys to ssh-agent
- actor-IaC correctly interprets wildcard hosts (`192.168.5.*`)

**Important note about Ed25519 keys**:
- When using Ed25519 keys, pre-registration with ssh-agent is **mandatory**
- Even if you specify IdentityFile in `~/.ssh/config`, Ed25519 cannot be read directly (JSch limitation)
- RSA/ECDSA keys work without ssh-agent

### Step 2: Register Keys with ssh-agent (Mandatory for Ed25519 Keys)

When using Ed25519 keys, registration with ssh-agent is mandatory.

```bash
# Start ssh-agent (if not already running)
eval "$(ssh-agent -s)"

# Register the key for the account to use
ssh-add ~/.ssh/id_ed25519_myuser_cluster

# Verify registered keys
ssh-add -l
```

**Verification**: If `ssh-add -l` shows registered keys, you're good.

This step can be skipped when using RSA/ECDSA keys (without passphrase).

### Step 3: Create Inventory File

**Accessing all nodes with myuser account**:

```ini
# inventory-myuser.ini
[compute]
192.168.5.101
192.168.5.102
192.168.5.103
# ... omitted ...
192.168.5.200

[all:vars]
ansible_user=myuser
ansible_port=22
```

**Accessing with myuser-admin account**:

```ini
# inventory-myuser-admin.ini
[compute]
192.168.5.101
192.168.5.102
192.168.5.103
# ... omitted ...
192.168.5.200

[all:vars]
ansible_user=myuser-admin
ansible_port=22
```

**Using different account for only some nodes**:

```ini
# inventory-mixed.ini
[compute]
192.168.5.101
192.168.5.102
192.168.5.103 ansible_user=myuser-admin

[all:vars]
ansible_user=myuser
ansible_port=22
```

### Step 4: Execute with actor-IaC

```java
// Confirm ssh-agent is running and key is registered

NodeGroup nodeGroup = new NodeGroup.Builder()
    .withInventory(new FileInputStream("inventory-myuser.ini"))
    .build();

// Create 100 compute nodes
List<Node> nodes = nodeGroup.createNodesForGroup("compute");

// Execute command on all nodes
for (Node node : nodes) {
    Node.CommandResult result = node.executeCommand("hostname");
    System.out.println(result.getStdout());
}
```

### Accessing from External via Gateway (ProxyJump)

actor-IaC v2.9 and later supports `ProxyJump` settings in `~/.ssh/config`.

#### ProxyJump Configuration

Add the following to `~/.ssh/config`:

```
Host 192.168.5.*
    User myuser
    IdentityFile ~/.ssh/id_ed25519_myuser_cluster
    ProxyJump myuser@10.1.2.3
```

With this configuration, actor-IaC automatically:
1. Connects to the gateway (10.1.2.3)
2. Port forwards to the target node (192.168.5.x) via the gateway
3. Executes commands on the target node

#### Usage Example

```bash
# Register key with ssh-agent (mandatory for Ed25519)
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_myuser_cluster

# Execute actor-IaC - ProxyJump is handled automatically
java -jar actor-IaC.jar -d ./workflows -w deploy -i inventory.ini
```

#### ProxyJump Formats

The following formats are supported:
- `user@host` - Uses default port 22
- `user@host:port` - Uses specified port
- `host` - Uses same username as target

#### Alternative Methods

Alternative methods when not using ProxyJump:

**Method 1: Execute actor-IaC on the gateway**

```bash
# Login to gateway
ssh myuser@10.1.2.3

# Execute actor-IaC on the gateway
java -jar actor-IaC.jar -d ./workflows -w deploy -i inventory.ini
```

**Method 2: Execute from the same network segment**

If the machine running actor-IaC is on the same segment as the internal network (192.168.5.0/24), ProxyJump is not needed.

## SSH Authentication

actor-IaC supports the following SSH authentication methods.

### Authentication Priority

actor-IaC attempts authentication in the following order:

1. **ssh-agent** (highest priority) - Supports all key types including Ed25519
2. **~/.ssh/config IdentityFile** - RSA/ECDSA keys only (without passphrase)
3. **Default key files** (id_rsa, id_ecdsa, id_dsa) - Without passphrase
4. **Password authentication** (when --ask-pass option is specified)

### Method 1: SSH Key Authentication (Recommended)

#### Using Ed25519 Keys (ssh-agent Required)

**Important**: Ed25519 keys can only be used via ssh-agent. This is a limitation of the JSch library.

```bash
# Start ssh-agent
eval "$(ssh-agent -s)"

# Register Ed25519 key
ssh-add ~/.ssh/id_ed25519
# or specific key file
ssh-add ~/.ssh/id_ed25519_myuser_cluster
```

CLI execution:
```bash
java -jar actor-IaC.jar -d ./workflows -w deploy -i inventory.ini
```

#### Using RSA/ECDSA Keys

RSA/ECDSA keys (without passphrase) can be used directly without ssh-agent.
Specify IdentityFile in `~/.ssh/config` or use default key files (~/.ssh/id_rsa, etc.).

```bash
# ~/.ssh/config example
Host 192.168.5.*
    User myuser
    IdentityFile ~/.ssh/id_rsa_cluster
```

**Advantages**: No password input needed, ideal for automation, security-recommended

### Method 2: Password Authentication (--ask-pass)

In environments where SSH keys cannot be used (clusters managed by other departments, initial setup, etc.), password authentication can be used.

```bash
java -jar actor-IaC.jar -d ./workflows -w deploy -i inventory.ini --ask-pass
SSH password: ********
```

Or short form:
```bash
java -jar actor-IaC.jar -d ./workflows -w deploy -i inventory.ini -k
SSH password: ********
```

**Behavior**:
- Enter password only once at startup
- The entered password is applied to all nodes (same as Ansible)
- Password is not echoed to the screen

**Notes**:
- Assumes the same password for all nodes (different passwords per node not supported)
- Not suitable for automation (requires password input each time)
- Migration to SSH key authentication is recommended when possible

### Choosing an Authentication Method

| Situation | Recommended Method |
|-----------|-------------------|
| Servers you manage | SSH key authentication |
| Clusters managed by other departments | Password authentication (--ask-pass) |
| Initial setup (keys not distributed) | Password authentication → Migrate to key authentication |
| CI/CD pipeline | SSH key authentication (can't input password) |

### sudo Password

If a sudo password is required, pass it via environment variable:

```bash
export SUDO_PASSWORD=yourpassword
java -jar actor-IaC.jar -d ./workflows -w deploy -i inventory.ini
```

HashiCorp Vault integration is planned for secure secret management in the future. See VaultIntegration for details.

## Troubleshooting

### "Auth fail for methods 'publickey,password'"

**Cause**: SSH authentication failed.

**Solution**:
1. If using Ed25519 key, check if ssh-agent is running:
   ```bash
   ssh-add -l
   # If no keys are shown, add them
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519_xxx
   ```
2. For RSA/ECDSA keys, confirm there's no passphrase
3. Confirm the IdentityFile path in `~/.ssh/config` is correct

### "ssh-ed25519 is not available"

**Cause**: Trying to read Ed25519 key directly (without ssh-agent).

**Solution**: Ed25519 keys can only be used via ssh-agent. Start ssh-agent and register the key:
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_xxx
```

### Connection Timeout

**Cause**: Network connection issue or ProxyJump configuration problem.

**Solution**:
1. Check if you can connect with regular SSH:
   ```bash
   ssh user@target-host
   ```
2. If using ProxyJump, check connection to gateway:
   ```bash
   ssh user@gateway-host
   ```
3. Check firewall settings

### "UnsupportedClassVersionError"

**Cause**: Java version on target server is too old.

**Solution**:
- Update Java on the target server
- Or rebuild the application for an older Java version

### Wildcard Hosts Not Recognized

**Cause**: Wildcard pattern in `~/.ssh/config` (`Host 192.168.5.*`) is incorrect.

**Solution**: actor-IaC supports OpenSSH format wildcards. Use the following format:
```
Host 192.168.5.*
    User myuser
    IdentityFile ~/.ssh/id_ed25519_xxx
```
