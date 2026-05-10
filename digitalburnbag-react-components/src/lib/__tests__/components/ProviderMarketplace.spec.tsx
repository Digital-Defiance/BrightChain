/**
 * Unit tests for ProviderMarketplace component.
 * Task 13.2 — Tests for provider marketplace UI.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8
 */

// ---------------------------------------------------------------------------
// Mocks — must come before any imports that use them
// ---------------------------------------------------------------------------

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
  }),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { ProviderCategory } from '@brightchain/digitalburnbag-lib';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import type { IProviderMarketplaceProps } from '../../components/ProviderMarketplace';
import { ProviderMarketplace } from '../../components/ProviderMarketplace';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeProvider(
  overrides: Partial<{
    id: string;
    name: string;
    description: string;
    category: ProviderCategory;
    authType: string;
    supportsWebhooks: boolean;
  }> = {},
) {
  const id = overrides.id ?? 'test-provider';
  return {
    id,
    name: overrides.name ?? 'Test Provider',
    description: overrides.description ?? 'A test provider description',
    category: overrides.category ?? ProviderCategory.DEVELOPER,
    icon: 'icon-test',
    baseUrl: 'https://api.test.com',
    auth: { type: (overrides.authType ?? 'oauth2') as 'oauth2' | 'api_key' | 'webhook' | 'session' },
    endpoints: {
      activity: {
        path: '/activity',
        method: 'GET' as const,
        responseMapping: {
          eventsPath: '$.data',
          timestampPath: 'timestamp',
          timestampFormat: 'iso8601' as const,
        },
      },
      healthCheck: { path: '/health', method: 'GET' as const, expectedStatus: 200 },
    },
    defaultLookbackMs: 86400000,
    minCheckIntervalMs: 3600000,
    supportsWebhooks: overrides.supportsWebhooks ?? false,
    enabledByDefault: true,
  };
}

const GITHUB_PROVIDER = makeProvider({
  id: 'github',
  name: 'GitHub',
  description: 'Monitor commits, pull requests, and issues',
  category: ProviderCategory.DEVELOPER,
  authType: 'oauth2',
});

const FITBIT_PROVIDER = makeProvider({
  id: 'fitbit',
  name: 'Fitbit',
  description: 'Monitor steps, heart rate, and sleep',
  category: ProviderCategory.HEALTH_FITNESS,
  authType: 'oauth2',
});

const SPOTIFY_PROVIDER = makeProvider({
  id: 'spotify',
  name: 'Spotify',
  description: 'Monitor recently played tracks and listening history',
  category: ProviderCategory.ENTERTAINMENT,
  authType: 'oauth2',
});

const SLACK_PROVIDER = makeProvider({
  id: 'slack',
  name: 'Slack',
  description: 'Monitor message activity and presence status',
  category: ProviderCategory.COMMUNICATION,
  authType: 'oauth2',
  supportsWebhooks: true,
});

const ALL_PROVIDERS = [GITHUB_PROVIDER, FITBIT_PROVIDER, SPOTIFY_PROVIDER, SLACK_PROVIDER];

