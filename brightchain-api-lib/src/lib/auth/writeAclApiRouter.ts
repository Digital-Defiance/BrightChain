/**
 * @fileoverview WriteAclApiRouter - Express router for Write ACL management endpoints.
 *
 * Provides REST API endpoints for managing Write ACLs, mounted alongside
 * the existing `createDbRouter`. All mutating endpoints require
 * `X-Acl-Admin-Signature` (hex-encoded ECDSA signature) and
 * `X-Acl-Admin-PublicKey` headers from an ACL administrator.
 *
 * @see BrightDB Write ACLs design, WriteAclApiRouter section
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import type {
  IAclDocument,
  ICapabilityToken,
  IWriteAclAuditLogger,
  IWriteAclService,
} from '@brightchain/brightchain-lib';
import { Request, Response, Router } from 'express';

/**
 * Interface for the ACL manager operations needed by the router.
 * Extends IWriteAclService with mutation methods.
 */
export interface IWriteAclApiManager extends IWriteAclService {
  setAcl(
    aclDoc: IAclDocument,
    adminSignature: Uint8Array,
    adminPublicKey: Uint8Array,
  ): Promise<string>;
  addWriter(
    dbName: string,
    collectionName: string | undefined,
    writerPublicKey: Uint8Array,
    adminSignature: Uint8Array,
    adminPublicKey: Uint8Array,
  ): Promise<string>;
  removeWriter(
    dbName: string,
    collectionName: string | undefined,
    writerPublicKey: Uint8Array,
    adminSignature: Uint8Array,
    adminPublicKey: Uint8Array,
  ): Promise<string>;
  issueCapabilityToken(
    token: ICapabilityToken,
    adminSignature: Uint8Array,
  ): Promise<ICapabilityToken>;
}

/**
 * Extract and validate admin credentials from request headers.
 * Returns the admin signature and public key as Uint8Arrays, or
 * sends HTTP 403 and returns undefined.
 */
function extractAdminCredentials(
  req: Request,
  res: Response,
): { adminSignature: Uint8Array; adminPublicKey: Uint8Array } | undefined {
  const signatureHex = req.headers['x-acl-admin-signature'] as
    | string
    | undefined;
  const publicKeyHex = req.headers['x-acl-admin-publickey'] as
    | string
    | undefined;

  if (!signatureHex || !publicKeyHex) {
    res.status(403).json({
      error: 'Missing admin credentials',
      message:
        'X-Acl-Admin-Signature and X-Acl-Admin-PublicKey headers are required for this operation',
    });
    return undefined;
  }

  try {
    const adminSignature = Uint8Array.from(Buffer.from(signatureHex, 'hex'));
    const adminPublicKey = Uint8Array.from(Buffer.from(publicKeyHex, 'hex'));
    return { adminSignature, adminPublicKey };
  } catch {
    res.status(403).json({
      error: 'Invalid admin credentials',
      message:
        'X-Acl-Admin-Signature and X-Acl-Admin-PublicKey must be valid hex-encoded values',
    });
    return undefined;
  }
}

/**
 * Factory function that creates an Express router for Write ACL management.
 *
 * @param aclManager - The WriteAclManager (or any IWriteAclApiManager) to delegate to
 * @param auditLogger - Optional WriteAclAuditLogger for logging ACL events
 * @returns An Express Router with ACL management endpoints
 */
