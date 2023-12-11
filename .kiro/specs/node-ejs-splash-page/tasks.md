# Implementation Plan: Node EJS Splash Page

## Overview

Implement EJS templating for the BrightChain splash page, replacing string-replacement with a proper template engine. The implementation adds an `EjsTemplateService`, extends the `Environment` and `IEnvironment` with new properties, creates a default template, and hooks into the `AppRouter` via `registerAdditionalRenderHooks()`. Multi-page routing is driven by a `routes.json` manifest in the operator's custom template directory.

## Tasks

- [x] 1. Add EJS dependency and create interfaces
  - [x] 1.1 Add `ejs` package to `brightchain-api-lib/package.json` dependencies
    - Run `yarn add ejs` in the `brightchain-api-lib` directory
    - Add `@types/ejs` as a devDependency at the workspace root
    - _Requirements: 1.1_

  - [x] 1.2 Create `IEjsTemplateContext` and `IRouteManifest` interfaces
    - Create `brightchain-api-lib/src/lib/interfaces/ejsTemplateContext.ts`
    - Define `IEjsTemplateContext` with all template variable fields: nodeId, nodeIdSource, siteName, siteTagline, siteDescription, fontAwesomeKitId, serverUrl, emailDomain, emailSender, production, enabledFeatures, cspNonce, requestPath, plus index signature
    - Define `IRouteManifest` as `{ [urlPath: string]: string }`
    - Export both interfaces
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 2. Extend Environment and IEnvironment
  - [x] 2.1 Add `ejsSplashRoot` and `splashTemplatePath` to `IEnvironment` interface
    - Edit `brightchain-api-lib/src/lib/interfaces/environment.ts`
    - Add `ejsSplashRoot: string | undefined` property with JSDoc
    - Add `splashTemplatePath: string | undefined` property with `@deprecated` JSDoc
    - _Requirements: 3.1, 3.8, 3.9_

  - [x] 2.2 Implement `ejsSplashRoot` and `splashTemplatePath` in `Environment` class
    - Edit `brightchain-api-lib/src/lib/environment.ts`
    - Read `EJS_SPLASH_ROOT` from env, store as private field
    - Read `SPLASH_TEMPLATE_PATH` from env, store as private field
    - When both are set, log deprecation warning for `SPLASH_TEMPLATE_PATH`
    - Support absolute paths and paths relative to `process.cwd()`
    - Add public getters for both properties
    - _Requirements: 3.1, 3.7, 3.8, 3.9_

  - [x] 2.3 Write unit tests for Environment EJS properties
    - Create test file `brightchain-api-lib/src/lib/environment.ejsSplash.spec.ts`
    - Test `EJS_SPLASH_ROOT` is read correctly
    - Test `SPLASH_TEMPLATE_PATH` backward compatibility
    - Test deprecation warning when both are set
    - Test relative and absolute path handling
    - _Requirements: 3.1, 3.7, 3.8, 3.9_

