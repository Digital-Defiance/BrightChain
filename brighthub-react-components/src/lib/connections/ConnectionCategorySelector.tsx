/**
 * ConnectionCategorySelector Component
 *
 * Multi-select checkbox list for assigning connection categories.
 * Displays category color swatches, icons, and default indicators.
 *
 * @remarks
 * Implements Requirements 35.3, 61.4
 */

import { BrightHubStrings } from '@brightchain/brightchain-lib';
import { IBaseConnectionCategory } from '@brightchain/brighthub-lib';
import {
  Box,
  Checkbox,
  Chip,
  FormControlLabel,
  FormGroup,
  Typography,
} from '@mui/material';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the ConnectionCategorySelector component */
export interface ConnectionCategorySelectorProps {
  /** Available categories to choose from */
  categories: IBaseConnectionCategory<string>[];
  /** Currently selected category IDs */
  selectedCategoryIds: string[];
  /** Callback when selection changes */
  onChange: (selectedIds: string[]) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * ConnectionCategorySelector
 *
 * Compact multi-select list of connection categories with color swatches,
 * optional FontAwesome icons, and default category indicators.
 * Suitable for use in sidebars and dialogs.
 */
export function ConnectionCategorySelector({
  categories,
  selectedCategoryIds,
  onChange,
  disabled = false,
}: ConnectionCategorySelectorProps) {
  const { t } = useBrightHubTranslation();

  const handleToggle = (categoryId: string) => {
    if (disabled) return;
    const isSelected = selectedCategoryIds.includes(categoryId);
    const next = isSelected
      ? selectedCategoryIds.filter((id) => id !== categoryId)
      : [...selectedCategoryIds, categoryId];
    onChange(next);
  };

  return (
    <Box
      role="group"
      aria-label={t(BrightHubStrings.ConnectionCategorySelector_AriaLabel)}
      data-testid="connection-category-selector"
    >
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {t(BrightHubStrings.ConnectionCategorySelector_Title)}
      </Typography>

      {categories.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          data-testid="no-categories"
        >
          {t(BrightHubStrings.ConnectionCategorySelector_NoneAvailable)}
        </Typography>
      ) : (
        <FormGroup>
          {categories.map((category) => {
            const checked = selectedCategoryIds.includes(category._id);
            return (
              <FormControlLabel
                key={category._id}
                disabled={disabled}
                control={
                  <Checkbox
                    checked={checked}
                    onChange={() => handleToggle(category._id)}
                    size="small"
                    data-testid={`category-checkbox-${category._id}`}
                  />
                }
                label={
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                    }}
                  >
                    {category.color && (
                      <Box
                        data-testid={`color-swatch-${category._id}`}
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: category.color,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    {category.icon && (
                      <i
                        className={`fa-solid fa-${category.icon}`}
                        data-testid={`category-icon-${category._id}`}
                        style={{ fontSize: 12 }}
                      />
                    )}
                    <Typography variant="body2">{category.name}</Typography>
                    {category.isDefault && (
                      <Chip
                        label={t(
                          BrightHubStrings.ConnectionCategorySelector_DefaultIndicator,
                        )}
                        size="small"
                        variant="outlined"
                        data-testid={`default-indicator-${category._id}`}
                        sx={{ height: 18, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                }
              />
            );
          })}
        </FormGroup>
      )}
    </Box>
  );
}

export default ConnectionCategorySelector;
