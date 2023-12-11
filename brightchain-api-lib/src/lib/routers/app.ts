import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  IApplication,
  IndexLocals,
  AppRouter as UpstreamAppRouter,
} from '@digitaldefiance/node-express-suite';
import { Application, NextFunction, Request, Response } from 'express';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { Environment } from '../environment';
import { EjsTemplateService } from '../services/ejsTemplateService';
import { DefaultBackendIdType } from '../shared-types';
import { ApiRouter } from './api';

/**
 * Resolved path to the bundled default EJS splash template.
 * Used as the fallback when no custom template root is configured.
 */
const defaultTemplatePath = join(__dirname, '..', 'templates', 'default-splash.ejs');

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

  /**
   * Override to register EJS splash page routes before the React SPA catch-all.
   *
   * EJS routes are only registered when a custom EJS_SPLASH_ROOT is configured
   * (or the deprecated SPLASH_TEMPLATE_PATH). When neither is set, no EJS routes
   * are registered and the upstream renderIndex catch-all serves the Vite-built
   * index.html with all React bundle references intact.
   *
   * When EJS_SPLASH_ROOT is configured:
   *   1. The root route '/' is served via EJS (custom index.ejs)
   *   2. Additional routes from routes.json manifest are registered
   *
   * Routes starting with /api/ are skipped with a warning.
   * Manifest routes pointing to nonexistent templates return 404.
   */
  protected override registerAdditionalRenderHooks(app: Application): void {
    const environment = this.application.environment as Environment<TID>;

    // Only activate EJS routing when a custom template root is configured.
    // Without EJS_SPLASH_ROOT (or deprecated SPLASH_TEMPLATE_PATH), the
    // upstream renderIndex catch-all handles '/' by reading the Vite-built
    // index.html — which includes all <script> and <link> tags for the
    // React bundles. Intercepting '/' with the bare EJS default template
    // would break React loading.
    if (!environment.ejsSplashRoot && !environment.splashTemplatePath) {
      return;
    }

    const ejsService = new EjsTemplateService(
      defaultTemplatePath,
      environment.ejsSplashRoot,
      environment.splashTemplatePath,
      this.indexPath, // Vite-built index.html — for extracting bundle tags
    );

    /**
     * Shared EJS request handler.
     * Builds context from getIndexLocals() + request, renders via EjsTemplateService,
     * and sends the resulting HTML.
     */
    const ejsHandler = (req: Request, res: Response, next: NextFunction): void => {
      try {
        const locals = this.getIndexLocals(req, res);
        const context = ejsService.buildContext(locals, req);
        const templatePath = ejsService.resolveTemplatePath(req.path);
        const html = ejsService.render(templatePath, context);
        res.type('html').send(html);
      } catch (err) {
        console.error(
          `[AppRouter] EJS render failed for "${req.path}":`,
          err,
        );
        next(err);
      }
    };

    // Only register the EJS handler on '/' if there's a custom index.ejs
    // (or deprecated splashTemplatePath). Otherwise '/' falls through to
    // the upstream renderIndex which serves the Vite-built React app.
    const hasCustomIndex = (environment.ejsSplashRoot &&
      existsSync(join(environment.ejsSplashRoot, 'index.ejs'))) ||
      (environment.splashTemplatePath &&
        existsSync(environment.splashTemplatePath));

    if (hasCustomIndex) {
      app.get('/', ejsHandler);

      // Register /_spa bypass route — serves the Vite-built React SPA
      // with full CSP nonce injection, APP_CONFIG, etc.
      // Custom EJS templates can link here to load the React app:
      //   <a href="/_spa">Enter App</a>
      app.get('/_spa', (req: Request, res: Response, next: NextFunction): void => {
        this.renderIndex(req, res, next);
      });
    }

    // Read the route manifest and register each valid route
    const manifest = ejsService.readRouteManifest();
    for (const [route, templateFile] of Object.entries(manifest)) {
      if (!ejsService.isValidEjsRoute(route)) {
        console.warn(
          `[AppRouter] Skipping manifest route "${route}" — conflicts with /api/ prefix`,
        );
        continue;
      }

      // Register a handler that checks template existence per-request
      // (manifest is read at startup, but template files may appear/disappear)
      app.get(route, (req: Request, res: Response, next: NextFunction): void => {
        try {
          // Re-read manifest to get the freshest mapping
          const freshManifest = ejsService.readRouteManifest();
          const freshTemplateFile = freshManifest[req.path];

          if (!freshTemplateFile) {
            // Route was removed from manifest since startup
            next();
            return;
          }

          // Check if the template file actually exists
          if (environment.ejsSplashRoot) {
            const templatePath = resolve(environment.ejsSplashRoot, freshTemplateFile);
            if (!existsSync(templatePath)) {
              console.warn(
                `[AppRouter] Manifest route "${req.path}" points to "${freshTemplateFile}" which does not exist — returning 404`,
              );
              res.status(404).send('Not Found');
              return;
            }
          }

          ejsHandler(req, res, next);
        } catch (err) {
          console.error(
            `[AppRouter] EJS manifest route handler failed for "${req.path}":`,
            err,
          );
          next(err);
        }
      });
    }
  }
}
