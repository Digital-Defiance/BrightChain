/**
 * FontAwesomeIconPicker — Dialog for selecting a FontAwesome icon with style variants.
 *
 * Displays a searchable grid of icons. The user can filter by name and switch
 * between style families (solid, regular, light, thin, duotone, brands, chisel, etc.).
 * On selection, returns the full CSS class string (e.g. "fa-solid fa-gamepad").
 *
 * When a style is selected, the picker shows **all** icons available in the kit
 * for that prefix — not just a curated subset. This ensures brand icons (and any
 * other style-specific icons) are fully represented.
 */

import { byPrefixAndName } from '@awesome.me/kit-a20d532681/icons';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  type FC,
  memo,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from 'react';
import SafeFaIcon from './SafeFaIcon';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FontAwesomeIconPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (faClass: string) => void;
  /** Currently selected FA class (for highlighting) */
  currentFaClass?: string;
  maxIconGridSize?: number;
  maxDisplay?: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Style families available for selection. Each maps to a CSS prefix and an internal FA prefix. */
const STYLE_OPTIONS = [
  // ── Classic family ──
  { label: 'Solid', prefix: 'fa-solid', faPrefix: 'fas' },
  { label: 'Regular', prefix: 'fa-regular', faPrefix: 'far' },
  { label: 'Light', prefix: 'fa-light', faPrefix: 'fal' },
  { label: 'Thin', prefix: 'fa-thin', faPrefix: 'fat' },
  // ── Brands ──
  { label: 'Brands', prefix: 'fa-brands', faPrefix: 'fab' },
  // ── Duotone family ──
  { label: 'Duotone', prefix: 'fa-duotone', faPrefix: 'fad' },
  { label: 'Duotone Regular', prefix: 'fa-duotone fa-regular', faPrefix: 'fadr' },
  { label: 'Duotone Light', prefix: 'fa-duotone fa-light', faPrefix: 'fadl' },
  { label: 'Duotone Thin', prefix: 'fa-duotone fa-thin', faPrefix: 'fadt' },
  // ── Sharp family ──
  { label: 'Sharp Solid', prefix: 'fa-sharp fa-solid', faPrefix: 'fass' },
  { label: 'Sharp Regular', prefix: 'fa-sharp fa-regular', faPrefix: 'fasr' },
  { label: 'Sharp Light', prefix: 'fa-sharp fa-light', faPrefix: 'fasl' },
  { label: 'Sharp Thin', prefix: 'fa-sharp fa-thin', faPrefix: 'fast' },
  // ── Sharp Duotone family ──
  { label: 'Sharp Duotone Solid', prefix: 'fa-sharp-duotone fa-solid', faPrefix: 'fasds' },
  { label: 'Sharp Duotone Regular', prefix: 'fa-sharp-duotone fa-regular', faPrefix: 'fasdr' },
  { label: 'Sharp Duotone Light', prefix: 'fa-sharp-duotone fa-light', faPrefix: 'fasdl' },
  { label: 'Sharp Duotone Thin', prefix: 'fa-sharp-duotone fa-thin', faPrefix: 'fasdt' },
  // ── Specialty families ──
  { label: 'Chisel', prefix: 'fa-chisel fa-regular', faPrefix: 'facr' },
  { label: 'Etch', prefix: 'fa-etch fa-solid', faPrefix: 'faes' },
  { label: 'Graphite', prefix: 'fa-graphite fa-thin', faPrefix: 'fagt' },
  { label: 'Jelly', prefix: 'fa-jelly fa-regular', faPrefix: 'fajr' },
  { label: 'Jelly Duo', prefix: 'fa-jelly-duo fa-regular', faPrefix: 'fajdr' },
  { label: 'Jelly Fill', prefix: 'fa-jelly-fill fa-regular', faPrefix: 'fajfr' },
  { label: 'Notdog', prefix: 'fa-notdog fa-solid', faPrefix: 'fans' },
  { label: 'Notdog Duo', prefix: 'fa-notdog-duo fa-solid', faPrefix: 'fands' },
  { label: 'Slab', prefix: 'fa-slab fa-regular', faPrefix: 'faslr' },
  { label: 'Slab Press', prefix: 'fa-slab-press fa-regular', faPrefix: 'faslpr' },
  { label: 'Thumbprint', prefix: 'fa-thumbprint fa-light', faPrefix: 'fatl' },
  { label: 'Utility', prefix: 'fa-utility fa-semibold', faPrefix: 'fausb' },
  { label: 'Utility Duo', prefix: 'fa-utility-duo fa-semibold', faPrefix: 'faudsb' },
  { label: 'Utility Fill', prefix: 'fa-utility-fill fa-semibold', faPrefix: 'faufsb' },
  { label: 'Whiteboard', prefix: 'fa-whiteboard fa-semibold', faPrefix: 'fawsb' },
];

