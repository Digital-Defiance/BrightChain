/**
 * Unit tests for PatientRegistrationFlow component.
 *
 * Tests: open enrollment registration, invite-only token prompt,
 * 403/409/410 error handling, role refetch.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 *
 * @module organizations/__tests__/PatientRegistrationFlow.spec
 */

import type { IOrganization } from '@brightchain/brightchart-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRegisterPatient = jest.fn();
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
    registerPatient: mockRegisterPatient,
  }),
}));

import { PatientRegistrationFlow } from '../components/PatientRegistrationFlow';

// ─── Helpers ────────────────────────────────────────────────────────────────

const openOrg: IOrganization = {
  _id: 'org-open',
  name: 'Open Clinic',
  active: true,
  enrollmentMode: 'open',
  createdBy: 'member-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const inviteOnlyOrg: IOrganization = {
  _id: 'org-invite',
  name: 'Invite Clinic',
  active: true,
  enrollmentMode: 'invite-only',
  createdBy: 'member-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const defaultProps = {
  organization: openOrg,
  onRegistered: jest.fn(),
  onCancel: jest.fn(),
};

function renderFlow(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<PatientRegistrationFlow {...props} />);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PatientRegistrationFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 5.1: open enrollment registration', () => {
    it('shows open enrollment UI for open orgs', () => {
      renderFlow();
      expect(screen.getByTestId('open-enrollment')).toBeTruthy();
      expect(screen.getByTestId('register-btn')).toBeTruthy();
      expect(screen.queryByTestId('token-form')).toBeNull();
    });

    it('registers patient directly for open enrollment orgs', async () => {
      mockRegisterPatient.mockResolvedValue({
        _id: 'role-1',
        roleDisplay: 'Patient',
      });
      const onRegistered = jest.fn();

      renderFlow({ onRegistered });

      fireEvent.click(screen.getByTestId('register-btn'));

      await waitFor(() => {
        expect(mockRegisterPatient).toHaveBeenCalledWith({
          organizationId: 'org-open',
        });
        expect(mockRefetchRoles).toHaveBeenCalled();
        expect(onRegistered).toHaveBeenCalled();
      });
    });
  });

  describe('Requirement 5.2: invite-only token prompt', () => {
    it('shows token form for invite-only orgs', () => {
      renderFlow({ organization: inviteOnlyOrg });
      expect(screen.getByTestId('token-form')).toBeTruthy();
      expect(screen.getByTestId('token-input')).toBeTruthy();
      expect(screen.queryByTestId('open-enrollment')).toBeNull();
    });
  });

  describe('Requirement 5.3: invite-only registration with token', () => {
    it('submits token with org ID for invite-only registration', async () => {
      mockRegisterPatient.mockResolvedValue({
        _id: 'role-1',
        roleDisplay: 'Patient',
      });
      const onRegistered = jest.fn();

      renderFlow({ organization: inviteOnlyOrg, onRegistered });

      fireEvent.change(screen.getByTestId('token-input'), {
        target: { value: 'abc-token-123' },
      });
      fireEvent.click(screen.getByTestId('submit-token-btn'));

      await waitFor(() => {
        expect(mockRegisterPatient).toHaveBeenCalledWith({
          organizationId: 'org-invite',
          invitationToken: 'abc-token-123',
        });
        expect(mockRefetchRoles).toHaveBeenCalled();
        expect(onRegistered).toHaveBeenCalled();
      });
    });

    it('shows validation error for empty token', async () => {
      renderFlow({ organization: inviteOnlyOrg });

      fireEvent.click(screen.getByTestId('submit-token-btn'));

      await waitFor(() => {
        expect(screen.getByText('Invitation token is required')).toBeTruthy();
      });

      expect(mockRegisterPatient).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 5.4: role refetch on success', () => {
    it('calls refetchRoles after successful open enrollment', async () => {
      mockRegisterPatient.mockResolvedValue({
        _id: 'role-1',
        roleDisplay: 'Patient',
      });

      renderFlow();
      fireEvent.click(screen.getByTestId('register-btn'));

      await waitFor(() => {
        expect(mockRefetchRoles).toHaveBeenCalled();
      });
    });
  });

  describe('Requirement 5.5: 403 INVITATION_REQUIRED error', () => {
    it('shows token form when 403 INVITATION_REQUIRED is returned', async () => {
      mockRegisterPatient.mockRejectedValue(new Error('INVITATION_REQUIRED'));

      renderFlow();
      fireEvent.click(screen.getByTestId('register-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('token-form')).toBeTruthy();
        expect(
          screen.getByText(
            'This organization requires an invitation to register.',
          ),
        ).toBeTruthy();
      });
    });
  });

  describe('Requirement 5.6: 409 conflict error', () => {
    it('shows already registered message on 409', async () => {
      mockRegisterPatient.mockRejectedValue(new Error('already registered'));

      renderFlow();
      fireEvent.click(screen.getByTestId('register-btn'));

      await waitFor(() => {
        expect(
          screen.getByText(
            'You are already registered as a patient at this organization.',
          ),
        ).toBeTruthy();
      });
    });
  });

  describe('Requirement 5.7: 410 expired invitation', () => {
    it('shows expired message on 410 during token submission', async () => {
      mockRegisterPatient.mockRejectedValue(new Error('expired'));

      renderFlow({ organization: inviteOnlyOrg });

      fireEvent.change(screen.getByTestId('token-input'), {
        target: { value: 'expired-token' },
      });
      fireEvent.click(screen.getByTestId('submit-token-btn'));

      await waitFor(() => {
        expect(
          screen.getByText(
            'The invitation has expired or has already been used.',
          ),
        ).toBeTruthy();
      });
    });
  });

  describe('Requirement 5.8: loading state', () => {
    it('disables button and shows loading indicator during open enrollment', async () => {
      let resolveRegister!: (value: unknown) => void;
      mockRegisterPatient.mockReturnValue(
        new Promise((resolve) => {
          resolveRegister = resolve;
        }),
      );

      renderFlow();
      fireEvent.click(screen.getByTestId('register-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('register-btn')).toBeDisabled();
        expect(screen.getByTestId('loading-indicator')).toBeTruthy();
      });

      resolveRegister({ _id: 'role-1' });

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).toBeNull();
      });
    });

    it('disables button and shows loading indicator during token submission', async () => {
      let resolveRegister!: (value: unknown) => void;
      mockRegisterPatient.mockReturnValue(
        new Promise((resolve) => {
          resolveRegister = resolve;
        }),
      );

      renderFlow({ organization: inviteOnlyOrg });

      fireEvent.change(screen.getByTestId('token-input'), {
        target: { value: 'some-token' },
      });
      fireEvent.click(screen.getByTestId('submit-token-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('submit-token-btn')).toBeDisabled();
        expect(screen.getByTestId('loading-indicator')).toBeTruthy();
      });

      resolveRegister({ _id: 'role-1' });

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).toBeNull();
      });
    });
  });

  describe('cancel behavior', () => {
    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = jest.fn();
      renderFlow({ onCancel });

      fireEvent.click(screen.getByTestId('cancel-btn'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('displays organization name', () => {
    it('shows the organization name in the heading', () => {
      renderFlow();
      expect(
        screen.getByText('Register as Patient at Open Clinic'),
      ).toBeTruthy();
    });
  });
});
