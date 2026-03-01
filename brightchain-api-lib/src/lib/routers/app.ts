import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  IApplication,
  AppRouter as UpstreamAppRouter,
} from '@digitaldefiance/node-express-suite';
import { NextFunction, Request, Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import { Environment } from '../environment';
import { DefaultBackendIdType } from '../shared-types';
import { ApiRouter } from './api';

/**
 * Application router for BrightChain.
 * Extends the upstream AppRouter to inherit standard routing behavior
 * (API mounting, static file serving, EJS rendering, catch-all)
 * while overriding renderIndex() for BrightChain-specific template locals.
 */
export class AppRouter<
  TID extends PlatformID = DefaultBackendIdType,
> extends UpstreamAppRouter<TID, IApplication<TID>> {
  /**
   * Typed reference to the BrightChain ApiRouter.
   * The upstream stores apiRouter as BaseRouter; this provides
   * access to BrightChain-specific methods (setSyncEventSystem, etc.).
   */
  private readonly brightchainApiRouter: ApiRouter<TID>;

  constructor(apiRouter: ApiRouter<TID>) {
    super(apiRouter);
    this.brightchainApiRouter = apiRouter;
  }

  /**
   * Returns the BrightChain-specific ApiRouter instance.
   * Useful for wiring services (e.g. setSyncEventSystem) after construction.
   */
  public getBrightchainApiRouter(): ApiRouter<TID> {
    return this.brightchainApiRouter;
  }

  /**
   * Override the upstream's renderIndex to inject BrightChain-specific
   * template locals (fontAwesomeKitId, custom tagline, etc.).
   *
   * Production build: hashed assets/index-[hash].js → jsFile is set
   * Dev build: static/js/main.js + runtime.js + vendor.js → devScripts is set
   */
  public override renderIndex(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    if (req.url.endsWith('.js')) {
      res.type('application/javascript');
    }

    // Production: hashed bundle in assets/
    const jsFile = this.getAssetFilename(this.assetsDir, /^index-.*\.js$/);
    const cssFile = this.getAssetFilename(this.assetsDir, /^index-.*\.css$/);

    // Dev: un-hashed files emitted directly into reactDistDir
    const devScripts = !jsFile
      ? ['runtime.js', 'main.js', 'vendor.js'].filter((f) =>
          existsSync(join(this.reactDistDir, f)),
        )
      : [];

    const environment = this.application.environment as Environment<TID>;

    const locals = {
      ...this.getBaseViewLocals(req, res),
      fontawesomeKitId: environment.fontAwesomeKitId,
      jsFile: jsFile ? `assets/${jsFile}` : undefined,
      cssFile: cssFile ? `assets/${cssFile}` : undefined,
      // Dev-mode script list (empty in production)
      devScripts,
    };

    this.renderTemplate(req, res, next, 'index', locals);
  }
}
