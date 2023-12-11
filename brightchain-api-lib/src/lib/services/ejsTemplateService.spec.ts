/**
 * Unit tests for EjsTemplateService.
 *
 * Validates: Requirements 1.1, 1.3, 2.1–2.7, 3.2, 3.3, 3.4, 3.5, 3.6,
 *            5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 7.5, 7.7, 7.8, 7.9, 7.10
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { EjsTemplateService } from './ejsTemplateService';
import { Request } from 'express';
import { BrightChainIndexLocals } from '../routers/app';

/** Minimal default template for testing */
const DEFAULT_TEMPLATE = '<html><body>Default: <%= siteName %></body></html>';

/** Helper to create a temp directory with optional files */
function createTempDir(
  files?: Record<string, string>,
): string {
  const dir = mkdtempSync(join(tmpdir(), 'ejs-test-'));
  if (files) {
    for (const [name, content] of Object.entries(files)) {
      const filePath = join(dir, name);
      const fileDir = filePath.substring(0, filePath.lastIndexOf('/'));
      if (fileDir !== dir) {
        mkdirSync(fileDir, { recursive: true });
      }
      writeFileSync(filePath, content, 'utf-8');
    }
  }
  return dir;
}

/** Helper to build minimal BrightChainIndexLocals */
function makeLocals(
  overrides: Partial<BrightChainIndexLocals> = {},
): BrightChainIndexLocals {
  return {
    cspNonce: 'test-nonce-123',
    title: 'BrightChain',
    tagline: 'Privacy. Participation. Power.',
    description: 'A decentralized platform.',
    server: 'https://localhost:3000',
    siteUrl: 'https://brightchain.org',
    baseHref: '/',
    hostname: 'localhost',
    siteTitle: 'BrightChain',
    emailDomain: 'brightchain.org',
    fontAwesomeKitId: 'abc123',
    enabledFeatures: ['BrightChat', 'BrightHub'],
    ...overrides,
  };
}

/** Helper to build a minimal Express Request mock */
function makeReq(path = '/'): Request {
  return { path } as unknown as Request;
}

