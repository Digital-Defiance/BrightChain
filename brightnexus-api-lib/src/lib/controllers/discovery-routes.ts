import {
  formatBrightDnsTxt,
  toWellKnownManifest,
  type IBrightNexusLocationLookupEntry,
} from '@brightchain/brightnexus-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { Router } from 'express';
import type { BslpSignatureVerifier } from '../services/bslp-signature-verifier';
import type { LocationRegistryService } from '../services/location-registry-service';

export interface IDiscoveryRoutesDeps<TID extends PlatformID> {
  locationRegistryService: LocationRegistryService<TID>;
  signatureVerifier: BslpSignatureVerifier;
  getMemberPublicKeyHexByIdString: (memberIdHex: string) => Promise<string | null>;
}

function verifiedOnlyQuery(query: Record<string, unknown>): boolean {
  const q = query['verifiedOnly'];
  return q === 'true' || q === '1';
}

/**
 * Public tier-1 discovery mirrors backed by the BrightNexus registry.
 *
 * Mount at `/brightnexus/discovery` (rate-limit at mount site).
 */
export function createBrightNexusDiscoveryRouter<TID extends PlatformID>(
  deps: IDiscoveryRoutesDeps<TID>,
): Router {
  const router = Router();

  async function enrichEntry(
    entry: Omit<IBrightNexusLocationLookupEntry, 'signatureVerified'>,
  ): Promise<IBrightNexusLocationLookupEntry> {
    let signatureVerified = false;
    if (entry.signature) {
      const publicKeyHex = await deps.getMemberPublicKeyHexByIdString(
        entry.memberIdHex,
      );
      if (publicKeyHex) {
        signatureVerified = deps.signatureVerifier.verifyPublish(
          entry.memberIdHex,
          {
            ipAddress: entry.ipAddress,
            vector: entry.vector,
            privacy: entry.privacy,
            signature: entry.signature,
          },
          entry.signature,
          publicKeyHex,
        );
      }
    }
    return { ...entry, signatureVerified };
  }

  async function pickBestEntry(
    ip: string,
    verifiedOnly: boolean,
  ): Promise<IBrightNexusLocationLookupEntry | undefined> {
    const lookup = await deps.locationRegistryService.lookupByIp(ip);
    const enriched = await Promise.all(
      lookup.entries.map((entry) => enrichEntry(entry)),
    );
    const filtered = verifiedOnly
      ? enriched.filter((e) => e.signatureVerified)
      : enriched;
    return filtered[0];
  }

  router.get('/ip/:ip/manifest', async (req, res) => {
    const ip = (req.params['ip'] as string | undefined)?.trim();
    if (!ip) {
      res.status(400).json({ error: 'Bad request', message: 'ip is required' });
      return;
    }

    const entry = await pickBestEntry(ip, verifiedOnlyQuery(req.query));
    if (!entry) {
      res.status(404).json({
        error: 'Not found',
        message: 'No location announcement found for this IP',
      });
      return;
    }

    const manifest = toWellKnownManifest(
      entry.memberIdHex,
      entry.vector,
      entry.privacy,
      entry.signature,
    );

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(manifest);
  });

  router.get('/ip/:ip/dns.txt', async (req, res) => {
    const ip = (req.params['ip'] as string | undefined)?.trim();
    if (!ip) {
      res.status(400).json({ error: 'Bad request', message: 'ip is required' });
      return;
    }

    const entry = await pickBestEntry(ip, verifiedOnlyQuery(req.query));
    if (!entry) {
      res.status(404).json({
        error: 'Not found',
        message: 'No location announcement found for this IP',
      });
      return;
    }

    const dnsTxt = formatBrightDnsTxt(entry.vector, entry.privacy);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.send(dnsTxt);
  });

  return router;
}
