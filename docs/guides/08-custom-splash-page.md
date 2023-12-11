---
title: "Custom Splash Page (EJS Templates)"
parent: "Guides"
nav_order: 8
permalink: /guides/08-custom-splash-page/
---
# Custom Splash Page (EJS Templates)

BrightChain nodes serve a splash page at the root URL (`/`). By default this is a stock page showing your node's branding and enabled features. As a node operator you can replace it — and add additional pages — using [EJS](https://ejs.co/) templates, without modifying the BrightChain source code.

## Quick Start

1. Create a directory for your templates (anywhere on disk):

   ```bash
   mkdir -p /opt/brightchain/templates
   ```

2. Add an `index.ejs` file:

   ```ejs
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="utf-8" />
     <title><%= siteName %></title>
     <meta name="description" content="<%= siteDescription %>" />
     <meta name="viewport" content="width=device-width, initial-scale=1" />
     <script nonce="<%= cspNonce %>">
       window.APP_CONFIG = <%- JSON.stringify({
         apiUrl: serverUrl + '/api',
         enabledFeatures: enabledFeatures
       }) %>;
     </script>
   </head>
   <body>
     <h1>Welcome to <%= siteName %></h1>
     <p><%= siteTagline %></p>
     <div id="root"></div>
   </body>
   </html>
   ```

3. Set the environment variable and restart your node:

   ```bash
   EJS_SPLASH_ROOT=/opt/brightchain/templates
   ```

That's it. Your custom `index.ejs` is now served at `/`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EJS_SPLASH_ROOT` | No | Absolute or relative path to a directory containing your EJS templates. When set, the engine looks for `index.ejs` in this directory for the root route. |
| `SPLASH_TEMPLATE_PATH` | No | **Deprecated.** Direct path to a single template file. Retained for backward compatibility. If both are set, `EJS_SPLASH_ROOT` takes precedence and a deprecation warning is logged. |

Paths can be absolute (`/opt/brightchain/templates`) or relative to the process working directory (`./my-templates`).

## Template Variables

Every EJS page receives the full set of template variables as top-level locals. You can use them directly — no object prefix needed.

### Node Identity

| Variable | Type | Description |
|----------|------|-------------|
| `nodeId` | `string` | This node's GuidV4 identifier |
| `nodeIdSource` | `string` | How the node ID was determined (e.g. `"env"`, `"generated"`) |

### Branding

| Variable | Type | Description |
|----------|------|-------------|
| `siteName` | `string` | The site title (from `Constants.Site`) |
| `siteTagline` | `string` | Short tagline |
| `siteDescription` | `string` | Longer description, suitable for `<meta name="description">` |
| `fontAwesomeKitId` | `string` | Font Awesome kit ID; empty string if not configured |

### Environment

| Variable | Type | Description |
|----------|------|-------------|
| `serverUrl` | `string` | The node's public URL (e.g. `https://my-node.example.com:3000`) |
| `siteUrl` | `string` | Alias for `serverUrl` |
| `emailDomain` | `string` | Email domain for this node |
| `emailSender` | `string` | Default sender address |
| `production` | `boolean` | `true` when running in production mode |

### Features

| Variable | Type | Description |
|----------|------|-------------|
| `enabledFeatures` | `string[]` | Array of enabled feature identifiers (e.g. `["BrightChat", "BrightPass"]`) |

### Security