- [x] 3. Implement EjsTemplateService
  - [x] 3.1 Create `EjsTemplateService` class
    - Create `brightchain-api-lib/src/lib/services/ejsTemplateService.ts`
    - Implement constructor accepting `defaultTemplatePath`, optional `ejsSplashRoot`, optional `splashTemplatePath`
    - Implement `resolveTemplatePath(route: string): string` — resolves template file path with fallback to default
    - Implement `readRouteManifest(): IRouteManifest` — reads and parses `routes.json`, returns `{}` on failure
    - Implement `isValidEjsRoute(route: string): boolean` — rejects `/api/` prefixed routes
    - Implement `buildContext(locals, req): IEjsTemplateContext` — builds full template context
    - Implement `render(templatePath: string, context: IEjsTemplateContext): string` — renders EJS with fallback on error
    - No caching of custom templates (re-read per request)
    - _Requirements: 1.1, 1.3, 2.1–2.7, 3.2, 3.3, 3.4, 3.5, 3.6, 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 7.5, 7.7, 7.8, 7.9, 7.10_

  - [x] 3.2 Write property test: Template variable completeness (Property 1)
    - **Property 1: Template variable completeness**
    - For any valid IEjsTemplateContext built from arbitrary request/environment data, all properties are accessible as top-level EJS variables during rendering
    - Use `fast-check` to generate arbitrary context objects and verify all keys appear in rendered output
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

  - [x] 3.3 Write property test: Custom template freshness (Property 2)
    - **Property 2: Custom template freshness (no stale cache)**
    - For any custom template file, if content changes between requests, the second render reflects the update
    - Use temp files with `fast-check` generated content to verify no stale caching
    - **Validates: Requirements 5.4, 3.2**

  - [x] 3.4 Write property test: Syntax error fallback produces valid HTML (Property 3)
    - **Property 3: Syntax error fallback produces valid HTML**
    - For any EJS string containing a syntax error, rendering falls back to default template and produces valid HTML
    - Generate malformed EJS strings with `fast-check` and verify fallback produces HTML with `<!DOCTYPE` or `<html`
    - **Validates: Requirements 5.2, 1.4**

  - [x] 3.5 Write property test: Manifest route rendering correctness (Property 5)
    - **Property 5: Manifest route rendering correctness**
    - For any valid routes.json manifest and matching request, the correct template file is rendered with full variables
    - Generate manifest objects and verify correct template resolution
    - **Validates: Requirements 7.1, 7.2, 7.4, 7.11**

  - [x] 3.6 Write property test: API route priority over manifest routes (Property 6)
    - **Property 6: API route priority over manifest routes**
    - For any URL path matching `/api/` prefix, `isValidEjsRoute` returns false and the route is never registered
    - Generate paths with `/api/` prefix via `fast-check` and verify rejection
    - **Validates: Requirements 7.5, 7.10**

  - [x] 3.7 Write property test: Path resolution accepts absolute and relative paths (Property 9)
    - **Property 9: Path resolution accepts absolute and relative paths**
    - For any valid directory path (absolute or relative), template resolution correctly finds templates
    - Generate path variations and verify resolution
    - **Validates: Requirements 3.7**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create default template
  - [x] 5.1 Create the default splash EJS template
    - Create `brightchain-api-lib/src/lib/templates/default-splash.ejs`
    - Replicate current stock index page behavior using EJS syntax
    - Include Font Awesome kit `<script>` tag when `fontAwesomeKitId` is non-empty (with CSP nonce)
    - Include `APP_CONFIG` script block with `enabledFeatures` and `siteUrl`
    - Apply `cspNonce` to all inline `<script>` tags
    - Include `<title>` from `siteName`
    - Include meta description from `siteDescription`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.2 Write property test: CSP nonce applied to all inline scripts (Property 4)
    - **Property 4: CSP nonce applied to all inline scripts**
    - For any nonce string, every `<script>` tag in the rendered default template contains the nonce attribute
    - Generate arbitrary nonce strings and verify all script tags include `nonce="..."`
    - **Validates: Requirements 4.5**

  - [x] 5.3 Write property test: Default template renders expected content blocks (Property 10)
    - **Property 10: Default template renders expected content blocks**
    - For any fontAwesomeKitId and enabledFeatures array, the rendered output contains the FA script tag (when kitId non-empty) and APP_CONFIG with features
    - **Validates: Requirements 4.3, 4.4**

- [x] 6. Integrate into AppRouter
  - [x] 6.1 Override `registerAdditionalRenderHooks` in AppRouter
    - Edit `brightchain-api-lib/src/lib/routers/app.ts`
    - Import `EjsTemplateService` and `IEjsTemplateContext`
    - Override `registerAdditionalRenderHooks(app: Application): void`
    - Instantiate `EjsTemplateService` with default template path, `environment.ejsSplashRoot`, `environment.splashTemplatePath`
    - Register `app.get('/')` handler that builds context from `getIndexLocals()` + request, renders via EjsTemplateService, sends HTML response
    - Read route manifest and register each valid manifest route with the same handler pattern
    - Skip routes that fail `isValidEjsRoute()` with a warning log
    - Handle 404 for manifest routes pointing to nonexistent templates
    - _Requirements: 1.2, 6.2, 6.3, 7.1, 7.3, 7.4, 7.5, 7.6, 7.8, 7.9, 7.10, 7.11_

  - [x] 6.2 Write property test: Unregistered routes fall through to React SPA (Property 7)
    - **Property 7: Unregistered routes fall through to React SPA**
    - For any URL path not in the manifest and not `/api/`, the request is not handled by EJS routes
    - Generate arbitrary non-API, non-manifest paths and verify they are not matched
    - **Validates: Requirements 7.6, 6.1**

  - [x] 6.3 Write property test: Manifest freshness (Property 8)
    - **Property 8: Manifest freshness (re-read per request)**
    - For any modification to routes.json between requests, the second request reflects the updated manifest
    - Write manifest, read it, modify, read again, verify changes reflected
    - **Validates: Requirements 7.7**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Wire everything together and export
  - [x] 8.1 Update barrel exports
    - Export `EjsTemplateService`, `IEjsTemplateContext`, `IRouteManifest` from `brightchain-api-lib/src/lib/services/` barrel (create if needed)
    - Export interfaces from `brightchain-api-lib/src/lib/interfaces/` barrel
    - Ensure the default template file is included in the package build (add to `assets` in `project.json` if needed)
    - _Requirements: 4.2_

  - [x] 8.2 Write integration tests
    - Create `brightchain-api-lib/src/lib/routers/app.ejsSplash.spec.ts`
    - Test full request to `/` returns 200 with EJS-rendered HTML
    - Test API routes (`/api/*`) are unaffected
    - Test non-manifest routes fall through to React SPA catch-all
    - Test CSP headers remain intact on EJS responses
    - _Requirements: 1.2, 6.1, 6.3, 6.4_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–10)
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout; all implementation is in `brightchain-api-lib`
- Use `npx nx test brightchain-api-lib --testPathPatterns=<pattern>` to run specific tests
- Use `yarn` for package management (not pnpm)
