import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  IApplication,
  IndexLocals,
  AppRouter as UpstreamAppRouter,
} from '@digitaldefiance/node-express-suite';
import { Request, Response } from 'express';
import { Environment } from '../environment';
import { DefaultBackendIdType } from '../shared-types';
import { ApiRouter } from './api';

/**
 * BrightChain-specific index locals extending the upstream IndexLocals.
 */
export interface BrightChainIndexLocals extends IndexLocals {
  fontAwesomeKitId: string;
  emailDomain: string;
  enabledFeatures: string[];
}

/**
 * Application router for BrightChain.
 * Extends the upstream AppRouter to add BrightChain-specific runtime
 * values (Font Awesome kit, email domain) to the index.html injection.
 */
export class AppRouter<
  TID extends PlatformID = DefaultBackendIdType,
> extends UpstreamAppRouter<TID, IApplication<TID>> {
  private readonly brightchainApiRouter: ApiRouter<TID>;

  constructor(apiRouter: ApiRouter<TID>) {
    super(apiRouter);
    this.brightchainApiRouter = apiRouter;
  }

  /**
   * Returns the BrightChain-specific ApiRouter instance.
   */
  public getBrightchainApiRouter(): ApiRouter<TID> {
    return this.brightchainApiRouter;
  }

  /**
   * Override to add BrightChain-specific locals (fontAwesomeKitId, emailDomain).
   */
  protected override getIndexLocals(
    req: Request,
    res: Response,
  ): BrightChainIndexLocals {
    const base = super.getIndexLocals(req, res);
    const environment = this.application.environment as Environment<TID>;

    return {
      ...base,
      fontAwesomeKitId: environment.fontAwesomeKitId || '',
      emailDomain: environment.emailDomain,
      siteUrl: environment.serverUrl || base.siteUrl,
      enabledFeatures: environment.enabledFeatures,
    };
  }

  /**
   * Override to inject Font Awesome kit script tag into the HTML
   * in addition to the base replacements (title, APP_CONFIG, CSP nonce).
   */
  protected override applyIndexReplacements(
    html: string,
    locals: IndexLocals,
  ): string {
    let result = super.applyIndexReplacements(html, locals);

    const bcLocals = locals as BrightChainIndexLocals;

    // Inject enabledFeatures into the APP_CONFIG that the base class serialized.
    // We parse the JSON back out, merge our field, and re-serialize — avoids
    // fragile regex splicing into a JSON string.
    result = result.replace(
      /window\.APP_CONFIG\s*=\s*(\{.*?\});/,
      (_match, jsonStr) => {
        try {
          const config = JSON.parse(jsonStr);
          config.enabledFeatures = bcLocals.enabledFeatures;
          return `window.APP_CONFIG = ${JSON.stringify(config)};`;
        } catch {
          // If parsing fails for any reason, fall back to the original
          return _match;
        }
      },
    );

    // Inject Font Awesome kit script before </head> if kitId is configured.
    // The nonce is required because 'strict-dynamic' disables host-based allowlisting.
    const kitId = bcLocals.fontAwesomeKitId;
    if (kitId && locals.cspNonce) {
      const faScript = `<script nonce="${locals.cspNonce}" src="https://kit.fontawesome.com/${kitId}.js" crossorigin="anonymous"></script>`;
      result = result.replace('</head>', `${faScript}\n</head>`);
    }

    return result;
  }
}
