# @brightchain/brightchain-identity

Thin server-side identity layer for BrightChain. Wraps the lower-level
`Member` factories from
[`@digitaldefiance/node-ecies-lib`](https://www.npmjs.com/package/@digitaldefiance/node-ecies-lib)
and pairs every unlocked member with an `IBrightChainIdentity` descriptor that
is safe to ship to clients.

## Why this package exists

`Member.fromMnemonic` / `Member.newMember` are the canonical way to materialise
a BrightChain identity, but they require:

- a configured `ECIESService`,
- an `EmailString` value object,
- an explicit `MemberType`, and
- careful disposal of the resulting private-key material.

`brightchain-identity` lifts that boilerplate into a small static facade so
every consumer (API, CLI, desktop, agents) talks to the same surface and
emits the same JSON-safe descriptor.

## Usage

```ts
import { BrightChainIdentity } from '@brightchain/brightchain-identity';
import { SecureString } from '@digitaldefiance/ecies-lib';

// 1. Bootstrap a brand-new identity (e.g. signup flow)
const created = BrightChainIdentity.create('Ada Lovelace', 'ada@example.com');
console.log(created.identity); // safe to send to client
console.log(created.mnemonic.toString()); // show ONCE then discard
created.member.dispose();

// 2. Re-unlock an existing identity (e.g. login flow)
const bundle = BrightChainIdentity.fromMnemonic(
  new SecureString('twelve word mnemonic ...'),
  'Ada Lovelace',
  'ada@example.com',
);
// Hand bundle.member to a CryptoSessionStore so subsequent requests do not
// need the mnemonic.
```

## Pairing with crypto sessions

This library is the producer half of the equation; the consumer is
`@brightchain/brightchain-node-express-suite`'s `CryptoSessionStore` and the
`useSessionEstablish` / `useSessionUnlock` middlewares. Together they
implement the architecture described in
[`docs/papers/brightchain-crypto-sessions.md`](../docs/papers/brightchain-crypto-sessions.md).

## Public surface

- `BrightChainIdentity.create(name, email, options?)` &mdash; mint a new
  identity plus mnemonic.
- `BrightChainIdentity.fromMnemonic(mnemonic, name, email, options?)` &mdash;
  re-derive an identity.
- `BrightChainIdentity.describe(member)` &mdash; project an unlocked `Member`
  into the JSON-safe descriptor.
- `IBrightChainIdentity`, `IBrightChainIdentityBundle` &mdash; types.
- `BrightChainIdentityError` &mdash; the only error type the public surface
  throws.

## License

MIT &copy; Digital Defiance
