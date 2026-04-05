---
id: PluginSecret_260403_oo01
sidebar_position: 70
title: "plugin-secret: AES-256-GCM Secret Encryption"
description: "A plugin that protects INI-format secret files using AES-256-GCM encryption. Manages secrets with host/group/global priority."
keywords:
  - secret
  - encryption
  - AES-256-GCM
  - INI format
  - credential management
---

# plugin-secret

A plugin that securely manages secrets (passwords, SSH keys, API keys, etc.) using AES-256-GCM encryption. It encrypts entire INI-format secret files and resolves secrets based on host/group/global priority.

## Encryption Specification

| Item | Specification |
|---|---|
| Algorithm | `AES/GCM/NoPadding` |
| Key length | 256 bits |
| IV length | 96 bits (randomly generated for each encryption) |
| Authentication tag | 128 bits (GCM authentication tag) |
| Encoding | Base64 (for both key and ciphertext) |

Ciphertext format: `Base64(12-byte IV + encrypted data + 16-byte authentication tag)`

## Secret File Format

Create in plaintext INI format, then encrypt and save.

```ini
# Global secrets (applied to all hosts)
[secrets:all]
ssh_key=-----BEGIN OPENSSH PRIVATE KEY-----\nMIIE...
sudo_password=GlobalPass123

# Group secrets (applied to hosts in the group)
[secrets:webservers]
sudo_password=WebPass456
api_key=sk-abc123...

# Host-specific secrets (highest priority)
[secrets:host:web1.example.com]
ssh_key=-----BEGIN OPENSSH PRIVATE KEY-----\nMIIE...
sudo_password=Web1Pass789
```

### Secret Priority

**Host-specific > Group > Global**

```
getSecretsForHost("web1.example.com", "webservers")

-> sudo_password: "Web1Pass789"   (host > group > global)
   ssh_key:       host-specific key (host-specific)
   api_key:       "sk-abc123..."  (inherited from group)
```

### Value Escaping

`\n` in values is converted to actual newlines. This allows multi-line values such as SSH private keys to be written on a single line.

## CLI Tool (`SecretTool`)

### Key Generation

```bash
java -cp plugin-secret.jar \
  com.scivicslab.turingworkflow.plugins.secret.SecretTool \
  generate-key
```

Output:
```
Generated encryption key:
aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC=

Store this key securely. Example:
  export TURING_SECRET_KEY='aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC='
```

### Encrypting Secret Files

```bash
java -cp plugin-secret.jar \
  com.scivicslab.turingworkflow.plugins.secret.SecretTool \
  encrypt secrets.ini secrets.enc "$TURING_SECRET_KEY"
```

### Decrypting Encrypted Files (for verification)

```bash
java -cp plugin-secret.jar \
  com.scivicslab.turingworkflow.plugins.secret.SecretTool \
  decrypt secrets.enc "$TURING_SECRET_KEY"
```

## Programmatic Usage

### Encryption and Decryption

```java
// Generate key
String key = SecretEncryptor.generateKey();

// Encrypt
String encrypted = SecretEncryptor.encrypt("secret data", key);

// Decrypt
String decrypted = SecretEncryptor.decrypt(encrypted, key);

// Decryption with invalid key throws EncryptionException
try {
    SecretEncryptor.decrypt(encrypted, wrongKey);
} catch (SecretEncryptor.EncryptionException e) {
    // GCM authentication tag verification failed
}
```

### Using Encrypted Secret Files

```java
// Load, decrypt, and parse encrypted file
EncryptedSecretConfig config = EncryptedSecretConfig.parse(
    new FileInputStream("secrets.enc"),
    encryptionKey
);

// Get secrets for host (resolved based on priority)
Map<String, String> secrets = config.getSecretsForHost(
    "web1.example.com",
    "webservers"     // belonging group
);

String sudoPass = secrets.get("sudo_password");
String sshKey = secrets.get("ssh_key");

// Global secrets only
Map<String, String> global = config.getGlobalSecrets();
```

## Typical Usage Pattern in Workflows

1. Operator generates encryption key with `generate-key`
2. Create plaintext `secrets.ini`
3. Generate encrypted file with `encrypt`
4. Delete plaintext file
5. Set encryption key in environment variable `TURING_SECRET_KEY`
6. Decrypt encrypted file during workflow execution to retrieve secrets

## Environment Variables

| Variable Name | Description |
|---|---|
| `TURING_SECRET_KEY` | Base64-encoded AES-256 encryption key (convention) |

## Library Dependencies

- JDK `javax.crypto` (built-in) - No external cryptography library required
- No dependencies on other plugins
