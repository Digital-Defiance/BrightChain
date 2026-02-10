# Keybase-Inspired Features — Architecture Documentation

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     brightchain-react (UI)                      │
│  PaperKeyWizard │ DeviceManager │ IdentityProofWizard │ ...    │
├─────────────────────────────────────────────────────────────────┤
│                  brightchain-api-lib (Controllers)              │
│  DeviceController │ IdentityProofController │ WalletController  │
│  DirectoryController │ GitController │ ExplodingMsgController   │
│  ExpirationScheduler (Node.js-specific)                        │
├─────────────────────────────────────────────────────────────────┤
│                  brightchain-lib (Core Services)                │
│  MemberPaperKeyService │ SplitPaperKeyService                  │
│  DeviceProvisioningService │ MemberIdentityProofService        │
│  PublicKeyDirectoryService │ EthereumWalletService              │
│  GitSigningService │ ExplodingMessageService                   │
├─────────────────────────────────────────────────────────────────┤
│                  External Dependencies                          │
│  bip39 │ @scure/bip32 │ secp256k1 │ @noble/hashes             │
│  @digitaldefiance/secrets │ @digitaldefiance/ecies-lib         │
└─────────────────────────────────────────────────────────────────┘
```

## Design Principles

1. **Platform Agnosticism**: All core logic lives in brightchain-lib and runs in both Node.js and browsers.
2. **Generic DTO Pattern**: Interfaces use `<TId = string>` so frontends use string IDs while backends can use `GuidV4Buffer`.
3. **Stateless Services**: Services are pure functions operating on data — no internal state, no singletons.
4. **Deterministic Key Derivation**: All keys (device, wallet, git) are derived from the member's BIP39 mnemonic via BIP32 HD paths.
5. **No Centralized Trust**: Identity proofs are self-verifying via ECDSA signatures; no server is trusted for verification.

---

## Data Flow Diagrams

### Paper Key Generation & Recovery

```
User → PaperKeyWizard → MemberPaperKeyService.generatePaperKey()
                         ├── bip39.generateMnemonic(256)
                         └── Returns 24-word phrase

User → PaperKeyRecovery → MemberPaperKeyService.recoverFromPaperKey()
                           ├── bip39.mnemonicToSeedSync()
                           ├── HDKey.fromMasterSeed()
                           └── Reconstructs Member identity
```

### Split Paper Key (Shamir's Secret Sharing)

```
Paper Key → SplitPaperKeyService.split(key, totalShares, threshold)
            ├── @digitaldefiance/secrets.share()
            ├── Produces N shares, any T can reconstruct
            └── Each share → QR code template

Any T shares → SplitPaperKeyService.reconstruct(shares)
               ├── @digitaldefiance/secrets.combine()
               └── Returns original paper key
```

### Device Provisioning

```
Member + Paper Key → DeviceProvisioningService.provisionDevice()
                     ├── Validate paper key
                     ├── Derive device key: m/44'/60'/0'/1/<deviceIndex>
                     ├── Generate IDeviceMetadata
                     └── Register device on member

Device Revocation → DeviceProvisioningService.revokeDevice()
                    ├── Mark device as revoked
                    ├── Set revokedAt timestamp
                    └── Device keys become permanently invalid
```

### Identity Proof Creation & Verification

```
Member + Platform → MemberIdentityProofService.create()
                    ├── Build proof statement (JSON)
                    ├── ECDSA sign with member's private key
                    ├── Return signed proof + instructions
                    └── User posts to platform

Proof URL → MemberIdentityProofService.verify()
            ├── Fetch proof from URL
            ├── Extract signature
            ├── ECDSA verify against member's public key
            └── Return verified/failed
```

### Ethereum Wallet Derivation

```
Mnemonic → EthereumWalletService.deriveAddress()
           ├── bip39.mnemonicToSeedSync()
           ├── HDKey.fromMasterSeed(seed)
           ├── Derive path m/44'/60'/0'/0/0
           ├── secp256k1 public key
           ├── keccak256(publicKey)
           └── Last 20 bytes → 0x-prefixed Ethereum address