| Variable | Type | Description |
|----------|------|-------------|
| `cspNonce` | `string` | A per-request nonce for Content Security Policy. **You must add this to every inline `<script>` tag** — see [CSP Nonce](#csp-nonce) below. |

### Request

| Variable | Type | Description |
|----------|------|-------------|
| `requestPath` | `string` | The URL path of the current request (e.g. `/`, `/about`) |

### Vite Bundle Tags

| Variable | Type | Description |
|----------|------|-------------|
| `headAssets` | `string` | Pre-built `<link>` and `<script type="module">` tags from the React app's Vite build. Use `<%- headAssets %>` (unescaped) in your `<head>` to include the React SPA bundle. |
| `bodyScripts` | `string` | Additional script tags for the `<body>`, if any. |

If you want the React SPA to load inside your custom page (e.g. in a `<div id="root">`), include `<%- headAssets %>` in your `<head>` and `<%- bodyScripts %>` before `</body>`.

## EJS Syntax Primer

BrightChain uses standard [EJS syntax](https://ejs.co/#docs):

| Tag | Purpose | Example |
|-----|---------|---------|
| `<%= expr %>` | Output (HTML-escaped) | `<title><%= siteName %></title>` |
| `<%- expr %>` | Output (unescaped / raw HTML) | `<%- headAssets %>` |
| `<% code %>` | Control flow (no output) | `<% if (production) { %> ... <% } %>` |

### Common Patterns

Conditional Font Awesome:

```ejs
<% if (fontAwesomeKitId) { %>
  <script nonce="<%= cspNonce %>" src="https://kit.fontawesome.com/<%= fontAwesomeKitId %>.js"
          crossorigin="anonymous"></script>
<% } %>
```

Feature flags:

```ejs
<% if (enabledFeatures.includes('BrightChat')) { %>
  <a href="/chat">Open BrightChat</a>
<% } %>
```

Iterating features:

```ejs
<ul>
<% enabledFeatures.forEach(function(feature) { %>
  <li><%= feature %></li>
<% }); %>
</ul>
```

## CSP Nonce

BrightChain enforces a Content Security Policy. Every inline `<script>` tag in your template **must** include the nonce attribute, or the browser will block it:

```ejs
<script nonce="<%= cspNonce %>">
  // your inline JS here
</script>
```

External scripts loaded via `src` don't need the nonce (they're covered by the CSP `script-src` directive), but the Font Awesome kit script is an exception — include the nonce there too since it injects inline code.

## Multi-Page Routing with routes.json

Beyond the root splash page, you can serve additional EJS pages at custom URL paths using a route manifest.

### Setting Up the Manifest

Create a `routes.json` file in your `EJS_SPLASH_ROOT` directory:

```json
{
  "/about": "about.ejs",
  "/terms": "legal/terms.ejs",
  "/privacy": "legal/privacy.ejs",
  "/status": "status.ejs"
}
```

- **Keys** are URL paths (must start with `/`)
- **Values** are `.ejs` filenames relative to `EJS_SPLASH_ROOT`

Then create the corresponding template files:

```
/opt/brightchain/templates/
├── index.ejs
├── about.ejs
├── status.ejs
├── legal/
│   ├── terms.ejs
│   └── privacy.ejs
└── routes.json
```

Each manifest-routed page receives the same full set of [template variables](#template-variables).

### Manifest Rules

- The root route (`/` → `index.ejs`) is served automatically even without a manifest.
- If the manifest maps `/` to a different file (e.g. `"home.ejs"`), that mapping is honored.
- Routes starting with `/api/` are rejected — API routes always take priority.
- If a manifest entry points to a `.ejs` file that doesn't exist, that route returns a 404.
- Routes not in the manifest (and not `/`) fall through to the React SPA catch-all.

### Live Editing

The manifest is re-read on every request. You can add, remove, or change route mappings by editing `routes.json` — no server restart required.

## Includes and Partials

EJS supports `include()` for reusable template fragments. When `EJS_SPLASH_ROOT` is set, includes resolve relative to that directory:

```
/opt/brightchain/templates/
├── index.ejs
├── partials/
│   ├── header.ejs
│   └── footer.ejs
└── routes.json
```

In `index.ejs`:

```ejs
<%- include('partials/header') %>

<main>
  <h1>Welcome to <%= siteName %></h1>
</main>

<%- include('partials/footer') %>
```

Partials receive the same template variables as the parent template.

## Fallback Behavior

The system is designed to never break your node, even if your templates have issues:

| Scenario | What Happens |
|----------|-------------|
| `EJS_SPLASH_ROOT` not set | Default bundled template is served |
| `EJS_SPLASH_ROOT` directory doesn't exist | Warning logged, default template served |
| `index.ejs` missing from `EJS_SPLASH_ROOT` | Warning logged, default template served |
| Syntax error in your custom template | Error logged, default template served |
| `routes.json` has invalid JSON | Error logged, only root route (`/`) served |
| Manifest route points to missing `.ejs` file | 404 returned for that specific route |
| Custom template deleted while server is running | Detected on next request, falls back to default |

The default template is always the safety net. The only scenario that produces a 500 error is if the bundled default template itself is broken (which would indicate a build issue).

## Full Example

Here's a complete custom splash page that shows node info, enabled features, and loads the React SPA:

```ejs
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title><%= siteName %> — <%= siteTagline %></title>
  <meta name="description" content="<%= siteDescription %>" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />

<% if (fontAwesomeKitId) { %>
  <script nonce="<%= cspNonce %>"
          src="https://kit.fontawesome.com/<%= fontAwesomeKitId %>.js"
          crossorigin="anonymous"></script>
<% } %>

  <script nonce="<%= cspNonce %>">
    window.APP_CONFIG = <%- JSON.stringify({
      apiUrl: (siteUrl || serverUrl) + '/api',
      serverUrl: siteUrl || serverUrl,
      siteTitle: siteName,
      emailDomain: emailDomain,
      enabledFeatures: enabledFeatures
    }) %>;
  </script>

  <style nonce="<%= cspNonce %>">
    .splash-banner {
      text-align: center;
      padding: 2rem;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      color: #e0e0e0;
    }
    .splash-banner h1 { margin: 0; font-size: 2.5rem; }
    .splash-banner p { opacity: 0.8; }
    .features { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; padding: 1rem; }
    .feature-badge {
      background: #0f3460; color: #e0e0e0; padding: 0.5rem 1rem;
      border-radius: 4px; font-size: 0.9rem;
    }
  </style>

<%- headAssets %>
</head>
<body>
  <div class="splash-banner">
    <h1><%= siteName %></h1>
    <p><%= siteTagline %></p>
    <p>Node <code><%= nodeId %></code></p>
  </div>

<% if (enabledFeatures.length > 0) { %>
  <div class="features">
  <% enabledFeatures.forEach(function(f) { %>
    <span class="feature-badge"><%= f %></span>
  <% }); %>
  </div>
<% } %>

  <div id="root"></div>

<%- bodyScripts %>
</body>
</html>
```

## Adding to .env.production

Add the following to your `.env` or `.env.production` file:

```bash
# ─── Custom Splash Page (optional) ──────────────────────────────────────────
# Point to a directory containing your EJS templates (index.ejs, partials, routes.json)
# EJS_SPLASH_ROOT=/opt/brightchain/templates
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Custom template not showing | `EJS_SPLASH_ROOT` not set or path is wrong | Check the env var and verify the directory exists |
| Blank page | Template has a syntax error | Check server logs for EJS render errors |
| `<script>` tags blocked by browser | Missing `nonce` attribute | Add `nonce="<%= cspNonce %>"` to every inline `<script>` |
| React app not loading in custom page | Missing Vite bundle tags | Add `<%- headAssets %>` in `<head>` and `<%- bodyScripts %>` before `</body>` |
| Manifest route returns 404 | `.ejs` file missing from `EJS_SPLASH_ROOT` | Verify the file path in `routes.json` matches an actual file |
| Manifest changes not taking effect | N/A — manifest is re-read per request | If still stale, check you're editing the right `routes.json` |
| `/api/*` route overridden by manifest | Can't happen — API routes always win | API routes are mounted before EJS routes |

## Next Steps

- [Node Operator Guide](./02-node-operator-guide) — General node operations
- [Docker Node Setup](./docker-node-setup) — Running in Docker (mount your template directory as a volume)
