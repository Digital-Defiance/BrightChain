# BrightChain Keybase Features — Developer Guide

## Architecture Overview

All Keybase-inspired features follow BrightChain's layered architecture:

- **brightchain-lib**: Core services, interfaces, and enumerations (platform-agnostic)
- **brightchain-api-lib**: Express controllers and Node.js-specific services
- **brightchain-react**: UI components (MUI + React FC pattern)

Interfaces use generic `<TId = string>` for frontend/backend DTO compatibility.

---

## Service Reference

### Identity Services (`brightchain-lib/src/lib/services/identity/`)

#### MemberPaperKeyService

```typescript
import { MemberPaperKeyService } from '@digitaldefiance/brightchain-lib';

// Generate a 24-word BIP39 paper key
const paperKey = MemberPaperKeyService.generatePaperKey();

// Validate a paper key
const isValid = MemberPaperKeyService.validatePaperKey(paperKey);

// Recover a member from a paper key
const member = MemberPaperKeyService.recoverFromPaperKey(paperKey, memberName);

// Generate a printable template
const template = MemberPaperKeyService.generateTemplate(paperKey, metadata);
```

#### SplitPaperKeyService

```typescript
import { SplitPaperKeyService } from '@digitaldefiance/brightchain-lib';

// Split a paper key into shares (3-of-5 threshold)
const shares = SplitPaperKeyService.split(paperKey, 5, 3);

// Reconstruct from any 3 shares
const recovered = SplitPaperKeyService.reconstruct(shares.slice(0, 3));
```

#### DeviceProvisioningService

```typescript
import { DeviceProvisioningService } from '@digitaldefiance/brightchain-lib';

// Provision a new device
const device = DeviceProvisioningService.provisionDevice(member, {
  name: 'MacBook Pro',
  type: DeviceType.Desktop,
});

// List devices for a member
const devices = DeviceProvisioningService.listDevices(member);

// Revoke a device
DeviceProvisioningService.revokeDevice(member, deviceId);
```

#### MemberIdentityProofService

```typescript
import { MemberIdentityProofService } from '@digitaldefiance/brightchain-lib';

// Create a signed identity proof
const proof = MemberIdentityProofService.create(member, 'github', 'username');

// Verify a proof
const isValid = await MemberIdentityProofService.verify(proof);

// Get platform-specific posting instructions
const instructions = MemberIdentityProofService.getInstructions('github');
```

#### PublicKeyDirectoryService

```typescript
import { PublicKeyDirectoryService } from '@digitaldefiance/brightchain-lib';

// Search the directory
const results = PublicKeyDirectoryService.search('alice', profiles);

// Toggle privacy mode
PublicKeyDirectoryService.togglePrivacyMode(profile);
```

### Crypto Services (`brightchain-lib/src/lib/services/crypto/`)

#### EthereumWalletService

```typescript
import { EthereumWalletService } from '@digitaldefiance/brightchain-lib';

// Derive Ethereum address from member identity
const address = EthereumWalletService.deriveAddress(mnemonic);

// Sign a message (EIP-191)
const signature = EthereumWalletService.signMessage(mnemonic, 'Hello');

// Verify a signature
const signer = EthereumWalletService.verifySignature('Hello', signature);
```

#### GitSigningService

```typescript
import { GitSigningService } from '@digitaldefiance/brightchain-lib';

// Sign a git commit
const signature = GitSigningService.signCommit(mnemonic, commitContent);

// Sign a git tag
const tagSig = GitSigningService.signTag(mnemonic, tagContent);

// Export public key in GPG-compatible format
const gpgKey = GitSigningService.exportPublicKey(mnemonic);

// Verify a signature
const valid = GitSigningService.verify(content, signature, publicKey);
```

### Communication Services (`brightchain-lib/src/lib/services/communication/`)

#### ExplodingMessageService

