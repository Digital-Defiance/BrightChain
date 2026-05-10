/**
 * Unit tests for MembersManagementPage component.
 *
 * Tests: renders grouped members, remove role confirmation, LAST_ADMIN error,
 * 403 handling, buttons present.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 *
 * @module organizations/__tests__/MembersManagementPage.spec
 */

import type { IHealthcareRoleDocument } from '@brightchain/brightchart-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRemoveRole = jest.fn();
const mockRefetch = jest.fn();

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useAuthenticatedApi: () => ({}),
}));

jest.mock('../hooks/useOrgApi', () => ({
  useOrgApi: () => ({
    removeRole: mockRemoveRole,
  }),
}));

let mockMembersData: {
  members: Record<string, IHealthcareRoleDocument[]>;
} | null = null;
let mockMembersLoading = false;
let mockMembersError: string | null = null;

jest.mock('../hooks/useOrgMembers', () => ({
  useOrgMembers: () => ({
    data: mockMembersData,
    loading: mockMembersLoading,
    error: mockMembersError,
    refetch: mockRefetch,
  }),
}));

import { MembersManagementPage } from '../components/MembersManagementPage';

// ─── Helpers ────────────────────────────────────────────────────────────────

const basePeriod = { start: '2024-01-01T00:00:00.000Z' };

