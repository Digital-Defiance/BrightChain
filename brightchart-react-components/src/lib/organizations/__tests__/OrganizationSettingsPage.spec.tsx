/**
 * Unit tests for OrganizationSettingsPage component.
 *
 * Tests: populates form, submits changes, enrollment mode toggle,
 * active status warning, 403 handling, 400/404 errors.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 *
 * @module organizations/__tests__/OrganizationSettingsPage.spec
 */

import type { IOrganization } from '@brightchain/brightchart-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockUpdateOrganization = jest.fn();
const mockRefetch = jest.fn();

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useAuthenticatedApi: () => ({}),
}));

jest.mock('../hooks/useOrgApi', () => ({
  useOrgApi: () => ({
    updateOrganization: mockUpdateOrganization,
  }),
}));

let mockOrgData: IOrganization | null = null;
let mockOrgLoading = false;
let mockOrgError: string | null = null;

jest.mock('../hooks/useOrganization', () => ({
  useOrganization: () => ({
    data: mockOrgData,
    loading: mockOrgLoading,
    error: mockOrgError,
    refetch: mockRefetch,
  }),
}));

import { OrganizationSettingsPage } from '../components/OrganizationSettingsPage';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockOrg: IOrganization = {
  _id: 'org-1',
  name: 'Test Clinic',
  active: true,
  enrollmentMode: 'open',
  createdBy: 'member-1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

function renderSettings(orgId = 'org-1') {
  return render(<OrganizationSettingsPage organizationId={orgId} />);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('OrganizationSettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrgData = { ...mockOrg };
    mockOrgLoading = false;
    mockOrgError = null;
  });

  describe('Requirement 3.1: populates form from API', () => {
    it('displays the organization name in the name field', () => {
      renderSettings();
      const nameInput = screen.getByTestId(
        'settings-name-input',
      ) as HTMLInputElement;
      expect(nameInput.value).toBe('Test Clinic');
    });

    it('displays the enrollment mode in the select', () => {
      renderSettings();
      const enrollmentInput = screen.getByTestId(
        'settings-enrollment-input',
      ) as HTMLInputElement;
      expect(enrollmentInput.value).toBe('open');
    });

    it('displays the active status in the switch', () => {
      renderSettings();
      const switchEl = screen.getByTestId('settings-active-switch');
      const input = switchEl.querySelector('input') as HTMLInputElement;
      expect(input.checked).toBe(true);
    });

    it('shows loading state while fetching', () => {
      mockOrgData = null;
      mockOrgLoading = true;
      renderSettings();
      expect(screen.getByTestId('settings-loading')).toBeTruthy();
    });
  });

  describe('Requirement 3.2: submits only changed fields', () => {
    it('sends PUT with only the name when only name is changed', async () => {
      mockUpdateOrganization.mockResolvedValue({
        ...mockOrg,
        name: 'New Name',
      });
      renderSettings();

      fireEvent.change(screen.getByTestId('settings-name-input'), {
        target: { value: 'New Name' },
      });
      fireEvent.click(screen.getByTestId('settings-submit-btn'));

      await waitFor(() => {
        expect(mockUpdateOrganization).toHaveBeenCalledWith('org-1', {
          name: 'New Name',
        });
      });
    });

    it('sends PUT with only enrollmentMode when only enrollment is changed', async () => {
      mockUpdateOrganization.mockResolvedValue({
        ...mockOrg,
        enrollmentMode: 'invite-only',
      });
      renderSettings();

      const enrollmentInput = screen.getByTestId('settings-enrollment-input');
      fireEvent.change(enrollmentInput, { target: { value: 'invite-only' } });
      fireEvent.click(screen.getByTestId('settings-submit-btn'));

      await waitFor(() => {
        expect(mockUpdateOrganization).toHaveBeenCalledWith('org-1', {
          enrollmentMode: 'invite-only',
        });
      });
    });

    it('sends PUT with only active when only active status is changed', async () => {
      mockUpdateOrganization.mockResolvedValue({ ...mockOrg, active: false });
      renderSettings();

      const switchEl = screen.getByTestId('settings-active-switch');
      const input = switchEl.querySelector('input') || switchEl;
      fireEvent.click(input);
      fireEvent.click(screen.getByTestId('settings-submit-btn'));

      await waitFor(() => {
        expect(mockUpdateOrganization).toHaveBeenCalledWith('org-1', {
          active: false,
        });
      });
    });

    it('shows success message after successful update', async () => {
      mockUpdateOrganization.mockResolvedValue({ ...mockOrg, name: 'Updated' });
      renderSettings();

      fireEvent.change(screen.getByTestId('settings-name-input'), {
        target: { value: 'Updated' },
      });
      fireEvent.click(screen.getByTestId('settings-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('settings-success')).toBeTruthy();
      });
    });

    it('disables submit button when no changes are made', () => {
      renderSettings();
      expect(screen.getByTestId('settings-submit-btn')).toBeDisabled();
    });
  });

  describe('Requirement 3.3: enrollment mode toggle with description', () => {
    it('shows description for open enrollment', () => {
      renderSettings();
      expect(
        screen.getByText(
          'Any BrightChain member can self-register as a patient.',
        ),
      ).toBeTruthy();
    });

    it('shows description for invite-only enrollment', () => {
      mockOrgData = { ...mockOrg, enrollmentMode: 'invite-only' };
      renderSettings();
      expect(
        screen.getByText(
          'Patients must present a valid invitation token to register.',
        ),
      ).toBeTruthy();
    });

    it('updates description when enrollment mode changes', () => {
      renderSettings();
      const enrollmentInput = screen.getByTestId('settings-enrollment-input');
      fireEvent.change(enrollmentInput, { target: { value: 'invite-only' } });
      expect(
        screen.getByText(
          'Patients must present a valid invitation token to register.',
        ),
      ).toBeTruthy();
    });
  });

  describe('Requirement 3.4: active status toggle with deactivation warning', () => {
    it('shows warning when deactivating', () => {
      renderSettings();
      const switchEl = screen.getByTestId('settings-active-switch');
      const input = switchEl.querySelector('input') || switchEl;
      fireEvent.click(input);
      expect(screen.getByTestId('deactivate-warning')).toBeTruthy();
    });

    it('hides warning when reactivating', () => {
      mockOrgData = { ...mockOrg, active: false };
      renderSettings();
      // Org is inactive, toggle to active
      const switchEl = screen.getByTestId('settings-active-switch');
      const input = switchEl.querySelector('input') || switchEl;
      fireEvent.click(input);
      expect(screen.queryByTestId('deactivate-warning')).toBeNull();
    });
  });

  describe('Requirement 3.5: 403 forbidden handling', () => {
    it('shows access denied when fetch returns forbidden error', () => {
      mockOrgData = null;
      mockOrgLoading = false;
      mockOrgError = 'Forbidden';
      renderSettings();
      expect(screen.getByTestId('settings-access-denied')).toBeTruthy();
    });

    it('shows access denied when update returns forbidden error', async () => {
      mockUpdateOrganization.mockRejectedValue(new Error('Forbidden'));
      renderSettings();

      fireEvent.change(screen.getByTestId('settings-name-input'), {
        target: { value: 'New Name' },
      });
      fireEvent.click(screen.getByTestId('settings-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('settings-access-denied')).toBeTruthy();
      });
    });
  });

  describe('Requirement 3.6: loading indicator on submit', () => {
    it('disables submit button and shows loading indicator while submitting', async () => {
      let resolveUpdate!: (value: IOrganization) => void;
      mockUpdateOrganization.mockReturnValue(
        new Promise<IOrganization>((resolve) => {
          resolveUpdate = resolve;
        }),
      );

      renderSettings();

      fireEvent.change(screen.getByTestId('settings-name-input'), {
        target: { value: 'New Name' },
      });
      fireEvent.click(screen.getByTestId('settings-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('settings-submit-btn')).toBeDisabled();
        expect(screen.getByTestId('settings-loading-indicator')).toBeTruthy();
      });

      resolveUpdate({ ...mockOrg, name: 'New Name' });

      await waitFor(() => {
        expect(screen.queryByTestId('settings-loading-indicator')).toBeNull();
      });
    });
  });

  describe('Requirement 3.7: 400/404 error display', () => {
    it('displays error message from 400 response', async () => {
      mockUpdateOrganization.mockRejectedValue(
        new Error('Organization name already exists'),
      );
      renderSettings();

      fireEvent.change(screen.getByTestId('settings-name-input'), {
        target: { value: 'Duplicate' },
      });
      fireEvent.click(screen.getByTestId('settings-submit-btn'));

      await waitFor(() => {
        expect(
          screen.getByText('Organization name already exists'),
        ).toBeTruthy();
      });
    });

    it('displays error message from 404 response', async () => {
      mockUpdateOrganization.mockRejectedValue(
        new Error('Organization not found'),
      );
      renderSettings();

      fireEvent.change(screen.getByTestId('settings-name-input'), {
        target: { value: 'Updated' },
      });
      fireEvent.click(screen.getByTestId('settings-submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Organization not found')).toBeTruthy();
      });
    });

    it('displays fetch error for non-403 errors', () => {
      mockOrgData = null;
      mockOrgLoading = false;
      mockOrgError = 'Organization not found';
      renderSettings();
      expect(screen.getByTestId('settings-fetch-error')).toBeTruthy();
      expect(screen.getByText('Organization not found')).toBeTruthy();
    });
  });
});
