/**
 * WebhookController — inbound webhook processing endpoint.
 *
 * Handles POST /api/webhooks/canary/:connectionId/:secret
 * Validates and processes inbound webhook payloads from push-based providers.
 * Responds within 5 seconds; processes asynchronously if extraction exceeds timeout.
 *
 * Feature: canary-provider-expansion
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
import type { IWebhookEndpointService } from '@brightchain/digitalburnbag-lib';
import type { PlatformID } from '@digitaldefiance/ecies-lib';
import { PlatformID as NodePlatformID } from '@digitaldefiance/node-ecies-lib';
import type { NextFunction, Request as ExpressRequest, Response } from 'express';
import { Router } from 'express';

// ---------------------------------------------------------------------------
// Dependencies interface
// ---------------------------------------------------------------------------

export interface IWebhookControllerDeps<TID extends PlatformID> {
  webhookEndpointService: IWebhookEndpointService<TID>;
  parseId: (idString: string) => TID;
  parseSafeId?: (idString: string) => TID | undefined;
}

// ---------------------------------------------------------------------------
// WebhookController
// ---------------------------------------------------------------------------

/**
 * WebhookController handles inbound webhook payloads from external services.
 *
 * Unlike other controllers, this does NOT extend BaseController because:
 * - It does NOT require user authentication (external services call it)
 * - It needs raw Buffer access to the request body for signature verification
 * - It must respond within 5 seconds (Req 10.4)
 *
 * The route is mounted at /api/webhooks/canary (no /burnbag prefix).
 */
export class WebhookController<TID extends NodePlatformID = NodePlatformID> {
  public readonly router: Router;
  private readonly deps: IWebhookControllerDeps<TID>;

  constructor(deps: IWebhookControllerDeps<TID>) {
    this.deps = deps;
    this.router = Router();
    this.initRoutes();
  }

  private safeParseId(idString: string | undefined): TID | undefined {
    if (!idString) return undefined;
    if (this.deps.parseSafeId) return this.deps.parseSafeId(idString);
    try {
      return this.deps.parseId(idString);
    } catch {
      return undefined;
    }
  }

  private initRoutes(): void {
    // POST /api/webhooks/canary/:connectionId/:secret
    // Requirement: 10.1 — unique URL per connection in format {connectionId}/{secret}
    this.router.post(
      '/:connectionId/:secret',
      // Parse raw body as Buffer for signature verification (Req 10.2)
      (req: ExpressRequest, _res: Response, next: NextFunction) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          (req as ExpressRequest & { rawBody?: Buffer }).rawBody =
            Buffer.concat(chunks);
          next();
        });
        req.on('error', next);
      },
      this.handleWebhook.bind(this),
    );
  }

  /**
   * POST /:connectionId/:secret
   *
   * Validates and processes an inbound webhook payload.
   *
   * Response codes:
   * - 200: Valid payload processed (or accepted for async processing)
   * - 401: Invalid signature (Req 10.5)
   * - 403: Source IP blocked by allowlist
   * - 404: Unknown endpoint (without revealing existence — same as 404 for any unknown)
   * - 429: Rate limit exceeded
   *
   * Requirement: 10.4 — respond within 5 seconds
   */
  private async handleWebhook(
    req: ExpressRequest,
    res: Response,
  ): Promise<void> {
    const connectionIdStr = req.params['connectionId'];
    const secret = req.params['secret'];

    const connectionId = this.safeParseId(
      Array.isArray(connectionIdStr) ? connectionIdStr[0] : connectionIdStr,
    );
    const secretStr = Array.isArray(secret) ? secret[0] : secret;
    if (!connectionId || !secretStr) {
      // Return 404 without revealing whether the endpoint exists (Req 10.5)
      res.status(404).json({ error: 'Not found' });
      return;
    }

    // Extract source IP from request
    const sourceIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket?.remoteAddress ??
      '0.0.0.0';

    // Get raw body buffer (populated by middleware above)
    const rawBody =
      (req as ExpressRequest & { rawBody?: Buffer }).rawBody ?? Buffer.alloc(0);

    // Normalize headers to lowercase for consistent lookup
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key.toLowerCase()] = value;
      } else if (Array.isArray(value)) {
        headers[key.toLowerCase()] = value[0] ?? '';
      }
    }

    // Process the webhook — service handles all validation and signal emission
    // Requirement 10.4: respond within 5 seconds
    const RESPONSE_TIMEOUT_MS = 4800; // slightly under 5s to ensure we respond in time

    let responded = false;

    const timeoutHandle = setTimeout(() => {
      if (!responded) {
        responded = true;
        // Accept the webhook and process asynchronously (Req 10.4)
        res.status(200).json({ accepted: true, async: true });
      }
    }, RESPONSE_TIMEOUT_MS);

    try {
      const result = await this.deps.webhookEndpointService.processWebhook(
        connectionId,
        secretStr,
        headers,
        rawBody,
        sourceIp,
      );

      clearTimeout(timeoutHandle);

      if (responded) {
        // Already responded via timeout — processing continues in background
        return;
      }
      responded = true;

      if (result.success) {
        // Requirement 10.4: HTTP 200 within 5 seconds
        res.status(200).json({
          success: true,
          processingTimeMs: result.processingTimeMs,
        });
        return;
      }

      // Map service errors to HTTP status codes
      const error = result.error ?? 'Processing failed';

      if (error.includes('Invalid signature')) {
        // Requirement 10.5: HTTP 401 for invalid signature
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (error.includes('Rate limit')) {
        // HTTP 429 for rate limit exceeded
        res.status(429).json({ error: 'Too Many Requests' });
        return;
      }

      if (error.includes('Source IP not in allowlist')) {
        // HTTP 403 for IP block
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      if (error.includes('Endpoint not found')) {
        // HTTP 404 without revealing existence (Req 10.5)
        res.status(404).json({ error: 'Not found' });
        return;
      }

      if (error.includes('temporarily disabled')) {
        // HTTP 503 for disabled endpoint
        res.status(503).json({ error: 'Service Unavailable' });
        return;
      }

      // Generic failure — return 400
      res.status(400).json({ error: 'Bad Request' });
    } catch (err) {
      clearTimeout(timeoutHandle);
      if (!responded) {
        responded = true;
        // Return 404 for any unexpected error to avoid revealing endpoint existence
        res.status(404).json({ error: 'Not found' });
      }
    }
  }
}