Message → EthereumWalletService.signMessage()
          ├── EIP-191 prefix: "\x19Ethereum Signed Message:\n"
          ├── keccak256(prefixed message)
          ├── secp256k1.sign(hash, privateKey)
          └── Returns {r, s, v} signature
```

### Git Signing

```
Commit Content → GitSigningService.signCommit()
                 ├── SHA-256 hash of content
                 ├── secp256k1.sign(hash, gitSigningKey)
                 ├── DER-encode signature
                 └── Wrap in GPG-compatible armor block

Public Key → GitSigningService.exportPublicKey()
             ├── Derive git signing key (m/44'/60'/0'/2/0)
             ├── Get compressed public key
             └── Wrap in GPG PUBLIC KEY BLOCK armor
```

### Exploding Messages

```
Message + Duration → ExplodingMessageService.setExpiration()
                     ├── Set expiresAt = now + duration
                     └── Mark as exploding

Message + Read → ExplodingMessageService.markRead()
                 ├── Add reader to readBy map
                 ├── Increment readCount
                 └── Check if maxReads exceeded

Scheduler (Node.js) → ExpirationScheduler.start()
                      ├── Periodic check (configurable interval)
                      ├── ExplodingMessageService.checkExpiration()
                      ├── ExplodingMessageService.explode()
                      └── Emit MESSAGE_EXPIRED / MESSAGE_EXPLODED events
```

---

## Security Considerations

### Key Management

- **BIP39 Entropy**: Paper keys use 256-bit entropy (24 words), providing 2^256 possible keys.
- **BIP32 Derivation**: Hardened derivation (`'`) is used for all purpose-level paths, preventing child key compromise from leaking parent keys.
- **Device Isolation**: Each device has its own derived key. Revoking a device does not affect other devices or the master identity.

### Cryptographic Primitives

| Operation | Algorithm | Library | Security Level |
|-----------|-----------|---------|----------------|
| Key derivation | BIP32 HD | @scure/bip32 | 256-bit |
| Signing (identity) | ECDSA secp256k1 | secp256k1 | 128-bit |
| Hashing (Ethereum) | Keccak-256 | @noble/hashes/sha3 | 256-bit |
| Hashing (Git) | SHA-256 | @noble/hashes/sha256 | 256-bit |
| Secret sharing | Shamir's SSS | @digitaldefiance/secrets | Information-theoretic |
| Mnemonic | BIP39 | bip39 | 256-bit entropy |

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Paper key theft | Split custody via Shamir's Secret Sharing; physical storage guidance |
| Device compromise | Per-device keys with revocation; compromised device cannot access other device keys |
| Identity proof forgery | ECDSA signatures tied to member's secp256k1 key; proofs are self-verifying |
| Message persistence | Exploding messages with server-side scheduled cleanup; content replaced on expiration |
| Key derivation attack | Hardened BIP32 derivation prevents child-to-parent key recovery |
| Replay attacks | Timestamps and nonces in signed proof statements |

### Comparison with Keybase Security Model

- **Keybase**: Relies on centralized servers for key distribution, proof verification, and device management. Server compromise could forge proofs or intercept device provisioning.
- **BrightChain**: All verification is cryptographic and peer-to-peer. No server is trusted for proof validity. Device keys are derived deterministically, not distributed by a server. Shamir's Secret Sharing provides organizational key recovery without any single custodian having full access.

---

## Interface Design (Generic DTO Pattern)

All interfaces follow the generic `<TId>` pattern for cross-platform compatibility:

```typescript
// brightchain-lib — shared interface
interface IDeviceMetadata<TId = string> {
  id: TId;
  memberId: TId;
  name: string;
  type: DeviceType;
  publicKey: string;
  createdAt: Date;
  lastSeenAt: Date;
  revoked: boolean;
  revokedAt?: Date;
}

// Frontend usage: IDeviceMetadata<string>
// Backend usage:  IDeviceMetadata<GuidV4Buffer>
```

This pattern is applied consistently across all Keybase feature interfaces:
- `IDeviceMetadata<TId>`
- `IIdentityProof<TId>`
- `IPublicProfile<TId>`
- `IGitSignature<TId>`
- `ICommunicationMessage<TId>` (extended with exploding fields)
