/**
 * PrincipalPicker — Autocomplete chip input for selecting users/groups.
 *
 * Accepts a `searchPrincipals` callback so the parent can wire it to
 * whatever user-search API is available (BrightHub, directory, etc.).
 * Falls back to a plain text field when no search function is provided.
 */
import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import {
  Autocomplete,
  Avatar,
  Chip,
  CircularProgress,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface IPrincipalOption {
  id: string;
  name: string;
  type: 'user' | 'group' | 'share_link';
  avatarUrl?: string;
  /** Secondary text shown below the name (e.g. email). */
  secondary?: string;
}

export interface IPrincipalPickerProps {
  /** Currently selected principals. */
  value: IPrincipalOption[];
  /** Called when the selection changes. */
  onChange: (selected: IPrincipalOption[]) => void;
  /**
   * Async search callback. Return matching principals for the query.
   * When omitted the picker degrades to a free-text chip input.
   */
  searchPrincipals?: (query: string) => Promise<IPrincipalOption[]>;
  /** Placeholder text. Falls back to the i18n ACL_UserOrGroupPlaceholder. */
  placeholder?: string;
  /** Debounce delay in ms (default 300). */
  debounceMs?: number;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PrincipalPicker({
  value,
  onChange,
  searchPrincipals,
  placeholder,
  debounceMs = 300,
  disabled = false,
}: IPrincipalPickerProps) {
  const { tBranded: t } = useI18n();
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<IPrincipalOption[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (!searchPrincipals || inputValue.trim().length < 2) {
      setOptions([]);
      return;
    }
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchPrincipals(inputValue.trim());
        // Filter out already-selected principals
        const selectedIds = new Set(value.map((v) => v.id));
        setOptions(results.filter((r) => !selectedIds.has(r.id)));
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, searchPrincipals, debounceMs, value]);

  const handleFreeSoloAdd = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      // Avoid duplicates
      if (value.some((v) => v.id === trimmed)) return;
      onChange([...value, { id: trimmed, name: trimmed, type: 'user' }]);
      setInputValue('');
    },
    [value, onChange],
  );

  if (!searchPrincipals) {
    // Free-text chip input fallback
    return (
      <Autocomplete
        multiple
        freeSolo
        options={[]}
        value={value}
        disabled={disabled}
        inputValue={inputValue}
        onInputChange={(_e, val) => setInputValue(val)}
        onChange={(_e, newVal) => {
          // newVal can contain strings (free solo) or IPrincipalOption objects
          const mapped = newVal.map((v) =>
            typeof v === 'string'
              ? { id: v, name: v, type: 'user' as const }
              : v,
          );
          onChange(mapped);
        }}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => {
            const { key, ...rest } = getTagProps({ index });
            return (
              <Chip
                key={key}
                label={option.name}
                size="small"
                icon={option.type === 'group' ? <GroupIcon /> : <PersonIcon />}
                {...rest}
              />
            );
          })
        }
        renderInput={(params) => {
          const { ref: inputRef, ...InputProps } = params.InputProps;
          return (
            <TextField
              {...params}
              size="small"
              placeholder={
                placeholder ??
                t(DigitalBurnbagStrings.ACL_UserOrGroupPlaceholder)
              }
              InputProps={InputProps}
              inputRef={inputRef}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputValue.trim()) {
                  e.preventDefault();
                  handleFreeSoloAdd(inputValue);
                }
              }}
            />
          );
        }}
        getOptionLabel={(o) => (typeof o === 'string' ? o : o.name)}
        isOptionEqualToValue={(a, b) => a.id === b.id}
      />
    );
  }

  // Autocomplete with search
  return (
    <Autocomplete
      multiple
      options={options}
      value={value}
      disabled={disabled}
      loading={loading}
      inputValue={inputValue}
      onInputChange={(_e, val, reason) => {
        if (reason !== 'reset') setInputValue(val);
      }}
      onChange={(_e, newVal) => {
        onChange(newVal);
        setInputValue('');
      }}
      filterOptions={(x) => x} // server-side filtering
      getOptionLabel={(o) => o.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const { key, ...rest } = getTagProps({ index });
          return (
            <Chip
              key={key}
              avatar={
                option.avatarUrl ? (
                  <Avatar
                    src={option.avatarUrl}
                    sx={{ width: 20, height: 20 }}
                  />
                ) : undefined
              }
              icon={
                !option.avatarUrl ? (
                  option.type === 'group' ? (
                    <GroupIcon />
                  ) : (
                    <PersonIcon />
                  )
                ) : undefined
              }
              label={option.name}
              size="small"
              {...rest}
            />
          );
        })
      }
      renderOption={(props, option) => {
        const { key, ...rest } =
          props as React.HTMLAttributes<HTMLLIElement> & { key: string };
        return (
          <ListItem key={key} {...rest} dense>
            <ListItemAvatar sx={{ minWidth: 36 }}>
              {option.avatarUrl ? (
                <Avatar src={option.avatarUrl} sx={{ width: 24, height: 24 }} />
              ) : option.type === 'group' ? (
                <GroupIcon fontSize="small" />
              ) : (
                <PersonIcon fontSize="small" />
              )}
            </ListItemAvatar>
            <ListItemText
              primary={option.name}
              secondary={option.secondary}
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
        );
      }}
      renderInput={(params) => {
        const { ref: inputRef, ...InputProps } = params.InputProps;
        return (
          <TextField
            {...params}
            size="small"
            placeholder={
              placeholder ?? t(DigitalBurnbagStrings.ACL_UserOrGroupPlaceholder)
            }
            InputProps={{
              ...InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress color="inherit" size={16} />}
                  {InputProps.endAdornment}
                </>
              ),
            }}
            inputRef={inputRef}
          />
        );
      }}
    />
  );
}

export default PrincipalPicker;
