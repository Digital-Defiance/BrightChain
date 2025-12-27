# Voting Service Security Best Practices

## Overview

This document provides security guidelines for using the VotingService in production environments. The ECIES-to-Paillier bridge is cryptographically sound, but proper usage is critical for maintaining security.

## Key Security Properties

### What is Protected
✅ **One-way derivation**: Cannot recover ECDH keys from Paillier keys  
✅ **Collision resistance**: Different ECDH keys → different Paillier keys  
✅ **Domain separation**: Keys bound to voting purpose via HKDF  
✅ **Deterministic recovery**: Same ECDH keys → same Paillier keys  
✅ **Semantic security**: Paillier encryption is probabilistic  

### Security Level
- **Symmetric equivalent**: 128 bits
- **ECDH**: secp256k1 (Node) / P-256 (Web)
- **Paillier**: 3072-bit modulus
- **NIST compliance**: Meets SP 800-57 requirements

## Best Practices

### 1. Key Generation

#### ✅ DO:
```typescript
// Use cryptographically secure random for initial ECDH key generation
import { randomBytes } from 'crypto';
const seed = randomBytes(32); // 256 bits of entropy

// OR use secure mnemonic generation
const mnemonic = eciesService.generateNewMnemonic();
```

#### ❌ DON'T:
```typescript
// Never use weak random sources
const weakSeed = Math.random(); // INSECURE!

// Never use predictable seeds
const predictableSeed = Buffer.from('my-password'); // INSECURE!
```

### 2. Private Key Storage

#### ✅ DO:
```typescript
// Encrypt private keys before storing
const votingService = VotingService.getInstance();
const privateKeyBuffer = votingService.votingPrivateKeyToBuffer(privateKey);

// Encrypt with another key before storage
const encryptedKey = await eciesService.encrypt(
  privateKeyBuffer,
  storagePublicKey
);

// Store encrypted version only
await secureStorage.save(encryptedKey);
```

#### ❌ DON'T:
```typescript
// Never store private keys in plaintext
localStorage.setItem('privateKey', privateKeyBuffer.toString('hex')); // INSECURE!

// Never log private keys
console.log('Private key:', privateKey); // INSECURE!

// Never transmit private keys over insecure channels
fetch('http://example.com/keys', { // INSECURE!
  method: 'POST',
  body: JSON.stringify({ privateKey })
});
```

### 3. Memory Management

#### ✅ DO:
```typescript
// Clear sensitive data from memory when done
import { SecureBuffer } from '@digitaldefiance/node-ecies-lib';

const privateKeyBuffer = new SecureBuffer(privateKeyBytes);
try {
  // Use the key
  await doSomethingWithKey(privateKeyBuffer);
} finally {
  // Always clear
  privateKeyBuffer.dispose();
}
```

#### ❌ DON'T:
```typescript
// Don't keep private keys in memory longer than needed
class MyApp {
  private privateKey: PrivateKey; // Persists in memory!
  
  // Better: Load only when needed, clear immediately after
}
```

### 4. Key Rotation

#### ✅ DO:
```typescript
// Rotate keys periodically
const KEY_ROTATION_INTERVAL = 90 * 24 * 60 * 60 * 1000; // 90 days

if (Date.now() - member.dateCreated.getTime() > KEY_ROTATION_INTERVAL) {
  // Generate new member with fresh keys
  const { member: newMember, mnemonic } = BrightChainMember.newMember(
    type,
    name,
    email
  );
  
  // Migrate data to new keys
  await migrateVotesToNewKeys(oldMember, newMember);
  
  // Securely delete old keys
  oldMember.dispose();
}
```

### 5. Timing Attack Mitigation

#### ✅ DO:
```typescript
// Use constant-time comparison for sensitive values
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}
```

#### ⚠️ NOTE:
The voting service includes timing attack mitigations:
- Fixed iteration count for prime generation (10,000 attempts)
- Constant-time completion (continues after finding prime)
- Input validation to prevent information leakage

### 6. Input Validation

#### ✅ DO:
```typescript
// Always validate inputs before key derivation
function deriveVotingKeys(ecdhPrivKey: Uint8Array, ecdhPubKey: Uint8Array) {
  // Validate key lengths
  if (ecdhPrivKey.length !== 32) {
    throw new Error('Invalid private key length');
  }
  
  if (ecdhPubKey.length !== 64 && ecdhPubKey.length !== 65) {
    throw new Error('Invalid public key length');
  }
  
  // Validate key is on curve (if possible)
  // ... curve validation ...
  
  return votingService.deriveVotingKeysFromECDH(ecdhPrivKey, ecdhPubKey);
}
```

### 7. Error Handling

#### ✅ DO:
```typescript
// Handle errors without leaking information
try {
  const keys = deriveVotingKeysFromECDH(privKey, pubKey);
} catch (error) {
  // Log minimal information
  logger.error('Key derivation failed', { 
    timestamp: Date.now(),
    // Don't log keys or sensitive details!
  });
  
  // Return generic error to user
  throw new Error('Key derivation failed');
}
```

#### ❌ DON'T:
```typescript
// Don't expose internal details
catch (error) {
  throw new Error(`Failed with keys: ${privKey} ${pubKey}`); // INSECURE!
}
```

### 8. Testing in Production

