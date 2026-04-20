import * as ejs from 'ejs';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import {
  IEjsTemplateContext,
  IRouteManifest,
} from '../interfaces/ejsTemplateContext';
import { BrightChainIndexLocals } from '../routers/app';
import { Request } from 'express';

/**
 * Service responsible for EJS template resolution and rendering.
 *
 * Implements a layered template resolution strategy:
 * 1. Custom templates from EJS_SPLASH_ROOT (if configured)
 * 2. Deprecated SPLASH_TEMPLATE_PATH (backward compat)
 * 3. Bundled default template (always the safety net)
 *
 * Custom templates are re-read per request (no caching) so operators
 * can edit without restarting the server.
 */
export class EjsTemplateService {
  private readonly defaultTemplatePath: string;
  private readonly ejsSplashRoot: string | undefined;
  private readonly splashTemplatePath: string | undefined;
  private readonly reactIndexPath: string | undefined;

  constructor(
    defaultTemplatePath: string,
    ejsSplashRoot?: string,
    splashTemplatePath?: string,
    reactIndexPath?: string,
  ) {
    this.defaultTemplatePath = defaultTemplatePath;
    this.ejsSplashRoot = ejsSplashRoot;
    this.splashTemplatePath = splashTemplatePath;
    this.reactIndexPath = reactIndexPath;
  }

  /**
   * Resolves which template file to use for a given route.
   *
   * For the root route '/':
   *   1. ejsSplashRoot/index.ejs (if exists)
   *   2. splashTemplatePath (deprecated, if exists)
   *   3. defaultTemplatePath
   *
   * For other routes:
   *   1. Look up route in routes.json manifest
   *   2. If found, resolve ejsSplashRoot/{manifest-specified-file}
   *   3. Fall back to defaultTemplatePath
   *
   * @param route - The URL path to resolve a template for
   * @returns Absolute path to the template file
   */
  resolveTemplatePath(route: string): string {
    if (route === '/') {
      return this.resolveRootTemplate();
    }
    return this.resolveManifestTemplate(route);
  }