describe('EjsTemplateService', () => {
  let tempDir: string;
  let defaultTemplatePath: string;

  beforeEach(() => {
    tempDir = createTempDir();
    defaultTemplatePath = join(tempDir, 'default-splash.ejs');
    writeFileSync(defaultTemplatePath, DEFAULT_TEMPLATE, 'utf-8');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should accept defaultTemplatePath only', () => {
      const service = new EjsTemplateService(defaultTemplatePath);
      expect(service).toBeDefined();
    });

    it('should accept all three parameters', () => {
      const service = new EjsTemplateService(
        defaultTemplatePath,
        '/some/root',
        '/some/splash.ejs',
      );
      expect(service).toBeDefined();
    });
  });

  describe('resolveTemplatePath', () => {
    it('should return default template when no ejsSplashRoot is set (root route)', () => {
      const service = new EjsTemplateService(defaultTemplatePath);
      expect(service.resolveTemplatePath('/')).toBe(defaultTemplatePath);
    });

    it('should return custom index.ejs when ejsSplashRoot has it', () => {
      const customDir = createTempDir({ 'index.ejs': '<html>Custom</html>' });
      const service = new EjsTemplateService(defaultTemplatePath, customDir);
      expect(service.resolveTemplatePath('/')).toBe(
        join(customDir, 'index.ejs'),
      );
      rmSync(customDir, { recursive: true, force: true });
    });

    it('should fall back to splashTemplatePath when ejsSplashRoot has no index.ejs', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const emptyDir = createTempDir();
      const splashPath = join(tempDir, 'splash.ejs');
      writeFileSync(splashPath, '<html>Splash</html>', 'utf-8');

      const service = new EjsTemplateService(
        defaultTemplatePath,
        emptyDir,
        splashPath,
      );
      expect(service.resolveTemplatePath('/')).toBe(splashPath);
      rmSync(emptyDir, { recursive: true, force: true });
    });

    it('should fall back to default when ejsSplashRoot has no index.ejs and no splashTemplatePath', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const emptyDir = createTempDir();
      const service = new EjsTemplateService(defaultTemplatePath, emptyDir);
      expect(service.resolveTemplatePath('/')).toBe(defaultTemplatePath);
      rmSync(emptyDir, { recursive: true, force: true });
    });

    it('should resolve manifest route to the correct template file', () => {
      const customDir = createTempDir({
        'routes.json': JSON.stringify({ '/about': 'about.ejs' }),
        'about.ejs': '<html>About</html>',
      });
      const service = new EjsTemplateService(defaultTemplatePath, customDir);
      expect(service.resolveTemplatePath('/about')).toBe(
        join(customDir, 'about.ejs'),
      );
      rmSync(customDir, { recursive: true, force: true });
    });

    it('should fall back to default for non-root route not in manifest', () => {
      const customDir = createTempDir({
        'routes.json': JSON.stringify({}),
      });
      const service = new EjsTemplateService(defaultTemplatePath, customDir);
      expect(service.resolveTemplatePath('/unknown')).toBe(defaultTemplatePath);
      rmSync(customDir, { recursive: true, force: true });
    });

    it('should fall back to default when manifest route points to missing file', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const customDir = createTempDir({
        'routes.json': JSON.stringify({ '/missing': 'missing.ejs' }),
      });
      const service = new EjsTemplateService(defaultTemplatePath, customDir);
      expect(service.resolveTemplatePath('/missing')).toBe(defaultTemplatePath);
      rmSync(customDir, { recursive: true, force: true });
    });
  });

  describe('readRouteManifest', () => {
    it('should return empty object when no ejsSplashRoot', () => {
      const service = new EjsTemplateService(defaultTemplatePath);
      expect(service.readRouteManifest()).toEqual({});
    });

    it('should parse valid routes.json', () => {
      const customDir = createTempDir({
        'routes.json': JSON.stringify({
          '/about': 'about.ejs',
          '/terms': 'legal/terms.ejs',
        }),
      });
      const service = new EjsTemplateService(defaultTemplatePath, customDir);
      expect(service.readRouteManifest()).toEqual({
        '/about': 'about.ejs',
        '/terms': 'legal/terms.ejs',
      });
      rmSync(customDir, { recursive: true, force: true });
    });

    it('should return empty object for invalid JSON', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const customDir = createTempDir({
        'routes.json': 'not valid json {{{',
      });
      const service = new EjsTemplateService(defaultTemplatePath, customDir);
      expect(service.readRouteManifest()).toEqual({});
      rmSync(customDir, { recursive: true, force: true });
    });

    it('should return empty object when routes.json is missing', () => {
      const customDir = createTempDir();
      const service = new EjsTemplateService(defaultTemplatePath, customDir);
      expect(service.readRouteManifest()).toEqual({});
      rmSync(customDir, { recursive: true, force: true });
    });

    it('should return empty object when routes.json is an array', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const customDir = createTempDir({
        'routes.json': JSON.stringify(['/about']),
      });
      const service = new EjsTemplateService(defaultTemplatePath, customDir);
      expect(service.readRouteManifest()).toEqual({});
      rmSync(customDir, { recursive: true, force: true });
    });
  });

  describe('isValidEjsRoute', () => {
    it('should reject routes starting with /api/', () => {
      const service = new EjsTemplateService(defaultTemplatePath);
      expect(service.isValidEjsRoute('/api/users')).toBe(false);
      expect(service.isValidEjsRoute('/api/')).toBe(false);
      expect(service.isValidEjsRoute('/api/v1/data')).toBe(false);
    });

    it('should accept non-API routes', () => {
      const service = new EjsTemplateService(defaultTemplatePath);
      expect(service.isValidEjsRoute('/')).toBe(true);
      expect(service.isValidEjsRoute('/about')).toBe(true);
      expect(service.isValidEjsRoute('/terms')).toBe(true);
      expect(service.isValidEjsRoute('/apiary')).toBe(true);
    });
  });

  describe('buildContext', () => {
    it('should build context with all required fields', () => {
      const service = new EjsTemplateService(defaultTemplatePath);
      const locals = makeLocals();
      const req = makeReq('/about');
      const ctx = service.buildContext(locals, req);

      expect(ctx.nodeId).toBe('');
      expect(ctx.nodeIdSource).toBe('');
      expect(ctx.siteName).toBe('BrightChain');
      expect(ctx.siteTagline).toBe('Privacy. Participation. Power.');
      expect(ctx.siteDescription).toBe('A decentralized platform.');
      expect(ctx.fontAwesomeKitId).toBe('abc123');
      expect(ctx.serverUrl).toBe('https://brightchain.org');
      expect(ctx.emailDomain).toBe('brightchain.org');
      expect(ctx.emailSender).toBe('');
      expect(ctx.production).toBe(false);
      expect(ctx.enabledFeatures).toEqual(['BrightChat', 'BrightHub']);
      expect(ctx.cspNonce).toBe('test-nonce-123');
      expect(ctx.requestPath).toBe('/about');
    });

    it('should include extra locals properties via spread', () => {
      const service = new EjsTemplateService(defaultTemplatePath);
      const locals = makeLocals({ nodeId: 'node-42' } as never);
      const req = makeReq('/');
      const ctx = service.buildContext(locals, req);

      expect(ctx.nodeId).toBe('node-42');
    });

    it('should use req.path for requestPath', () => {
      const service = new EjsTemplateService(defaultTemplatePath);
      const ctx = service.buildContext(makeLocals(), makeReq('/custom/path'));
      expect(ctx.requestPath).toBe('/custom/path');
    });
  });

  describe('render', () => {
    it('should render a simple EJS template with context', () => {
      const service = new EjsTemplateService(defaultTemplatePath);
      const ctx = service.buildContext(makeLocals(), makeReq('/'));
      const html = service.render(defaultTemplatePath, ctx);
      expect(html).toContain('Default: BrightChain');
    });

    it('should render EJS control flow tags', () => {
      const templatePath = join(tempDir, 'control.ejs');
      writeFileSync(
        templatePath,
        '<% if (production) { %>PROD<% } else { %>DEV<% } %>',
        'utf-8',
      );
      const service = new EjsTemplateService(defaultTemplatePath);
      const ctx = service.buildContext(makeLocals(), makeReq('/'));
      const html = service.render(templatePath, ctx);
      expect(html).toBe('DEV');
    });

    it('should render unescaped output tags', () => {
      const templatePath = join(tempDir, 'unescaped.ejs');
      writeFileSync(
        templatePath,
        '<%- "<b>bold</b>" %>',
        'utf-8',
      );
      const service = new EjsTemplateService(defaultTemplatePath);
      const ctx = service.buildContext(makeLocals(), makeReq('/'));
      const html = service.render(templatePath, ctx);
      expect(html).toBe('<b>bold</b>');
    });

    it('should fall back to default template on custom template syntax error', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const badTemplate = join(tempDir, 'bad.ejs');
      writeFileSync(badTemplate, '<%= unclosed tag', 'utf-8');

      const service = new EjsTemplateService(defaultTemplatePath);
      const ctx = service.buildContext(makeLocals(), makeReq('/'));
      const html = service.render(badTemplate, ctx);
      expect(html).toContain('Default: BrightChain');
    });

    it('should throw when default template itself has a syntax error', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const badDefault = join(tempDir, 'bad-default.ejs');
      writeFileSync(badDefault, '<%= broken %%%>', 'utf-8');

      const service = new EjsTemplateService(badDefault);
      const ctx = service.buildContext(makeLocals(), makeReq('/'));
      expect(() => service.render(badDefault, ctx)).toThrow();
    });

    it('should re-read template on each render (no caching)', () => {
      const templatePath = join(tempDir, 'dynamic.ejs');
      writeFileSync(templatePath, '<html>Version 1</html>', 'utf-8');

      const service = new EjsTemplateService(defaultTemplatePath);
      const ctx = service.buildContext(makeLocals(), makeReq('/'));

      const html1 = service.render(templatePath, ctx);
      expect(html1).toContain('Version 1');

      // Update the file
      writeFileSync(templatePath, '<html>Version 2</html>', 'utf-8');
      const html2 = service.render(templatePath, ctx);
      expect(html2).toContain('Version 2');
    });

    it('should fall back to default when custom template file is deleted', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const templatePath = join(tempDir, 'deletable.ejs');
      writeFileSync(templatePath, '<html>Custom</html>', 'utf-8');

      const service = new EjsTemplateService(defaultTemplatePath);
      const ctx = service.buildContext(makeLocals(), makeReq('/'));

      // First render works
      expect(service.render(templatePath, ctx)).toContain('Custom');

      // Delete the file
      rmSync(templatePath);

      // Second render falls back to default
      const html = service.render(templatePath, ctx);
      expect(html).toContain('Default: BrightChain');
    });
  });
});
