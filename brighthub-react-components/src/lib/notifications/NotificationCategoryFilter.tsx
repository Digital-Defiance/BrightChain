/**
 * NotificationCategoryFilter Component
 *
 * Filter notifications by one or more categories.
 *
 * @remarks
 * Implements Requirements 53.6, 55.10, 61.4
 */

import type { BrightHubStringKeyValue } from '@brightchain/brightchain-lib';
import { BrightHubStrings } from '@brightchain/brightchain-lib';
import { NotificationCategory } from '@brightchain/brighthub-lib';
import { Chip, Stack, Typography } from '@mui/material';
import type { FC } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the NotificationCategoryFilter component */
export interface NotificationCategoryFilterProps {
  /** Currently selected categories (empty = all) */
  selectedCategories: NotificationCategory[];
  /** Callback when selection changes */
  onChange: (categories: NotificationCategory[]) => void;
}

const CATEGORY_LABELS: Record<NotificationCategory, BrightHubStringKeyValue> = {
  [NotificationCategory.Social]:
    BrightHubStrings.NotificationCategoryFilter_Social,
  [NotificationCategory.Messages]:
    BrightHubStrings.NotificationCategoryFilter_Messages,
  [NotificationCategory.Connections]:
    BrightHubStrings.NotificationCategoryFilter_Connections,
  [NotificationCategory.System]:
    BrightHubStrings.NotificationCategoryFilter_System,
};

/**
 * NotificationCategoryFilter
 *
 * Chip-based category filter for notifications.
 */
export const NotificationCategoryFilter: FC<
  NotificationCategoryFilterProps
> = ({ selectedCategories, onChange }) => {
  const { t } = useBrightHubTranslation();

  const isAllSelected = selectedCategories.length === 0;

  const handleToggle = (category: NotificationCategory) => {
    if (selectedCategories.includes(category)) {
      onChange(selectedCategories.filter((c) => c !== category));
    } else {
      onChange([...selectedCategories, category]);
    }
  };

  const handleSelectAll = () => {
    onChange([]);
  };

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      aria-label={t(BrightHubStrings.NotificationCategoryFilter_AriaLabel)}
      data-testid="notification-category-filter"
    >
      <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
        {t(BrightHubStrings.NotificationCategoryFilter_Title)}
      </Typography>
      <Chip
        label={t(BrightHubStrings.NotificationCategoryFilter_All)}
        variant={isAllSelected ? 'filled' : 'outlined'}
        color={isAllSelected ? 'primary' : 'default'}
        onClick={handleSelectAll}
        data-testid="filter-all"
      />
      {Object.values(NotificationCategory).map((category) => {
        const isSelected = selectedCategories.includes(category);
        return (
          <Chip
            key={category}
            label={t(CATEGORY_LABELS[category])}
            variant={isSelected ? 'filled' : 'outlined'}
            color={isSelected ? 'primary' : 'default'}
            onClick={() => handleToggle(category)}
            data-testid={`filter-${category}`}
          />
        );
      })}
    </Stack>
  );
};

export default NotificationCategoryFilter;
