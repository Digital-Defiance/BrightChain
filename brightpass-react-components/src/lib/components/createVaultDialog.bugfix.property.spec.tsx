/**
 * Bug Condition Exploration Tests — CreateVaultDialog & VaultDetailView
 *
 * These tests encode the EXPECTED (correct) behavior. They are written
 * BEFORE the fix and are EXPECTED TO FAIL on unfixed code, confirming
 * the bugs exist.
 *
 * Bug 1: CreateVaultDialog does not auto-unlock after creation
 * Bug 2a: VaultDetailView "Add Entry" navigates to wrong URL (plural /vaults/)
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 */

// Async React property tests can exceed 5 s under parallel load — give them room.
jest.retryTimes(2, { logErrorsBeforeRetry: false });
jest.setTimeout(30000);

import type { VaultMetadata } from '@brightchain/brightchain-lib';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ vaultId: 'abc-123' }),
}));

const mockUnlockVault = jest.fn().mockResolvedValue(undefined);
const mockLockVault = jest.fn();
const mockIsVaultUnlocked = jest.fn().mockReturnValue(true);

jest.mock('../context/BrightPassProvider', () => ({
  useBrightPass: () => ({
    vault: {
      vaultId: 'abc-123',
      metadata: {
        id: 'abc-123',
        name: 'Test Vault',
        ownerId: 'owner-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        entryCount: 0,
        sharedWith: [],
        vcblBlockId: 'block-1',
      },
      propertyRecords: [],
    },
    unlockVault: mockUnlockVault,
    lockVault: mockLockVault,
    isVaultUnlocked: mockIsVaultUnlocked,
    autoLockTimeout: 900000,
    setAutoLockTimeout: jest.fn(),
  }),
  BrightPassProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const mockCreateVault = jest.fn();
jest.mock('../hooks/useBrightPassApi', () => ({
  useBrightPassApi: () => ({
    createVault: mockCreateVault,
  }),
}));

jest.mock('../hooks/useBrightPassTranslation', () => ({
  useBrightPassTranslation: () => ({
    t: (key: string) => key,
    tEnum: (_enumType: unknown, value: unknown) => String(value),
  }),
}));

// Mock formik to bypass form validation and directly test onSubmit behavior.
// We capture the onSubmit callback and invoke it directly.
let capturedOnSubmit:
  | ((values: Record<string, string>) => Promise<void>)
  | null = null;

jest.mock('formik', () => {
  const actual = jest.requireActual('formik');
  return {
    ...actual,
    useFormik: (config: {
      onSubmit: (values: Record<string, string>) => Promise<void>;
      initialValues: Record<string, string>;
    }) => {
      capturedOnSubmit = config.onSubmit;
      const formik = actual.useFormik({
        ...config,
        // Override validation to always pass so we can test onSubmit
        validationSchema: undefined,
        validate: () => ({}),
      });
      return formik;
    },
  };
});

// ── Imports (after mocks) ────────────────────────────────────────────

import VaultDetailView from '../views/VaultDetailView';
import CreateVaultDialog from './CreateVaultDialog';

// ── Helpers ──────────────────────────────────────────────────────────

function makeMockVaultMetadata(
  overrides: Partial<VaultMetadata> = {},
): VaultMetadata {
  return {
    id: 'test-vault-id',
    name: 'Test Vault',
    ownerId: 'owner-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    entryCount: 0,
    sharedWith: [],
    vcblBlockId: 'block-1' as unknown as VaultMetadata['vcblBlockId'],
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Bug Condition Exploration — CreateVaultDialog & VaultDetailView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnSubmit = null;
  });

  /**
   * Bug 1 — CreateVaultDialog does not auto-unlock after creation
   *
   * After successful vault creation, the dialog should:
   * 1. Call unlockVault(vaultId, masterPassword)
   * 2. Navigate to /brightpass/vault/{vaultId}
   *
   * On unfixed code, neither happens — the return value from createVault()
   * is discarded and unlockVault/navigate are never called.
   *
   * **Validates: Requirements 1.1**
   */
  describe('Bug 1: CreateVaultDialog auto-unlock after creation', () => {
    it('should call unlockVault with the vault ID and master password after successful creation', async () => {
      const mockVaultMetadata = makeMockVaultMetadata();
      mockCreateVault.mockResolvedValue(mockVaultMetadata);

      render(
        <CreateVaultDialog
          open={true}
          onClose={jest.fn()}
          onVaultCreated={jest.fn()}
        />,
      );

      // The useFormik mock captured the onSubmit callback.
      // Invoke it directly with valid form values to test the submission logic.
      expect(capturedOnSubmit).not.toBeNull();

      await act(async () => {
        await capturedOnSubmit!({
          name: 'My New Vault',
          masterPassword: 'StrongP@ss1234',
          confirmMasterPassword: 'StrongP@ss1234',
        });
      });

      // Verify createVault was called
      expect(mockCreateVault).toHaveBeenCalledWith(
        'My New Vault',
        'StrongP@ss1234',
      );

      // EXPECTED TO FAIL on unfixed code: unlockVault is never called
      expect(mockUnlockVault).toHaveBeenCalledWith(
        'test-vault-id',
        'StrongP@ss1234',
      );
    });

    it('should navigate to /brightpass/vault/{vaultId} after successful creation', async () => {
      const mockVaultMetadata = makeMockVaultMetadata();
      mockCreateVault.mockResolvedValue(mockVaultMetadata);

      render(
        <CreateVaultDialog
          open={true}
          onClose={jest.fn()}
          onVaultCreated={jest.fn()}
        />,
      );

      expect(capturedOnSubmit).not.toBeNull();

      await act(async () => {
        await capturedOnSubmit!({
          name: 'My New Vault',
          masterPassword: 'StrongP@ss1234',
          confirmMasterPassword: 'StrongP@ss1234',
        });
      });

      expect(mockCreateVault).toHaveBeenCalled();

      // EXPECTED TO FAIL on unfixed code: navigate is never called
      expect(mockNavigate).toHaveBeenCalledWith(
        '/brightpass/vault/test-vault-id',
      );
    });
  });

  /**
   * Bug 2a — VaultDetailView "Add Entry" navigates to wrong URL (plural)
   *
   * The "Add Entry" button should navigate to:
   *   /brightpass/vault/{vaultId}/entries/new  (singular "vault")
   *
   * On unfixed code, it navigates to:
   *   /brightpass/vaults/{vaultId}/entries/new  (plural "vaults")
   *
   * **Validates: Requirements 1.2**
   */
  describe('Bug 2a: VaultDetailView Add Entry navigation URL', () => {
    it('should navigate to singular /brightpass/vault/{vaultId}/entries/new when clicking Add Entry', () => {
      render(
        <MemoryRouter>
          <VaultDetailView />
        </MemoryRouter>,
      );

      // Find and click the "Add Entry" button
      const addEntryButton = screen.getByRole('button', {
        name: /VaultDetail_AddEntry/i,
      });
      fireEvent.click(addEntryButton);

      // EXPECTED TO FAIL on unfixed code: uses plural /vaults/ instead of singular /vault/
      expect(mockNavigate).toHaveBeenCalledWith(
        '/brightpass/vault/abc-123/entries/new',
      );
    });
  });
});
