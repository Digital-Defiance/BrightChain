import { ICBLCore } from './cblBase';

/**
 * IConstituentBlockListBlock defines the contract for Constituent Block List (CBL) blocks
 * in the Owner Free Filesystem (OFF). CBLs are fundamental to OFF's organization:
 *
 * Purpose:
 * 1. Store references to related blocks
 * 2. Maintain block relationships
 * 3. Enable data reconstruction
 * 4. Support ownership verification
 *
 * Structure:
 * [Header][Block References][Signature]
 * - Header: Contains metadata and counts
 * - References: List of block checksums
 * - Signature: Creator's cryptographic signature
 */
export type IConstituentBlockListBlock = ICBLCore;
