# BrightChain Showcase

This is the GitHub Pages showcase site for **BrightChain**, the revolutionary decentralized infrastructure platform combining advanced cryptography, distributed storage, and democratic governance. Built with React, TypeScript, and Vite.

## About BrightChain

BrightChain provides:
- **Owner-Free File System (OFFS)** - Decentralized storage with legal protection for node operators
- **Homomorphic Voting** - Privacy-preserving elections using Paillier encryption
- **Brokered Anonymity** - Anonymous operations with accountability via quorum consensus
- **Advanced Encryption** - ECIES + AES-256-GCM with BIP39/32 authentication
- **Zero Mining Waste** - Sustainable blockchain without proof-of-work mining
- **P2P Storage Network** - Monetize unused storage space on personal devices
- **Quorum Governance** - Democratic decision-making with configurable thresholds
- **Cross-Platform Cryptography** - Deterministic operations across Node.js and browsers

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
