import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import {
  IApiProviderDisplayInfoDTO,
  IApiProvidersByCategoryDTO,
} from '../services/burnbag-api-client';
import { ProviderCard } from './ProviderCard';

export interface IProviderListProps {
  providersByCategory: IApiProvidersByCategoryDTO[];
  isLoading: boolean;
  selectedProviderId?: string;
  onSelectProvider: (provider: IApiProviderDisplayInfoDTO) => void;
}

/**
 * Grouped list of available providers with search and filter.
 */
export function ProviderList({
  providersByCategory,
  isLoading,
  selectedProviderId,
  onSelectProvider,
}: IProviderListProps) {
  const { tBranded: t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Get unique categories for filter dropdown
  const categories = useMemo(
    () =>
      providersByCategory.map((cat) => ({
        value: cat.category,
        label: cat.categoryName,
      })),
    [providersByCategory],
  );

  // Filter providers based on search and category
  const filteredCategories = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();

    return providersByCategory
      .filter((cat) => !categoryFilter || cat.category === categoryFilter)
      .map((cat) => ({
        ...cat,
        providers: cat.providers.filter(
          (p) =>
            p.name.toLowerCase().includes(lowerQuery) ||
            p.description.toLowerCase().includes(lowerQuery),
        ),
      }))
      .filter((cat) => cat.providers.length > 0);
  }, [providersByCategory, searchQuery, categoryFilter]);

  if (isLoading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Skeleton variant="rectangular" height={56} sx={{ flex: 1 }} />
          <Skeleton variant="rectangular" height={56} width={200} />
        </Box>
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton
                variant="rectangular"
                height={140}
                sx={{ borderRadius: 1 }}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      {/* Search and filter */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder={t(DigitalBurnbagStrings.Provider_SearchPlaceholder)}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>
            {t(DigitalBurnbagStrings.Provider_FilterByCategory)}
          </InputLabel>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            label={t(DigitalBurnbagStrings.Provider_FilterByCategory)}
          >
            <MenuItem value="">
              {t(DigitalBurnbagStrings.Provider_AllCategories)}
            </MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat.value} value={cat.value}>
                {cat.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Provider categories */}
      {filteredCategories.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={4}>
          No providers found matching your search.
        </Typography>
      ) : (
        filteredCategories.map((category) => (
          <Box key={category.category} sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              {category.categoryName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {category.categoryDescription}
            </Typography>
            <Grid container spacing={2}>
              {category.providers.map((provider) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={provider.id}>
                  <ProviderCard
                    provider={provider}
                    selected={provider.id === selectedProviderId}
                    onClick={() => onSelectProvider(provider)}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        ))
      )}
    </Box>
  );
}
