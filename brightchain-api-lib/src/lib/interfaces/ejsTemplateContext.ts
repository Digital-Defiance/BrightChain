/**
 * Context object passed to EJS templates during rendering.
 * Contains all template variables available to splash page and
 * manifest-routed EJS pages.
 *
 * The index signature allows forwarding any additional properties
 * from BrightChainIndexLocals without requiring interface changes.
 */
export interface IEjsTemplateContext {
  // Node identity
  nodeId: string;
  nodeIdSource: string;

  // Branding
  siteName: string;
  siteTagline: string;
  siteDescription: string;
  fontAwesomeKitId: string;

  // Environment
  serverUrl: string;
  emailDomain: string;
  emailSender: string;
  production: boolean;

  // Features
  enabledFeatures: string[];

  // CSP
  cspNonce: string;

  // Request
  requestPath: string;

  // All BrightChainIndexLocals properties (spread)
  [key: string]: unknown;
}

/**
 * Route manifest mapping URL paths to relative `.ejs` template filenames
 * within the EJS_SPLASH_ROOT directory.
 *
 * Example:
 * ```json
 * {
 *   "/about": "about.ejs",
 *   "/terms": "legal/terms.ejs"
 * }
 * ```
 */
export interface IRouteManifest {
  [urlPath: string]: string;
}
