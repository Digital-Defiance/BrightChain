import { THEME_COLORS } from '@brightchain/brightchain-lib';
import {
  BrightChainSubLogo,
  LayoutShell,
  type BrandConfig,
  type SidebarConfig,
} from '@brightchain/brightchain-react-components';
import { BurnbagConstants } from '@brightchain/digitalburnbag-lib';
import { useTheme } from '@mui/material';
import type { ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';
import { BirdbagLogoGrey } from './BirdbagLogoGrey';

/**
 * Brand configuration for a domain.
 */
export interface DomainBrandConfig {
  /** The domain pattern used for matching */
  domain: string;
  /** Brand display name */
  name: string;
  /** Path to logo asset */
  logoSrc: string;
  /** Header/tagline text */
  headerText: string;
  /** Header logo optional */
  headerLogo?: ReactNode;
  /** MUI theme primary color */
  primaryColor: string;
  /** Default landing section (e.g., 'files', 'canary', 'burnbag') */
  defaultSection: string;
}

/** Brand configurations keyed by domain pattern. */
export function useDomainConfigs(): Record<string, DomainBrandConfig> {
  const theme = useTheme();
  return useMemo(
    () => ({
      'brightchain.org': {
        domain: 'brightchain.org',
        name: 'BrightChain',
        logoSrc: '/assets/logos/brightchain.svg',
        headerLogo: (
          <BrightChainSubLogo
            customIcon={<BirdbagLogoGrey height={32} />}
            leadText="Digital"
            subText="Burnbag"
            leadColor={theme.palette.primary.contrastText}
          />
        ),
        headerText: 'Digital Burnbag',
        primaryColor: THEME_COLORS.CHAIN_BLUE_DARK,
        defaultSection: 'files',
      },
      'digitalburnbag.com': {
        domain: 'digitalburnbag.com',
        name: 'Digital Burnbag',
        logoSrc: '/assets/logos/digitalburnbag.svg',
        headerLogo: (
          <BrightChainSubLogo
            customIcon={<BirdbagLogoGrey height={32} />}
            leadText="Digital"
            subText="Burnbag"
            leadColor={theme.palette.primary.contrastText}
          />
        ),
        headerText: 'Digital Burnbag',
        primaryColor: THEME_COLORS.CHAIN_BLUE_DARK,
        defaultSection: 'burnbag',
      },
      'canaryprotocol.io': {
        domain: 'canaryprotocol.io',
        name: 'Canary Protocol',
        logoSrc: '/assets/logos/canaryprotocol.svg',
        headerLogo: (
          <BrightChainSubLogo
            leadText="Canary"
            subText="Protocol"
            leadColor={BurnbagConstants.ThemeColors.CanaryOrangeDark}
            subColor={BurnbagConstants.ThemeColors.CanaryOrangeLight}
          />
        ),
        headerText: 'Canary Protocol',
        primaryColor: BurnbagConstants.ThemeColors.CanaryOrangeDark,
        defaultSection: 'canary',
      },
    }),
    [theme],
  );
}

/** Static fallback used only as the context default (hooks can't run at module scope). */
const FALLBACK_CONFIG: DomainBrandConfig = {
  domain: 'brightchain.org',
  name: 'BrightChain',
  logoSrc: '/assets/logos/brightchain.svg',
  headerText: 'Digital Burnbag',
  primaryColor: THEME_COLORS.CHAIN_BLUE_DARK,
  defaultSection: 'files',
};

/**
 * Detect the current domain brand config from `window.location.hostname`.
 * Falls back to the BrightChain config for localhost / unknown domains.
 */
export function useDomainBrand(): DomainBrandConfig {
  const configs = useDomainConfigs();
  const fallback = configs['brightchain.org'];

  return useMemo(() => {
    if (typeof window === 'undefined') {
      return fallback;
    }

    const hostname = window.location.hostname;

    for (const key of Object.keys(configs)) {
      if (hostname.includes(key.split('.')[0])) {
        return configs[key];
      }
    }

    return fallback;
  }, [configs, fallback]);
}

/**
 * React context that provides the current domain brand config to descendants.
 */
export const DomainBrandContext =
  createContext<DomainBrandConfig>(FALLBACK_CONFIG);

/**
 * Convenience hook to consume the DomainBrandContext.
 */
export function useDomainBrandContext(): DomainBrandConfig {
  return useContext(DomainBrandContext);
}

export interface IDomainRouterProps {
  children: ReactNode;
  /** Optional elements to render on the right side of the AppBar (e.g. notifications) */
  toolbarActions?: ReactNode;
  /** Optional content rendered after the logo in the AppBar (e.g. breadcrumb path) */
  titleContent?: ReactNode;
  /** Optional sidebar configuration passed through to LayoutShell */
  sidebar?: SidebarConfig;
  /** Optional sub-bar rendered between AppBar and content row */
  subBar?: ReactNode;
  /** Optional detail panel rendered on the right at ≥1280px */
  detailPanel?: ReactNode;
}

/**
 * Layout shell that detects the current domain, applies branded MUI theming,
 * renders a branded AppBar header, and provides the brand config via context.
 *
 * Delegates rendering to the shared LayoutShell from brightchain-react-components.
 * Also provides the Burnbag-specific DomainBrandContext for descendants that need
 * domain-specific fields (defaultSection, domain, logoSrc).
 *
 * All routes work from any domain — this component only controls visual
 * branding and the default landing section, not route availability.
 * Authentication sessions are shared across all domains.
 */
export function DomainRouter({
  children,
  toolbarActions,
  titleContent,
  sidebar,
  subBar,
  detailPanel,
}: IDomainRouterProps) {
  const domainBrand = useDomainBrand();

  const brandConfig: BrandConfig = useMemo(
    () => ({
      appName: domainBrand.headerText,
      logo: domainBrand.headerLogo,
      primaryColor: domainBrand.primaryColor,
    }),
    [domainBrand.headerText, domainBrand.headerLogo, domainBrand.primaryColor],
  );

  return (
    <DomainBrandContext.Provider value={domainBrand}>
      <LayoutShell
        brandConfig={brandConfig}
        titleContent={titleContent}
        toolbarActions={toolbarActions}
        sidebar={sidebar}
        subBar={subBar}
        detailPanel={detailPanel}
      >
        {children}
      </LayoutShell>
    </DomainBrandContext.Provider>
  );
}
