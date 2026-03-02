import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  IApplication,
  AppRouter as UpstreamAppRouter,
} from '@digitaldefiance/node-express-suite';
import { NextFunction, Request, Response } from 'express';
import { existsSync, readFileSync, readdirSync } from 'fs';
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
   * Parses the webpack-generated index.html to extract the hashed script
   * and stylesheet filenames. This is the most reliable way to serve the
   * correct bundles since webpack already resolved the content hashes.
   *
   * Returns { scripts, stylesheets } arrays of filenames (relative paths).
   * Returns empty arrays if index.html is missing or unparseable.
   */
  private parseWebpackIndexHtml(): {
    scripts: string[];
    stylesheets: string[];
  } {
    const indexHtmlPath = join(this.reactDistDir, 'index.html');
    if (!existsSync(indexHtmlPath)) {
      return { scripts: [], stylesheets: [] };
    }
    try {
      const html = readFileSync(indexHtmlPath, 'utf8');
      // Match <script ... src="filename.js" ...>
      const scriptRegex = /<script[^>]+src="([^"]+\.js)"[^>]*>/g;
      const scripts: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = scriptRegex.exec(html)) !== null) {
        scripts.push(match[1]);
      }
      // Match <link ... href="filename.css" ...>
      const cssRegex = /<link[^>]+href="([^"]+\.css)"[^>]*>/g;
      const stylesheets: string[] = [];
      while ((match = cssRegex.exec(html)) !== null) {
        stylesheets.push(match[1]);
      }
      return { scripts, stylesheets };
    } catch {
      return { scripts: [], stylesheets: [] };
    }
  }

  /**
   * Finds Nx webpack hashed filenames in reactDistDir matching a pattern
   * like main.{hash}.js or runtime.{hash}.js.
   */
  private findHashedFiles(
    baseName: string,
    ext: string,
  ): string | undefined {
    try {
      const pattern = new RegExp(
        `^${baseName}\\.[a-f0-9]+\\.${ext}$`,
      );
      const files = readdirSync(this.reactDistDir, 'utf8');
      // Sort descending by name to get the latest hash if multiple exist
      return files.filter((f) => pattern.test(f)).sort().pop();
    } catch {
      return undefined;
    }
  }

  /**
   * Override the upstream's renderIndex to inject BrightChain-specific
   * template locals (fontAwesomeKitId, custom tagline, etc.).
   *
   * Supports three bundle layouts:
   * 1. Vite: hashed assets/index-[hash].js in assets/ dir
   * 2. Nx webpack: hashed main.[hash].js + runtime.[hash].js in reactDistDir
   *    (detected by parsing the webpack-generated index.html)
   * 3. Dev fallback: unhashed runtime.js + main.js + vendor.js
   */
  public override renderIndex(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    if (req.url.endsWith('.js')) {
      res.type('application/javascript');
    }

    // Strategy 1: Vite — hashed bundle in assets/
    const jsFile = this.getAssetFilename(this.assetsDir, /^index-.*\.js$/);
    const cssFile = this.getAssetFilename(this.assetsDir, /^index-.*\.css$/);

    let devScripts: string[] = [];
    let webpackCss: string[] = [];

    if (!jsFile) {
      // Strategy 2: Nx webpack — parse the generated index.html for hashed filenames.
      // This is the authoritative source since webpack writes the correct references.
      const { scripts, stylesheets } = this.parseWebpackIndexHtml();
      webpackCss = stylesheets;

      if (scripts.length > 0) {
        // Webpack index.html found with hashed scripts — use them.
        // Scripts are served from reactDistDir via the /static/js/ mount
        // or directly if they're root-relative paths.
        devScripts = scripts;
      } else {
        // Strategy 3: Dev fallback — unhashed files.
        // Also try to find hashed files directly in case index.html is missing.
        const hashedRuntime = this.findHashedFiles('runtime', 'js');
        const hashedMain = this.findHashedFiles('main', 'js');

        if (hashedMain) {
          // Prefer hashed files over unhashed
          if (hashedRuntime) devScripts.push(hashedRuntime);
          devScripts.push(hashedMain);
        } else {
          // True dev fallback: unhashed files
          devScripts = ['runtime.js', 'main.js', 'vendor.js'].filter((f) =>
            existsSync(join(this.reactDistDir, f)),
          );
        }
      }
    }

    const environment = this.application.environment as Environment<TID>;

    const locals = {
      ...this.getBaseViewLocals(req, res),
      fontawesomeKitId: environment.fontAwesomeKitId,
      jsFile: jsFile ? `assets/${jsFile}` : undefined,
      cssFile: cssFile ? `assets/${cssFile}` : undefined,
      // Script list for non-Vite builds (hashed or dev)
      devScripts,
      // Additional CSS from webpack index.html
      webpackCss,
    };

    this.renderTemplate(req, res, next, 'index', locals);
  }
}
