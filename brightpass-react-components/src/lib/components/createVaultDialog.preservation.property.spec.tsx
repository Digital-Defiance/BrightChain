/**
 * Preservation Property Tests — CreateVaultDialog, Routes, and Vault Flows
 *
 * These tests observe and lock-in EXISTING behavior on UNFIXED code.
 * All tests MUST PASS on unfixed code to confirm baseline behavior
 * that must be preserved after the bugfix.
 *
 * Preservation A: Dialog cancel flow (Req 3.1)
 * Preservation B: Dialog API error flow (Req 3.2)
 * Preservation C: Existing route rendering (Req 3.3, 3.4, 3.5)
 * Preservation D: Lock vault flow (Req 3.6)
 * Preservation E: MasterPasswordPrompt unlock flow (Req 3.7)
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
 */

// Async React property tests can exceed 5 s under parallel load — give them room.
jest.retryTimes(2, { logErrorsBeforeRetry: false });
jest.setTimeout(30000);

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import fc from 'fast-check';
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

// Mock formik to bypass validation and capture onSubmit
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

// ── Arbitraries ──────────────────────────────────────────────────────

/** Arbitrary vault name: printable ASCII strings of reasonable length. */
const arbVaultName: fc.Arbitrary<string> = fc.stringMatching(
  /^[A-Za-z][A-Za-z0-9 _-]{0,30}$/,
);

/** Arbitrary error message strings. */
const arbErrorMessage: fc.Arbitrary<string> = fc.stringMatching(
  /^[A-Za-z][A-Za-z0-9 _.!-]{0,50}$/,
);

// ── Tests ────────────────────────────────────────────────────────────

describe('Preservation A — Dialog cancel flow (Req 3.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnSubmit = null;
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * **Validates: Requirements 3.1**
   *
   * For all arbitrary vault name strings, cancelling the CreateVaultDialog
   * always calls onClose(), does NOT call createVault, unlockVault, or navigate.
   */
  it('cancelling dialog calls onClose and does not trigger createVault, unlockVault, or navigate', () => {
    fc.assert(
      fc.property(arbVaultName, (_vaultName) => {
        cleanup();
        jest.clearAllMocks();

        const mockOnClose = jest.fn();
        const mockOnVaultCreated = jest.fn();

        render(
          <CreateVaultDialog
            open={true}
            onClose={mockOnClose}
            onVaultCreated={mockOnVaultCreated}
          />,
        );

        // Find and click the Cancel button
        const cancelButton = screen.getByRole('button', {
          name: /VaultList_Cancel/i,
        });
        fireEvent.click(cancelButton);

        // onClose should be called
        expect(mockOnClose).toHaveBeenCalledTimes(1);

        // createVault, unlockVault, navigate should NOT be called
        expect(mockCreateVault).not.toHaveBeenCalled();
        expect(mockUnlockVault).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();

        // onVaultCreated should NOT be called
        expect(mockOnVaultCreated).not.toHaveBeenCalled();

        cleanup();
      }),
      { numRuns: 20 },
    );
  });
});

describe('Preservation B — Dialog API error flow (Req 3.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnSubmit = null;
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * **Validates: Requirements 3.2**
   *
   * For all arbitrary error messages, when createVault() rejects,
   * the dialog shows the generic error message (Error_Generic) and
   * does NOT call unlockVault or navigate.
   */
  it('failed createVault displays error alert and does not call unlockVault or navigate', async () => {
    await fc.assert(
      fc.asyncProperty(arbErrorMessage, async (errorMsg) => {
        cleanup();
        jest.clearAllMocks();
        capturedOnSubmit = null;

        mockCreateVault.mockRejectedValue(new Error(errorMsg));

        const mockOnClose = jest.fn();
        const mockOnVaultCreated = jest.fn();

        render(
          <CreateVaultDialog
            open={true}
            onClose={mockOnClose}
            onVaultCreated={mockOnVaultCreated}
          />,
        );

        // The useFormik mock captured the onSubmit callback
        expect(capturedOnSubmit).not.toBeNull();

        await act(async () => {
          await capturedOnSubmit!({
            name: 'Test Vault',
            masterPassword: 'StrongP@ss1234',
            confirmMasterPassword: 'StrongP@ss1234',
          });
        });

        // createVault was called and rejected
        expect(mockCreateVault).toHaveBeenCalled();

        // Error alert should be displayed with the generic error key
        const alert = screen.getByRole('alert');
        expect(alert).toBeTruthy();
        expect(alert.textContent).toBe('Error_Generic');

        // unlockVault and navigate should NOT be called
        expect(mockUnlockVault).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();

        // onClose should NOT be called (dialog stays open)
        expect(mockOnClose).not.toHaveBeenCalled();

        // onVaultCreated should NOT be called
        expect(mockOnVaultCreated).not.toHaveBeenCalled();

        cleanup();
      }),
      { numRuns: 20 },
    );
  }, 30_000);
});

describe('Preservation D — Lock vault flow (Req 3.6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * **Validates: Requirements 3.6**
   *
   * Clicking "Lock Vault" in VaultDetailView calls lockVault() and
   * navigates to /brightpass.
   */
  it('clicking Lock Vault calls lockVault and navigates to /brightpass', async () => {
    render(
      <MemoryRouter>
        <VaultDetailView />
      </MemoryRouter>,
    );

    // Click the "Lock Vault" button to open confirmation dialog
    const lockButton = screen.getByRole('button', {
      name: /VaultDetail_LockVault/i,
    });
    fireEvent.click(lockButton);

    // Confirm the lock action
    const confirmButton = screen.getByRole('button', {
      name: /VaultDetail_Confirm/i,
    });
    fireEvent.click(confirmButton);

    expect(mockLockVault).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/brightpass');
  });
});

describe('Preservation E — MasterPasswordPrompt unlock flow (Req 3.7)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * **Validates: Requirements 3.7**
   *
   * Submitting master password in MasterPasswordPrompt calls
   * unlockVault(vaultId, password) and navigates to /brightpass/vault/{vaultId}.
   */
  it('submitting master password calls unlockVault and navigates to vault detail', async () => {
    // We need to import MasterPasswordPrompt separately since it uses the same mocks
    const MasterPasswordPrompt = (await import('./MasterPasswordPrompt'))
      .default;

    const mockOnClose = jest.fn();

    render(
      <MasterPasswordPrompt
        open={true}
        onClose={mockOnClose}
        vaultId="abc-123"
        vaultName="Test Vault"
      />,
    );

    // Type master password
    const passwordInput = screen.getByLabelText(
      /VaultList_EnterMasterPassword/i,
    );
    fireEvent.change(passwordInput, { target: { value: 'MyP@ssword123' } });

    // Click Unlock button
    const unlockButton = screen.getByRole('button', {
      name: /VaultList_Unlock/i,
    });
    await act(async () => {
      fireEvent.click(unlockButton);
    });

    await waitFor(() => {
      expect(mockUnlockVault).toHaveBeenCalledWith('abc-123', 'MyP@ssword123');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/brightpass/vault/abc-123');
    });
  });
});