// ─── Component ──────────────────────────────────────────────────────────────

const FontAwesomeIconPicker: FC<FontAwesomeIconPickerProps> = ({
  open,
  onClose,
  onSelect,
  currentFaClass,
  maxDisplay = 120,
  maxIconGridSize = 40,
}) => {
  const { tBranded: t } = useI18n();
  const [search, setSearch] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<{
    label: string;
    prefix: string;
    faPrefix: string;
  }>(STYLE_OPTIONS[0]);
  const deferredSearch = useDeferredValue(search);

  /**
   * Build the full list of icon names available for the selected style,
   * sourced directly from the kit's byPrefixAndName export.
   * This ensures every icon the kit provides for a given prefix is shown —
   * no curated subset that might miss brand icons like "chisel", etc.
   */
  const allAvailableIcons = useMemo(() => {
    const icons = byPrefixAndName[selectedStyle.faPrefix] ?? {};
    return Object.keys(icons).sort();
  }, [selectedStyle.faPrefix]);

  // Filter icons based on search query
  const filteredIcons = useMemo(() => {
    const query = deferredSearch.toLowerCase().trim();
    const filtered = query
      ? allAvailableIcons.filter((name) => name.includes(query))
      : allAvailableIcons;
    return filtered.slice(0, maxDisplay);
  }, [deferredSearch, allAvailableIcons]);

  const handleSelect = useCallback(
    (iconName: string) => {
      const faClass = `${selectedStyle.prefix} fa-${iconName}`;
      onSelect(faClass);
    },
    [selectedStyle, onSelect],
  );

  // Parse current selection for highlighting
  const currentIconName = useMemo(() => {
    if (!currentFaClass) return null;
    const match = currentFaClass.match(/fa-([a-z0-9-]+)$/);
    return match ? match[1] : null;
  }, [currentFaClass]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      data-testid="fa-icon-picker-dialog"
    >
      <DialogTitle>{t(BrightChatStrings.IconPicker_Title)}</DialogTitle>

      <DialogContent>
        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder={t(BrightChatStrings.IconPicker_SearchPlaceholder)}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2 }}
          data-testid="fa-icon-search"
          autoFocus
        />

        {/* Style selector */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
          {STYLE_OPTIONS.map((style) => (
            <Chip
              key={style.prefix}
              label={style.label}
              size="small"
              color={
                selectedStyle.prefix === style.prefix ? 'primary' : 'default'
              }
              variant={
                selectedStyle.prefix === style.prefix ? 'filled' : 'outlined'
              }
              onClick={() => setSelectedStyle(style)}
              clickable
            />
          ))}
        </Box>

        {/* Preview of current selection */}
        {currentFaClass && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 2,
              p: 1,
              bgcolor: 'action.hover',
              borderRadius: 1,
            }}
          >
            <SafeFaIcon className={currentFaClass} style={{ fontSize: 24 }} />
            <Typography variant="body2" color="text.secondary">
              {t(BrightChatStrings.IconPicker_CurrentLabel)}{' '}
              <code>{currentFaClass}</code>
            </Typography>
          </Box>
        )}

        {/* Icon grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(${maxIconGridSize}px, 1fr))`,
            gap: 0.5,
            maxHeight: 300,
            overflowY: 'auto',
          }}
          data-testid="fa-icon-grid"
        >
          {filteredIcons.map((iconName) => {
            const fullClass = `${selectedStyle.prefix} fa-${iconName}`;
            const isSelected = iconName === currentIconName;
            return (
              <Tooltip
                key={`${selectedStyle.prefix}-${iconName}`}
                title={iconName}
                arrow
              >
                <IconButton
                  onClick={() => handleSelect(iconName)}
                  sx={{
                    width: maxIconGridSize,
                    height: maxIconGridSize,
                    borderRadius: 1,
                    border: isSelected ? 2 : 1,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected ? 'primary.light' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  data-testid={`fa-icon-${iconName}`}
                >
                  <SafeFaIcon className={fullClass} style={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            );
          })}
        </Box>

        {filteredIcons.length === 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            py={3}
          >
            {t(BrightChatStrings.IconPicker_NoMatchTemplate).replace(
              '{0}',
              search,
            )}
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          {t(BrightChatStrings.IconPicker_Cancel)}
        </Button>
        {currentFaClass && (
          <Button
            color="error"
            onClick={() => onSelect('')}
            data-testid="fa-icon-clear"
          >
            {t(BrightChatStrings.IconPicker_RemoveIcon)}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default memo(FontAwesomeIconPicker);
