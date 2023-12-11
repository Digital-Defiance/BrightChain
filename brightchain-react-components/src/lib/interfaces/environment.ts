export interface IEnvironment {
  production: boolean;
  debugI18n: boolean;
  serverUrl: string;
  apiUrl: string;
  emailDomain: string;
  enabledFeatures: string[];
  gtag?: string;
  /**
   * When true, force-enables Google Analytics outside production builds.
   * Sourced from the `VITE_GA_FORCE` environment variable at build time.
   */
  gaForce?: boolean;
  brightHubFontAwesomeMaxDisplay?: number;
  brightHubFontAwesomeIconGridSize?: number;
  brightChatFontAwesomeMaxDisplay?: number;
  brightChatFontAwesomeIconGridSize?: number;
}