#### ✅ DO:
```typescript
// Use test vectors for validation
const TEST_VECTORS = {
  ecdhPrivKey: Buffer.from('...known test key...'),
  ecdhPubKey: Buffer.from('...known test key...'),
  expectedPaillierN: BigInt('...expected value...')
};

// Verify implementation matches expected behavior
const result = deriveVotingKeysFromECDH(
  TEST_VECTORS.ecdhPrivKey,
  TEST_VECTORS.ecdhPubKey
);

if (result.publicKey.n !== TEST_VECTORS.expectedPaillierN) {
  throw new Error('Implementation changed! Do not deploy!');
}
```

### 9. Homomorphic Operation Security

#### ✅ DO:
```typescript
// Verify ballots are properly encrypted
function submitVote(vote: bigint, votingPublicKey: PublicKey) {
  // Encrypt vote
  const encryptedVote = votingPublicKey.encrypt(vote);
  
  // Verify encryption is non-deterministic (different each time)
  const testEncryption = votingPublicKey.encrypt(vote);
  if (encryptedVote === testEncryption) {
    throw new Error('Encryption is deterministic - SECURITY ISSUE!');
  }
  
  return encryptedVote;
}
```

#### ⚠️ REMEMBER:
- Paillier encryption is probabilistic (uses random r)
- Same vote → different ciphertexts (semantic security)
- Homomorphic addition is safe: E(a) + E(b) = E(a+b)
- Never reuse randomness between encryptions

### 10. Web-Specific Security

#### ✅ DO:
```typescript
// Use Content Security Policy
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-eval'">

// Store keys in IndexedDB, not localStorage
const db = await openDB('voting-keys', 1);
await db.put('keys', encryptedKeys, 'voting');

// Use HTTPS only
if (window.location.protocol !== 'https:') {
  throw new Error('Voting requires HTTPS');
}
```

#### ❌ DON'T:
```typescript
// Never use localStorage for keys
localStorage.setItem('votingKeys', JSON.stringify(keys)); // INSECURE!

// Never allow HTTP
if (window.location.protocol === 'http:') {
  // Still proceed... // INSECURE!
}
```

## Threat Model

### What We Protect Against

1. **Factorization Attacks**: 3072-bit modulus resists GNFS
2. **Weak Primes**: Miller-Rabin with 256 rounds (error < 2^-512)
3. **Collision Attacks**: Birthday bound requires ~2^128 operations
4. **Timing Attacks**: Constant-time operations where possible
5. **Key Recovery**: One-way derivation (HKDF, ECDH hardness)

### What We Cannot Protect Against

1. **Quantum Attacks**: Shor's algorithm breaks RSA-type systems
   - **Mitigation**: Monitor post-quantum crypto developments
   - **Timeline**: Practical quantum computers 10+ years away

2. **Side-Channel Attacks**: Power analysis, cache timing, etc.
   - **Mitigation**: Use hardware security modules (HSM) for production
   - **Mitigation**: Constant-time crypto libraries

3. **Insider Threats**: Compromised private keys
   - **Mitigation**: Multi-signature schemes, key splitting
   - **Mitigation**: Hardware security, key ceremonies

4. **Implementation Bugs**: Software vulnerabilities
   - **Mitigation**: Regular security audits
   - **Mitigation**: Formal verification (future work)

## Production Checklist

Before deploying to production:

- [ ] Use cryptographically secure random for ECDH key generation
- [ ] Encrypt private keys before storage
- [ ] Implement key rotation policy (90-180 days)
- [ ] Use HTTPS/TLS for all communications
- [ ] Implement proper error handling (no information leakage)
- [ ] Add security monitoring and logging
- [ ] Conduct security audit of integration code
- [ ] Test with NIST test vectors
- [ ] Implement rate limiting for key derivation
- [ ] Set up key backup and recovery procedures
- [ ] Document incident response procedures
- [ ] Train operators on security procedures
- [ ] Consider HSM for production key storage
- [ ] Implement multi-signature for critical operations

## Monitoring and Logging

### What to Log (Safe)
✅ Timestamp of key derivation  
✅ Number of votes encrypted  
✅ Failed authentication attempts  
✅ Key rotation events  
✅ Error types (without sensitive details)  

### What NOT to Log (Sensitive)
❌ Private keys (any part)  
❌ ECDH private keys  
❌ Paillier private keys (lambda, mu)  
❌ Decrypted vote values  
❌ Intermediate cryptographic values  

## Incident Response

### If Private Key Compromised

1. **Immediate Actions**:
   - Revoke compromised keys
   - Generate new keys for affected members
   - Notify affected parties
   - Invalidate affected votes/data

2. **Investigation**:
   - Determine scope of compromise
   - Identify attack vector
   - Assess data exposure

3. **Recovery**:
   - Migrate to new keys
   - Implement additional controls
   - Update security procedures

4. **Post-Incident**:
   - Security audit
   - Update threat model
   - Training and awareness

## Resources

- **Security Analysis**: `docs/SECURITY_ANALYSIS_ECIES_PAILLIER_BRIDGE.md`
- **Test Suite**: `voting.service.spec.ts`
- **NIST Standards**: 
  - SP 800-57 (Key Management)
  - SP 800-90A (DRBG)
  - FIPS 186-4 (DSS)
- **RFCs**:
  - RFC 5869 (HKDF)
  - RFC 6979 (Deterministic ECDSA)

## Support

For security-related questions or to report vulnerabilities:
- **Email**: security@digitaldefiance.io
- **Security Policy**: `SECURITY.md`
- **Bug Bounty**: [To be announced]

---

**Document Version**: 1.0  
**Last Updated**: December 25, 2025  
**Next Review**: March 25, 2026
