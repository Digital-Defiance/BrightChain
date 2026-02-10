# BrightChain Showcase

This is the GitHub Pages showcase site for **BrightChain**, the revolutionary decentralized infrastructure platform combining advanced cryptography, distributed storage, and democratic governance. Built with React, TypeScript, and Vite.

## About BrightChain

BrightChain provides a complete platform for building decentralized digital societies:

### Foundation Layer
- **Owner-Free File System (OFFS)** - Decentralized storage with plausible deniability and legal protection
- **Super CBL Architecture** - Unlimited file sizes through hierarchical block lists
- **Identity Management** - BIP39/32 key derivation with SECP256k1 cryptography
- **Brokered Anonymity** - Anonymous operations with accountability via quorum consensus

### Communication Layer
- **Messaging System** - Encrypted message passing with gossip protocol propagation
- **Email System** - RFC 5322/2045 compliant email with threading, attachments, and delivery tracking
- **Gossip Protocol** - Epidemic-style message propagation with priority-based delivery
- **Discovery Protocol** - Bloom filter-based block location across the network

### Application Layer
- **Communication System** - Discord-competitive platform with Signal-grade encryption
  - Direct messaging for private conversations
  - Group chats with shared encryption and key rotation
  - Channels with four visibility modes (public/private/secret/invisible)
  - Real-time presence, typing indicators, and reactions
  - Role-based permissions (Owner/Admin/Moderator/Member)

- **BrightPass Password Manager** - 1Password-competitive credential management
  - VCBL architecture for efficient encrypted storage
  - TOTP/2FA with QR code generation
  - Breach detection via Have I Been Pwned
  - Emergency access via Shamir's Secret Sharing
  - Import from 1Password, LastPass, Bitwarden, Chrome, Firefox, KeePass, Dashlane

### Governance Layer
- **Homomorphic Voting** - Privacy-preserving elections with 15+ voting methods
  - Fully secure: Plurality, Approval, Weighted, Borda, Score, Yes/No, Supermajority
  - Multi-round: Ranked Choice (IRV), Two-Round Runoff, STAR, STV
  - Special: Quadratic, Consensus, Consent-Based
  - Government compliance: Audit logs, bulletin board, verifiable receipts
  - Hierarchical aggregation for large-scale elections

- **Quorum Governance** - Democratic decision-making with Shamir's Secret Sharing
  - Configurable thresholds (2 to 1,048,575 members)
  - Document sealing/unsealing with majority consensus
  - Temporal expiration for statute of limitations

### Security & Cryptography
- **Advanced Encryption** - ECIES + AES-256-GCM + Paillier homomorphic encryption
- **Forward Error Correction** - Reed-Solomon erasure coding for data recovery
- **Zero Mining Waste** - Sustainable blockchain without proof-of-work mining
- **Cross-Platform Cryptography** - Deterministic operations across Node.js and browsers
- **128-bit Security** - Miller-Rabin primality testing with 256 rounds

## Development

```bash
cd showcase
yarn install
yarn dev
```

Visit `http://localhost:5173` to see the site.

## Building

```bash
yarn build
```

The built site will be in the `dist` directory.

## Deployment

The site is automatically deployed to GitHub Pages when changes are pushed to the `main` branch. The deployment is handled by the `.github/workflows/deploy-showcase.yml` workflow.

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Framer Motion** - Animations
- **React Icons** - Icon library
- **React Intersection Observer** - Scroll animations

## Structure

- `/src/components` - React components
- `/src/assets` - Static assets
- `/public` - Public files
- `index.html` - Entry HTML file
- `vite.config.ts` - Vite configuration

## Learn More

- [BrightChain Repository](https://github.com/Digital-Defiance/BrightChain)
- [BrightChain Summary](../docs/BrightChain%20Summary.md)
- [Technical Documentation](../docs/BrightChain%20Writeup.md)
