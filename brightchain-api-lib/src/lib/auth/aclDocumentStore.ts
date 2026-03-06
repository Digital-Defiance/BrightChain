/**
 * ACL Document Store - stores and retrieves Write ACL documents as signed blocks.
 *
 * Follows the PoolACLStore pattern: each ACL document is serialized to JSON
 * (without creatorSignature), signed with the admin's ECDSA key, and stored
 * as a block. On retrieval, the signature is verified against the signer's
 * public key before the document is returned.
 *
 * Version chaining: each update references the previous ACL block ID via
 * `previousVersionBlockId`, forming an auditable linked list.
 *
 * @see Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import {
  type IAclDocument,
  AclSignatureVerificationError,
  AclVersionConflictError,
  deserializeAclDocument,
  serializeAclDocument,
} from '@brightchain/brightchain-lib';
import * as crypto from 'crypto';

import { ECDSANodeAuthenticator } from './ecdsaNodeAuthenticator';

/**
 * The on-disk format for a signed ACL document block.
 * `aclJson` is the serialized IAclDocument without creatorSignature;
 * `signatures` carries the admin signatures as hex strings alongside
 * their public keys.
 *
 * Follows the SignedACLBlock pattern from PoolACLStore.
 */
export interface SignedAclDocumentBlock {
  aclJson: string;
  signatures: Array<{ publicKeyHex: string; signature: string }>;
}

/**
 * Stores and retrieves Write ACL documents as signed blocks.
 *
 * Uses an in-memory Map for block storage, following the PoolACLStore
 * pattern. Block IDs are SHA-256 hashes of the stored content.
 *
 * @see Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
export class AclDocumentStore {
  protected readonly blocks = new Map<string, Uint8Array>();
  private readonly authenticator: ECDSANodeAuthenticator;

  constructor(authenticator?: ECDSANodeAuthenticator) {
    this.authenticator = authenticator ?? new ECDSANodeAuthenticator();
  }

  /**
   * Serialize an ACL document to JSON, sign it, and store as a block.
   * Returns the block ID (SHA-256 hex of the stored content).
   *
   * The document is serialized using the shared serializeAclDocument helper
   * (which handles Date → ISO string and Uint8Array → hex encoding).
   * The creatorSignature field is excluded from the signed payload;
   * the signature is stored separately in the SignedAclDocumentBlock envelope.
   *
   * @param doc - The ACL document to store (creatorSignature is ignored; a fresh signature is computed)
   * @param signerPrivateKey - The admin's raw 32-byte secp256k1 private key
   * @returns The block ID (SHA-256 hex digest)
   * @see Requirements 2.1, 2.2, 2.3
   */
  async storeAclDocument(
    doc: IAclDocument,
    signerPrivateKey: Uint8Array,
  ): Promise<string> {
    // Serialize the document (the serialization includes creatorSignature,
    // but we strip it for signing to match the PoolACLStore pattern)
    const docForSigning: IAclDocument = {
      ...doc,
      creatorSignature: new Uint8Array(0), // zero-length placeholder for signing
    };
    const aclJson = serializeAclDocument(docForSigning);
    const aclBytes = new TextEncoder().encode(aclJson);

    // Sign the serialized JSON
    const signature = await this.authenticator.signChallenge(
      aclBytes,
      signerPrivateKey,
    );

    // Derive the signer's public key
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(Buffer.from(signerPrivateKey));
    const publicKey = new Uint8Array(ecdh.getPublicKey());
    const publicKeyHex = Buffer.from(publicKey).toString('hex');

    const signedBlock: SignedAclDocumentBlock = {
      aclJson,
      signatures: [
        {
          publicKeyHex,
          signature: Buffer.from(signature).toString('hex'),
        },
      ],
    };

    const blockBytes = new TextEncoder().encode(JSON.stringify(signedBlock));
    const blockId = this.computeBlockId(blockBytes);
    this.blocks.set(blockId, blockBytes);

    return blockId;
  }

  /**
   * Load an ACL document from a stored block, verifying the signature.
   * Throws if the block doesn't exist or the signature is invalid.
   *
   * @param blockId - The block ID to load
   * @returns The deserialized and verified ACL document
   * @throws AclSignatureVerificationError if signature verification fails
   * @see Requirements 2.3, 2.4
   */
  async loadAclDocument(blockId: string): Promise<IAclDocument> {
    const blockBytes = this.blocks.get(blockId);
    if (!blockBytes) {
      throw new Error(`ACL document block not found: ${blockId}`);
    }

    const signedBlock: SignedAclDocumentBlock = JSON.parse(
      new TextDecoder().decode(blockBytes),
    );

    if (signedBlock.signatures.length === 0) {
      throw new AclSignatureVerificationError(
        blockId,
        'ACL document block has no signatures',
      );
    }

    // Verify the first signature
    const firstSig = signedBlock.signatures[0];
    const publicKey = new Uint8Array(Buffer.from(firstSig.publicKeyHex, 'hex'));
    const signatureBytes = new Uint8Array(
      Buffer.from(firstSig.signature, 'hex'),
    );
    const aclBytes = new TextEncoder().encode(signedBlock.aclJson);

    const isValid = await this.authenticator.verifySignature(
      aclBytes,
      signatureBytes,
      publicKey,
    );

    if (!isValid) {
      throw new AclSignatureVerificationError(
        blockId,
        'Signature verification failed',
      );
    }

    // Deserialize the ACL document
    const doc = deserializeAclDocument(signedBlock.aclJson);

    // Attach the verified signature as the creatorSignature
    doc.creatorSignature = signatureBytes;

    return doc;
  }

  /**
   * Update an ACL document: validates version increment, sets
   * previousVersionBlockId to the current block ID, and stores
   * the new version.
   *
   * @param currentBlockId - The block ID of the current ACL document
   * @param updatedDoc - The updated ACL document
   * @param signerPrivateKey - The admin's raw 32-byte secp256k1 private key
   * @returns The new block ID
   * @throws AclVersionConflictError if version is not strictly greater
   * @see Requirements 2.5, 2.6
   */
  async updateAclDocument(
    currentBlockId: string,
    updatedDoc: IAclDocument,
    signerPrivateKey: Uint8Array,
  ): Promise<string> {
    // Load and verify the current document
    const currentDoc = await this.loadAclDocument(currentBlockId);

    // Validate version increment (must be strictly greater)
    if (updatedDoc.version <= currentDoc.version) {
      throw new AclVersionConflictError(
        currentDoc.version,
        updatedDoc.version,
        updatedDoc.scope.dbName,
        updatedDoc.scope.collectionName,
      );
    }

    // Set chain reference to the current block
    const chainedDoc: IAclDocument = {
      ...updatedDoc,
      previousVersionBlockId: currentBlockId,
    };

    return this.storeAclDocument(chainedDoc, signerPrivateKey);
  }

  /**
   * Check whether a block exists in the store.
   */
  hasBlock(blockId: string): boolean {
    return this.blocks.has(blockId);
  }

  /**
   * Compute a block ID as the SHA-256 hex digest of the content.
   */
  private computeBlockId(content: Uint8Array): string {
    return crypto
      .createHash('sha256')
      .update(Buffer.from(content))
      .digest('hex');
  }
}
