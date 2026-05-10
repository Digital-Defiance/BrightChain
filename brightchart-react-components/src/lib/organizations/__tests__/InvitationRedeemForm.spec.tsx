/**
 * Unit tests for InvitationRedeemForm component.
 *
 * Tests: token field, submission, success message with role/org,
 * 410 error, role refetch.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 *
 * @module organizations/__tests__/InvitationRedeemForm.spec
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRedeemInvitation = jest.fn();
const mockRefetchRoles = jest.fn();

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useAuthenticatedApi: () => ({}),
}));

jest.mock('../../shell/contexts/ActiveContext', () => ({
  useActiveContext: () => ({
    refetchRoles: mockRefetchRoles,
    member: { memberId: 'member-1', username: 'test', type: 'User' },
    healthcareRoles: [],
    activeRole: { roleCode: 'PATIENT' },
    specialtyProfile: {},
    switchRole: jest.fn(),
    setActivePatient: jest.fn(),
    setActiveEncounter: jest.fn(),
  }),
}));

jest.mock('../hooks/useOrgApi', () => ({
  useOrgApi: () => ({
    redeemInvitation: mockRedeemInvitation,
  }),
}));

import { InvitationRedeemForm } from '../components/InvitationRedeemForm';

// ─── Helpers ────────────────────────────────────────────────────────────────

const defaultProps = {
  onRedeemed: jest.fn(),
};

function renderForm(
  overrides: Partial<typeof defaultProps & { initialToken?: string }> = {},
) {
  const props = { ...defaultProps, ...overrides };
  return render(<InvitationRedeemForm {...props} />);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('InvitationRedeemForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 8.1: token field', () => {
    it('renders a token text field', () => {
      renderForm();
      expect(screen.getByTestId('redeem-token-input')).toBeTruthy();
    });

    it('pre-fills token from initialToken prop', () => {
      renderForm({ initialToken: 'pre-filled-token' });
      const input = screen.getByTestId(
        'redeem-token-input',
      ) as HTMLInputElement;
      expect(input.value).toBe('pre-filled-token');
    });

    it('renders the heading', () => {
      renderForm();
      expect(screen.getByText('Redeem Invitation')).toBeTruthy();
    });

    it('renders the submit button', () => {
      renderForm();
      expect(screen.getByTestId('redeem-submit-btn')).toBeTruthy();
    });
  });

  describe('Requirement 8.2: submission', () => {
    it('sends POST with token on submit', async () => {
      mockRedeemInvitation.mockResolvedValue({
        role: { _id: 'role-1', roleDisplay: 'Physician' },
        organizationName: 'Test Clinic',
      });

      renderForm();

      fireEvent.change(screen.getByTestId('redeem-token-input'), {
        target: { value: 'valid-token-123' },
      });
      fireEvent.click(screen.getByTestId('redeem-submit-btn'));

      await waitFor(() => {
        expect(mockRedeemInvitation).toHaveBeenCalledWith({
          token: 'valid-token-123',
        });
      });
    });

    it('shows validation error for empty token', async () => {
      renderForm();

      fireEvent.click(screen.getByTestId('redeem-submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Invitation token is required')).toBeTruthy();
      });

      expect(mockRedeemInvitation).not.toHaveBeenCalled();
    });

    it('clears validation error when user types', async () => {
      renderForm();

      fireEvent.click(screen.getByTestId('redeem-submit-btn'));
      await waitFor(() => {
        expect(screen.getByText('Invitation token is required')).toBeTruthy();
      });

      fireEvent.change(screen.getByTestId('redeem-token-input'), {
        target: { value: 'a' },
      });

      expect(screen.queryByText('Invitation token is required')).toBeNull();
    });
  });

  describe('Requirement 8.3: success message', () => {
    it('displays role name and org name on success', async () => {
      mockRedeemInvitation.mockResolvedValue({
        role: { _id: 'role-1', roleDisplay: 'Physician' },
        organizationName: 'Test Clinic',
      });
      const onRedeemed = jest.fn();

      renderForm({ onRedeemed });

      fireEvent.change(screen.getByTestId('redeem-token-input'), {
        target: { value: 'valid-token' },
      });
      fireEvent.click(screen.getByTestId('redeem-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('redeem-success')).toBeTruthy();
        expect(screen.getByText(/Physician/)).toBeTruthy();
        expect(screen.getByText(/Test Clinic/)).toBeTruthy();
      });
    });

    it('calls onRedeemed with role name and org name', async () => {
      mockRedeemInvitation.mockResolvedValue({
        role: { _id: 'role-1', roleDisplay: 'Nurse' },
        organizationName: 'Health Center',
      });
      const onRedeemed = jest.fn();

      renderForm({ onRedeemed });

      fireEvent.change(screen.getByTestId('redeem-token-input'), {
        target: { value: 'valid-token' },
      });
      fireEvent.click(screen.getByTestId('redeem-submit-btn'));

      await waitFor(() => {
        expect(onRedeemed).toHaveBeenCalledWith('Nurse', 'Health Center');
      });
    });

    it('calls refetchRoles on success', async () => {
      mockRedeemInvitation.mockResolvedValue({
        role: { _id: 'role-1', roleDisplay: 'Patient' },
        organizationName: 'Clinic',
      });

      renderForm();

      fireEvent.change(screen.getByTestId('redeem-token-input'), {
        target: { value: 'valid-token' },
      });
      fireEvent.click(screen.getByTestId('redeem-submit-btn'));

      await waitFor(() => {
        expect(mockRefetchRoles).toHaveBeenCalled();
      });
    });

    it('hides the form and shows success after redemption', async () => {
      mockRedeemInvitation.mockResolvedValue({
        role: { _id: 'role-1', roleDisplay: 'Patient' },
        organizationName: 'Clinic',
      });

      renderForm();

      fireEvent.change(screen.getByTestId('redeem-token-input'), {
        target: { value: 'valid-token' },
      });
      fireEvent.click(screen.getByTestId('redeem-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('redeem-success')).toBeTruthy();
        expect(screen.queryByTestId('redeem-token-input')).toBeNull();
        expect(screen.queryByTestId('redeem-submit-btn')).toBeNull();
      });
    });
  });

  describe('Requirement 8.4: 410 error', () => {
    it('shows expired message on 410 error', async () => {
      mockRedeemInvitation.mockRejectedValue(new Error('expired'));

      renderForm();

      fireEvent.change(screen.getByTestId('redeem-token-input'), {
        target: { value: 'expired-token' },
      });
      fireEvent.click(screen.getByTestId('redeem-submit-btn'));

      await waitFor(() => {
        expect(
          screen.getByText(
            'This invitation has expired or has already been redeemed.',
          ),
        ).toBeTruthy();
      });
    });

    it('shows expired message when error contains "redeemed"', async () => {
      mockRedeemInvitation.mockRejectedValue(new Error('already redeemed'));

      renderForm();

      fireEvent.change(screen.getByTestId('redeem-token-input'), {
        target: { value: 'used-token' },
      });
      fireEvent.click(screen.getByTestId('redeem-submit-btn'));

      await waitFor(() => {
        expect(
          screen.getByText(
            'This invitation has expired or has already been redeemed.',
          ),
        ).toBeTruthy();
      });
    });

    it('shows generic error for other failures', async () => {
      mockRedeemInvitation.mockRejectedValue(new Error('Network error'));

      renderForm();

      fireEvent.change(screen.getByTestId('redeem-token-input'), {
        target: { value: 'some-token' },
      });
      fireEvent.click(screen.getByTestId('redeem-submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeTruthy();
      });
    });
  });

  describe('Requirement 8.5: loading state', () => {
    it('disables submit button and shows loading indicator while submitting', async () => {
      let resolveRedeem!: (value: unknown) => void;
      mockRedeemInvitation.mockReturnValue(
        new Promise((resolve) => {
          resolveRedeem = resolve;
        }),
      );

      renderForm();

      fireEvent.change(screen.getByTestId('redeem-token-input'), {
        target: { value: 'some-token' },
      });
      fireEvent.click(screen.getByTestId('redeem-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('redeem-submit-btn')).toBeDisabled();
        expect(screen.getByTestId('loading-indicator')).toBeTruthy();
      });

      resolveRedeem({
        role: { _id: 'role-1', roleDisplay: 'Patient' },
        organizationName: 'Clinic',
      });

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).toBeNull();
      });
    });
  });
});
