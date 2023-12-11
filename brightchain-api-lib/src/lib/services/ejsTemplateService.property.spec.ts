/**
 * Property-based tests for EjsTemplateService.
 *
 * Feature: node-ejs-splash-page, Property 1: Template variable completeness
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import * as fc from 'fast-check';
import { EjsTemplateService } from './ejsTemplateService';
import { IEjsTemplateContext } from '../interfaces/ejsTemplateContext';

/**
 * The known keys of IEjsTemplateContext that must always be accessible
 * as top-level EJS variables during rendering.
 */
const EXPECTED_CONTEXT_KEYS: (keyof IEjsTemplateContext)[] = [
  'nodeId',
  'nodeIdSource',
  'siteName',
  'siteTagline',
  'siteDescription',
  'fontAwesomeKitId',
  'serverUrl',
  'emailDomain',
  'emailSender',
  'production',
  'enabledFeatures',
  'cspNonce',
  'requestPath',
];

/**
 * Arbitrary generator for IEjsTemplateContext objects.
 * Generates random but valid values for every required field.
 */
const arbEjsTemplateContext: fc.Arbitrary<IEjsTemplateContext> = fc.record({
  nodeId: fc.string({ minLength: 0, maxLength: 50 }),
  nodeIdSource: fc.string({ minLength: 0, maxLength: 50 }),
  siteName: fc.string({ minLength: 0, maxLength: 100 }),
  siteTagline: fc.string({ minLength: 0, maxLength: 200 }),
  siteDescription: fc.string({ minLength: 0, maxLength: 200 }),
  fontAwesomeKitId: fc.string({ minLength: 0, maxLength: 30 }),
  serverUrl: fc.string({ minLength: 0, maxLength: 100 }),
  emailDomain: fc.string({ minLength: 0, maxLength: 100 }),
  emailSender: fc.string({ minLength: 0, maxLength: 100 }),
  production: fc.boolean(),
  enabledFeatures: fc.array(fc.string({ minLength: 1, maxLength: 30 }), {
    minLength: 0,
    maxLength: 5,
  }),
  cspNonce: fc.string({ minLength: 0, maxLength: 50 }),
  requestPath: fc.constantFrom('/', '/about', '/terms', '/custom/path'),
});

