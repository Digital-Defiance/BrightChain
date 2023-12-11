# Requirements Document

## Introduction

This feature introduces EJS templating for the BrightChain node splash/index page, replacing the current string-replacement approach with a full template engine. Node operators gain the ability to customize the splash page by pointing an environment variable (`EJS_SPLASH_ROOT`) at a directory containing their own EJS templates, partials, and includes — all outside the committed source tree, without forking or modifying the core repository. A rich set of template variables (node identity, environment, branding, enabled features, etc.) is exposed to the template. When no custom template root is configured or the expected `index.ejs` is missing, the system falls back to a bundled default template that replicates the current stock page behavior.

Beyond the splash page, the system supports multi-page EJS routing via a manually maintained route manifest (`routes.json`) in the EJS_Splash_Root directory. Node operators explicitly register which URL paths map to which `.ejs` template filenames (e.g., `"/about": "about.ejs"`, `"/terms": "legal/terms.ejs"`). The root route (`/` → `index.ejs`) is served by default even without a manifest for backward compatibility. EJS pages act as opt-in overrides — if a route is registered in the manifest, the EJS page is served; otherwise the request falls through to the React SPA. API routes always take priority over EJS routes and are never overridable by templates. All registered EJS pages receive the same rich set of Template_Variables as the splash page. Node operators can add or remove route registrations by editing the manifest without restarting the server.

## Glossary

- **Splash_Page**: The HTML index page served at the root URL of a BrightChain node, rendered via EJS templating
- **Template_Engine**: The EJS rendering subsystem integrated into the AppRouter that compiles and renders `.ejs` template files
- **Template_Variables**: The collection of runtime values (node info, branding, environment, features) passed to the EJS template as the data context
- **EJS_Splash_Root**: A directory path, configured via the `EJS_SPLASH_ROOT` environment variable, pointing to a node operator's custom EJS template root directory containing `index.ejs` and any partials or includes
- **Custom_Template_Path**: (Deprecated in favor of EJS_Splash_Root) A file system path pointing to a single custom EJS template file; retained for backward compatibility
- **Default_Template**: The bundled EJS template shipped with the application that replicates the current stock splash page behavior
- **Node_Operator**: A person who runs a BrightChain node and may wish to customize its splash page
- **AppRouter**: The BrightChain application router class (`brightchain-api-lib/src/lib/routers/app.ts`) that extends the upstream AppRouter and handles index page serving
- **Environment**: The configuration class (`brightchain-api-lib/src/lib/environment.ts`) that reads `.env` files and exposes typed configuration properties
- **Route_Manifest**: A JSON configuration file (`routes.json`) located in the EJS_Splash_Root directory that maps URL paths to `.ejs` template filenames; used by the AppRouter to determine which routes are served as EJS pages

## Requirements

### Requirement 1: EJS Engine Integration

**User Story:** As a developer, I want the API server to use EJS as a template engine for the splash page, so that dynamic content can be rendered using standard template syntax instead of fragile string replacements.

#### Acceptance Criteria

1. THE Template_Engine SHALL render the splash page using the EJS templating library
2. WHEN a request for the root URL is received, THE AppRouter SHALL render the splash page template via EJS and return the resulting HTML with a 200 status code
3. THE Template_Engine SHALL support standard EJS syntax including output tags (`<%= %>`), unescaped output tags (`<%- %>`), and control flow tags (`<% %>`)
4. WHEN the EJS rendering encounters a syntax error in the template, THE Template_Engine SHALL log the error and return a 500 response with a generic error message

### Requirement 2: Template Variable Exposure

**User Story:** As a node operator, I want a rich set of variables available in the splash page template, so that I can display node identity, branding, environment info, and enabled features without needing access to the source code.

#### Acceptance Criteria

1. THE Template_Engine SHALL expose the following node identity variables to the template: nodeId, nodeIdSource
2. THE Template_Engine SHALL expose the following branding variables to the template: siteName, siteTagline, siteDescription, fontAwesomeKitId
3. THE Template_Engine SHALL expose the following environment variables to the template: serverUrl, emailDomain, emailSender, production (boolean indicating production mode)
4. THE Template_Engine SHALL expose the following feature variables to the template: enabledFeatures (array of enabled BrightChain feature identifiers)
5. THE Template_Engine SHALL expose a cspNonce variable to the template for use in inline script and style tags
6. THE Template_Engine SHALL expose a request-derived variable for the current request URL path
7. WHEN new variables are added to the BrightChainIndexLocals interface, THE Template_Engine SHALL pass all BrightChainIndexLocals properties to the template context

### Requirement 3: Custom Template Root Configuration

**User Story:** As a node operator, I want to specify a root directory for my custom EJS templates via an environment variable, so that I can organize templates, partials, and includes in a proper working directory without modifying committed source files.

#### Acceptance Criteria

