/**
 * Browser shim for Node.js 'crypto' module.
 *
 * @digitaldefiance/secrets calls hasCryptoRandomBytes() at module init, which
 * does require("crypto") then checks typeof crypto.randomBytes. In a browser
 * build Vite's proxy throws on that property access, crashing the module.
 *
 * By aliasing 'crypto' here we return a plain object with no randomBytes, so
 * hasCryptoRandomBytes() returns false and secrets.js falls through to its
 * hasCryptoGetRandomValues() path — which uses window.crypto and is already
 * browser-safe.
 */
const cryptoShim = {};
export default cryptoShim;