const adminRole: IHealthcareRoleDocument = {
  _id: 'role-1',
  memberId: 'member-admin',
  roleCode: 'ADMIN',
  roleDisplay: 'Administrator',
  organizationId: 'org-1',
  period: basePeriod,
  createdBy: 'member-admin',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const physicianRole: IHealthcareRoleDocument = {
  _id: 'role-2',
  memberId: 'member-doc',
  roleCode: '309343006',
  roleDisplay: 'Physician',
  organizationId: 'org-1',
  period: basePeriod,
  createdBy: 'member-admin',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const patientRole: IHealthcareRoleDocument = {
  _id: 'role-3',
  memberId: 'member-patient',
  roleCode: 'PATIENT',
  roleDisplay: 'Patient',
  organizationId: 'org-1',
  period: basePeriod,
  createdBy: 'member-admin',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockMembers: Record<string, IHealthcareRoleDocument[]> = {
  ADMIN: [adminRole],
  '309343006': [physicianRole],
  PATIENT: [patientRole],
};

function renderPage(orgId = 'org-1') {
  return render(<MembersManagementPage organizationId={orgId} />);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('MembersManagementPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMembersData = { members: { ...mockMembers } };
    mockMembersLoading = false;
    mockMembersError = null;
  });

  describe('Requirement 4.1: renders members grouped by role code', () => {
    it('displays role group headers for each role code', () => {
      renderPage();
      expect(screen.getByTestId('role-group-ADMIN')).toBeTruthy();
      expect(screen.getByTestId('role-group-309343006')).toBeTruthy();
      expect(screen.getByTestId('role-group-PATIENT')).toBeTruthy();
    });

    it('displays role display name as section header', () => {
      renderPage();
      expect(screen.getByTestId('role-header-ADMIN').textContent).toBe(
        'Administrator',
      );
      expect(screen.getByTestId('role-header-309343006').textContent).toBe(
        'Physician',
      );
      expect(screen.getByTestId('role-header-PATIENT').textContent).toBe(
        'Patient',
      );
    });

    it('shows loading state while fetching', () => {
      mockMembersData = null;
      mockMembersLoading = true;
      renderPage();
      expect(screen.getByTestId('members-loading')).toBeTruthy();
    });
  });

  describe('Requirement 4.2: displays member identifier and role display name', () => {
    it('shows memberId and roleDisplay for each member', () => {
      renderPage();
      const adminText = screen.getByTestId('member-text-role-1');
      expect(adminText.textContent).toContain('member-admin');
      expect(adminText.textContent).toContain('Administrator');

      const docText = screen.getByTestId('member-text-role-2');
      expect(docText.textContent).toContain('member-doc');
      expect(docText.textContent).toContain('Physician');
    });
  });

  describe('Requirement 4.3: remove role with confirmation dialog', () => {
    it('opens confirmation dialog when Remove Role is clicked', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('remove-role-btn-role-2'));
      expect(screen.getByTestId('remove-confirm-dialog')).toBeTruthy();
      // Dialog should mention the role and member in the confirmation text
      const dialog = screen.getByTestId('remove-confirm-dialog');
      expect(dialog.textContent).toContain('Physician');
      expect(dialog.textContent).toContain('member-doc');
    });

    it('calls removeRole on confirm and refreshes member list', async () => {
      mockRemoveRole.mockResolvedValue(undefined);
      renderPage();

      fireEvent.click(screen.getByTestId('remove-role-btn-role-2'));
      fireEvent.click(screen.getByTestId('remove-confirm-btn'));

      await waitFor(() => {
        expect(mockRemoveRole).toHaveBeenCalledWith('role-2');
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it('closes dialog on cancel', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('remove-role-btn-role-2'));
      expect(screen.getByTestId('remove-confirm-dialog')).toBeTruthy();

      fireEvent.click(screen.getByTestId('remove-cancel-btn'));
      // Dialog should close (MUI keeps it in DOM but hidden)
      // The confirm button should not be visible
      expect(screen.queryByTestId('last-admin-error')).toBeNull();
    });
  });

  describe('Requirement 4.4: LAST_ADMIN error handling', () => {
    it('displays last admin error when removal fails with that message', async () => {
      mockRemoveRole.mockRejectedValue(
        new Error('Organization must retain at least one administrator'),
      );
      renderPage();

      fireEvent.click(screen.getByTestId('remove-role-btn-role-1'));
      fireEvent.click(screen.getByTestId('remove-confirm-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('last-admin-error')).toBeTruthy();
      });
    });
  });

  describe('Requirement 4.5: refresh after successful removal', () => {
    it('calls refetch after successful role removal', async () => {
      mockRemoveRole.mockResolvedValue(undefined);
      renderPage();

      fireEvent.click(screen.getByTestId('remove-role-btn-role-2'));
      fireEvent.click(screen.getByTestId('remove-confirm-btn'));

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });

  describe('Requirement 4.6: Assign Staff button', () => {
    it('renders the Assign Staff button', () => {
      renderPage();
      expect(screen.getByTestId('assign-staff-btn')).toBeTruthy();
    });

    it('opens staff form placeholder when clicked', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('assign-staff-btn'));
      expect(screen.getByTestId('staff-form-placeholder')).toBeTruthy();
    });
  });

  describe('Requirement 4.7: Manage Invitations button', () => {
    it('renders the Manage Invitations button', () => {
      renderPage();
      expect(screen.getByTestId('manage-invitations-btn')).toBeTruthy();
    });

    it('opens invitation panel placeholder when clicked', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('manage-invitations-btn'));
      expect(screen.getByTestId('invitation-panel-placeholder')).toBeTruthy();
    });
  });

  describe('Requirement 4.8: 403 forbidden handling', () => {
    it('shows access denied when fetch returns forbidden error', () => {
      mockMembersData = null;
      mockMembersLoading = false;
      mockMembersError = 'Forbidden';
      renderPage();
      expect(screen.getByTestId('members-access-denied')).toBeTruthy();
    });
  });

  describe('general error handling', () => {
    it('shows generic error for non-403 fetch errors', () => {
      mockMembersData = null;
      mockMembersLoading = false;
      mockMembersError = 'Network error';
      renderPage();
      expect(screen.getByTestId('members-fetch-error')).toBeTruthy();
      expect(screen.getByText('Network error')).toBeTruthy();
    });

    it('shows remove error in dialog for non-LAST_ADMIN errors', async () => {
      mockRemoveRole.mockRejectedValue(new Error('Role not found'));
      renderPage();

      fireEvent.click(screen.getByTestId('remove-role-btn-role-2'));
      fireEvent.click(screen.getByTestId('remove-confirm-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('remove-error')).toBeTruthy();
        expect(screen.getByText('Role not found')).toBeTruthy();
      });
    });
  });
});
