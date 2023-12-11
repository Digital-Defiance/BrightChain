/**
 * Integration tests for EJS splash page routing.
 *
 * Tests the EjsTemplateService integrated with Express routing,
 * mimicking the route registration pattern from AppRouter.registerAdditionalRenderHooks.
 *
 * Validates: Requirements 1.2, 6.1, 6.3, 6.4
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import express, { Express, NextFunction, Request, Response } from 'express';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import request from 'supertest';
import { existsSync } from 'fs';
import { EjsTemplateService } from '../services/ejsTemplateService';
import { IEjsTemplateContext } from '../interfaces/ejsTemplateContext';
import { BrightChainIndexLocals } from './app';

/** Minimal default template that produces valid HTML with CSP nonce */
const DEFAULT_TEMPLATE = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '<title><%= siteName %></title>',
  '<meta name="description" content="<%= siteDescription %>" />',
  '<% if (fontAwesomeKitId) { %>',
  '<script nonce="<%= cspNonce %>" src="https://kit.fontawesome.com/<%= fontAwesomeKitId %>.js" crossorigin="anonymous"></script>',
  '<% } %>',
  '<script nonce="<%= cspNonce %>">',
  'window.APP_CONFIG = <%- JSON.stringify({ enabledFeatures: enabledFeatures, serverUrl: serverUrl }) %>;',
  '</script>',
  '</head>',
  '<body><div id="root"></div></body>',
  '</html>',
].join('\n');

/** Stub locals simulating what getIndexLocals() would return */
function makeLocals(): BrightChainIndexLocals {
  return {
    cspNonce: 'test-nonce-abc123',
    title: 'BrightChain',
    tagline: 'Privacy. Participation. Power.',
    description: 'A decentralized platform.',
    server: 'https://localhost:3000',
    siteUrl: 'https://brightchain.org',
    baseHref: '/',
    hostname: 'localhost',
    siteTitle: 'BrightChain',
    emailDomain: 'brightchain.org',
    fontAwesomeKitId: 'kit123',
    enabledFeatures: ['BrightChat', 'BrightHub'],
  };
}

/**
 * Creates a lightweight Express app that mimics the route registration
 * pattern from AppRouter.registerAdditionalRenderHooks.
 *
 * This allows us to integration-test the full request cycle:
 *   request → route matching → EjsTemplateService → HTML response
 */
