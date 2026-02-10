# BrightChain Keybase-Inspired Features — User Guide

## Paper Key Generation & Recovery

### What is a Paper Key?

A paper key is a 24-word BIP39 mnemonic phrase that serves as the master backup for your BrightChain identity. It can recover your account, provision new devices, and restore access if all devices are lost.

### Generating a Paper Key

1. Navigate to **Identity → Paper Keys** in the BrightChain interface.
2. The Paper Key Wizard walks you through four steps:
   - **Security Warnings**: Read and acknowledge the security requirements.
   - **Generate**: A cryptographically random 24-word phrase is generated.
   - **Write Down**: Copy the words onto the printable template. Never store digitally.
   - **Verify**: Enter 3 randomly selected words to confirm you recorded them correctly.
3. Store the paper key in a secure physical location (safe, safety deposit box).

### Split Paper Keys (Shamir's Secret Sharing)

For organizational or high-security scenarios, a paper key can be split into multiple shares:
- Configure a threshold (e.g., 3-of-5) — any 3 shares can reconstruct the key, but fewer cannot.
- Distribute shares to trusted custodians.
- Each share is printed on its own template with a QR code.

### Recovering from a Paper Key

1. Navigate to **Identity → Recovery**.
2. Enter your 24-word paper key (typed or scanned via QR).
3. Your member identity, keys, and metadata are restored.
4. Provision the current device to resume normal operation.

---

## Identity Proofs

### Linking External Accounts

Identity proofs let you cryptographically link external accounts (GitHub, Twitter, Reddit, Hacker News, DNS, websites) to your BrightChain identity.

1. Open **Identity → Link Identity**.
2. Select a platform.
3. A signed statement is generated using your member's private key.
4. Copy the statement and post it on the selected platform (e.g., as a GitHub Gist).
5. Enter the URL where you posted the proof.
6. BrightChain verifies the proof by fetching the URL and validating the signature.

### Managing Proofs

- View all linked accounts in **Profile Settings** with verification badges.
- Revoke a proof at any time — this removes the link but does not delete the external post.
- Enable **Privacy Mode** to hide your profile from the public directory while keeping proofs valid.

### Searching the Directory

- Use **Profile Search** to find other BrightChain members by username, email, or linked platform handle.
- Verified badges indicate which identity proofs have been cryptographically confirmed.

---

## Device Provisioning

### Adding a New Device

1. On the new device, select **Provision Device**.
2. Enter your paper key or scan its QR code.
3. A unique device key is derived from your identity using BIP32 HD derivation.
4. The device is registered with a name and type (desktop, mobile, browser extension, CLI, hardware).

### Managing Devices

- **List**: View all provisioned devices with their status and last-seen timestamps.
- **Rename**: Update a device's display name.
- **Revoke**: Permanently disable a device's keys. Revoked devices cannot be re-provisioned.

---

## Ethereum Wallet

### Overview

BrightChain derives a non-custodial Ethereum wallet directly from your member identity using the BIP44 path `m/44'/60'/0'/0/0`. No separate seed phrase is needed.

### Features

- **View Address**: Your Ethereum address is deterministically derived from your identity.
- **Sign Transactions**: Sign Ethereum transactions with your member key.
- **Sign Messages**: Authenticate with dApps using EIP-191 personal message signing.
- **Verify Signatures**: Confirm that a message was signed by a specific member.

---

## Git Commit Signing

### Overview

BrightChain can sign Git commits and tags using your member identity, producing GPG-compatible signatures.

### Usage

- **Sign Commits**: Produces a signature block compatible with `git log --show-signature`.
- **Sign Tags**: Annotated tags can be signed with your BrightChain identity.
- **Export Public Key**: Export your signing public key in GPG-compatible format for use with Git hosting platforms.
- **Verify**: Validate that a commit or tag was signed by a specific BrightChain member.

---

## Exploding Messages

### Time-Based Expiration

- When composing a message, enable **Exploding Message** and set a duration (seconds to days).
- After the expiration time, the message is automatically deleted from all recipients.

### Read-Count Expiration

- Set a maximum number of reads. Once the limit is reached, the message self-destructs.
- Each unique reader is tracked; re-reads by the same user do not increment the count.

### Visual Indicators

- Exploding messages display a countdown timer badge.
- Read-count messages show remaining reads (e.g., "2 reads left").
- Once exploded, the message content is replaced with a "[Message exploded]" placeholder.
