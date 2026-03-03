/**
 * PasswordGeneratorWidget — reusable password generator component.
 *
 * Can be used standalone (on the generator page) or inline (from EntryForm).
 * When `onUsePassword` is provided, a "Use Password" button is shown.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import type {
  IGeneratedPassword,
  IPasswordGenerationOptions,
} from '@brightchain/brightchain-lib';
import {
  BrightPassStrings,
  type BrightPassStringKey,
} from '@brightchain/brightchain-lib';
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Slider,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useRef, useState } from 'react';

import { useBrightPassTranslation } from '../hooks/useBrightPassTranslation';
import { useBrightPassApi } from '../hooks/useBrightPassApi';

/**
 * Pure function to classify password strength based on entropy bits.
 * Exported for property-based testing (Property 8).
 */
export function classifyStrength(
  entropy: number,
): 'weak' | 'fair' | 'strong' | 'very_strong' {
  if (entropy < 40) return 'weak';
  if (entropy < 60) return 'fair';
  if (entropy < 80) return 'strong';
  return 'very_strong';
}

interface PasswordGeneratorWidgetProps {
  onUsePassword?: (password: string) => void;
}

const STRENGTH_COLORS: Record<string, string> = {
  weak: '#d32f2f',
  fair: '#ed6c02',
  strong: '#2e7d32',
  very_strong: '#1565c0',
};

const STRENGTH_PROGRESS: Record<string, number> = {
  weak: 25,
  fair: 50,
  strong: 75,
  very_strong: 100,
};

const CLIPBOARD_CLEAR_MS = 30_000;

const STRENGTH_LABEL_KEYS = {
  weak: BrightPassStrings.PasswordGen_Strength_Weak,
  fair: BrightPassStrings.PasswordGen_Strength_Fair,
  strong: BrightPassStrings.PasswordGen_Strength_Strong,
  very_strong: BrightPassStrings.PasswordGen_Strength_VeryStrong,
} as const;

type ToggleField = keyof Omit<IPasswordGenerationOptions, 'length'>;

const TOGGLE_FIELDS: readonly {
  readonly field: ToggleField;
  readonly labelKey: BrightPassStringKey;
}[] = [
  { field: 'uppercase', labelKey: BrightPassStrings.PasswordGen_Uppercase },
  { field: 'lowercase', labelKey: BrightPassStrings.PasswordGen_Lowercase },
  { field: 'digits', labelKey: BrightPassStrings.PasswordGen_Digits },
  { field: 'symbols', labelKey: BrightPassStrings.PasswordGen_Symbols },
];

export const PasswordGeneratorWidget: React.FC<
  PasswordGeneratorWidgetProps
> = ({ onUsePassword }) => {
  const { t } = useBrightPassTranslation();
  const brightPassApi = useBrightPassApi();

  const [options, setOptions] = useState<IPasswordGenerationOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    digits: true,
    symbols: true,
  });

  const [result, setResult] = useState<IGeneratedPassword | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clipboardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setCopied(false);
    try {
      const generated = await brightPassApi.generatePassword(options);
      setResult(generated);
    } catch (err) {
      const message =
        (err as { message?: string })?.message ?? 'Generation failed';
      setError(message);
    } finally {
      setGenerating(false);
    }
  }, [options]);

  const handleCopy = useCallback(async () => {
    if (!result?.password) return;

    try {
      await navigator.clipboard.writeText(result.password);
      setCopied(true);

      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);

      if (clipboardTimerRef.current) {
        clearTimeout(clipboardTimerRef.current);
      }
      clipboardTimerRef.current = setTimeout(async () => {
        try {
          await navigator.clipboard.writeText('');
        } catch {
          // Clipboard API may not be available in background
        }
      }, CLIPBOARD_CLEAR_MS);
    } catch {
      // Clipboard write failed
    }
  }, [result]);

  const handleUsePassword = useCallback(() => {
    if (result?.password && onUsePassword) {
      onUsePassword(result.password);
    }
  }, [result, onUsePassword]);

  const updateToggle = useCallback((field: ToggleField) => {
    setOptions((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const strength = result?.strength ?? null;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t(BrightPassStrings.PasswordGen_Title)}
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography gutterBottom>
          {t(BrightPassStrings.PasswordGen_Length)}: {options.length}
        </Typography>
        <Slider
          value={options.length}
          min={8}
          max={128}
          onChange={(_, value) =>
            setOptions((prev) => ({
              ...prev,
              length: value as number,
            }))
          }
          aria-label={t(BrightPassStrings.PasswordGen_Length)}
        />
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        {TOGGLE_FIELDS.map(({ field, labelKey }) => (
          <Box
            key={field}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <Switch
              checked={options[field]}
              onChange={() => updateToggle(field)}
              inputProps={{
                'aria-label': t(labelKey as BrightPassStringKey),
              }}
            />
            <Typography variant="body2">
              {t(labelKey as BrightPassStringKey)}
            </Typography>
          </Box>
        ))}
      </Box>

      <Button
        variant="contained"
        onClick={handleGenerate}
        disabled={generating}
        sx={{ mb: 2 }}
      >
        {t(BrightPassStrings.PasswordGen_Generate)}
      </Button>

      {error && (
        <Typography color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      {result && (
        <Box sx={{ mb: 2 }}>
          <TextField
            value={result.password}
            fullWidth
            slotProps={{ input: { readOnly: true } }}
            sx={{ mb: 1, fontFamily: 'monospace' }}
          />

          {strength && (
            <Box sx={{ mb: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 0.5,
                }}
              >
                <Chip
                  label={t(STRENGTH_LABEL_KEYS[strength])}
                  size="small"
                  sx={{
                    backgroundColor: STRENGTH_COLORS[strength],
                    color: '#fff',
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {t(BrightPassStrings.PasswordGen_Entropy, {
                    BITS: String(Math.round(result.entropy)),
                  })}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={STRENGTH_PROGRESS[strength]}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: STRENGTH_COLORS[strength],
                  },
                }}
              />
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={handleCopy}>
              {copied
                ? t(BrightPassStrings.PasswordGen_Copied)
                : t(BrightPassStrings.PasswordGen_Copy)}
            </Button>
            {onUsePassword && (
              <Button variant="contained" onClick={handleUsePassword}>
                {t(BrightPassStrings.PasswordGen_UsePassword)}
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PasswordGeneratorWidget;