function createEjsApp(
  ejsService: EjsTemplateService,
  ejsSplashRoot: string | undefined,
): Express {
  const app = express();
  const locals = makeLocals();

  // Shared EJS handler (mirrors AppRouter.registerAdditionalRenderHooks)
  const ejsHandler = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const context = ejsService.buildContext(locals, req);
      const templatePath = ejsService.resolveTemplatePath(req.path);
      const html = ejsService.render(templatePath, context);
      res.type('html').send(html);
    } catch (err) {
      next(err);
    }
  };

  // Simulate API routes mounted before EJS routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/api/v1/users', (_req, res) => {
    res.json({ users: [] });
  });

  // Register root EJS route
  app.get('/', ejsHandler);

  // Register manifest routes (mirrors AppRouter logic)
  const manifest = ejsService.readRouteManifest();
  for (const [route, templateFile] of Object.entries(manifest)) {
    if (!ejsService.isValidEjsRoute(route)) {
      continue;
    }

    app.get(route, (req: Request, res: Response, next: NextFunction): void => {
      try {
        const freshManifest = ejsService.readRouteManifest();
        const freshTemplateFile = freshManifest[req.path];

        if (!freshTemplateFile) {
          next();
          return;
        }

        if (ejsSplashRoot) {
          const tplPath = resolve(ejsSplashRoot, freshTemplateFile);
          if (!existsSync(tplPath)) {
            res.status(404).send('Not Found');
            return;
          }
        }

        ejsHandler(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  }

  // React SPA catch-all (simulates the upstream behavior)
  // Express 5 uses path-to-regexp v8 which requires named wildcard params
  app.get('{*path}', (_req, res) => {
    res.type('html').send('<html><body><div id="root">React SPA</div></body></html>');
  });

  return app;
}

describe('EJS Splash Page Integration', () => {
  let tempDir: string;
  let defaultTemplatePath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ejs-integ-'));
    defaultTemplatePath = join(tempDir, 'default-splash.ejs');
    writeFileSync(defaultTemplatePath, DEFAULT_TEMPLATE, 'utf-8');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  /**
   * Validates: Requirement 1.2
   * WHEN a request for the root URL is received, the AppRouter SHALL render
   * the splash page template via EJS and return the resulting HTML with a 200 status code.
   */
  describe('GET / returns 200 with EJS-rendered HTML', () => {
    it('should return 200 with rendered HTML from default template', async () => {
      const service = new EjsTemplateService(defaultTemplatePath);
      const app = createEjsApp(service, undefined);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toContain('<!DOCTYPE html>');
      expect(res.text).toContain('<title>BrightChain</title>');
      expect(res.text).toContain('APP_CONFIG');
    });

    it('should return 200 with rendered HTML from custom template', async () => {
      const customDir = mkdtempSync(join(tmpdir(), 'ejs-custom-'));
      writeFileSync(
        join(customDir, 'index.ejs'),
        '<html><body>Custom: <%= siteName %></body></html>',
        'utf-8',
      );

      const service = new EjsTemplateService(defaultTemplatePath, customDir);
      const app = createEjsApp(service, customDir);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toContain('Custom: BrightChain');

      rmSync(customDir, { recursive: true, force: true });
    });

    it('should include template variables in rendered output', async () => {
      const service = new EjsTemplateService(defaultTemplatePath);
      const app = createEjsApp(service, undefined);

      const res = await request(app).get('/');

      expect(res.text).toContain('BrightChain');
      expect(res.text).toContain('BrightChat');
      expect(res.text).toContain('BrightHub');
      expect(res.text).toContain('kit123');
    });
  });

  /**
   * Validates: Requirement 6.3
   * WHEN the EJS splash page feature is active, the AppRouter SHALL preserve
   * all existing API route handling without modification.
   */
  describe('API routes (/api/*) are unaffected', () => {
    it('GET /api/health returns JSON, not EJS HTML', async () => {
      const service = new EjsTemplateService(defaultTemplatePath);
      const app = createEjsApp(service, undefined);

      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('GET /api/v1/users returns JSON, not EJS HTML', async () => {
      const service = new EjsTemplateService(defaultTemplatePath);
      const app = createEjsApp(service, undefined);

      const res = await request(app).get('/api/v1/users');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body).toEqual({ users: [] });
    });

    it('API routes in manifest are rejected by isValidEjsRoute', () => {
      const service = new EjsTemplateService(defaultTemplatePath);
      expect(service.isValidEjsRoute('/api/override')).toBe(false);
      expect(service.isValidEjsRoute('/api/v1/custom')).toBe(false);
    });
  });

  /**
   * Validates: Requirement 6.1
   * The AppRouter SHALL continue to serve the React application for all
   * routes not registered in the Route_Manifest.
   */
  describe('Non-manifest routes fall through to React SPA catch-all', () => {
    it('GET /unknown falls through to SPA catch-all', async () => {
      const service = new EjsTemplateService(defaultTemplatePath);
      const app = createEjsApp(service, undefined);

      const res = await request(app).get('/unknown');

      expect(res.status).toBe(200);
      expect(res.text).toContain('React SPA');
    });

    it('GET /some/deep/path falls through to SPA catch-all', async () => {
      const service = new EjsTemplateService(defaultTemplatePath);
      const app = createEjsApp(service, undefined);

      const res = await request(app).get('/some/deep/path');

      expect(res.status).toBe(200);
      expect(res.text).toContain('React SPA');
    });

    it('manifest route is served via EJS, non-manifest falls through', async () => {
      const customDir = mkdtempSync(join(tmpdir(), 'ejs-manifest-'));
      writeFileSync(
        join(customDir, 'routes.json'),
        JSON.stringify({ '/about': 'about.ejs' }),
        'utf-8',
      );
      writeFileSync(
        join(customDir, 'about.ejs'),
        '<html><body>About: <%= siteName %></body></html>',
        'utf-8',
      );

      const service = new EjsTemplateService(defaultTemplatePath, customDir);
      const app = createEjsApp(service, customDir);

      // Manifest route returns EJS-rendered HTML
      const aboutRes = await request(app).get('/about');
      expect(aboutRes.status).toBe(200);
      expect(aboutRes.text).toContain('About: BrightChain');

      // Non-manifest route falls through to SPA
      const contactRes = await request(app).get('/contact');
      expect(contactRes.status).toBe(200);
      expect(contactRes.text).toContain('React SPA');

      rmSync(customDir, { recursive: true, force: true });
    });
  });

  /**
   * Validates: Requirement 6.4
   * The Template_Engine SHALL not interfere with the Content Security Policy
   * headers already configured by the Middlewares class.
   */
  describe('CSP headers remain intact on EJS responses', () => {
    it('CSP nonce is present in all script tags of rendered output', async () => {
      const service = new EjsTemplateService(defaultTemplatePath);
      const app = createEjsApp(service, undefined);

      const res = await request(app).get('/');

      // Every <script> tag should contain the nonce attribute
      const scriptTagRegex = /<script[^>]*>/g;
      const scriptTags = res.text.match(scriptTagRegex) || [];
      expect(scriptTags.length).toBeGreaterThan(0);

      for (const tag of scriptTags) {
        expect(tag).toContain('nonce="test-nonce-abc123"');
      }
    });

    it('EJS rendering does not add or remove CSP headers', async () => {
      const cspValue = "default-src 'self'; script-src 'nonce-test-nonce-abc123'";
      const service = new EjsTemplateService(defaultTemplatePath);

      const app = express();
      // Simulate CSP middleware setting headers before EJS routes
      app.use((_req, res, next) => {
        res.setHeader('Content-Security-Policy', cspValue);
        next();
      });

      const locals = makeLocals();
      app.get('/', (req: Request, res: Response, next: NextFunction) => {
        try {
          const context = service.buildContext(locals, req);
          const templatePath = service.resolveTemplatePath(req.path);
          const html = service.render(templatePath, context);
          res.type('html').send(html);
        } catch (err) {
          next(err);
        }
      });

      // Pre-bind the server and wait for it to be ready before making the
      // request. This avoids ECONNRESET under heavy parallel test load where
      // supertest's internal listen-then-request cycle can race with OS
      // ephemeral port allocation.
      const server = await new Promise<import('http').Server>((resolve) => {
        const s = app.listen(0, () => resolve(s));
      });
      try {
        const res = await request(server).get('/');

        expect(res.status).toBe(200);
        expect(res.headers['content-security-policy']).toBe(cspValue);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
  });

  /**
   * Validates: Requirements 7.1, 7.8
   * Manifest routes work end-to-end; missing template files return 404.
   */
  describe('Manifest route rendering end-to-end', () => {
    it('manifest route pointing to existing template returns rendered HTML', async () => {
      const customDir = mkdtempSync(join(tmpdir(), 'ejs-e2e-'));
      mkdirSync(join(customDir, 'legal'), { recursive: true });
      writeFileSync(
        join(customDir, 'routes.json'),
        JSON.stringify({
          '/about': 'about.ejs',
          '/terms': 'legal/terms.ejs',
        }),
        'utf-8',
      );
      writeFileSync(
        join(customDir, 'about.ejs'),
        '<html><body>About page for <%= siteName %></body></html>',
        'utf-8',
      );
      writeFileSync(
        join(customDir, 'legal', 'terms.ejs'),
        '<html><body>Terms of <%= siteName %></body></html>',
        'utf-8',
      );

      const service = new EjsTemplateService(defaultTemplatePath, customDir);
      const app = createEjsApp(service, customDir);

      const aboutRes = await request(app).get('/about');
      expect(aboutRes.status).toBe(200);
      expect(aboutRes.text).toContain('About page for BrightChain');

      const termsRes = await request(app).get('/terms');
      expect(termsRes.status).toBe(200);
      expect(termsRes.text).toContain('Terms of BrightChain');

      rmSync(customDir, { recursive: true, force: true });
    });

    it('manifest route pointing to missing template returns 404', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const customDir = mkdtempSync(join(tmpdir(), 'ejs-404-'));
      writeFileSync(
        join(customDir, 'routes.json'),
        JSON.stringify({ '/missing': 'missing.ejs' }),
        'utf-8',
      );

      const service = new EjsTemplateService(defaultTemplatePath, customDir);
      const app = createEjsApp(service, customDir);

      const res = await request(app).get('/missing');
      expect(res.status).toBe(404);
    });
  });

  /**
   * Full render cycle integration: build context → resolve template → render → verify HTML.
   */
  describe('Full render cycle', () => {
    it('default template produces valid HTML with all expected elements', async () => {
      const realDefaultTemplate = join(__dirname, '..', 'templates', 'default-splash.ejs');
      // Only run if the real default template exists
      if (!existsSync(realDefaultTemplate)) {
        return;
      }

      const service = new EjsTemplateService(realDefaultTemplate);
      const app = createEjsApp(service, undefined);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.text).toContain('<!DOCTYPE html>');
      expect(res.text).toContain('<html');
      expect(res.text).toContain('<head>');
      expect(res.text).toContain('</head>');
      expect(res.text).toContain('<body>');
      expect(res.text).toContain('</body>');
      expect(res.text).toContain('</html>');
      expect(res.text).toContain('<div id="root">');
      expect(res.text).toContain('APP_CONFIG');
    });
  });
});