```typescript
import { ExplodingMessageService } from '@digitaldefiance/brightchain-lib';

// Set time-based expiration
const msg = ExplodingMessageService.setExpiration(message, 3600); // 1 hour

// Set read-count expiration
const msg2 = ExplodingMessageService.setExpiration(message, undefined, 3);

// Mark a message as read by a user
const updated = ExplodingMessageService.markRead(message, userId);

// Check if a message should be exploded
const shouldExplode = ExplodingMessageService.checkExpiration(message);

// Explode a message (replace content)
const exploded = ExplodingMessageService.explode(message);
```

---

## API Endpoints

### Device Provisioning

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/devices/provision` | Provision a new device |
| GET | `/api/devices/list` | List all devices for a member |
| POST | `/api/devices/:id/revoke` | Revoke a device |
| PUT | `/api/devices/:id/rename` | Rename a device |

### Identity Proofs

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/identity/proofs` | Create a new identity proof |
| GET | `/api/identity/proofs/:memberId` | Get proofs for a member |
| POST | `/api/identity/proofs/:id/verify` | Verify a proof |
| DELETE | `/api/identity/proofs/:id` | Revoke a proof |
| GET | `/api/identity/proofs/instructions/:platform` | Get posting instructions |

### Public Directory

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/directory/search?q=` | Search the public directory |
| GET | `/api/directory/profile/:memberId` | Get a member's public profile |
| PUT | `/api/directory/profile` | Update profile |
| POST | `/api/directory/privacy` | Toggle privacy mode |

### Cryptocurrency

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/wallet/address/:memberId` | Get Ethereum address |
| POST | `/api/wallet/sign-transaction` | Sign an Ethereum transaction |
| POST | `/api/wallet/sign-message` | Sign a message (EIP-191) |
| POST | `/api/wallet/verify` | Verify a signature |
| POST | `/api/git/sign-commit` | Sign a git commit |
| POST | `/api/git/sign-tag` | Sign a git tag |
| GET | `/api/git/public-key/:memberId` | Export GPG-compatible public key |
| POST | `/api/git/verify` | Verify a git signature |

### Exploding Messages

| Method | Path | Description |
|--------|------|-------------|
| PUT | `/api/messages/:id/set-expiration` | Set message expiration |
| POST | `/api/messages/:id/mark-read` | Mark message as read |
| GET | `/api/messages/expired` | List expired messages |
| DELETE | `/api/messages/:id/explode` | Force-explode a message |
| GET | `/api/messages/:id/remaining` | Get remaining time/reads |

---

## Key Derivation Paths

| Purpose | BIP32/44 Path | Notes |
|---------|---------------|-------|
| Master identity | BIP39 mnemonic | 24-word phrase, 256-bit entropy |
| Ethereum wallet | `m/44'/60'/0'/0/0` | Standard BIP44 Ethereum |
| Device keys | `m/44'/60'/0'/1/<index>` | One per provisioned device |
| Git signing | `m/44'/60'/0'/2/0` | GPG-compatible ECDSA |

---

## Testing

Run all Keybase feature tests:

```bash
# Identity services
NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream --testFile=src/lib/services/identity/memberPaperKeyService.spec.ts
NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream --testFile=src/lib/services/identity/deviceProvisioningService.spec.ts
NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream --testFile=src/lib/services/identity/memberIdentityProofService.spec.ts
NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream --testFile=src/lib/services/identity/publicKeyDirectoryService.spec.ts

# Crypto services
NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream --testFile=src/lib/services/crypto/ethereumWalletService.spec.ts
NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream --testFile=src/lib/services/crypto/gitSigningService.spec.ts

# Communication services
NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream --testFile=src/lib/services/communication/explodingMessageService.spec.ts

# Property-based tests
NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream --testFile=src/lib/services/identity/deviceProvisioningService.property.spec.ts
NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream --testFile=src/lib/services/identity/publicKeyDirectoryService.property.spec.ts
NX_TUI=false npx nx run brightchain-lib:test --outputStyle=stream --testFile=src/lib/services/communication/explodingMessageService.property.spec.ts
```
