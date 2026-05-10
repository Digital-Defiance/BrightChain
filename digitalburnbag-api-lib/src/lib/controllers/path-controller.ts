/**
 * @fileoverview PathController — canonical path-based file access.
 *
 * Resolves a human-readable vault path to the current version of a file
 * and streams it inline. Links survive version uploads as long as the file
 * is not moved or renamed.
 *
 * ## URL format
 *   GET /burnbag/path/:vaultId/*segments
 *
 * ## Access rules
 *   - public vault  → no authentication required
 *   - unlisted vault → no authentication required (security by obscurity via vaultId)
 *   - private vault  → JWT authentication required; requester must have Read ACL
 *
 * ## Response
 *   - File found   → 200 with Content-Type, Content-Disposition: inline, file bytes
 *   - Path is a folder → 200 JSON listing of folder contents
 *   - Not found    → 404
 *   - Auth required → 401
 *   - Forbidden    → 403
 *
 * Requirements: canonical-path-links spec
 */

import type {
  IFileService,
  IFolderService,
  IVaultContainerService,
} from '@brightchain/digitalburnbag-lib';
import {
  DigitalBurnbagStrings,
  VaultVisibility,
  getDigitalBurnbagTranslation,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { PlatformID as NodePlatformID } from '@digitaldefiance/node-ecies-lib';
import type {
  Request as ExpressRequest,
  NextFunction,
  Response,
} from 'express';
import { Router } from 'express';

export interface IPathControllerDeps<TID extends PlatformID> {
  vaultContainerService: IVaultContainerService<TID>;
  folderService: IFolderService<TID>;
  fileService: IFileService<TID>;
  parseId: (idString: string) => TID;
  parseSafeId?: (idString: string) => TID | undefined;
}

/**
 * Mounts the canonical path endpoint on a router.
 *
 * Usage:
 *   router.use('/burnbag/path', createPathRouter(application, deps));
 */
export function createPathRouter<TID extends NodePlatformID>(
  deps: IPathControllerDeps<TID>,
  getRequesterId: (req: ExpressRequest) => TID | undefined,
): Router {
  const router = Router();

  // GET /:vaultId  — list vault root (JSON)
  // GET /:vaultId/*path  — resolve path and serve file or folder listing
  router.get('/:vaultId', handlePath);
  router.get('/:vaultId/*path', handlePath);

  async function handlePath(
    req: ExpressRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> {
    const vaultIdRaw = req.params['vaultId'];
    const vaultId = Array.isArray(vaultIdRaw) ? vaultIdRaw[0] : vaultIdRaw;
    const splat = (req.params as Record<string, string | string[]>)['path'];
    const splatStr = Array.isArray(splat) ? splat.join('/') : (splat ?? '');
    const segments = splatStr
      ? splatStr.split('/').filter((s) => s.length > 0)
      : [];

    // ── Parse vault ID ──────────────────────────────────────────────
    const parseSafe =
      deps.parseSafeId ??
      ((s: string) => {
        try {
          return deps.parseId(s);
        } catch {
          return undefined;
        }
      });
    const parsedVaultId = parseSafe(vaultId ?? '');
    if (!parsedVaultId) {
      res.status(404).json({ error: 'Vault not found' });
      return;
    }

    // ── Load vault container ────────────────────────────────────────
    let container;
    try {
      // Use a dummy requesterId for the lookup — visibility check is below
      container = await deps.vaultContainerService.getContainer(
        parsedVaultId,
        parsedVaultId, // placeholder; getContainer doesn't enforce ACL
      );
    } catch {
      res.status(404).json({ error: 'Vault not found' });
      return;
    }

    // ── Visibility / auth check ─────────────────────────────────────
    const visibility = container.visibility ?? VaultVisibility.Private;
    const requesterId = getRequesterId(req);

    if (visibility === VaultVisibility.Private) {
      if (!requesterId) {
        res.status(401).json({
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
        });
        return;
      }
      // For private vaults, verify the requester is the owner or has ACL.
      // Simple ownership check — full ACL enforcement is in FileService.
      const ownerId = String(container.ownerId);
      const reqId = String(requesterId);
      if (ownerId !== reqId) {
        // Let FileService enforce ACL when we stream the file below.
        // If they don't have access, getFileContent will throw.
      }
    }
    // public / unlisted: no auth required

    // ── Effective requester for service calls ───────────────────────
    // For public/unlisted vaults without auth, use the owner as the
    // effective requester so service ACL checks pass.
    const effectiveRequesterId: TID = requesterId ?? (container.ownerId as TID);

    // ── Resolve path ────────────────────────────────────────────────
    try {
      const { folders, file } = await deps.folderService.resolvePath(
        effectiveRequesterId,
        segments,
        parsedVaultId,
      );

      if (file) {
        // ── Stream file ───────────────────────────────────────────
        const metadata = await deps.fileService.getFileMetadata(
          file.id,
          effectiveRequesterId,
        );

        const stream = await deps.fileService.getFileContent(
          file.id,
          effectiveRequesterId,
          { ipAddress: req.ip ?? '0.0.0.0', timestamp: new Date() },
        );

        const chunks: Uint8Array[] = [];
        const reader = stream.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const buf = Buffer.concat(chunks);

        const mimeType = metadata.mimeType || 'application/octet-stream';
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Length', buf.length.toString());
        res.setHeader(
          'Content-Disposition',
          `inline; filename="${encodeURIComponent(metadata.fileName)}"`,
        );
        // Cache-control: public vaults can be cached; private/unlisted should not
        if (visibility === VaultVisibility.Public) {
          res.setHeader('Cache-Control', 'public, max-age=300');
        } else {
          res.setHeader('Cache-Control', 'private, no-store');
        }
        res.status(200).end(buf);
        return;
      }

      // ── Folder listing ────────────────────────────────────────────
      const currentFolder = folders[folders.length - 1];
      if (!currentFolder) {
        res.status(404).json({ error: 'Path not found' });
        return;
      }

      const contents = await deps.folderService.getFolderContents(
        currentFolder.id,
        effectiveRequesterId,
      );

      const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}/${vaultId}`;
      const pathPrefix = segments.length > 0 ? `/${segments.join('/')}` : '';

      res.status(200).json({
        vault: {
          id: String(container.id),
          name: container.name,
          visibility,
        },
        path: segments,
        folders: contents.folders.map((f) => ({
          name: f.name,
          url: `${baseUrl}${pathPrefix}/${encodeURIComponent(f.name)}`,
          updatedAt: f.updatedAt,
        })),
        files: contents.files.map((f) => ({
          name: f.fileName,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
          url: `${baseUrl}${pathPrefix}/${encodeURIComponent(f.fileName)}`,
          updatedAt: f.updatedAt,
        })),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('not found') ||
        msg.includes('NotFound') ||
        msg.includes('Path segment')
      ) {
        res.status(404).json({ error: 'Path not found', detail: msg });
        return;
      }
      if (
        msg.includes('permission') ||
        msg.includes('Permission') ||
        msg.includes('ACL')
      ) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      res.status(500).json({ error: 'Internal error', detail: msg });
    }
  }

  return router;
}
