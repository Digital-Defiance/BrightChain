/**
 * ProviderMarketplace — browsable card-based UI for discovering and connecting providers.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8
 */
import type { ICanaryProviderConfig } from '@brightchain/digitalburnbag-lib';
import { ProviderCategory } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IProviderMarketplaceProps {
  /** All available providers from the catalog */
  providers: ICanaryProviderConfig<string>[];
  /** IDs of provider connections the user has already connected */
  connectedProviderIds: string[];
  /** IDs of providers marked as recommended (high-reliability) */
  recommendedProviderIds: string[];
  /** Called when the user clicks "Connect" on a provider card */
  onConnect: (provider: ICanaryProviderConfig<string>) => void;
  /** Called when the marketplace should navigate to itself (for left-nav link) */
  onNavigateToMarketplace?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Partial<Record<ProviderCategory, string>> = {
  [ProviderCategory.SOCIAL_MEDIA]: 'Social Media',
  [ProviderCategory.HEALTH_FITNESS]: 'Health & Fitness',
  [ProviderCategory.DEVELOPER]: 'Development',
  [ProviderCategory.COMMUNICATION]: 'Communication',
  [ProviderCategory.FINANCIAL]: 'Financial',
  [ProviderCategory.IOT_SMART_HOME]: 'Smart Home & IoT',
  [ProviderCategory.GAMING]: 'Gaming',
  [ProviderCategory.EMAIL]: 'Email',
  [ProviderCategory.PRODUCTIVITY]: 'Productivity',
  [ProviderCategory.CUSTOM_WEBHOOK]: 'Custom Webhook',
  [ProviderCategory.PLATFORM_NATIVE]: 'Platform Native',
  [ProviderCategory.LOCATION]: 'Location',
  [ProviderCategory.ENTERTAINMENT]: 'Entertainment',
  [ProviderCategory.OTHER]: 'Other',
};

function getCategoryLabel(cat: ProviderCategory): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

function getAuthMethodLabel(authType: string): string {
  switch (authType) {
    case 'oauth2': return 'OAuth2';
    case 'api_key': return 'API Key';
    case 'webhook': return 'Webhook';
    case 'session': return 'Session';
    default: return authType;
  }
}

// ---------------------------------------------------------------------------
// ProviderMarketplaceCard
// ---------------------------------------------------------------------------

interface IProviderMarketplaceCardProps {
  provider: ICanaryProviderConfig<string>;
  isConnected: boolean;
  isRecommended: boolean;
  onConnect: (provider: ICanaryProviderConfig<string>) => void;
}

function ProviderMarketplaceCard({ provider, isConnected, isRecommended, onConnect }: IProviderMarketplaceCardProps) {
  const { tBranded: _t } = useI18n();
  return (
    <Card
      variant="outlined"
      data-testid={`provider-card-${provider.id}`}
      sx={{ height: '100%', display: 'flex', flexDirection: 'column', '&:hover': { boxShadow: 2 } }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
          <Box
            data-testid={`provider-icon-${provider.id}`}
            sx={{ width: 40, height: 40, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'action.hover', flexShrink: 0 }}
          >
            {provider.icon
              ? <i className={provider.icon} aria-hidden="true" />
              : <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{provider.name.charAt(0).toUpperCase()}</Typography>
            }
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }} data-testid={`provider-name-${provider.id}`}>
                {provider.name}
              </Typography>
              {isRecommended && (
                <Tooltip title="Recommended — high reliability">
                  <Chip icon={<StarIcon sx={{ fontSize: '0.875rem !important' }} />} label="Recommended" size="small" color="warning" data-testid={`recommended-badge-${provider.id}`} sx={{ height: 20, fontSize: '0.7rem' }} />
                </Tooltip>
              )}
              {isConnected && (
                <Chip icon={<CheckCircleIcon sx={{ fontSize: '0.875rem !important', color: 'success.main !important' }} />} label="Connected" size="small" color="success" variant="outlined" data-testid={`connected-badge-${provider.id}`} sx={{ height: 20, fontSize: '0.7rem' }} />
              )}
            </Box>
            <Chip label={getCategoryLabel(provider.category)} size="small" variant="outlined" data-testid={`category-badge-${provider.id}`} sx={{ height: 18, fontSize: '0.65rem', mt: 0.25 }} />
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" data-testid={`provider-description-${provider.id}`} sx={{ flex: 1, mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {provider.description}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }} data-testid={`auth-methods-${provider.id}`}>
          <Chip label={getAuthMethodLabel(provider.auth.type)} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
          {provider.supportsWebhooks && <Chip label="Webhook" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />}
        </Box>
        <Button variant={isConnected ? 'outlined' : 'contained'} size="small" color={isConnected ? 'success' : 'primary'} onClick={() => onConnect(provider)} data-testid={`connect-button-${provider.id}`} fullWidth startIcon={isConnected ? <CheckCircleIcon /> : undefined}>
          {isConnected ? 'Connected' : 'Connect'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// CategorySection
// ---------------------------------------------------------------------------

interface ICategorySectionProps {
  category: ProviderCategory;
  providers: ICanaryProviderConfig<string>[];
  connectedProviderIds: string[];
  recommendedProviderIds: string[];
  onConnect: (provider: ICanaryProviderConfig<string>) => void;
}

function CategorySection({ category, providers, connectedProviderIds, recommendedProviderIds, onConnect }: ICategorySectionProps) {
  const [expanded, setExpanded] = useState(true);
  const label = getCategoryLabel(category);
  return (
    <Box sx={{ mb: 3 }} data-testid={`category-section-${category}`}>
      <Box
        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mb: 1.5, '&:hover': { opacity: 0.8 } }}
        onClick={() => setExpanded(p => !p)}
        role="button"
        aria-expanded={expanded}
        aria-controls={`category-content-${category}`}
        data-testid={`category-header-${category}`}
      >
        <Typography variant="h6" sx={{ flex: 1 }}>{label}</Typography>
        <Badge badgeContent={providers.length} color="primary" data-testid={`category-count-${category}`} sx={{ mr: 1 }}>
          <Box sx={{ width: 8 }} />
        </Badge>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
          {providers.length} provider{providers.length !== 1 ? 's' : ''}
        </Typography>
        <IconButton size="small" aria-label={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      <Collapse in={expanded} id={`category-content-${category}`}>
        <Grid container spacing={2}>
          {providers.map(provider => (
            <Grid key={provider.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <ProviderMarketplaceCard
                provider={provider}
                isConnected={connectedProviderIds.includes(provider.id)}
                isRecommended={recommendedProviderIds.includes(provider.id)}
                onConnect={onConnect}
              />
            </Grid>
          ))}
        </Grid>
      </Collapse>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// ProviderMarketplace
// ---------------------------------------------------------------------------

/**
 * Provider Marketplace page component.
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8
 */
export function ProviderMarketplace({ providers, connectedProviderIds, recommendedProviderIds, onConnect }: IProviderMarketplaceProps) {
  const { tBranded: _t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProviderCategory | ''>('');

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<ProviderCategory, number>> = {};
    for (const p of providers) counts[p.category] = (counts[p.category] ?? 0) + 1;
    return counts;
  }, [providers]);

  const availableCategories = useMemo(
    () => (Object.keys(categoryCounts) as ProviderCategory[]).sort((a, b) => getCategoryLabel(a).localeCompare(getCategoryLabel(b))),
    [categoryCounts],
  );

  const filteredProviders = useMemo(() => {
    const lq = searchQuery.toLowerCase().trim();
    return providers.filter(p => {
      const matchesCat = !selectedCategory || p.category === selectedCategory;
      const matchesSearch = !lq || p.name.toLowerCase().includes(lq) || p.description.toLowerCase().includes(lq);
      return matchesCat && matchesSearch;
    });
  }, [providers, searchQuery, selectedCategory]);

  const providersByCategory = useMemo(() => {
    const groups = new Map<ProviderCategory, ICanaryProviderConfig<string>[]>();
    for (const p of filteredProviders) groups.set(p.category, [...(groups.get(p.category) ?? []), p]);
    return groups;
  }, [filteredProviders]);

  return (
    <Box data-testid="provider-marketplace" sx={{ display: 'flex', gap: 2 }}>
      {/* Sidebar */}
      <Box component="nav" aria-label="Provider categories" data-testid="category-sidebar" sx={{ width: 220, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, px: 1 }}>Categories</Typography>
        <List dense disablePadding>
          <ListItemButton selected={selectedCategory === ''} onClick={() => setSelectedCategory('')} data-testid="category-filter-all" sx={{ borderRadius: 1, mb: 0.25 }}>
            <ListItemText primary="All Providers" secondary={`${providers.length} total`} primaryTypographyProps={{ variant: 'body2', fontWeight: selectedCategory === '' ? 600 : 400 }} secondaryTypographyProps={{ variant: 'caption' }} />
          </ListItemButton>
          {availableCategories.map(cat => (
            <ListItemButton key={cat} selected={selectedCategory === cat} onClick={() => setSelectedCategory(cat)} data-testid={`category-filter-${cat}`} sx={{ borderRadius: 1, mb: 0.25 }}>
              <ListItemText primary={getCategoryLabel(cat)} secondary={`${categoryCounts[cat] ?? 0} providers`} primaryTypographyProps={{ variant: 'body2', fontWeight: selectedCategory === cat ? 600 : 400 }} secondaryTypographyProps={{ variant: 'caption' }} />
            </ListItemButton>
          ))}
        </List>
      </Box>

      {/* Main content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" gutterBottom>Provider Marketplace</Typography>
          <Typography variant="body2" color="text.secondary">Browse and connect canary providers to monitor your activity across services.</Typography>
        </Box>
        <TextField
          placeholder="Search providers by name or description…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
          inputProps={{ 'data-testid': 'marketplace-search-input' }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
          aria-label="Search providers"
        />
        {/* Mobile tabs */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 1, flexWrap: 'wrap', mb: 2 }} data-testid="category-tabs-mobile">
          <Chip label={`All (${providers.length})`} onClick={() => setSelectedCategory('')} color={selectedCategory === '' ? 'primary' : 'default'} variant={selectedCategory === '' ? 'filled' : 'outlined'} size="small" data-testid="category-tab-all" />
          {availableCategories.map(cat => (
            <Chip key={cat} label={`${getCategoryLabel(cat)} (${categoryCounts[cat] ?? 0})`} onClick={() => setSelectedCategory(cat)} color={selectedCategory === cat ? 'primary' : 'default'} variant={selectedCategory === cat ? 'filled' : 'outlined'} size="small" data-testid={`category-tab-${cat}`} />
          ))}
        </Box>
        {filteredProviders.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }} data-testid="marketplace-empty-state">
            <Typography variant="body1" color="text.secondary" gutterBottom>No providers found.</Typography>
            {(searchQuery || selectedCategory) && (
              <Button variant="outlined" size="small" onClick={() => { setSearchQuery(''); setSelectedCategory(''); }}>Clear filters</Button>
            )}
          </Box>
        )}
        {Array.from(providersByCategory.entries()).map(([category, catProviders]) => (
          <CategorySection key={category} category={category} providers={catProviders} connectedProviderIds={connectedProviderIds} recommendedProviderIds={recommendedProviderIds} onConnect={onConnect} />
        ))}
      </Box>
    </Box>
  );
}
