/**
 * EntryForm — Tabbed form for creating/editing vault entries.
 *
 * - Tabs for Login, Secure Note, Credit Card, Identity entry types
 * - Pre-populates fields when editing an existing entry
 * - Tab is locked to the entry's type when editing
 * - Inline password generator placeholder (widget created in Task 8.1)
 * - TOTP secret input accepting base32 or otpauth:// URI
 * - Calls createEntry or updateEntry on submit
 *
 * Requirements: 4.5, 4.6, 4.7, 4.8, 6.5, 7.5
 */

import type {
  CreditCardEntry,
  IdentityEntry,
  LoginEntry,
  SecureNoteEntry,
  VaultEntry,
  VaultEntryType,
} from '@brightchain/brightchain-lib';
import { BrightPassStrings } from '@brightchain/brightpass-lib';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Tab,
  Tabs,
  TextField,
} from '@mui/material';
import React, { useCallback, useMemo, useState } from 'react';
import { useBrightPassApi } from '../hooks/useBrightPassApi';
import { useBrightPassTranslation } from '../hooks/useBrightPassTranslation';

export interface EntryFormProps {
  vaultId: string;
  entry?: VaultEntry;
  onSave?: (entry: VaultEntry) => void;
  onCancel?: () => void;
}

const ENTRY_TYPES: VaultEntryType[] = [
  'login',
  'secure_note',
  'credit_card',
  'identity',
];

const TYPE_TO_STRING_KEY: Record<
  VaultEntryType,
  string & keyof typeof BrightPassStrings
> = {
  login: 'EntryType_Login',
  secure_note: 'EntryType_SecureNote',
  credit_card: 'EntryType_CreditCard',
  identity: 'EntryType_Identity',
};

interface CommonFields {
  title: string;
  notes: string;
  tags: string;
  favorite: boolean;
}

interface LoginFields {
  siteUrl: string;
  username: string;
  password: string;
  totpSecret: string;
}

interface SecureNoteFields {
  content: string;
}

interface CreditCardFields {
  cardholderName: string;
  cardNumber: string;
  expirationDate: string;
  cvv: string;
}

