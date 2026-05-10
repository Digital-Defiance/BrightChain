/**
 * FontAwesomeIconPicker — Dialog for selecting a FontAwesome icon to insert
 * as `{{}}` markup into the BrightHub post composer.
 *
 * Displays a searchable grid of icons. The user can filter by name and switch
 * between all style families available in the kit (solid, regular, light, thin,
 * duotone, brands, sharp, chisel, etch, graphite, jelly, notdog, slab,
 * thumbprint, utility, whiteboard, etc.).
 *
 * Includes optional styling controls for color, animation, rotation, and size
 * that produce markup like `{{solid heart spin; color: blue}}`.
 *
 * Uses the FontAwesome kit's `byPrefixAndName` export to filter icons to only
 * those that actually exist in the selected style family.
 */

import { byPrefixAndName } from '@awesome.me/kit-a20d532681/icons';
import { CONSTANTS } from '@brightchain/brightchain-lib';
import { BrightHubStrings } from '@brightchain/brighthub-lib';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
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
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FontAwesomeIconPickerProps {
  open: boolean;
  onClose: () => void;
  /** Called with the `{{}}` markup string, e.g. "{{solid heart}}" */
  onSelect: (markup: string) => void;
  /** Whether to show styling controls (color, animation, rotation, size). Default true. */
  showStyleControls?: boolean;
  maxDisplay?: number;
  maxIconGridSize?: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

interface StyleOption {
  /** Display label for the chip */
  label: string;
  /**
   * The style token used in `{{style iconName}}` markup.
   * Empty string means the default "regular" style (omitted from markup).
   */
  markupStyle: string;
  /** CSS class prefix for rendering the preview tiles */
  cssPrefix: string;
  /** Internal FA kit prefix for checking icon availability via byPrefixAndName */
  faPrefix: string;
  /** Grouping category for the chip display */
  group:
    | 'classic'
    | 'sharp'
    | 'sharpDuotone'
    | 'duotone'
    | 'specialty'
    | 'brands';
}

/**
 * Complete set of style families available in the kit.
 * Derived from the kit's byPrefixAndName export and CSS class conventions.
 *
 * The markup style tokens match what the `{{}}` parser in brighthub-lib accepts.
 * For specialty families (chisel, etch, etc.) the markup token is the family name
 * and the parser produces `fa-{family}` as the CSS class.
 */
const STYLE_OPTIONS: readonly StyleOption[] = [
  // ── Classic family ──
  {
    label: 'Solid',
    markupStyle: 'solid',
    cssPrefix: 'fa-solid',
    faPrefix: 'fas',
    group: 'classic',
  },
  {
    label: 'Regular',
    markupStyle: '',
    cssPrefix: 'fa-regular',
    faPrefix: 'far',
    group: 'classic',
  },
  {
    label: 'Light',
    markupStyle: 'light',
    cssPrefix: 'fa-light',
    faPrefix: 'fal',
    group: 'classic',
  },
  {
    label: 'Thin',
    markupStyle: 'thin',
    cssPrefix: 'fa-thin',
    faPrefix: 'fat',
    group: 'classic',
  },
  // ── Brands ──
  {
    label: 'Brands',
    markupStyle: 'brands',
    cssPrefix: 'fa-brands',
    faPrefix: 'fab',
    group: 'brands',
  },
  // ── Duotone family ──
  {
    label: 'Duotone',
    markupStyle: 'duotone',
    cssPrefix: 'fa-duotone',
    faPrefix: 'fad',
    group: 'duotone',
  },
  {
    label: 'Duotone Regular',
    markupStyle: 'duotoneregular',
    cssPrefix: 'fa-duotone fa-regular',
    faPrefix: 'fadr',
    group: 'duotone',
  },
  {
    label: 'Duotone Light',
    markupStyle: 'duotonelight',
    cssPrefix: 'fa-duotone fa-light',
    faPrefix: 'fadl',
    group: 'duotone',
  },
  {
    label: 'Duotone Thin',
    markupStyle: 'duotonethin',
    cssPrefix: 'fa-duotone fa-thin',
    faPrefix: 'fadt',
    group: 'duotone',
  },
  // ── Sharp family ──
  {
    label: 'Sharp Solid',
    markupStyle: 'sharpsolid',
    cssPrefix: 'fa-sharp fa-solid',
    faPrefix: 'fass',
    group: 'sharp',
  },
  {
    label: 'Sharp Regular',
    markupStyle: 'sharpregular',
    cssPrefix: 'fa-sharp fa-regular',
    faPrefix: 'fasr',
    group: 'sharp',
  },
  {
    label: 'Sharp Light',
    markupStyle: 'sharplight',
    cssPrefix: 'fa-sharp fa-light',
    faPrefix: 'fasl',
    group: 'sharp',
  },
  {
    label: 'Sharp Thin',
    markupStyle: 'sharpthin',
    cssPrefix: 'fa-sharp fa-thin',
    faPrefix: 'fast',
    group: 'sharp',
  },
  // ── Sharp Duotone family ──
  {
    label: 'Sharp Duotone Solid',
    markupStyle: 'sharpduotonesolid',
    cssPrefix: 'fa-sharp-duotone fa-solid',
    faPrefix: 'fasds',
    group: 'sharpDuotone',
  },
  {
    label: 'Sharp Duotone Regular',
    markupStyle: 'sharpduotoneregular',
    cssPrefix: 'fa-sharp-duotone fa-regular',
    faPrefix: 'fasdr',
    group: 'sharpDuotone',
  },
  {
    label: 'Sharp Duotone Light',
    markupStyle: 'sharpduotonelight',
    cssPrefix: 'fa-sharp-duotone fa-light',
    faPrefix: 'fasdl',
    group: 'sharpDuotone',
  },
  {
    label: 'Sharp Duotone Thin',
    markupStyle: 'sharpduotonethin',
    cssPrefix: 'fa-sharp-duotone fa-thin',
    faPrefix: 'fasdt',
    group: 'sharpDuotone',
  },
  // ── Specialty families ──
  {
    label: 'Chisel',
    markupStyle: 'chisel',
    cssPrefix: 'fa-chisel fa-regular',
    faPrefix: 'facr',
    group: 'specialty',
  },
  {
    label: 'Etch',
    markupStyle: 'etch',
    cssPrefix: 'fa-etch fa-solid',
    faPrefix: 'faes',
    group: 'specialty',
  },
  {
    label: 'Graphite',
    markupStyle: 'graphite',
    cssPrefix: 'fa-graphite fa-thin',
    faPrefix: 'fagt',
    group: 'specialty',
  },
  {
    label: 'Jelly',
    markupStyle: 'jelly',
    cssPrefix: 'fa-jelly fa-regular',
    faPrefix: 'fajr',
    group: 'specialty',
  },
  {
    label: 'Jelly Duo',
    markupStyle: 'jelly-duo',
    cssPrefix: 'fa-jelly-duo fa-regular',
    faPrefix: 'fajdr',
    group: 'specialty',
  },
  {
    label: 'Jelly Fill',
    markupStyle: 'jelly-fill',
    cssPrefix: 'fa-jelly-fill fa-regular',
    faPrefix: 'fajfr',
    group: 'specialty',
  },
  {
    label: 'Notdog',
    markupStyle: 'notdog',
    cssPrefix: 'fa-notdog fa-solid',
    faPrefix: 'fans',
    group: 'specialty',
  },
  {
    label: 'Notdog Duo',
    markupStyle: 'notdog-duo',
    cssPrefix: 'fa-notdog-duo fa-solid',
    faPrefix: 'fands',
    group: 'specialty',
  },
  {
    label: 'Slab',
    markupStyle: 'slab',
    cssPrefix: 'fa-slab fa-regular',
    faPrefix: 'faslr',
    group: 'specialty',
  },
  {
    label: 'Slab Press',
    markupStyle: 'slab-press',
    cssPrefix: 'fa-slab-press fa-regular',
    faPrefix: 'faslpr',
    group: 'specialty',
  },
  {
    label: 'Thumbprint',
    markupStyle: 'thumbprint',
    cssPrefix: 'fa-thumbprint fa-light',
    faPrefix: 'fatl',
    group: 'specialty',
  },
  {
    label: 'Utility',
    markupStyle: 'utility',
    cssPrefix: 'fa-utility fa-semibold',
    faPrefix: 'fausb',
    group: 'specialty',
  },
  {
    label: 'Utility Duo',
    markupStyle: 'utility-duo',
    cssPrefix: 'fa-utility-duo fa-semibold',
    faPrefix: 'faudsb',
    group: 'specialty',
  },
  {
    label: 'Utility Fill',
    markupStyle: 'utility-fill',
    cssPrefix: 'fa-utility-fill fa-semibold',
    faPrefix: 'faufsb',
    group: 'specialty',
  },
  {
    label: 'Whiteboard',
    markupStyle: 'whiteboard',
    cssPrefix: 'fa-whiteboard fa-semibold',
    faPrefix: 'fawsb',
    group: 'specialty',
  },
];

/** Animation options — maps display label to the FA additional class token */
const ANIMATION_OPTIONS = [
  { label: 'Spin', value: 'spin' },
  { label: 'Spin Reverse', value: 'spin-reverse' },
  { label: 'Spin Pulse', value: 'spin-pulse' },
  { label: 'Beat', value: 'beat' },
  { label: 'Beat Fade', value: 'beat-fade' },
  { label: 'Bounce', value: 'bounce' },
  { label: 'Fade', value: 'fade' },
  { label: 'Flip', value: 'flip' },
  { label: 'Shake', value: 'shake' },
] as const;

/** Rotation options */
const ROTATION_OPTIONS = [
  { label: '90°', value: 'rotate-90' },
  { label: '180°', value: 'rotate-180' },
  { label: '270°', value: 'rotate-270' },
  { label: 'Flip H', value: 'flip-horizontal' },
  { label: 'Flip V', value: 'flip-vertical' },
  { label: 'Flip Both', value: 'flip-both' },
] as const;

/** Size options */
const SIZE_OPTIONS = [
  { label: '2XS', value: '2xs' },
  { label: 'XS', value: 'xs' },
  { label: 'SM', value: 'sm' },
  { label: 'LG', value: 'lg' },
  { label: 'XL', value: 'xl' },
  { label: '2XL', value: '2xl' },
  { label: '1x', value: '1x' },
  { label: '2x', value: '2x' },
  { label: '3x', value: '3x' },
  { label: '4x', value: '4x' },
  { label: '5x', value: '5x' },
] as const;

/** Preset color swatches */
const COLOR_SWATCHES = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
];

