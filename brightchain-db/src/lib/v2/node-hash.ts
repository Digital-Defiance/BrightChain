/**
 * Registers Node's native SHA3-512, which is much faster than the pure
 * JavaScript implementation used in browsers. Import it for its side effect
 * from any Node-only module.
 */
import { createHash } from 'node:crypto';
import { setSha3Implementation } from './codec';

setSha3Implementation((bytes) => createHash('sha3-512').update(bytes).digest());