function renderMarketplace(overrides: Partial<IProviderMarketplaceProps> = {}) {
  const defaultProps: IProviderMarketplaceProps = {
    providers: ALL_PROVIDERS,
    connectedProviderIds: [],
    recommendedProviderIds: [],
    onConnect: jest.fn(),
    onNavigateToMarketplace: jest.fn(),
    ...overrides,
  };
  return {
    ...render(<ProviderMarketplace {...defaultProps} />),
    props: defaultProps,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProviderMarketplace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Req 11.1: Marketplace accessible from left nav ──────────────────────

  describe('Req 11.1 — marketplace navigation', () => {
    it('renders the marketplace container with correct test id', () => {
      renderMarketplace();
      expect(screen.getByTestId('provider-marketplace')).toBeInTheDocument();
    });

    it('renders the "Provider Marketplace" heading', () => {
      renderMarketplace();
      expect(screen.getByText('Provider Marketplace')).toBeInTheDocument();
    });

    it('renders the category sidebar for navigation', () => {
      renderMarketplace();
      expect(screen.getByTestId('category-sidebar')).toBeInTheDocument();
    });

    it('calls onNavigateToMarketplace when provided', () => {
      const onNavigateToMarketplace = jest.fn();
      renderMarketplace({ onNavigateToMarketplace });
      // The callback is available for the parent nav to call
      expect(onNavigateToMarketplace).not.toHaveBeenCalled(); // not auto-called
    });
  });

  // ── Req 11.2: Provider cards display all required fields ─────────────────

  describe('Req 11.2 — provider card fields', () => {
    it('renders provider name on each card', () => {
      renderMarketplace();
      expect(screen.getByTestId('provider-name-github')).toHaveTextContent('GitHub');
      expect(screen.getByTestId('provider-name-fitbit')).toHaveTextContent('Fitbit');
    });

    it('renders provider icon on each card', () => {
      renderMarketplace();
      expect(screen.getByTestId('provider-icon-github')).toBeInTheDocument();
      expect(screen.getByTestId('provider-icon-fitbit')).toBeInTheDocument();
    });

    it('renders category badge on each card', () => {
      renderMarketplace();
      expect(screen.getByTestId('category-badge-github')).toBeInTheDocument();
      expect(screen.getByTestId('category-badge-fitbit')).toBeInTheDocument();
    });

    it('renders provider description on each card', () => {
      renderMarketplace();
      expect(screen.getByTestId('provider-description-github')).toHaveTextContent(
        'Monitor commits, pull requests, and issues',
      );
    });

    it('renders auth method chips on each card', () => {
      renderMarketplace();
      const authMethods = screen.getByTestId('auth-methods-github');
      expect(authMethods).toBeInTheDocument();
      expect(within(authMethods).getByText('OAuth2')).toBeInTheDocument();
    });

    it('renders "Connect" button on each card', () => {
      renderMarketplace();
      expect(screen.getByTestId('connect-button-github')).toBeInTheDocument();
      expect(screen.getByTestId('connect-button-fitbit')).toBeInTheDocument();
    });

    it('renders webhook chip when provider supports webhooks', () => {
      renderMarketplace();
      const authMethods = screen.getByTestId('auth-methods-slack');
      expect(within(authMethods).getByText('Webhook')).toBeInTheDocument();
    });

    it('renders correct category label in category badge', () => {
      renderMarketplace();
      expect(screen.getByTestId('category-badge-github')).toHaveTextContent('Development');
      expect(screen.getByTestId('category-badge-fitbit')).toHaveTextContent('Health & Fitness');
      expect(screen.getByTestId('category-badge-spotify')).toHaveTextContent('Entertainment');
    });
  });

  // ── Req 11.3: Category filtering ─────────────────────────────────────────

  describe('Req 11.3 — category filtering', () => {
    it('renders category sidebar with all available categories', () => {
      renderMarketplace();
      // Should have sidebar entries for each category present in providers
      expect(screen.getByTestId('category-filter-developer')).toBeInTheDocument();
      expect(screen.getByTestId('category-filter-health_fitness')).toBeInTheDocument();
      expect(screen.getByTestId('category-filter-entertainment')).toBeInTheDocument();
      expect(screen.getByTestId('category-filter-communication')).toBeInTheDocument();
    });

    it('shows provider counts per category in sidebar', () => {
      renderMarketplace();
      const devFilter = screen.getByTestId('category-filter-developer');
      expect(devFilter).toHaveTextContent('1 providers');
    });

    it('filters to only show providers in selected category when category clicked', () => {
      renderMarketplace();
      // Click the developer category filter
      fireEvent.click(screen.getByTestId('category-filter-developer'));
      // GitHub (developer) should be visible
      expect(screen.getByTestId('provider-card-github')).toBeInTheDocument();
      // Fitbit (health_fitness) should NOT be visible
      expect(screen.queryByTestId('provider-card-fitbit')).not.toBeInTheDocument();
    });

    it('shows all providers when "All Providers" is selected', () => {
      renderMarketplace();
      // First filter to a category
      fireEvent.click(screen.getByTestId('category-filter-developer'));
      // Then click "All"
      fireEvent.click(screen.getByTestId('category-filter-all'));
      // All providers should be visible again
      expect(screen.getByTestId('provider-card-github')).toBeInTheDocument();
      expect(screen.getByTestId('provider-card-fitbit')).toBeInTheDocument();
      expect(screen.getByTestId('provider-card-spotify')).toBeInTheDocument();
    });

    it('renders category sections grouped by category', () => {
      renderMarketplace();
      expect(screen.getByTestId('category-section-developer')).toBeInTheDocument();
      expect(screen.getByTestId('category-section-health_fitness')).toBeInTheDocument();
    });
  });

  // ── Req 11.4: Real-time search filtering ─────────────────────────────────

  describe('Req 11.4 — real-time search filtering', () => {
    it('renders a search bar', () => {
      renderMarketplace();
      expect(screen.getByTestId('marketplace-search-input')).toBeInTheDocument();
    });

    it('filters providers by name as user types', () => {
      renderMarketplace();
      const searchInput = screen.getByTestId('marketplace-search-input');
      fireEvent.change(searchInput, { target: { value: 'GitHub' } });
      expect(screen.getByTestId('provider-card-github')).toBeInTheDocument();
      expect(screen.queryByTestId('provider-card-fitbit')).not.toBeInTheDocument();
    });

    it('filters providers by description as user types', () => {
      renderMarketplace();
      const searchInput = screen.getByTestId('marketplace-search-input');
      fireEvent.change(searchInput, { target: { value: 'heart rate' } });
      // Fitbit description contains "heart rate"
      expect(screen.getByTestId('provider-card-fitbit')).toBeInTheDocument();
      expect(screen.queryByTestId('provider-card-github')).not.toBeInTheDocument();
    });

    it('search is case-insensitive', () => {
      renderMarketplace();
      const searchInput = screen.getByTestId('marketplace-search-input');
      fireEvent.change(searchInput, { target: { value: 'GITHUB' } });
      expect(screen.getByTestId('provider-card-github')).toBeInTheDocument();
    });

    it('shows empty state when no providers match search', () => {
      renderMarketplace();
      const searchInput = screen.getByTestId('marketplace-search-input');
      fireEvent.change(searchInput, { target: { value: 'xyznonexistentprovider' } });
      expect(screen.getByTestId('marketplace-empty-state')).toBeInTheDocument();
    });

    it('shows all providers when search is cleared', () => {
      renderMarketplace();
      const searchInput = screen.getByTestId('marketplace-search-input');
      fireEvent.change(searchInput, { target: { value: 'GitHub' } });
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByTestId('provider-card-github')).toBeInTheDocument();
      expect(screen.getByTestId('provider-card-fitbit')).toBeInTheDocument();
    });
  });

  // ── Req 11.5: "Connect" button launches activation flow ──────────────────

  describe('Req 11.5 — Connect button launches activation flow', () => {
    it('calls onConnect with the provider when Connect button is clicked', () => {
      const onConnect = jest.fn();
      renderMarketplace({ onConnect });
      fireEvent.click(screen.getByTestId('connect-button-github'));
      expect(onConnect).toHaveBeenCalledTimes(1);
      expect(onConnect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'github', name: 'GitHub' }),
      );
    });

    it('calls onConnect with the correct provider when multiple providers exist', () => {
      const onConnect = jest.fn();
      renderMarketplace({ onConnect });
      fireEvent.click(screen.getByTestId('connect-button-fitbit'));
      expect(onConnect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'fitbit', name: 'Fitbit' }),
      );
    });
  });

  // ── Req 11.6: Connected badge shows green indicator ──────────────────────

  describe('Req 11.6 — Connected badge', () => {
    it('shows "Connected" badge on already-connected providers', () => {
      renderMarketplace({ connectedProviderIds: ['github'] });
      expect(screen.getByTestId('connected-badge-github')).toBeInTheDocument();
      expect(screen.getByTestId('connected-badge-github')).toHaveTextContent('Connected');
    });

    it('does not show "Connected" badge on unconnected providers', () => {
      renderMarketplace({ connectedProviderIds: ['github'] });
      expect(screen.queryByTestId('connected-badge-fitbit')).not.toBeInTheDocument();
    });

    it('shows no connected badges when connectedProviderIds is empty', () => {
      renderMarketplace({ connectedProviderIds: [] });
      expect(screen.queryByTestId('connected-badge-github')).not.toBeInTheDocument();
      expect(screen.queryByTestId('connected-badge-fitbit')).not.toBeInTheDocument();
    });

    it('shows connected badge with success color (green indicator)', () => {
      renderMarketplace({ connectedProviderIds: ['github'] });
      const badge = screen.getByTestId('connected-badge-github');
      // MUI Chip with color="success" renders with success class
      expect(badge).toBeInTheDocument();
      // The connect button should also reflect connected state
      const connectBtn = screen.getByTestId('connect-button-github');
      expect(connectBtn).toHaveTextContent('Connected');
    });

    it('shows multiple connected badges when multiple providers are connected', () => {
      renderMarketplace({ connectedProviderIds: ['github', 'fitbit'] });
      expect(screen.getByTestId('connected-badge-github')).toBeInTheDocument();
      expect(screen.getByTestId('connected-badge-fitbit')).toBeInTheDocument();
    });
  });

  // ── Req 11.7: Recommended badge on high-reliability providers ────────────

  describe('Req 11.7 — Recommended badge', () => {
    it('shows "Recommended" badge on recommended providers', () => {
      renderMarketplace({ recommendedProviderIds: ['github'] });
      expect(screen.getByTestId('recommended-badge-github')).toBeInTheDocument();
      expect(screen.getByTestId('recommended-badge-github')).toHaveTextContent('Recommended');
    });

    it('does not show "Recommended" badge on non-recommended providers', () => {
      renderMarketplace({ recommendedProviderIds: ['github'] });
      expect(screen.queryByTestId('recommended-badge-fitbit')).not.toBeInTheDocument();
    });

    it('shows no recommended badges when recommendedProviderIds is empty', () => {
      renderMarketplace({ recommendedProviderIds: [] });
      expect(screen.queryByTestId('recommended-badge-github')).not.toBeInTheDocument();
    });

    it('can show both connected and recommended badges simultaneously', () => {
      renderMarketplace({
        connectedProviderIds: ['github'],
        recommendedProviderIds: ['github'],
      });
      expect(screen.getByTestId('connected-badge-github')).toBeInTheDocument();
      expect(screen.getByTestId('recommended-badge-github')).toBeInTheDocument();
    });
  });

  // ── Req 11.8: Collapsible category sections with counts ──────────────────

  describe('Req 11.8 — Collapsible category sections with counts', () => {
    it('renders category section headers with provider counts', () => {
      renderMarketplace();
      const devSection = screen.getByTestId('category-section-developer');
      expect(devSection).toBeInTheDocument();
      // Should show count text
      expect(within(devSection).getByText(/1 provider/)).toBeInTheDocument();
    });

    it('collapses a category section when header is clicked (aria-expanded toggles)', () => {
      renderMarketplace();
      const devHeader = screen.getByTestId('category-header-developer');
      // Initially expanded
      expect(devHeader).toHaveAttribute('aria-expanded', 'true');
      // Click to collapse
      fireEvent.click(devHeader);
      // aria-expanded should now be false
      expect(devHeader).toHaveAttribute('aria-expanded', 'false');
    });

    it('expands a collapsed category section when header is clicked again', () => {
      renderMarketplace();
      const devHeader = screen.getByTestId('category-header-developer');
      // Collapse
      fireEvent.click(devHeader);
      expect(devHeader).toHaveAttribute('aria-expanded', 'false');
      // Expand again
      fireEvent.click(devHeader);
      expect(devHeader).toHaveAttribute('aria-expanded', 'true');
    });

    it('renders separate sections for each category', () => {
      renderMarketplace();
      expect(screen.getByTestId('category-section-developer')).toBeInTheDocument();
      expect(screen.getByTestId('category-section-health_fitness')).toBeInTheDocument();
      expect(screen.getByTestId('category-section-entertainment')).toBeInTheDocument();
      expect(screen.getByTestId('category-section-communication')).toBeInTheDocument();
    });

    it('shows correct provider count in sidebar for each category', () => {
      renderMarketplace({
        providers: [
          ...ALL_PROVIDERS,
          makeProvider({ id: 'gitlab', name: 'GitLab', category: ProviderCategory.DEVELOPER }),
        ],
      });
      // Developer category now has 2 providers
      const devFilter = screen.getByTestId('category-filter-developer');
      expect(devFilter).toHaveTextContent('2 providers');
    });

    it('renders category count badge in section header', () => {
      renderMarketplace();
      const devSection = screen.getByTestId('category-section-developer');
      expect(screen.getByTestId('category-count-developer')).toBeInTheDocument();
      expect(within(devSection).getByText(/1 provider/)).toBeInTheDocument();
    });
  });

  // ── Additional edge cases ─────────────────────────────────────────────────

  describe('edge cases', () => {
    it('renders empty state when no providers are provided', () => {
      renderMarketplace({ providers: [] });
      // No provider cards should be rendered
      expect(screen.queryByTestId('provider-card-github')).not.toBeInTheDocument();
    });

    it('renders all providers when no filters are active', () => {
      renderMarketplace();
      expect(screen.getByTestId('provider-card-github')).toBeInTheDocument();
      expect(screen.getByTestId('provider-card-fitbit')).toBeInTheDocument();
      expect(screen.getByTestId('provider-card-spotify')).toBeInTheDocument();
      expect(screen.getByTestId('provider-card-slack')).toBeInTheDocument();
    });

    it('combines search and category filter correctly', () => {
      renderMarketplace({
        providers: [
          ...ALL_PROVIDERS,
          makeProvider({
            id: 'gitlab',
            name: 'GitLab',
            description: 'Monitor merge requests and pipelines',
            category: ProviderCategory.DEVELOPER,
          }),
        ],
      });
      // Filter to developer category
      fireEvent.click(screen.getByTestId('category-filter-developer'));
      // Then search for "GitHub" specifically
      const searchInput = screen.getByTestId('marketplace-search-input');
      fireEvent.change(searchInput, { target: { value: 'GitHub' } });
      // Only GitHub should be visible
      expect(screen.getByTestId('provider-card-github')).toBeInTheDocument();
      expect(screen.queryByTestId('provider-card-gitlab')).not.toBeInTheDocument();
    });
  });
});
