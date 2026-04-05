---
id: plugin-vault
sidebar_position: 80
title: "plugin-vault: HashiCorp Vault KV v2 Integration"
description: "A plugin for retrieving secrets from HashiCorp Vault's KV v2 secret engine. Manages Vault paths for host/group/global levels using INI format configuration files."
keywords:
  - HashiCorp Vault
  - KV v2
  - secret management
  - vault client
  - INI config
---

# plugin-vault

A plugin that integrates with HashiCorp Vault's KV v2 secret engine. It retrieves secrets using the Vault HTTP API and manages Vault paths with priority resolution (host/group/global) through INI format configuration files.

## Overview

`plugin-vault` serves two primary roles:

1. **VaultClient**: Connects to the Vault HTTP API and reads KV v2 secrets
2. **VaultConfigParser**: Parses INI format Vault path configuration files and resolves priorities

## Vault Configuration

### `VaultConfig`

An immutable object that holds Vault connection information.

```java
VaultConfig config = new VaultConfig(
    "https://vault.example.com:8200",  // Vault server address
    "hvs.XXXXXXXXXXXXX"                // Authentication token
);

// toString() masks the token
System.out.println(config);
// → VaultConfig{address='https://vault.example.com:8200', token='***'}
```

## `VaultClient`

Reads Vault KV v2 secrets.

```java
VaultClient client = new VaultClient(config);

// Read a secret
String privateKey = client.readSecret("secret/data/ssh/admin/private_key");
```

### HTTP Communication

| Setting | Value |
|---|---|
| Method | GET |
| Connection Timeout | 10 seconds |
| Authentication | `X-Vault-Token` header |
| Response Parsing | KV v2 format: `data.data.value` |

### Error Handling

```java
try {
    String secret = client.readSecret("secret/data/nonexistent");
} catch (VaultClient.VaultException e) {
    // HTTP 404: "Secret not found at path: secret/data/nonexistent"
    // HTTP 403: "Vault returned status 403: ..."
    // Connection error: "Failed to read secret from Vault: ..."
}
```

`VaultException` is a checked exception.

## Vault Path Configuration File

### Configuration File Format

Vault paths are defined in INI format.

```ini
# Global paths (apply to all hosts)
[vault:all]
ssh_key_path=secret/data/ssh/iacuser/private_key
sudo_password_path=secret/data/sudo/default

# Group paths (apply to hosts within the group)
[vault:webservers]
sudo_password_path=secret/data/sudo/web
api_key_path=secret/data/api/web-service

# Host-specific paths (highest priority)
[vault:host:web1.example.com]
ssh_key_path=secret/data/ssh/web1/private_key
```

### Path Priority

**Host-specific > Group > Global**

```java
InputStream configStream = new FileInputStream("vault-config.ini");
VaultConfigParser.VaultPaths paths = VaultConfigParser.parse(configStream);

// Get Vault paths for a host (resolved by priority)
Map<String, String> vaultPaths = paths.getPathsForHost(
    "web1.example.com",
    "webservers"
);

// Result:
// ssh_key_path       → "secret/data/ssh/web1/private_key"    (host-specific)
// sudo_password_path → "secret/data/sudo/web"                (from group)
// api_key_path       → "secret/data/api/web-service"         (from group)
```

### `VaultPaths` API

```java
// Global paths only
Map<String, String> global = paths.getGlobalPaths();

// Paths for a specific group
Map<String, String> group = paths.getGroupPaths("webservers");

// Paths for a specific host
Map<String, String> host = paths.getHostPaths("web1.example.com");

// Path resolution with priority applied
Map<String, String> resolved = paths.getPathsForHost("web1.example.com", "webservers");

// Programmatically add paths
paths.addGlobalPath("new_key", "secret/data/new");
paths.addGroupPath("dbservers", "db_pass", "secret/data/db/password");
paths.addHostPath("db1.example.com", "db_pass", "secret/data/db/db1/password");
```

## Typical Usage Pattern in Workflows

```java
// 1. Parse the Vault configuration file
VaultPaths paths = VaultConfigParser.parse(configStream);

// 2. Resolve Vault paths for the host
Map<String, String> vaultPaths = paths.getPathsForHost(hostname, groupNames);

// 3. Retrieve Vault secrets for each path
VaultClient client = new VaultClient(vaultConfig);
for (Map.Entry<String, String> entry : vaultPaths.entrySet()) {
    String secretName = entry.getKey().replace("_path", "");
    String secretValue = client.readSecret(entry.getValue());
    // Use the secret...
}
```

## Comparison with `plugin-secret`

| Aspect | plugin-secret | plugin-vault |
|---|---|---|
| Secret Storage | Encrypted file (local) | HashiCorp Vault (server) |
| Key Management | Encryption key in environment variable | Vault token authentication |
| Rotation | Requires file re-encryption | Dynamic rotation possible via Vault |
| Offline Use | Possible | Requires connection to Vault server |
| Use Case | Small-scale / standalone environments | Enterprise / team environments |

## Environment Variables (Convention)

| Variable | Description |
|---|---|
| `VAULT_ADDR` | Vault server address |
| `VAULT_TOKEN` | Vault authentication token |

The plugin does not directly reference these environment variables. The caller is responsible for passing them to the `VaultConfig` constructor.

## Dependencies

- `org.yaml:snakeyaml:2.2` - JSON parsing for Vault responses (YAML superset)
- JDK `java.net.http.HttpClient` (built-in)
- No dependencies on other plugins