export function createWriteAclApiRouter(
  aclManager: IWriteAclApiManager,
  auditLogger?: IWriteAclAuditLogger,
): Router {
  const router = Router();

  // ─── GET endpoints: Retrieve current Write_ACL ──────────────────────

  /** GET /acl/:dbName — Get database-level Write_ACL. @see Requirement 9.1 */
  router.get('/acl/:dbName', (req: Request, res: Response): void => {
    try {
      const dbName = req.params['dbName'] as string;
      const aclDoc = aclManager.getAclDocument(dbName);
      if (!aclDoc) {
        res.status(404).json({
          error: 'ACL not found',
          message: `No Write_ACL configured for database "${dbName}"`,
        });
        return;
      }
      res.json(serializeAclForResponse(aclDoc));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** GET /acl/:dbName/:collectionName — Get collection-level Write_ACL. @see Requirement 9.1 */
  router.get(
    '/acl/:dbName/:collectionName',
    (req: Request, res: Response): void => {
      try {
        const dbName = req.params['dbName'] as string;
        const collectionName = req.params['collectionName'] as string;
        const aclDoc = aclManager.getAclDocument(dbName, collectionName);
        if (!aclDoc) {
          res.status(404).json({
            error: 'ACL not found',
            message: `No Write_ACL configured for "${dbName}/${collectionName}"`,
          });
          return;
        }
        res.json(serializeAclForResponse(aclDoc));
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    },
  );

  // ─── PUT endpoints: Set/update Write_ACL ────────────────────────────

  /** PUT /acl/:dbName — Set/update database-level Write_ACL. @see Requirements 9.2, 9.6 */
  router.put(
    '/acl/:dbName',
    async (req: Request, res: Response): Promise<void> => {
      const credentials = extractAdminCredentials(req, res);
      if (!credentials) return;

      try {
        const dbName = req.params['dbName'] as string;
        const aclDoc = parseAclFromRequest(req.body, dbName);
        const key = await aclManager.setAcl(
          aclDoc,
          credentials.adminSignature,
          credentials.adminPublicKey,
        );

        if (auditLogger) {
          auditLogger.logAclModification(
            Buffer.from(credentials.adminPublicKey).toString('hex'),
            'setAcl',
            'database',
            dbName,
          );
        }

        res.json({ success: true, key });
      } catch (error) {
        handleAclError(error as Error, res);
      }
    },
  );

  /** PUT /acl/:dbName/:collectionName — Set/update collection-level Write_ACL. @see Requirements 9.2, 9.6 */
  router.put(
    '/acl/:dbName/:collectionName',
    async (req: Request, res: Response): Promise<void> => {
      const credentials = extractAdminCredentials(req, res);
      if (!credentials) return;

      try {
        const dbName = req.params['dbName'] as string;
        const collectionName = req.params['collectionName'] as string;
        const aclDoc = parseAclFromRequest(req.body, dbName, collectionName);
        const key = await aclManager.setAcl(
          aclDoc,
          credentials.adminSignature,
          credentials.adminPublicKey,
        );

        if (auditLogger) {
          auditLogger.logAclModification(
            Buffer.from(credentials.adminPublicKey).toString('hex'),
            'setAcl',
            'collection',
            dbName,
            collectionName,
          );
        }

        res.json({ success: true, key });
      } catch (error) {
        handleAclError(error as Error, res);
      }
    },
  );

  // ─── POST endpoints: Add authorized writer ──────────────────────────

  /** POST /acl/:dbName/writers — Add an Authorized_Writer (database). @see Requirements 9.3, 9.6 */
  router.post(
    '/acl/:dbName/writers',
    async (req: Request, res: Response): Promise<void> => {
      const credentials = extractAdminCredentials(req, res);
      if (!credentials) return;

      try {
        const dbName = req.params['dbName'] as string;
        const writerPublicKeyHex = req.body?.publicKeyHex as string;
        if (!writerPublicKeyHex) {
          res
            .status(400)
            .json({ error: 'Missing publicKeyHex in request body' });
          return;
        }
        const writerPublicKey = Uint8Array.from(
          Buffer.from(writerPublicKeyHex, 'hex'),
        );

        const key = await aclManager.addWriter(
          dbName,
          undefined,
          writerPublicKey,
          credentials.adminSignature,
          credentials.adminPublicKey,
        );

        if (auditLogger) {
          auditLogger.logAclModification(
            Buffer.from(credentials.adminPublicKey).toString('hex'),
            'addWriter',
            writerPublicKeyHex,
            dbName,
          );
        }

        res.json({ success: true, key });
      } catch (error) {
        handleAclError(error as Error, res);
      }
    },
  );

  /** POST /acl/:dbName/:collectionName/writers — Add an Authorized_Writer (collection). @see Requirements 9.3, 9.6 */
  router.post(
    '/acl/:dbName/:collectionName/writers',
    async (req: Request, res: Response): Promise<void> => {
      const credentials = extractAdminCredentials(req, res);
      if (!credentials) return;

      try {
        const dbName = req.params['dbName'] as string;
        const collectionName = req.params['collectionName'] as string;
        const writerPublicKeyHex = req.body?.publicKeyHex as string;
        if (!writerPublicKeyHex) {
          res
            .status(400)
            .json({ error: 'Missing publicKeyHex in request body' });
          return;
        }
        const writerPublicKey = Uint8Array.from(
          Buffer.from(writerPublicKeyHex, 'hex'),
        );

        const key = await aclManager.addWriter(
          dbName,
          collectionName,
          writerPublicKey,
          credentials.adminSignature,
          credentials.adminPublicKey,
        );

        if (auditLogger) {
          auditLogger.logAclModification(
            Buffer.from(credentials.adminPublicKey).toString('hex'),
            'addWriter',
            writerPublicKeyHex,
            dbName,
            collectionName,
          );
        }

        res.json({ success: true, key });
      } catch (error) {
        handleAclError(error as Error, res);
      }
    },
  );

  // ─── DELETE endpoints: Remove authorized writer ─────────────────────

  /** DELETE /acl/:dbName/writers/:publicKeyHex — Remove an Authorized_Writer (database). @see Requirements 9.4, 9.6 */
  router.delete(
    '/acl/:dbName/writers/:publicKeyHex',
    async (req: Request, res: Response): Promise<void> => {
      const credentials = extractAdminCredentials(req, res);
      if (!credentials) return;

      try {
        const dbName = req.params['dbName'] as string;
        const publicKeyHex = req.params['publicKeyHex'] as string;
        const writerPublicKey = Uint8Array.from(
          Buffer.from(publicKeyHex, 'hex'),
        );

        const key = await aclManager.removeWriter(
          dbName,
          undefined,
          writerPublicKey,
          credentials.adminSignature,
          credentials.adminPublicKey,
        );

        if (auditLogger) {
          auditLogger.logAclModification(
            Buffer.from(credentials.adminPublicKey).toString('hex'),
            'removeWriter',
            publicKeyHex,
            dbName,
          );
        }

        res.json({ success: true, key });
      } catch (error) {
        handleAclError(error as Error, res);
      }
    },
  );

  /** DELETE /acl/:dbName/:collectionName/writers/:publicKeyHex — Remove an Authorized_Writer (collection). @see Requirements 9.4, 9.6 */
  router.delete(
    '/acl/:dbName/:collectionName/writers/:publicKeyHex',
    async (req: Request, res: Response): Promise<void> => {
      const credentials = extractAdminCredentials(req, res);
      if (!credentials) return;

      try {
        const dbName = req.params['dbName'] as string;
        const collectionName = req.params['collectionName'] as string;
        const publicKeyHex = req.params['publicKeyHex'] as string;
        const writerPublicKey = Uint8Array.from(
          Buffer.from(publicKeyHex, 'hex'),
        );

        const key = await aclManager.removeWriter(
          dbName,
          collectionName,
          writerPublicKey,
          credentials.adminSignature,
          credentials.adminPublicKey,
        );

        if (auditLogger) {
          auditLogger.logAclModification(
            Buffer.from(credentials.adminPublicKey).toString('hex'),
            'removeWriter',
            publicKeyHex,
            dbName,
            collectionName,
          );
        }

        res.json({ success: true, key });
      } catch (error) {
        handleAclError(error as Error, res);
      }
    },
  );

  // ─── POST endpoints: Issue capability token ─────────────────────────

  /** POST /acl/:dbName/tokens — Issue a Capability_Token (database). @see Requirements 9.5, 9.6 */
  router.post(
    '/acl/:dbName/tokens',
    async (req: Request, res: Response): Promise<void> => {
      const credentials = extractAdminCredentials(req, res);
      if (!credentials) return;

      try {
        const dbName = req.params['dbName'] as string;
        const token = parseCapabilityTokenFromRequest(req.body, dbName);

        const issuedToken = await aclManager.issueCapabilityToken(
          token,
          credentials.adminSignature,
        );

        if (auditLogger) {
          auditLogger.logCapabilityTokenIssued(
            Buffer.from(token.granteePublicKey).toString('hex'),
            token.scope,
            token.expiresAt,
            Buffer.from(credentials.adminPublicKey).toString('hex'),
          );
        }

        res.json({
          success: true,
          token: serializeTokenForResponse(issuedToken),
        });
      } catch (error) {
        handleAclError(error as Error, res);
      }
    },
  );

  /** POST /acl/:dbName/:collectionName/tokens — Issue a Capability_Token (collection). @see Requirements 9.5, 9.6 */
  router.post(
    '/acl/:dbName/:collectionName/tokens',
    async (req: Request, res: Response): Promise<void> => {
      const credentials = extractAdminCredentials(req, res);
      if (!credentials) return;

      try {
        const dbName = req.params['dbName'] as string;
        const collectionName = req.params['collectionName'] as string;
        const token = parseCapabilityTokenFromRequest(
          req.body,
          dbName,
          collectionName,
        );

        const issuedToken = await aclManager.issueCapabilityToken(
          token,
          credentials.adminSignature,
        );

        if (auditLogger) {
          auditLogger.logCapabilityTokenIssued(
            Buffer.from(token.granteePublicKey).toString('hex'),
            token.scope,
            token.expiresAt,
            Buffer.from(credentials.adminPublicKey).toString('hex'),
          );
        }

        res.json({
          success: true,
          token: serializeTokenForResponse(issuedToken),
        });
      } catch (error) {
        handleAclError(error as Error, res);
      }
    },
  );

  return router;
}

// ─── Helper functions ───────────────────────────────────────────────

/** Map known ACL error types to appropriate HTTP status codes. */
function handleAclError(error: Error, res: Response): void {
  const name = error.constructor.name;
  if (
    name === 'AclAdminRequiredError' ||
    name === 'CapabilityTokenInvalidError' ||
    name === 'CapabilityTokenExpiredError' ||
    name === 'AclSignatureVerificationError'
  ) {
    res.status(403).json({ error: name, message: error.message });
    return;
  }
  if (name === 'AclVersionConflictError') {
    res.status(409).json({ error: name, message: error.message });
    return;
  }
  if (name === 'LastAdministratorError' || name === 'WriterNotInPoolError') {
    res.status(400).json({ error: name, message: error.message });
    return;
  }
  res.status(500).json({ error: 'InternalError', message: error.message });
}

/** Parse an ACL document from a request body, injecting scope from URL params. */
function parseAclFromRequest(
  body: Record<string, unknown>,
  dbName: string,
  collectionName?: string,
): IAclDocument {
  return {
    documentId: (body['documentId'] as string) ?? '',
    writeMode: body['writeMode'] as IAclDocument['writeMode'],
    authorizedWriters: ((body['authorizedWriters'] as string[]) ?? []).map(
      (hex) => Uint8Array.from(Buffer.from(hex, 'hex')),
    ),
    aclAdministrators: ((body['aclAdministrators'] as string[]) ?? []).map(
      (hex) => Uint8Array.from(Buffer.from(hex, 'hex')),
    ),
    scope: { dbName, collectionName },
    version: (body['version'] as number) ?? 1,
    createdAt: body['createdAt']
      ? new Date(body['createdAt'] as string)
      : new Date(),
    updatedAt: body['updatedAt']
      ? new Date(body['updatedAt'] as string)
      : new Date(),
    creatorPublicKey: body['creatorPublicKey']
      ? Uint8Array.from(Buffer.from(body['creatorPublicKey'] as string, 'hex'))
      : new Uint8Array(0),
    creatorSignature: body['creatorSignature']
      ? Uint8Array.from(Buffer.from(body['creatorSignature'] as string, 'hex'))
      : new Uint8Array(0),
    previousVersionBlockId: body['previousVersionBlockId'] as
      | string
      | undefined,
  };
}

/** Parse a capability token from a request body, injecting scope from URL params. */
function parseCapabilityTokenFromRequest(
  body: Record<string, unknown>,
  dbName: string,
  collectionName?: string,
): ICapabilityToken {
  return {
    granteePublicKey: Uint8Array.from(
      Buffer.from((body['granteePublicKey'] as string) ?? '', 'hex'),
    ),
    scope: { dbName, collectionName },
    expiresAt: new Date(
      (body['expiresAt'] as string) ?? new Date().toISOString(),
    ),
    grantorSignature: Uint8Array.from(
      Buffer.from((body['grantorSignature'] as string) ?? '', 'hex'),
    ),
    grantorPublicKey: Uint8Array.from(
      Buffer.from((body['grantorPublicKey'] as string) ?? '', 'hex'),
    ),
  };
}

/** Serialize an ACL document for JSON response (Uint8Array → hex strings). */
function serializeAclForResponse(
  aclDoc: IAclDocument,
): Record<string, unknown> {
  return {
    documentId: aclDoc.documentId,
    writeMode: aclDoc.writeMode,
    authorizedWriters: aclDoc.authorizedWriters.map((w) =>
      Buffer.from(w).toString('hex'),
    ),
    aclAdministrators: aclDoc.aclAdministrators.map((a) =>
      Buffer.from(a).toString('hex'),
    ),
    scope: aclDoc.scope,
    version: aclDoc.version,
    createdAt: aclDoc.createdAt.toISOString(),
    updatedAt: aclDoc.updatedAt.toISOString(),
    creatorPublicKey: Buffer.from(aclDoc.creatorPublicKey).toString('hex'),
    creatorSignature: Buffer.from(aclDoc.creatorSignature).toString('hex'),
    previousVersionBlockId: aclDoc.previousVersionBlockId,
  };
}

/** Serialize a capability token for JSON response (Uint8Array → hex strings). */
function serializeTokenForResponse(
  token: ICapabilityToken,
): Record<string, unknown> {
  return {
    granteePublicKey: Buffer.from(token.granteePublicKey).toString('hex'),
    scope: token.scope,
    expiresAt: token.expiresAt.toISOString(),
    grantorSignature: Buffer.from(token.grantorSignature).toString('hex'),
    grantorPublicKey: Buffer.from(token.grantorPublicKey).toString('hex'),
  };
}