interface IdentityFields {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

function getInitialCommon(entry?: VaultEntry): CommonFields {
  return {
    title: entry?.title ?? '',
    notes: entry?.notes ?? '',
    tags: entry?.tags?.join(', ') ?? '',
    favorite: entry?.favorite ?? false,
  };
}

function getInitialLogin(entry?: VaultEntry): LoginFields {
  const e = entry?.type === 'login' ? entry : undefined;
  return {
    siteUrl: e?.siteUrl ?? '',
    username: e?.username ?? '',
    password: e?.password ?? '',
    totpSecret: e?.totpSecret ?? '',
  };
}

function getInitialSecureNote(entry?: VaultEntry): SecureNoteFields {
  const e = entry?.type === 'secure_note' ? entry : undefined;
  return { content: e?.content ?? '' };
}

function getInitialCreditCard(entry?: VaultEntry): CreditCardFields {
  const e = entry?.type === 'credit_card' ? entry : undefined;
  return {
    cardholderName: e?.cardholderName ?? '',
    cardNumber: e?.cardNumber ?? '',
    expirationDate: e?.expirationDate ?? '',
    cvv: e?.cvv ?? '',
  };
}

function getInitialIdentity(entry?: VaultEntry): IdentityFields {
  const e = entry?.type === 'identity' ? entry : undefined;
  return {
    firstName: e?.firstName ?? '',
    lastName: e?.lastName ?? '',
    email: e?.email ?? '',
    phone: e?.phone ?? '',
    address: e?.address ?? '',
  };
}

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function buildEntry(
  type: VaultEntryType,
  common: CommonFields,
  login: LoginFields,
  secureNote: SecureNoteFields,
  creditCard: CreditCardFields,
  identity: IdentityFields,
  existingEntry?: VaultEntry,
): VaultEntry {
  const now = new Date();
  const base = {
    id: existingEntry?.id ?? '',
    title: common.title,
    notes: common.notes || undefined,
    tags: parseTags(common.tags),
    favorite: common.favorite,
    createdAt: existingEntry?.createdAt ?? now,
    updatedAt: now,
    attachments: existingEntry?.attachments,
  };

  switch (type) {
    case 'login':
      return {
        ...base,
        type: 'login',
        siteUrl: login.siteUrl,
        username: login.username,
        password: login.password,
        totpSecret: login.totpSecret || undefined,
      } as LoginEntry;
    case 'secure_note':
      return {
        ...base,
        type: 'secure_note',
        content: secureNote.content,
      } as SecureNoteEntry;
    case 'credit_card':
      return {
        ...base,
        type: 'credit_card',
        cardholderName: creditCard.cardholderName,
        cardNumber: creditCard.cardNumber,
        expirationDate: creditCard.expirationDate,
        cvv: creditCard.cvv,
      } as CreditCardEntry;
    case 'identity':
      return {
        ...base,
        type: 'identity',
        firstName: identity.firstName,
        lastName: identity.lastName,
        email: identity.email || undefined,
        phone: identity.phone || undefined,
        address: identity.address || undefined,
      } as IdentityEntry;
  }
}

const EntryForm: React.FC<EntryFormProps> = ({
  vaultId,
  entry,
  onSave,
  onCancel,
}) => {
  const { t } = useBrightPassTranslation();
  const isEditing = Boolean(entry);
  const brightPassApi = useBrightPassApi();

  const [activeType, setActiveType] = useState<VaultEntryType>(
    entry?.type ?? 'login',
  );
  const [common, setCommon] = useState<CommonFields>(() =>
    getInitialCommon(entry),
  );
  const [login, setLogin] = useState<LoginFields>(() => getInitialLogin(entry));
  const [secureNote, setSecureNote] = useState<SecureNoteFields>(() =>
    getInitialSecureNote(entry),
  );
  const [creditCard, setCreditCard] = useState<CreditCardFields>(() =>
    getInitialCreditCard(entry),
  );
  const [identity, setIdentity] = useState<IdentityFields>(() =>
    getInitialIdentity(entry),
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabIndex = useMemo(() => ENTRY_TYPES.indexOf(activeType), [activeType]);

  const handleTabChange = useCallback(
    (_: React.SyntheticEvent, newIndex: number) => {
      if (!isEditing) {
        setActiveType(ENTRY_TYPES[newIndex]);
      }
    },
    [isEditing],
  );

  const updateCommon = useCallback(
    (field: keyof CommonFields, value: string | boolean) => {
      setCommon((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSubmitting(true);

      const builtEntry = buildEntry(
        activeType,
        common,
        login,
        secureNote,
        creditCard,
        identity,
        entry,
      );

      try {
        let saved: VaultEntry;
        if (isEditing && entry) {
          saved = await brightPassApi.updateEntry(
            vaultId,
            entry.id,
            builtEntry,
          );
        } else {
          saved = await brightPassApi.createEntry(vaultId, builtEntry);
        }
        onSave?.(saved);
      } catch (err) {
        const message =
          (err as { message?: string })?.message ??
          t(BrightPassStrings.Error_Generic);
        setError(message);
      } finally {
        setSubmitting(false);
      }
    },
    [
      activeType,
      common,
      login,
      secureNote,
      creditCard,
      identity,
      entry,
      isEditing,
      vaultId,
      onSave,
      t,
    ],
  );

  const renderLoginFields = () => (
    <>
      <TextField
        label={t(BrightPassStrings.EntryDetail_SiteUrl)}
        value={login.siteUrl}
        onChange={(e) =>
          setLogin((prev) => ({ ...prev, siteUrl: e.target.value }))
        }
        fullWidth
        margin="dense"
      />
      <TextField
        label={t(BrightPassStrings.EntryDetail_Username)}
        value={login.username}
        onChange={(e) =>
          setLogin((prev) => ({ ...prev, username: e.target.value }))
        }
        fullWidth
        margin="dense"
      />
      <Box display="flex" gap={1} alignItems="flex-start">
        <TextField
          label={t(BrightPassStrings.EntryDetail_Password)}
          value={login.password}
          onChange={(e) =>
            setLogin((prev) => ({ ...prev, password: e.target.value }))
          }
          fullWidth
          margin="dense"
          type="password"
        />
        <Button
          variant="outlined"
          sx={{ mt: 1, whiteSpace: 'nowrap' }}
          disabled
        >
          {t(BrightPassStrings.EntryForm_GeneratePassword)}
        </Button>
      </Box>
      <TextField
        label={t(BrightPassStrings.EntryDetail_TotpSecret)}
        value={login.totpSecret}
        onChange={(e) =>
          setLogin((prev) => ({ ...prev, totpSecret: e.target.value }))
        }
        fullWidth
        margin="dense"
        helperText={t(BrightPassStrings.EntryForm_TotpSecretHelp)}
      />
    </>
  );

  const renderSecureNoteFields = () => (
    <TextField
      label={t(BrightPassStrings.EntryDetail_Content)}
      value={secureNote.content}
      onChange={(e) =>
        setSecureNote((prev) => ({ ...prev, content: e.target.value }))
      }
      fullWidth
      margin="dense"
      multiline
      minRows={4}
    />
  );

  const renderCreditCardFields = () => (
    <>
      <TextField
        label={t(BrightPassStrings.EntryDetail_CardholderName)}
        value={creditCard.cardholderName}
        onChange={(e) =>
          setCreditCard((prev) => ({
            ...prev,
            cardholderName: e.target.value,
          }))
        }
        fullWidth
        margin="dense"
      />
      <TextField
        label={t(BrightPassStrings.EntryDetail_CardNumber)}
        value={creditCard.cardNumber}
        onChange={(e) =>
          setCreditCard((prev) => ({ ...prev, cardNumber: e.target.value }))
        }
        fullWidth
        margin="dense"
      />
      <TextField
        label={t(BrightPassStrings.EntryDetail_ExpirationDate)}
        value={creditCard.expirationDate}
        onChange={(e) =>
          setCreditCard((prev) => ({
            ...prev,
            expirationDate: e.target.value,
          }))
        }
        fullWidth
        margin="dense"
      />
      <TextField
        label={t(BrightPassStrings.EntryDetail_CVV)}
        value={creditCard.cvv}
        onChange={(e) =>
          setCreditCard((prev) => ({ ...prev, cvv: e.target.value }))
        }
        fullWidth
        margin="dense"
      />
    </>
  );

  const renderIdentityFields = () => (
    <>
      <TextField
        label={t(BrightPassStrings.EntryDetail_FirstName)}
        value={identity.firstName}
        onChange={(e) =>
          setIdentity((prev) => ({ ...prev, firstName: e.target.value }))
        }
        fullWidth
        margin="dense"
      />
      <TextField
        label={t(BrightPassStrings.EntryDetail_LastName)}
        value={identity.lastName}
        onChange={(e) =>
          setIdentity((prev) => ({ ...prev, lastName: e.target.value }))
        }
        fullWidth
        margin="dense"
      />
      <TextField
        label={t(BrightPassStrings.EntryDetail_Email)}
        value={identity.email}
        onChange={(e) =>
          setIdentity((prev) => ({ ...prev, email: e.target.value }))
        }
        fullWidth
        margin="dense"
      />
      <TextField
        label={t(BrightPassStrings.EntryDetail_Phone)}
        value={identity.phone}
        onChange={(e) =>
          setIdentity((prev) => ({ ...prev, phone: e.target.value }))
        }
        fullWidth
        margin="dense"
      />
      <TextField
        label={t(BrightPassStrings.EntryDetail_Address)}
        value={identity.address}
        onChange={(e) =>
          setIdentity((prev) => ({ ...prev, address: e.target.value }))
        }
        fullWidth
        margin="dense"
        multiline
        minRows={2}
      />
    </>
  );

  const renderTypeFields = () => {
    switch (activeType) {
      case 'login':
        return renderLoginFields();
      case 'secure_note':
        return renderSecureNoteFields();
      case 'credit_card':
        return renderCreditCardFields();
      case 'identity':
        return renderIdentityFields();
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Tabs value={tabIndex} onChange={handleTabChange} sx={{ mb: 2 }}>
        {ENTRY_TYPES.map((type) => (
          <Tab
            key={type}
            label={t(BrightPassStrings[TYPE_TO_STRING_KEY[type]])}
            disabled={isEditing && type !== entry?.type}
          />
        ))}
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Common fields */}
      <TextField
        label={t(BrightPassStrings.EntryForm_FieldTitle)}
        value={common.title}
        onChange={(e) => updateCommon('title', e.target.value)}
        fullWidth
        margin="dense"
        required
      />

      {/* Type-specific fields */}
      {renderTypeFields()}

      {/* Common optional fields */}
      <TextField
        label={t(BrightPassStrings.EntryForm_FieldNotes)}
        value={common.notes}
        onChange={(e) => updateCommon('notes', e.target.value)}
        fullWidth
        margin="dense"
        multiline
        minRows={2}
      />
      <TextField
        label={t(BrightPassStrings.EntryForm_FieldTags)}
        value={common.tags}
        onChange={(e) => updateCommon('tags', e.target.value)}
        fullWidth
        margin="dense"
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={common.favorite}
            onChange={(e) => updateCommon('favorite', e.target.checked)}
          />
        }
        label={t(BrightPassStrings.EntryForm_FieldFavorite)}
      />

      {/* Actions */}
      <Box display="flex" gap={1} justifyContent="flex-end" mt={2}>
        <Button onClick={onCancel} disabled={submitting}>
          {t(BrightPassStrings.EntryForm_Cancel)}
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={submitting || !common.title.trim()}
        >
          {submitting ? (
            <CircularProgress size={20} />
          ) : (
            t(BrightPassStrings.EntryForm_Save)
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default EntryForm;