1. THE Environment SHALL support an `EJS_SPLASH_ROOT` environment variable that specifies the file system path to a directory containing the operator's custom EJS templates
2. WHEN `EJS_SPLASH_ROOT` is set and the directory contains an `index.ejs` file, THE Template_Engine SHALL use that `index.ejs` as the splash page template
3. WHEN `EJS_SPLASH_ROOT` is set but the directory does not contain an `index.ejs` file, THE Template_Engine SHALL log a warning and fall back to the Default_Template
4. WHEN `EJS_SPLASH_ROOT` is set but the directory does not exist, THE Template_Engine SHALL log a warning and fall back to the Default_Template
5. WHEN `EJS_SPLASH_ROOT` is not set, THE Template_Engine SHALL use the Default_Template
6. THE Template_Engine SHALL configure the EJS `views` option to include the EJS_Splash_Root directory, enabling EJS includes and partials relative to that root
7. THE EJS_Splash_Root SHALL accept absolute paths and paths relative to the process working directory
8. WHEN both `EJS_SPLASH_ROOT` and the deprecated `SPLASH_TEMPLATE_PATH` are set, THE Environment SHALL prefer `EJS_SPLASH_ROOT` and log a deprecation warning for `SPLASH_TEMPLATE_PATH`
9. WHEN only `SPLASH_TEMPLATE_PATH` is set (without `EJS_SPLASH_ROOT`), THE Template_Engine SHALL treat it as a direct path to a single template file for backward compatibility

### Requirement 4: Default Template

**User Story:** As a developer, I want a bundled default EJS template that replicates the current stock splash page, so that the system works out of the box without requiring any custom template configuration.

#### Acceptance Criteria

1. THE Default_Template SHALL produce HTML output equivalent to the current stock index page when rendered with the standard Template_Variables
2. THE Default_Template SHALL be located within the `brightchain-api-lib` package source tree so it is included in builds
3. THE Default_Template SHALL include the Font Awesome kit script tag when fontAwesomeKitId is provided
4. THE Default_Template SHALL include the APP_CONFIG script block with enabled features and site URL
5. THE Default_Template SHALL apply the CSP nonce to all inline script tags
6. THE Default_Template SHALL serve as a reference example for node operators creating custom templates

### Requirement 5: Fallback Behavior

**User Story:** As a node operator, I want the system to gracefully fall back to the default template if my custom template is missing or invalid, so that the node remains operational even if my customization has issues.

#### Acceptance Criteria

1. IF the custom template file (`index.ejs` in EJS_Splash_Root) is deleted after server startup, THEN THE Template_Engine SHALL detect the missing file on the next request and fall back to the Default_Template
2. IF the custom template contains an EJS syntax error, THEN THE Template_Engine SHALL log the error, fall back to the Default_Template, and serve the page successfully
3. WHEN falling back to the Default_Template due to a custom template error, THE Template_Engine SHALL log a warning message identifying the EJS_Splash_Root path and the nature of the failure
4. THE Template_Engine SHALL not cache the custom template indefinitely, allowing operators to update templates in the EJS_Splash_Root directory without restarting the server

### Requirement 6: Backward Compatibility

**User Story:** As a developer, I want the EJS templating to coexist with the existing React app serving, so that the single-page application continues to function correctly for all non-root routes.

#### Acceptance Criteria

1. THE AppRouter SHALL continue to serve the React application's static assets from the React dist directory for all routes not registered in the Route_Manifest
2. THE AppRouter SHALL render the EJS splash page for the root URL path (`/`) and render registered EJS pages for any additional routes defined in the Route_Manifest
3. WHEN the EJS splash page feature is active, THE AppRouter SHALL preserve all existing API route handling without modification
4. THE Template_Engine SHALL not interfere with the Content Security Policy headers already configured by the Middlewares class


### Requirement 7: Multi-Page EJS Route Registration

**User Story:** As a node operator, I want to register additional EJS pages via a manifest file in my EJS_Splash_Root directory, so that I can serve custom pages at specific URL paths without modifying the application source code.

#### Acceptance Criteria

1. WHEN a `routes.json` file exists in the EJS_Splash_Root directory, THE AppRouter SHALL read it and register the declared route-to-template mappings
2. THE Route_Manifest SHALL be a JSON object where keys are URL path strings (e.g., `"/about"`, `"/terms"`) and values are relative `.ejs` template filenames within the EJS_Splash_Root directory (e.g., `"about.ejs"`, `"legal/terms.ejs"`)
3. WHEN no Route_Manifest file exists in the EJS_Splash_Root directory, THE AppRouter SHALL serve only the root route (`/` → `index.ejs`) as the default behavior
4. WHEN a request matches a route registered in the Route_Manifest, THE Template_Engine SHALL render the corresponding `.ejs` template with the full set of Template_Variables
5. WHEN a request matches both an API route and a Route_Manifest entry, THE AppRouter SHALL serve the API route and ignore the Route_Manifest entry
6. WHEN a request does not match any API route or Route_Manifest entry, THE AppRouter SHALL fall through to the React SPA handler
7. THE Template_Engine SHALL re-read the Route_Manifest on each request (or use a file-watcher invalidation strategy) so that operators can add or remove route registrations without restarting the server
8. IF the Route_Manifest contains a mapping to a `.ejs` file that does not exist in the EJS_Splash_Root directory, THEN THE Template_Engine SHALL log a warning and return a 404 response for that route
9. IF the Route_Manifest file contains invalid JSON, THEN THE AppRouter SHALL log an error and fall back to serving only the default root route (`/` → `index.ejs`)
10. THE Route_Manifest SHALL not permit registration of routes that conflict with known API route prefixes (e.g., `/api/`)
11. WHEN the root route (`/`) is explicitly declared in the Route_Manifest mapping to a template other than `index.ejs`, THE AppRouter SHALL use the manifest-specified template for the root route