  /**
   * Reads and parses the routes.json manifest from ejsSplashRoot.
   * Returns an empty object on any failure (missing file, invalid JSON, etc.).
   */
  readRouteManifest(): IRouteManifest {
    if (!this.ejsSplashRoot) {
      return {};
    }

    const manifestPath = join(this.ejsSplashRoot, 'routes.json');
    try {
      const content = readFileSync(manifestPath, 'utf-8');
      const parsed = JSON.parse(content);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        console.error(
          `[EjsTemplateService] routes.json at "${manifestPath}" is not a valid object`,
        );
        return {};
      }
      return parsed as IRouteManifest;
    } catch (err) {
      // Missing file or invalid JSON — both are expected failure modes
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(
          `[EjsTemplateService] Failed to read routes.json at "${manifestPath}":`,
          err,
        );
      }
      return {};
    }
  }

  /**
   * Validates that a route does not conflict with API prefixes.
   * Routes starting with /api/ are reserved for the API router.
   *
   * @param route - The URL path to validate
   * @returns true if the route is valid for EJS serving
   */
  isValidEjsRoute(route: string): boolean {
    return !route.startsWith('/api/');
  }

  /**
   * Builds the full template context from request locals and the request object.
   * Spreads all BrightChainIndexLocals properties and adds cspNonce, requestPath,
   * and Vite bundle tags extracted from the React dist index.html.
   *
   * @param locals - The BrightChainIndexLocals from the response
   * @param req - The Express request object
   * @returns Complete template context for EJS rendering
   */
  buildContext(
    locals: BrightChainIndexLocals,
    req: Request,
  ): IEjsTemplateContext {
    const { headAssets, bodyScripts } = this.extractBundleTags(locals.cspNonce ?? '');

    return {
      // Spread all locals properties (includes index signature values)
      ...locals,
      // Node identity
      nodeId: (locals['nodeId'] as string) ?? '',
      nodeIdSource: (locals['nodeIdSource'] as string) ?? '',
      // Branding
      siteName: locals.siteTitle ?? locals.title ?? '',
      siteTagline: locals.tagline ?? '',
      siteDescription: locals.description ?? '',
      fontAwesomeKitId: locals.fontAwesomeKitId ?? '',
      // Environment
      serverUrl: locals.siteUrl ?? locals.server ?? '',
      emailDomain: locals.emailDomain ?? '',
      emailSender: (locals['emailSender'] as string) ?? '',
      production: (locals['production'] as boolean) ?? false,
      // Features
      enabledFeatures: locals.enabledFeatures ?? [],
      // CSP
      cspNonce: locals.cspNonce ?? '',
      // Request
      requestPath: req.path,
      // Vite bundle tags — use <%- headAssets %> and <%- bodyScripts %> in templates
      headAssets,
      bodyScripts,
    };
  }

  /**
   * Renders an EJS template with the given context.
   * On render failure of custom templates, falls back to the default template.
   * If the default template itself fails, throws the error.
   *
   * @param templatePath - Absolute path to the EJS template file
   * @param context - The template context variables
   * @returns Rendered HTML string
   */
  render(templatePath: string, context: IEjsTemplateContext): string {
    // Always re-read the template (no caching for custom templates)
    try {
      const templateContent = readFileSync(templatePath, 'utf-8');

      // Build EJS options — async: false ensures synchronous rendering
      const ejsOptions: ejs.Options & { async: false } = { async: false };

      // Set the views/root option so EJS includes resolve relative to the template dir
      if (this.ejsSplashRoot) {
        ejsOptions.root = this.ejsSplashRoot;
        ejsOptions.views = [this.ejsSplashRoot];
      }

      return ejs.render(templateContent, context, ejsOptions);
    } catch (err) {
      // If we're already rendering the default template, re-throw
      if (templatePath === this.defaultTemplatePath) {
        console.error(
          `[EjsTemplateService] CRITICAL: Default template render failed at "${templatePath}":`,
          err,
        );
        throw err;
      }

      // Custom template failed — fall back to default
      console.warn(
        `[EjsTemplateService] Custom template render failed at "${templatePath}":`,
        err,
        `\nFalling back to default template.`,
      );
      return this.renderDefault(context);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────

  /**
   * Extracts Vite bundle <script> and <link> tags from the React dist index.html.
   * Injects CSP nonce on script tags and removes crossorigin attributes
   * (same-origin assets don't need CORS mode).
   *
   * Returns empty strings if the React index.html is not available.
   *
   * @param cspNonce - The CSP nonce to inject on script tags
   * @returns headAssets (CSS links + module scripts for <head>) and bodyScripts (empty for Vite)
   */
  private extractBundleTags(cspNonce: string): { headAssets: string; bodyScripts: string } {
    if (!this.reactIndexPath || !existsSync(this.reactIndexPath)) {
      return { headAssets: '', bodyScripts: '' };
    }

    try {
      const html = readFileSync(this.reactIndexPath, 'utf-8');

      // Extract <link rel="stylesheet" ...> tags
      const linkTags = html.match(/<link\s+[^>]*rel=["']stylesheet["'][^>]*>/gi) || [];

      // Extract <script type="module" ...> tags (Vite bundle entries)
      const scriptTags = html.match(/<script\s+[^>]*type=["']module["'][^>]*><\/script>/gi) || [];

      // Also extract <link rel="modulepreload" ...> tags (Vite preload hints)
      const preloadTags = html.match(/<link\s+[^>]*rel=["']modulepreload["'][^>]*>/gi) || [];

      // Process tags: inject nonce, remove crossorigin
      const processTag = (tag: string): string => {
        let result = tag;
        // Remove crossorigin attribute (same-origin assets)
        result = result.replace(/\s+crossorigin(?:="[^"]*")?/gi, '');
        // Inject nonce on script tags
        if (cspNonce && result.startsWith('<script')) {
          result = result.replace('<script', `<script nonce="${cspNonce}"`);
        }
        return result;
      };

      const headParts = [
        ...preloadTags.map(processTag),
        ...linkTags.map(processTag),
        ...scriptTags.map(processTag),
      ];

      return {
        headAssets: headParts.join('\n    '),
        bodyScripts: '', // Vite puts everything in <head> with type="module"
      };
    } catch (err) {
      console.warn(
        `[EjsTemplateService] Failed to extract bundle tags from "${this.reactIndexPath}":`,
        err,
      );
      return { headAssets: '', bodyScripts: '' };
    }
  }

  /**
   * Resolves the template for the root route '/'.
   */
  private resolveRootTemplate(): string {
    // 1. Check ejsSplashRoot/index.ejs
    if (this.ejsSplashRoot) {
      const customIndex = join(this.ejsSplashRoot, 'index.ejs');
      if (existsSync(customIndex)) {
        return customIndex;
      }
      console.warn(
        `[EjsTemplateService] EJS_SPLASH_ROOT set but no index.ejs found at "${customIndex}"`,
      );
    }

    // 2. Check deprecated splashTemplatePath
    if (this.splashTemplatePath && existsSync(this.splashTemplatePath)) {
      return this.splashTemplatePath;
    }

    // 3. Default template
    return this.defaultTemplatePath;
  }

  /**
   * Resolves a template for a non-root route using the manifest.
   */
  private resolveManifestTemplate(route: string): string {
    if (!this.ejsSplashRoot) {
      return this.defaultTemplatePath;
    }

    const manifest = this.readRouteManifest();
    const templateFile = manifest[route];

    if (!templateFile) {
      return this.defaultTemplatePath;
    }

    const templatePath = resolve(this.ejsSplashRoot, templateFile);
    if (existsSync(templatePath)) {
      return templatePath;
    }

    console.warn(
      `[EjsTemplateService] Manifest route "${route}" points to "${templateFile}" which does not exist`,
    );
    return this.defaultTemplatePath;
  }

  /**
   * Renders the default template. Throws on failure (no further fallback).
   */
  private renderDefault(context: IEjsTemplateContext): string {
    const templateContent = readFileSync(this.defaultTemplatePath, 'utf-8');
    return ejs.render(templateContent, context, { async: false });
  }
}