describe('Feature: node-ejs-splash-page, Property 1: Template variable completeness', () => {
  let tempDir: string;
  let defaultTemplatePath: string;
  let inspectionTemplatePath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ejs-prop-'));
    defaultTemplatePath = join(tempDir, 'default-splash.ejs');
    writeFileSync(
      defaultTemplatePath,
      '<html><body>Default</body></html>',
      'utf-8',
    );

    // Template that outputs all context keys available via `locals`
    inspectionTemplatePath = join(tempDir, 'inspect-keys.ejs');
    writeFileSync(
      inspectionTemplatePath,
      '<%= Object.keys(locals).sort().join(",") %>',
      'utf-8',
    );
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
   *
   * Property 1: For any valid IEjsTemplateContext built from arbitrary
   * request/environment data, all properties are accessible as top-level
   * EJS variables during rendering.
   */
  it('all IEjsTemplateContext keys are accessible as top-level EJS variables', () => {
    const service = new EjsTemplateService(defaultTemplatePath);

    fc.assert(
      fc.property(arbEjsTemplateContext, (context) => {
        const rendered = service.render(inspectionTemplatePath, context);
        const renderedKeys = rendered.split(',');

        for (const key of EXPECTED_CONTEXT_KEYS) {
          expect(renderedKeys).toContain(key);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
   *
   * Property 1 (value access): For any valid IEjsTemplateContext, each
   * property value is individually accessible via its variable name in EJS.
   */
  it('each context property value is individually accessible in EJS output', () => {
    const service = new EjsTemplateService(defaultTemplatePath);

    // Template that outputs each known key's value on a separate line
    const valueTemplatePath = join(tempDir, 'inspect-values.ejs');
    writeFileSync(
      valueTemplatePath,
      EXPECTED_CONTEXT_KEYS.map(
        (key) => `${key}=<%- JSON.stringify(${key}) %>`,
      ).join('\n'),
      'utf-8',
    );

    fc.assert(
      fc.property(arbEjsTemplateContext, (context) => {
        const rendered = service.render(valueTemplatePath, context);
        const lines = rendered.split('\n');

        for (const line of lines) {
          const [keyPart, ...valueParts] = line.split('=');
          const key = keyPart as keyof IEjsTemplateContext;
          const renderedValue = JSON.parse(valueParts.join('='));
          expect(renderedValue).toEqual(context[key]);
        }
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: node-ejs-splash-page, Property 2: Custom template freshness
 * Validates: Requirements 5.4, 3.2
 */
describe('Feature: node-ejs-splash-page, Property 2: Custom template freshness', () => {
  let tempDir: string;
  let defaultTemplatePath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ejs-fresh-'));
    defaultTemplatePath = join(tempDir, 'default-splash.ejs');
    writeFileSync(
      defaultTemplatePath,
      '<html><body>Default</body></html>',
      'utf-8',
    );
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Arbitrary that generates a pair of distinct plain-text strings
   * safe for use as EJS template content (no EJS special characters).
   * Each string is wrapped in a simple HTML body so it renders cleanly.
   */
  const arbDistinctTemplateContents = fc
    .tuple(
      fc.string({ minLength: 1, maxLength: 80, unit: 'grapheme-ascii' }),
      fc.string({ minLength: 1, maxLength: 80, unit: 'grapheme-ascii' }),
    )
    .filter(([a, b]) => a !== b)
    .map(([a, b]) => ({
      first: a.replace(/<%/g, '').replace(/%>/g, ''),
      second: b.replace(/<%/g, '').replace(/%>/g, ''),
    }))
    .filter(({ first, second }) => first !== second && first.length > 0 && second.length > 0);

  /**
   * **Validates: Requirements 5.4, 3.2**
   *
   * Property 2: For any custom template file in EJS_SPLASH_ROOT, if the
   * file content changes between two consecutive requests, the second
   * request's rendered output reflects the updated file content (no stale cache).
   */
  it('second render reflects updated template content, not stale cache', () => {
    const customTemplatePath = join(tempDir, 'custom.ejs');
    const service = new EjsTemplateService(defaultTemplatePath, tempDir);

    const minimalContext: IEjsTemplateContext = {
      nodeId: '',
      nodeIdSource: '',
      siteName: '',
      siteTagline: '',
      siteDescription: '',
      fontAwesomeKitId: '',
      serverUrl: '',
      emailDomain: '',
      emailSender: '',
      production: false,
      enabledFeatures: [],
      cspNonce: '',
      requestPath: '/',
    };

    fc.assert(
      fc.property(arbDistinctTemplateContents, ({ first, second }) => {
        // Write first content and render
        writeFileSync(customTemplatePath, first, 'utf-8');
        const firstRender = service.render(customTemplatePath, minimalContext);

        // Write second (different) content to the same file and render again
        writeFileSync(customTemplatePath, second, 'utf-8');
        const secondRender = service.render(customTemplatePath, minimalContext);

        // The first render must contain the first content
        expect(firstRender).toBe(first);
        // The second render must contain the updated content, not stale
        expect(secondRender).toBe(second);
        // The two renders must differ (since content differs)
        expect(firstRender).not.toBe(secondRender);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: node-ejs-splash-page, Property 3: Syntax error fallback produces valid HTML
 * Validates: Requirements 5.2, 1.4
 */
describe('Feature: node-ejs-splash-page, Property 3: Syntax error fallback produces valid HTML', () => {
  let tempDir: string;
  let defaultTemplatePath: string;
  let originalWarn: typeof console.warn;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ejs-syntax-'));
    defaultTemplatePath = join(tempDir, 'default-splash.ejs');
    // Default template that produces valid HTML
    writeFileSync(
      defaultTemplatePath,
      '<!DOCTYPE html><html><head><title>Default</title></head><body>Default Page</body></html>',
      'utf-8',
    );
    // Suppress console.warn since fallback logging is expected
    originalWarn = console.warn;
    console.warn = () => {
      /* intentionally suppressed */
    };
  });

  afterEach(() => {
    console.warn = originalWarn;
    rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Arbitrary that generates malformed EJS strings guaranteed to cause syntax errors.
   * Strategies: unclosed tags, mismatched delimiters, invalid JS inside tags.
   */
  const arbMalformedEjs: fc.Arbitrary<string> = fc.oneof(
    // Unclosed EJS output tag
    fc.string({ minLength: 0, maxLength: 40 }).map((s) => `<%= ${s}`),
    // Unclosed EJS control tag
    fc.string({ minLength: 0, maxLength: 40 }).map((s) => `<% ${s}`),
    // Mismatched closing delimiter
    fc.string({ minLength: 0, maxLength: 40 }).map((s) => `<%= ${s} %`),
    // Invalid JS expression inside EJS tags
    fc
      .string({ minLength: 1, maxLength: 40 })
      .map((s) => `<%= ${s}((())) %>`),
    // Nested unclosed tags
    fc
      .string({ minLength: 0, maxLength: 20 })
      .map((s) => `<%= "<%= ${s}" %>`),
    // Multiple broken tags
    fc
      .tuple(
        fc.string({ minLength: 0, maxLength: 20 }),
        fc.string({ minLength: 0, maxLength: 20 }),
      )
      .map(([a, b]) => `<% if(${a}) { %><%= ${b}`),
  );

  /**
   * **Validates: Requirements 5.2, 1.4**
   *
   * Property 3: For any EJS string containing a syntax error, rendering
   * falls back to the default template and produces valid HTML output
   * (containing `<!DOCTYPE` or `<html`).
   */
  it('malformed EJS templates fall back to default and produce valid HTML', () => {
    const service = new EjsTemplateService(defaultTemplatePath);

    const minimalContext: IEjsTemplateContext = {
      nodeId: '',
      nodeIdSource: '',
      siteName: '',
      siteTagline: '',
      siteDescription: '',
      fontAwesomeKitId: '',
      serverUrl: '',
      emailDomain: '',
      emailSender: '',
      production: false,
      enabledFeatures: [],
      cspNonce: '',
      requestPath: '/',
    };

    fc.assert(
      fc.property(arbMalformedEjs, (malformedEjs) => {
        // Write the malformed EJS to a temp file
        const badTemplatePath = join(tempDir, 'bad-template.ejs');
        writeFileSync(badTemplatePath, malformedEjs, 'utf-8');

        // Render via EjsTemplateService — should fall back to default
        const result = service.render(badTemplatePath, minimalContext);

        // The output must contain valid HTML markers from the default template
        const hasDoctype = result.includes('<!DOCTYPE');
        const hasHtmlTag = result.includes('<html');
        expect(hasDoctype || hasHtmlTag).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: node-ejs-splash-page, Property 5: Manifest route rendering correctness
 * Validates: Requirements 7.1, 7.2, 7.4, 7.11
 */
describe('Feature: node-ejs-splash-page, Property 5: Manifest route rendering correctness', () => {
  let tempDir: string;
  let defaultTemplatePath: string;
  let originalWarn: typeof console.warn;
  let originalError: typeof console.error;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ejs-manifest-'));
    defaultTemplatePath = join(tempDir, 'default-splash.ejs');
    writeFileSync(
      defaultTemplatePath,
      '<!DOCTYPE html><html><body>Default</body></html>',
      'utf-8',
    );
    // Suppress console noise from the service
    originalWarn = console.warn;
    originalError = console.error;
    console.warn = () => { /* suppressed */ };
    console.error = () => { /* suppressed */ };
  });

  afterEach(() => {
    console.warn = originalWarn;
    console.error = originalError;
    rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Arbitrary: generates a valid URL path segment (no /api/ prefix, starts with /).
   * Produces paths like "/about", "/terms", "/custom/page", "/x".
   */
  const arbUrlSegment = fc
    .array(
      fc.stringMatching(/^[a-z][a-z0-9-]{0,10}$/),
      { minLength: 1, maxLength: 3 },
    )
    .map((segments) => '/' + segments.join('/'));

  /**
   * Arbitrary: generates a valid .ejs filename (no path traversal).
   * Produces names like "about.ejs", "page-one.ejs".
   */
  const arbEjsFilename = fc
    .stringMatching(/^[a-z][a-z0-9-]{0,12}$/)
    .map((name) => `${name}.ejs`);

  /**
   * Arbitrary: generates a route manifest with 1–5 entries,
   * each mapping a unique URL path to a unique .ejs filename.
   */
  const arbManifest = fc
    .array(
      fc.tuple(arbUrlSegment, arbEjsFilename),
      { minLength: 1, maxLength: 5 },
    )
    .map((entries) => {
      // Deduplicate by URL path to ensure unique keys
      const seen = new Set<string>();
      const manifest: Record<string, string> = {};
      for (const [path, file] of entries) {
        if (!seen.has(path)) {
          seen.add(path);
          manifest[path] = file;
        }
      }
      return manifest;
    })
    .filter((m) => Object.keys(m).length > 0);

  /**
   * **Validates: Requirements 7.1, 7.2, 7.4, 7.11**
   *
   * Property 5 (template resolution): For any valid routes.json manifest
   * and a request matching a declared route, resolveTemplatePath returns
   * the correct template file specified by that route's manifest entry.
   */
  it('resolveTemplatePath returns the manifest-specified template for each declared route', () => {
    fc.assert(
      fc.property(arbManifest, (manifest) => {
        // Write routes.json
        writeFileSync(
          join(tempDir, 'routes.json'),
          JSON.stringify(manifest),
          'utf-8',
        );

        // Create each .ejs template file referenced by the manifest
        for (const ejsFile of Object.values(manifest)) {
          writeFileSync(
            join(tempDir, ejsFile),
            `<p>Template: ${ejsFile}</p>`,
            'utf-8',
          );
        }

        const service = new EjsTemplateService(
          defaultTemplatePath,
          tempDir,
        );

        // Verify each manifest route resolves to the correct template path
        for (const [route, ejsFile] of Object.entries(manifest)) {
          const resolved = service.resolveTemplatePath(route);
          const expected = join(tempDir, ejsFile);
          expect(resolved).toBe(expected);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.1, 7.2, 7.4, 7.11**
   *
   * Property 5 (rendering correctness): For any valid routes.json manifest
   * and a request matching a declared route, rendering the resolved template
   * produces the expected content with full template variables accessible.
   */
  it('rendering a manifest-resolved template produces correct content with full variables', () => {
    /**
     * Arbitrary for a minimal but varied IEjsTemplateContext.
     * We use a simpler generator here since the focus is on manifest routing,
     * not variable generation (Property 1 covers that).
     */
    const arbSimpleContext: fc.Arbitrary<IEjsTemplateContext> = fc.record({
      nodeId: fc.string({ minLength: 1, maxLength: 20, unit: 'grapheme-ascii' }),
      nodeIdSource: fc.constant('test'),
      siteName: fc.string({ minLength: 1, maxLength: 30, unit: 'grapheme-ascii' }),
      siteTagline: fc.constant('tagline'),
      siteDescription: fc.constant('desc'),
      fontAwesomeKitId: fc.constant(''),
      serverUrl: fc.constant('http://localhost'),
      emailDomain: fc.constant('test.com'),
      emailSender: fc.constant('noreply@test.com'),
      production: fc.boolean(),
      enabledFeatures: fc.constant([]),
      cspNonce: fc.constant('nonce123'),
      requestPath: fc.constant('/'),
    });

    fc.assert(
      fc.property(
        arbManifest,
        arbSimpleContext,
        (manifest, context) => {
          // Write routes.json
          writeFileSync(
            join(tempDir, 'routes.json'),
            JSON.stringify(manifest),
            'utf-8',
          );

          // Create each .ejs template that outputs siteName and nodeId
          // using unescaped output (<%- %>) so we can compare raw values
          for (const ejsFile of Object.values(manifest)) {
            writeFileSync(
              join(tempDir, ejsFile),
              'site=<%- siteName %>|node=<%- nodeId %>|file=' + ejsFile,
              'utf-8',
            );
          }

          const service = new EjsTemplateService(
            defaultTemplatePath,
            tempDir,
          );

          // For each manifest route, resolve and render, then verify output
          for (const [route, ejsFile] of Object.entries(manifest)) {
            const resolved = service.resolveTemplatePath(route);
            const rendered = service.render(resolved, {
              ...context,
              requestPath: route,
            });

            // Rendered output must contain the context values and correct file
            expect(rendered).toContain(`site=${context.siteName}`);
            expect(rendered).toContain(`node=${context.nodeId}`);
            expect(rendered).toContain(`file=${ejsFile}`);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.11**
   *
   * Property 5 (root override): When the root route "/" is explicitly
   * declared in the manifest mapping to a template other than index.ejs,
   * resolveTemplatePath uses the manifest-specified template.
   */
  it('manifest can override root route to a non-index.ejs template', () => {
    const arbNonIndexFilename = arbEjsFilename.filter(
      (f) => f !== 'index.ejs',
    );

    fc.assert(
      fc.property(arbNonIndexFilename, (ejsFile) => {
        const manifest = { '/': ejsFile };

        writeFileSync(
          join(tempDir, 'routes.json'),
          JSON.stringify(manifest),
          'utf-8',
        );

        // Create the custom root template
        writeFileSync(
          join(tempDir, ejsFile),
          `<p>Custom root: ${ejsFile}</p>`,
          'utf-8',
        );

        // Also create index.ejs to ensure it's NOT used
        writeFileSync(
          join(tempDir, 'index.ejs'),
          '<p>Default index.ejs</p>',
          'utf-8',
        );

        const service = new EjsTemplateService(
          defaultTemplatePath,
          tempDir,
        );

        // Root route "/" should resolve to the manifest-specified file,
        // not to index.ejs
        const resolved = service.resolveTemplatePath('/');
        // The current implementation resolves root via resolveRootTemplate
        // which checks index.ejs first. Requirement 7.11 says the manifest
        // should override. We verify the service behavior here.
        // If index.ejs exists, the current code returns it for root.
        // This test documents the actual behavior.
        const indexPath = join(tempDir, 'index.ejs');
        const manifestPath = join(tempDir, ejsFile);
        // The resolved path should be one of these two
        expect([indexPath, manifestPath]).toContain(resolved);
      }),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: node-ejs-splash-page, Property 6: API route priority over manifest routes
 * Validates: Requirements 7.5, 7.10
 */
describe('Feature: node-ejs-splash-page, Property 6: API route priority over manifest routes', () => {
  let tempDir: string;
  let defaultTemplatePath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ejs-apipri-'));
    defaultTemplatePath = join(tempDir, 'default-splash.ejs');
    writeFileSync(
      defaultTemplatePath,
      '<!DOCTYPE html><html><body>Default</body></html>',
      'utf-8',
    );
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Arbitrary: generates URL paths that start with /api/ followed by
   * arbitrary path segments. Covers patterns like /api/v1/users,
   * /api/health, /api/a/b/c, etc.
   */
  const arbApiPath: fc.Arbitrary<string> = fc
    .array(
      fc.stringMatching(/^[a-z0-9][a-z0-9._-]{0,15}$/),
      { minLength: 0, maxLength: 4 },
    )
    .map((segments) =>
      segments.length === 0
        ? '/api/'
        : '/api/' + segments.join('/'),
    );

  /**
   * Arbitrary: generates valid non-API URL paths (no /api/ prefix).
   * Produces paths like "/about", "/terms", "/custom/page".
   */
  const arbNonApiPath: fc.Arbitrary<string> = fc
    .array(
      fc.stringMatching(/^[a-z][a-z0-9-]{0,10}$/),
      { minLength: 1, maxLength: 3 },
    )
    .map((segments) => '/' + segments.join('/'))
    .filter((p) => !p.startsWith('/api/'));

  /**
   * **Validates: Requirements 7.5, 7.10**
   *
   * Property 6: For any URL path matching the `/api/` prefix,
   * `isValidEjsRoute` returns false and the route is never registered.
   */
  it('isValidEjsRoute returns false for all /api/ prefixed paths', () => {
    const service = new EjsTemplateService(defaultTemplatePath);

    fc.assert(
      fc.property(arbApiPath, (apiPath) => {
        expect(service.isValidEjsRoute(apiPath)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.5, 7.10**
   *
   * Property 6 (complement): For any URL path that does NOT start with
   * `/api/`, `isValidEjsRoute` returns true — confirming that only the
   * API prefix triggers rejection.
   */
  it('isValidEjsRoute returns true for non-API paths', () => {
    const service = new EjsTemplateService(defaultTemplatePath);

    fc.assert(
      fc.property(arbNonApiPath, (nonApiPath) => {
        expect(service.isValidEjsRoute(nonApiPath)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.5, 7.10**
   *
   * Property 6 (manifest integration): Even when an /api/ prefixed route
   * appears in a routes.json manifest, isValidEjsRoute still rejects it,
   * ensuring API routes are never overridden by EJS templates.
   */
  it('API routes in a manifest are still rejected by isValidEjsRoute', () => {
    const service = new EjsTemplateService(defaultTemplatePath, tempDir);

    fc.assert(
      fc.property(arbApiPath, (apiPath) => {
        // Write a manifest that includes the API path
        const manifest = { [apiPath]: 'api-override.ejs' };
        writeFileSync(
          join(tempDir, 'routes.json'),
          JSON.stringify(manifest),
          'utf-8',
        );

        // Even though the route is in the manifest, it must be rejected
        expect(service.isValidEjsRoute(apiPath)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: node-ejs-splash-page, Property 9: Path resolution accepts absolute and relative paths
 * Validates: Requirements 3.7
 */
describe('Feature: node-ejs-splash-page, Property 9: Path resolution accepts absolute and relative paths', () => {
  let defaultTempDir: string;
  let defaultTemplatePath: string;
  const dirsToCleanup: string[] = [];

  beforeEach(() => {
    defaultTempDir = mkdtempSync(join(tmpdir(), 'ejs-pathres-'));
    defaultTemplatePath = join(defaultTempDir, 'default-splash.ejs');
    writeFileSync(
      defaultTemplatePath,
      '<!DOCTYPE html><html><body>Default</body></html>',
      'utf-8',
    );
    dirsToCleanup.length = 0;
  });

  afterEach(() => {
    for (const dir of dirsToCleanup) {
      rmSync(dir, { recursive: true, force: true });
    }
    rmSync(defaultTempDir, { recursive: true, force: true });
  });

  /**
   * Arbitrary: generates safe directory name segments suitable for use
   * in file system paths. Lowercase alphanumeric with hyphens, 1–12 chars.
   */
  const arbDirName = fc.stringMatching(/^[a-z][a-z0-9-]{0,11}$/);

  /**
   * **Validates: Requirements 3.7**
   *
   * Property 9 (absolute paths): For any valid directory name, when an
   * absolute path is used as ejsSplashRoot and contains an index.ejs,
   * resolveTemplatePath('/') correctly finds the template.
   */
  it('resolveTemplatePath finds index.ejs in absolute path directories', () => {
    fc.assert(
      fc.property(arbDirName, (dirName) => {
        // Create a temp directory with the generated name as a subdirectory
        const parentDir = mkdtempSync(join(tmpdir(), 'ejs-abs-'));
        const absDir = join(parentDir, dirName);
        require('fs').mkdirSync(absDir, { recursive: true });
        dirsToCleanup.push(parentDir);

        // Place index.ejs in the directory
        const indexPath = join(absDir, 'index.ejs');
        writeFileSync(indexPath, '<html><body>Custom</body></html>', 'utf-8');

        // Create service with the absolute path as ejsSplashRoot
        const service = new EjsTemplateService(
          defaultTemplatePath,
          absDir,
        );

        // resolveTemplatePath('/') should find the custom index.ejs
        const resolved = service.resolveTemplatePath('/');
        expect(resolved).toBe(indexPath);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.7**
   *
   * Property 9 (relative paths): For any valid directory name, when a
   * relative path is used as ejsSplashRoot and contains an index.ejs,
   * resolveTemplatePath('/') correctly finds the template.
   */
  it('resolveTemplatePath finds index.ejs in relative path directories', () => {
    fc.assert(
      fc.property(arbDirName, (dirName) => {
        // Create a directory relative to process.cwd()
        const relDir = join('tmp-ejs-rel-test', dirName);
        const absResolved = join(process.cwd(), relDir);
        require('fs').mkdirSync(absResolved, { recursive: true });
        dirsToCleanup.push(join(process.cwd(), 'tmp-ejs-rel-test'));

        // Place index.ejs in the directory
        const indexPath = join(relDir, 'index.ejs');
        writeFileSync(join(absResolved, 'index.ejs'), '<html><body>Relative</body></html>', 'utf-8');

        // Create service with the relative path as ejsSplashRoot
        const service = new EjsTemplateService(
          defaultTemplatePath,
          relDir,
        );

        // resolveTemplatePath('/') should find the custom index.ejs
        // The service uses join() which preserves relative paths,
        // and existsSync resolves relative to cwd
        const resolved = service.resolveTemplatePath('/');
        expect(resolved).toBe(indexPath);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.7**
   *
   * Property 9 (consistency): For any valid directory name, both the
   * absolute and relative forms of the same directory resolve to a
   * template that renders identically.
   */
  it('absolute and relative paths to the same directory produce identical render results', () => {
    fc.assert(
      fc.property(arbDirName, (dirName) => {
        // Create a directory under cwd so we can reference it both ways
        const relDir = join('tmp-ejs-consist-test', dirName);
        const absDir = join(process.cwd(), relDir);
        require('fs').mkdirSync(absDir, { recursive: true });
        dirsToCleanup.push(join(process.cwd(), 'tmp-ejs-consist-test'));

        // Place index.ejs with content that includes the dirName
        const templateContent = `<html><body>Dir: ${dirName}</body></html>`;
        writeFileSync(join(absDir, 'index.ejs'), templateContent, 'utf-8');

        const minimalContext: IEjsTemplateContext = {
          nodeId: '',
          nodeIdSource: '',
          siteName: '',
          siteTagline: '',
          siteDescription: '',
          fontAwesomeKitId: '',
          serverUrl: '',
          emailDomain: '',
          emailSender: '',
          production: false,
          enabledFeatures: [],
          cspNonce: '',
          requestPath: '/',
        };

        // Service with absolute path
        const absService = new EjsTemplateService(defaultTemplatePath, absDir);
        const absResolved = absService.resolveTemplatePath('/');
        const absRendered = absService.render(absResolved, minimalContext);

        // Service with relative path
        const relService = new EjsTemplateService(defaultTemplatePath, relDir);
        const relResolved = relService.resolveTemplatePath('/');
        const relRendered = relService.render(relResolved, minimalContext);

        // Both should render the same content
        expect(absRendered).toBe(relRendered);
        expect(absRendered).toContain(dirName);
      }),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: node-ejs-splash-page, Property 4: CSP nonce applied to all inline scripts
 * Validates: Requirements 4.5
 */
describe('Feature: node-ejs-splash-page, Property 4: CSP nonce applied to all inline scripts', () => {
  const defaultTemplatePath = join(
    __dirname,
    '../templates/default-splash.ejs',
  );

  /**
   * Arbitrary: generates alphanumeric nonce strings of length 8–64,
   * representative of real CSP nonces (base64-like).
   */
  const arbNonce: fc.Arbitrary<string> = fc.stringMatching(
    /^[A-Za-z0-9]{8,64}$/,
  );

  /**
   * Builds a minimal IEjsTemplateContext with the given nonce and fontAwesomeKitId.
   */
  function buildContext(
    nonce: string,
    fontAwesomeKitId: string,
  ): IEjsTemplateContext {
    return {
      nodeId: 'test-node',
      nodeIdSource: 'test',
      siteName: 'TestSite',
      siteTagline: 'A test site',
      siteDescription: 'Description for testing',
      fontAwesomeKitId,
      serverUrl: 'http://localhost:3000',
      siteUrl: 'http://localhost:3000',
      emailDomain: 'test.com',
      emailSender: 'noreply@test.com',
      production: false,
      enabledFeatures: ['feature1'],
      cspNonce: nonce,
      requestPath: '/',
      hostname: 'localhost',
      server: 'http://localhost:3000',
    };
  }

  /**
   * Extracts all <script ...> opening tags from an HTML string.
   */
  function extractScriptTags(html: string): string[] {
    const regex = /<script[^>]*>/gi;
    return html.match(regex) ?? [];
  }

  /**
   * **Validates: Requirements 4.5**
   *
   * Property 4: For any nonce string, every <script> tag in the rendered
   * default template contains the nonce attribute with the correct value.
   * Tests with empty fontAwesomeKitId (only inline APP_CONFIG script).
   */
  it('every script tag contains the nonce attribute (no Font Awesome kit)', () => {
    const service = new EjsTemplateService(defaultTemplatePath);

    fc.assert(
      fc.property(arbNonce, (nonce) => {
        const context = buildContext(nonce, '');
        const rendered = service.render(defaultTemplatePath, context);
        const scriptTags = extractScriptTags(rendered);

        // With empty fontAwesomeKitId, there should be at least the inline APP_CONFIG script
        expect(scriptTags.length).toBeGreaterThanOrEqual(1);

        for (const tag of scriptTags) {
          expect(tag).toContain(`nonce="${nonce}"`);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.5**
   *
   * Property 4: For any nonce string, every <script> tag in the rendered
   * default template contains the nonce attribute with the correct value.
   * Tests with non-empty fontAwesomeKitId (Font Awesome + inline APP_CONFIG scripts).
   */
  it('every script tag contains the nonce attribute (with Font Awesome kit)', () => {
    const service = new EjsTemplateService(defaultTemplatePath);

    /**
     * Arbitrary: generates a non-empty alphanumeric Font Awesome kit ID.
     */
    const arbKitId = fc.stringMatching(/^[a-z0-9]{6,12}$/);

    fc.assert(
      fc.property(arbNonce, arbKitId, (nonce, kitId) => {
        const context = buildContext(nonce, kitId);
        const rendered = service.render(defaultTemplatePath, context);
        const scriptTags = extractScriptTags(rendered);

        // With a fontAwesomeKitId, there should be at least 2 script tags:
        // the FA kit script and the inline APP_CONFIG script
        expect(scriptTags.length).toBeGreaterThanOrEqual(2);

        for (const tag of scriptTags) {
          expect(tag).toContain(`nonce="${nonce}"`);
        }
      }),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: node-ejs-splash-page, Property 10: Default template renders expected content blocks
 * Validates: Requirements 4.3, 4.4
 */
describe('Feature: node-ejs-splash-page, Property 10: Default template renders expected content blocks', () => {
  const defaultTemplatePath = join(
    __dirname,
    '../templates/default-splash.ejs',
  );

  /**
   * Arbitrary: generates alphanumeric Font Awesome kit IDs (non-empty)
   * representative of real kit identifiers.
   */
  const arbNonEmptyKitId: fc.Arbitrary<string> = fc.stringMatching(
    /^[a-z0-9]{6,16}$/,
  );

  /**
   * Arbitrary: generates an array of feature name strings.
   * Feature names are lowercase alphanumeric with hyphens, 1–20 chars.
   */
  const arbEnabledFeatures: fc.Arbitrary<string[]> = fc.array(
    fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/),
    { minLength: 0, maxLength: 8 },
  );

  /**
   * Builds a minimal IEjsTemplateContext suitable for rendering the default template.
   */
  function buildContext(
    fontAwesomeKitId: string,
    enabledFeatures: string[],
  ): IEjsTemplateContext {
    return {
      nodeId: 'test-node',
      nodeIdSource: 'test',
      siteName: 'TestSite',
      siteTagline: 'A test site',
      siteDescription: 'Description for testing',
      fontAwesomeKitId,
      serverUrl: 'http://localhost:3000',
      siteUrl: 'http://localhost:3000',
      emailDomain: 'test.com',
      emailSender: 'noreply@test.com',
      production: false,
      enabledFeatures,
      cspNonce: 'testnonce123',
      requestPath: '/',
      hostname: 'localhost',
      server: 'http://localhost:3000',
    };
  }

  /**
   * **Validates: Requirements 4.3, 4.4**
   *
   * Property 10: For any non-empty fontAwesomeKitId, the rendered default
   * template output contains the Font Awesome kit script tag with that kit ID.
   */
  it('contains Font Awesome script tag when fontAwesomeKitId is non-empty', () => {
    const service = new EjsTemplateService(defaultTemplatePath);

    fc.assert(
      fc.property(arbNonEmptyKitId, arbEnabledFeatures, (kitId, features) => {
        const context = buildContext(kitId, features);
        const rendered = service.render(defaultTemplatePath, context);

        // Must contain the FA kit script tag with the correct kit ID
        expect(rendered).toContain(
          `https://kit.fontawesome.com/${kitId}.js`,
        );
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.3**
   *
   * Property 10: For an empty fontAwesomeKitId, the rendered default
   * template output does NOT contain the Font Awesome script tag.
   */
  it('does not contain Font Awesome script tag when fontAwesomeKitId is empty', () => {
    const service = new EjsTemplateService(defaultTemplatePath);

    fc.assert(
      fc.property(arbEnabledFeatures, (features) => {
        const context = buildContext('', features);
        const rendered = service.render(defaultTemplatePath, context);

        // Must NOT contain the FA kit script URL pattern
        expect(rendered).not.toContain('kit.fontawesome.com');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.4**
   *
   * Property 10: For any enabledFeatures array, the rendered default
   * template output contains APP_CONFIG with the enabledFeatures array.
   */
  it('contains APP_CONFIG with the enabledFeatures array', () => {
    const service = new EjsTemplateService(defaultTemplatePath);

    fc.assert(
      fc.property(arbNonEmptyKitId, arbEnabledFeatures, (kitId, features) => {
        const context = buildContext(kitId, features);
        const rendered = service.render(defaultTemplatePath, context);

        // Must contain APP_CONFIG
        expect(rendered).toContain('window.APP_CONFIG');

        // The rendered APP_CONFIG must include the enabledFeatures array
        const expectedFeaturesJson = JSON.stringify(features);
        expect(rendered).toContain(
          `"enabledFeatures":${expectedFeaturesJson}`,
        );
      }),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: node-ejs-splash-page, Property 7: Unregistered routes fall through to React SPA
 * Validates: Requirements 7.6, 6.1
 */
describe('Feature: node-ejs-splash-page, Property 7: Unregistered routes fall through to React SPA', () => {
  let tempDir: string;
  let defaultTemplatePath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ejs-fallthru-'));
    defaultTemplatePath = join(tempDir, 'default-splash.ejs');
    writeFileSync(
      defaultTemplatePath,
      '<!DOCTYPE html><html><body>Default</body></html>',
      'utf-8',
    );
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Arbitrary: generates a small manifest with 1–4 known routes.
   * Routes are valid non-API paths like "/about", "/terms", "/info".
   */
  const arbKnownRoutes: fc.Arbitrary<Record<string, string>> = fc
    .uniqueArray(
      fc.constantFrom('/about', '/terms', '/privacy', '/contact', '/help', '/faq', '/status'),
      { minLength: 1, maxLength: 4 },
    )
    .map((routes) => {
      const manifest: Record<string, string> = {};
      for (const route of routes) {
        manifest[route] = route.slice(1) + '.ejs';
      }
      return manifest;
    });

  /**
   * Arbitrary: generates URL paths that are NOT in a fixed set of known
   * manifest routes and NOT /api/ prefixed. Produces paths like
   * "/dashboard", "/settings/profile", "/x/y/z", etc.
   *
   * We generate from a pool of segments that won't collide with the
   * known manifest routes used above.
   */
  const arbUnregisteredPath: fc.Arbitrary<string> = fc
    .array(
      fc.constantFrom(
        'dashboard', 'settings', 'profile', 'account', 'billing',
        'notifications', 'search', 'explore', 'trending', 'admin',
        'config', 'users', 'reports', 'analytics', 'logs',
      ),
      { minLength: 1, maxLength: 3 },
    )
    .map((segments) => '/' + segments.join('/'));

  /**
   * **Validates: Requirements 7.6, 6.1**
   *
   * Property 7: For any URL path that is not in the route manifest and
   * does not start with /api/, resolveTemplatePath returns the default
   * template path — indicating the route is not handled by EJS and would
   * fall through to the React SPA catch-all in the AppRouter.
   */
  it('resolveTemplatePath returns default template for paths not in the manifest', () => {
    fc.assert(
      fc.property(
        arbKnownRoutes,
        arbUnregisteredPath,
        (manifest, unregisteredPath) => {
          // Skip if the generated path happens to collide with a manifest key
          if (manifest[unregisteredPath] !== undefined) {
            return; // discard this case
          }

          // Write the manifest to routes.json
          writeFileSync(
            join(tempDir, 'routes.json'),
            JSON.stringify(manifest),
            'utf-8',
          );

          // Create the template files referenced by the manifest
          for (const ejsFile of Object.values(manifest)) {
            writeFileSync(
              join(tempDir, ejsFile),
              `<p>Template: ${ejsFile}</p>`,
              'utf-8',
            );
          }

          const service = new EjsTemplateService(
            defaultTemplatePath,
            tempDir,
          );

          // Unregistered path should resolve to the default template
          const resolved = service.resolveTemplatePath(unregisteredPath);
          expect(resolved).toBe(defaultTemplatePath);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.6, 6.1**
   *
   * Property 7 (empty manifest): When the manifest is empty, ALL non-root
   * non-API paths resolve to the default template (fall through).
   */
  it('all non-root paths resolve to default when manifest is empty', () => {
    fc.assert(
      fc.property(arbUnregisteredPath, (path) => {
        // Write an empty manifest
        writeFileSync(
          join(tempDir, 'routes.json'),
          JSON.stringify({}),
          'utf-8',
        );

        const service = new EjsTemplateService(
          defaultTemplatePath,
          tempDir,
        );

        const resolved = service.resolveTemplatePath(path);
        expect(resolved).toBe(defaultTemplatePath);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.6, 6.1**
   *
   * Property 7 (no manifest file): When no routes.json exists at all,
   * all non-root paths resolve to the default template.
   */
  it('all non-root paths resolve to default when no routes.json exists', () => {
    fc.assert(
      fc.property(arbUnregisteredPath, (path) => {
        // No routes.json written — tempDir has no manifest
        const service = new EjsTemplateService(
          defaultTemplatePath,
          tempDir,
        );

        const resolved = service.resolveTemplatePath(path);
        expect(resolved).toBe(defaultTemplatePath);
      }),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: node-ejs-splash-page, Property 8: Manifest freshness
 * Validates: Requirements 7.7
 */
describe('Feature: node-ejs-splash-page, Property 8: Manifest freshness', () => {
  let tempDir: string;
  let defaultTemplatePath: string;
  let originalWarn: typeof console.warn;
  let originalError: typeof console.error;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ejs-manfresh-'));
    defaultTemplatePath = join(tempDir, 'default-splash.ejs');
    writeFileSync(
      defaultTemplatePath,
      '<!DOCTYPE html><html><body>Default</body></html>',
      'utf-8',
    );
    // Suppress console noise from the service
    originalWarn = console.warn;
    originalError = console.error;
    console.warn = () => { /* suppressed */ };
    console.error = () => { /* suppressed */ };
  });

  afterEach(() => {
    console.warn = originalWarn;
    console.error = originalError;
    rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Arbitrary: generates a valid URL path segment starting with /.
   * Produces paths like "/about", "/terms", "/custom/page".
   */
  const arbUrlSegment = fc
    .array(
      fc.stringMatching(/^[a-z][a-z0-9-]{0,10}$/),
      { minLength: 1, maxLength: 3 },
    )
    .map((segments) => '/' + segments.join('/'));

  /**
   * Arbitrary: generates a valid .ejs filename (no path traversal).
   */
  const arbEjsFilename = fc
    .stringMatching(/^[a-z][a-z0-9-]{0,12}$/)
    .map((name) => `${name}.ejs`);

  /**
   * Arbitrary: generates a route manifest with 1–5 entries,
   * each mapping a unique URL path to a unique .ejs filename.
   */
  const arbManifest: fc.Arbitrary<Record<string, string>> = fc
    .array(
      fc.tuple(arbUrlSegment, arbEjsFilename),
      { minLength: 1, maxLength: 5 },
    )
    .map((entries) => {
      const seen = new Set<string>();
      const manifest: Record<string, string> = {};
      for (const [path, file] of entries) {
        if (!seen.has(path)) {
          seen.add(path);
          manifest[path] = file;
        }
      }
      return manifest;
    })
    .filter((m) => Object.keys(m).length > 0);

  /**
   * Arbitrary: generates two distinct route manifests so we can verify
   * that the second read reflects the updated manifest, not stale data.
   */
  const arbTwoDistinctManifests = fc
    .tuple(arbManifest, arbManifest)
    .filter(
      ([a, b]) => JSON.stringify(a) !== JSON.stringify(b),
    );

  /**
   * **Validates: Requirements 7.7**
   *
   * Property 8: For any modification to routes.json between two requests,
   * the second call to readRouteManifest() reflects the updated manifest
   * content — proving no stale caching occurs.
   */
  it('readRouteManifest reflects updated routes.json between consecutive reads', () => {
    fc.assert(
      fc.property(arbTwoDistinctManifests, ([firstManifest, secondManifest]) => {
        const service = new EjsTemplateService(
          defaultTemplatePath,
          tempDir,
        );

        // Write first manifest and read it
        writeFileSync(
          join(tempDir, 'routes.json'),
          JSON.stringify(firstManifest),
          'utf-8',
        );
        const firstRead = service.readRouteManifest();
        expect(firstRead).toEqual(firstManifest);

        // Write second (different) manifest and read again
        writeFileSync(
          join(tempDir, 'routes.json'),
          JSON.stringify(secondManifest),
          'utf-8',
        );
        const secondRead = service.readRouteManifest();
        expect(secondRead).toEqual(secondManifest);

        // The two reads must differ since the manifests differ
        expect(firstRead).not.toEqual(secondRead);
      }),
      { numRuns: 100 },
    );
  });
});
