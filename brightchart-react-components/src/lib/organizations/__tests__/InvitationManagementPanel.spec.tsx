/**
 * Unit tests for InvitationManagementPanel component.
 *
 * Tests: role selector, token display, clipboard copy, expiration, 403 handling.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 *
 * @module organizations/__tests__/InvitationManagementPanel.spec
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockCreateInvitation = jest.fn();

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useAuthenticatedApi: () => ({}),
}));

jest.mock('../hooks/useOrgApi', () => ({
  useOrgApi: () => ({
    createInvitation: mockCreateInvitation,
  }),
}));

import { InvitationManagementPanel } from '../components/InvitationManagementPanel';

// ─── Helpers ────────────────────────────────────────────────────────────────

const defaultProps = {
  organizationId: 'org-123',
};

function renderPanel(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<InvitationManagementPanel {...props} />);
}

const mockInvitation = {
  _id: 'inv-1',
  token: 'abc-token-xyz-123',
  organizationId: 'org-123',
  roleCode: '309343006',
  createdBy: 'member-1',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('InvitationManagementPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  describe('Requirement 6.1: role selector and form', () => {
    it('renders the heading', () => {
      renderPanel();
      expect(
        screen.getByRole('heading', { name: 'Create Invitation' }),
      ).toBeTruthy();
    });

    it('renders a role code selector', () => {
      renderPanel();
      expect(screen.getByTestId('role-code-select')).toBeTruthy();
    });

    it('renders an optional target email field', () => {
      renderPanel();
      expect(screen.getByTestId('target-email-input')).toBeTruthy();
    });

    it('renders the create button', () => {
      renderPanel();
      expect(screen.getByTestId('create-invitation-btn')).toBeTruthy();
    });

    it('shows error when no role is selected', async () => {
      renderPanel();
      fireEvent.click(screen.getByTestId('create-invitation-btn'));

      await waitFor(() => {
        expect(screen.getByText('Please select a role code.')).toBeTruthy();
      });
      expect(mockCreateInvitation).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 6.2: invitation creation', () => {
    it('sends POST with org ID, role code, and optional email', async () => {
      mockCreateInvitation.mockResolvedValue(mockInvitation);

      renderPanel();

      // Select role
      const selectInput = screen.getByTestId('role-code-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });

      // Enter email
      fireEvent.change(screen.getByTestId('target-email-input'), {
        target: { value: 'doctor@example.com' },
      });

      fireEvent.click(screen.getByTestId('create-invitation-btn'));

      await waitFor(() => {
        expect(mockCreateInvitation).toHaveBeenCalledWith({
          organizationId: 'org-123',
          roleCode: '309343006',
          targetEmail: 'doctor@example.com',
        });
      });
    });

    it('sends POST without email when email is empty', async () => {
      mockCreateInvitation.mockResolvedValue(mockInvitation);

      renderPanel();

      const selectInput = screen.getByTestId('role-code-select-input');
      fireEvent.change(selectInput, { target: { value: 'ADMIN' } });

      fireEvent.click(screen.getByTestId('create-invitation-btn'));

      await waitFor(() => {
        expect(mockCreateInvitation).toHaveBeenCalledWith({
          organizationId: 'org-123',
          roleCode: 'ADMIN',
        });
      });
    });

    it('displays the generated token on success', async () => {
      mockCreateInvitation.mockResolvedValue(mockInvitation);

      renderPanel();

      const selectInput = screen.getByTestId('role-code-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });
      fireEvent.click(screen.getByTestId('create-invitation-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('invitation-result')).toBeTruthy();
        expect(screen.getByTestId('invitation-token').textContent).toBe(
          'abc-token-xyz-123',
        );
      });
    });
  });

  describe('Requirement 6.3: clipboard copy', () => {
    it('copies token to clipboard when copy button is clicked', async () => {
      mockCreateInvitation.mockResolvedValue(mockInvitation);

      renderPanel();

      const selectInput = screen.getByTestId('role-code-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });
      fireEvent.click(screen.getByTestId('create-invitation-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('copy-token-btn')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('copy-token-btn'));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          'abc-token-xyz-123',
        );
      });
    });

    it('shows "Copied!" confirmation after copying', async () => {
      mockCreateInvitation.mockResolvedValue(mockInvitation);

      renderPanel();

      const selectInput = screen.getByTestId('role-code-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });
      fireEvent.click(screen.getByTestId('create-invitation-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('copy-token-btn')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('copy-token-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('copy-token-btn').textContent).toBe(
          'Copied!',
        );
      });
    });
  });

  describe('Requirement 6.4: expiration display', () => {
    it('displays the expiration date', async () => {
      mockCreateInvitation.mockResolvedValue(mockInvitation);

      renderPanel();

      const selectInput = screen.getByTestId('role-code-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });
      fireEvent.click(screen.getByTestId('create-invitation-btn'));

      await waitFor(() => {
        const expirationEl = screen.getByTestId('invitation-expiration');
        expect(expirationEl.textContent).toContain('Expires:');
        // Should contain a date string
        expect(expirationEl.textContent!.length).toBeGreaterThan(
          'Expires: '.length,
        );
      });
    });
  });

  describe('Requirement 6.5: 403 handling', () => {
    it('shows permission error on 403', async () => {
      mockCreateInvitation.mockRejectedValue(new Error('Forbidden'));

      renderPanel();

      const selectInput = screen.getByTestId('role-code-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });
      fireEvent.click(screen.getByTestId('create-invitation-btn'));

      await waitFor(() => {
        expect(
          screen.getByText(
            'You do not have permission to create invitations at this organization.',
          ),
        ).toBeTruthy();
      });
    });
  });

  describe('Requirement 6.6: INVALID_ROLE_CODE handling', () => {
    it('shows error message for INVALID_ROLE_CODE', async () => {
      mockCreateInvitation.mockRejectedValue(
        new Error('INVALID_ROLE_CODE: role code is not valid'),
      );

      renderPanel();

      const selectInput = screen.getByTestId('role-code-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });
      fireEvent.click(screen.getByTestId('create-invitation-btn'));

      await waitFor(() => {
        expect(
          screen.getByText('INVALID_ROLE_CODE: role code is not valid'),
        ).toBeTruthy();
      });
    });
  });

  describe('Requirement 6.7: loading state', () => {
    it('disables submit button and shows loading indicator while submitting', async () => {
      let resolveCreate!: (value: unknown) => void;
      mockCreateInvitation.mockReturnValue(
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
      );

      renderPanel();

      const selectInput = screen.getByTestId('role-code-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });
      fireEvent.click(screen.getByTestId('create-invitation-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('create-invitation-btn')).toBeDisabled();
        expect(screen.getByTestId('loading-indicator')).toBeTruthy();
      });

      resolveCreate(mockInvitation);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).toBeNull();
      });
    });
  });

  describe('Create another', () => {
    it('resets form when "Create Another" is clicked', async () => {
      mockCreateInvitation.mockResolvedValue(mockInvitation);

      renderPanel();

      const selectInput = screen.getByTestId('role-code-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });
      fireEvent.click(screen.getByTestId('create-invitation-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('invitation-result')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('create-another-btn'));

      expect(screen.queryByTestId('invitation-result')).toBeNull();
      expect(screen.getByTestId('role-code-select')).toBeTruthy();
      expect(screen.getByTestId('create-invitation-btn')).toBeTruthy();
    });
  });
});