// ─── Component ──────────────────────────────────────────────────────────────

const FontAwesomeIconPicker: FC<FontAwesomeIconPickerProps> = ({
  open,
  onClose,
  onSelect,
  showStyleControls = true,
  maxDisplay = CONSTANTS.BRIGHTHUB.FONTAWESOME_MAX_DISPLAY,
  maxIconGridSize: iconGridSize = CONSTANTS.BRIGHTHUB
    .FONTAWESOME_ICON_GRID_SIZE,
}) => {
  const { t } = useBrightHubTranslation();
  const [search, setSearch] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<StyleOption>(
    STYLE_OPTIONS[0],
  );
  const deferredSearch = useDeferredValue(search);

  // Styling state
  const [color, setColor] = useState('');
  const [animation, setAnimation] = useState('');
  const [rotation, setRotation] = useState('');
  const [size, setSize] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  const allAvailableIcons = useMemo(() => {
    const icons = byPrefixAndName[selectedStyle.faPrefix] ?? {};
    return Object.keys(icons).sort();
  }, [selectedStyle.faPrefix]);

  const filteredIcons = useMemo(() => {
    const query = deferredSearch.toLowerCase().trim();
    const filtered = query
      ? allAvailableIcons.filter((name) => name.includes(query))
      : allAvailableIcons;
    return filtered.slice(0, maxDisplay);
  }, [deferredSearch, allAvailableIcons, maxDisplay]);

  /** Build the preview CSS class string for a given icon name */
  const buildPreviewClass = useCallback(
    (iconName: string) => {
      const parts = [selectedStyle.cssPrefix, `fa-${iconName}`];
      if (animation) parts.push(`fa-${animation}`);
      if (rotation) parts.push(`fa-${rotation}`);
      if (size) parts.push(`fa-${size}`);
      return parts.join(' ');
    },
    [selectedStyle.cssPrefix, animation, rotation, size],
  );

  /** Build the `{{}}` markup string for a given icon name */
  const buildMarkup = useCallback(
    (iconName: string) => {
      const tokens: string[] = [];
      if (selectedStyle.markupStyle) tokens.push(selectedStyle.markupStyle);
      tokens.push(iconName);
      if (animation) tokens.push(animation);
      if (rotation) tokens.push(rotation);
      if (size) tokens.push(size);

      const mainPart = tokens.join(' ');
      const cssParts: string[] = [];
      if (color) cssParts.push(`color: ${color}`);

      return cssParts.length > 0
        ? `{{${mainPart}; ${cssParts.join('; ')}}}`
        : `{{${mainPart}}}`;
    },
    [selectedStyle.markupStyle, animation, rotation, size, color],
  );

  const handleSelect = useCallback(
    (iconName: string) => {
      onSelect(buildMarkup(iconName));
    },
    [buildMarkup, onSelect],
  );

  const hasActiveOptions = !!(color || animation || rotation || size);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      data-testid="fa-icon-picker-dialog"
    >
      <DialogTitle>{t(BrightHubStrings.PostComposer_InsertIcon)}</DialogTitle>

      <DialogContent>
        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder={t(BrightHubStrings.PostComposer_IconSearchPlaceholder)}
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
              key={style.faPrefix}
              label={style.label}
              size="small"
              color={
                selectedStyle.faPrefix === style.faPrefix
                  ? 'primary'
                  : 'default'
              }
              variant={
                selectedStyle.faPrefix === style.faPrefix
                  ? 'filled'
                  : 'outlined'
              }
              onClick={() => setSelectedStyle(style)}
              clickable
            />
          ))}
        </Box>

        {/* Style options toggle (BrightHub only) */}
        {showStyleControls && (
          <>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowOptions((prev) => !prev)}
              sx={{ mb: 1, textTransform: 'none' }}
              data-testid="fa-icon-style-toggle"
            >
              {t(BrightHubStrings.PostComposer_IconStyleOptions)}
              {hasActiveOptions ? ' ●' : ''}
              {showOptions ? ' ▲' : ' ▼'}
            </Button>

            <Collapse in={showOptions}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  mb: 2,
                  p: 1.5,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                {/* Color */}
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 0.5, display: 'block' }}
                  >
                    {t(BrightHubStrings.PostComposer_IconColor)}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Chip
                      label={t(BrightHubStrings.PostComposer_IconColorNone)}
                      size="small"
                      variant={color === '' ? 'filled' : 'outlined'}
                      onClick={() => setColor('')}
                      clickable
                    />
                    {COLOR_SWATCHES.map((c) => (
                      <IconButton
                        key={c}
                        onClick={() => setColor(c)}
                        sx={{
                          width: 24,
                          height: 24,
                          bgcolor: c,
                          border: color === c ? 2 : 1,
                          borderColor: color === c ? 'primary.main' : 'divider',
                          borderRadius: '50%',
                          '&:hover': { opacity: 0.8 },
                        }}
                        data-testid={`fa-color-${c}`}
                      >
                        <span />
                      </IconButton>
                    ))}
                    <TextField
                      size="small"
                      placeholder="#hex"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      sx={{ width: 90 }}
                      inputProps={{ 'data-testid': 'fa-color-input' }}
                    />
                  </Box>
                </Box>

                {/* Animation */}
                <FormControl size="small" fullWidth>
                  <InputLabel>
                    {t(BrightHubStrings.PostComposer_IconAnimation)}
                  </InputLabel>
                  <Select
                    value={animation}
                    label={t(BrightHubStrings.PostComposer_IconAnimation)}
                    onChange={(e) => setAnimation(e.target.value)}
                    data-testid="fa-animation-select"
                  >
                    <MenuItem value="">
                      {t(BrightHubStrings.PostComposer_IconAnimationNone)}
                    </MenuItem>
                    {ANIMATION_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Rotation */}
                <FormControl size="small" fullWidth>
                  <InputLabel>
                    {t(BrightHubStrings.PostComposer_IconRotation)}
                  </InputLabel>
                  <Select
                    value={rotation}
                    label={t(BrightHubStrings.PostComposer_IconRotation)}
                    onChange={(e) => setRotation(e.target.value)}
                    data-testid="fa-rotation-select"
                  >
                    <MenuItem value="">
                      {t(BrightHubStrings.PostComposer_IconRotationNone)}
                    </MenuItem>
                    {ROTATION_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Size */}
                <FormControl size="small" fullWidth>
                  <InputLabel>
                    {t(BrightHubStrings.PostComposer_IconSize)}
                  </InputLabel>
                  <Select
                    value={size}
                    label={t(BrightHubStrings.PostComposer_IconSize)}
                    onChange={(e) => setSize(e.target.value)}
                    data-testid="fa-size-select"
                  >
                    <MenuItem value="">
                      {t(BrightHubStrings.PostComposer_IconSizeDefault)}
                    </MenuItem>
                    {SIZE_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Live preview */}
                {hasActiveOptions && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {t(BrightHubStrings.PostComposer_IconPreview)}:
                    </Typography>
                    <i
                      className={buildPreviewClass('star')}
                      style={{ fontSize: 24, ...(color ? { color } : {}) }}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontFamily: 'monospace', fontSize: 11 }}
                    >
                      {buildMarkup('star')}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Collapse>
          </>
        )}

        {/* Icon grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(${iconGridSize}px, 1fr))`,
            gap: 0.5,
            maxHeight: 300,
            overflowY: 'auto',
          }}
          data-testid="fa-icon-grid"
        >
          {filteredIcons.map((iconName) => {
            const fullClass = buildPreviewClass(iconName);
            return (
              <Tooltip
                key={`${selectedStyle.faPrefix}-${iconName}`}
                title={iconName}
                arrow
              >
                <IconButton
                  onClick={() => handleSelect(iconName)}
                  sx={{
                    width: iconGridSize,
                    height: iconGridSize,
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  data-testid={`fa-icon-${iconName}`}
                >
                  <i
                    className={fullClass}
                    style={{ fontSize: 18, ...(color ? { color } : {}) }}
                  />
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
            {t(BrightHubStrings.PostComposer_IconNoMatchTemplate).replace(
              '{0}',
              search,
            )}
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          {t(BrightHubStrings.PostComposer_Cancel)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default memo(FontAwesomeIconPicker);
