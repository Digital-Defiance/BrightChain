/**
 * Unit tests for OrganizationCreateDialog component.
 *
 * Tests: renders form fields, submits valid data, shows validation error
 * for empty name, shows API error, loading state disables button.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 *
 * @module organizations/__tests__/OrganizationCreateDialog.spec
 */

import type { IOrganization } from '@brightchain/brightchart-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockCreateOrganization = jest.fn();
const mockRefetchRoles = jest.fn();

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useAuthenticatedApi: () => ({}),
}));

jest.mock('../../shell/contexts/ActiveContext', () => ({
  useActiveContext: () => ({
    refetchRoles: mockRefetchRoles,
    member: { memberId: 'member-1', username: 'test', type: 'User' },
    healthcareRoles: [],
    activeRole: { roleCode: 'ADMIN' },
    specialtyProfile: {},
    switchRole: jest.fn(),
    setActivePatient: jest.fn(),
    setActiveEncounter: jest.fn(),
  }),
}));

jest.mock('../hooks/useOrgApi', () => ({
  useOrgApi: () => ({
    createOrganization: mockCreateOrganization,
  }),
}));

import { OrganizationCreateDialog } from '../components/OrganizationCreateDialog';

// ─── Helpers ────────────────────────────────────────────────────────────────

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  onCreated: jest.fn(),
};

function renderDialog(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<OrganizationCreateDialog {...props} />);
}

const mockOrg: IOrganization = {
  _id: 'org-1',
  name: 'Test Clinic',
  active: true,
  enrollmentMode: 'open',
  createdBy: 'member-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('OrganizationCreateDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 1.1: renders form fields', () => {
    it('displays name, phone, email, and address fields', () => {
      renderDialog();

      expect(screen.getByTestId('org-name-input')).toBeTruthy();
      expect(screen.getByTestId('org-phone-input')).toBeTruthy();
      expect(screen.getByTestId('org-email-input')).toBeTruthy();
      expect(screen.getByTestId('org-address-input')).toBeTruthy();
    });

    it('displays dialog title', () => {
      renderDialog();
      expect(screen.getByText('Create Organization')).toBeTruthy();
    });

    it('displays submit and cancel buttons', () => {
      renderDialog();
      expect(screen.getByTestId('submit-btn')).toBeTruthy();
      expect(screen.getByTestId('cancel-btn')).toBeTruthy();
    });
  });

  describe('Requirement 1.2: submits valid data', () => {
    it('calls createOrganization with name only when optional fields are empty', async () => {
      mockCreateOrganization.mockResolvedValue(mockOrg);
      const onCreated = jest.fn();
      const onClose = jest.fn();

      renderDialog({ onCreated, onClose });

      fireEvent.change(screen.getByTestId('org-name-input'), {
        target: { value: 'Test Clinic' },
      });
      fireEvent.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(mockCreateOrganization).toHaveBeenCalledWith({
          name: 'Test Clinic',
        });
      });
    });

    it('includes telecom and address when optional fields are filled', async () => {
      mockCreateOrganization.mockResolvedValue(mockOrg);
      renderDialog();

      fireEvent.change(screen.getByTestId('org-name-input'), {
        target: { value: 'Test Clinic' },
      });
      fireEvent.change(screen.getByTestId('org-phone-input'), {
        target: { value: '555-1234' },
      });
      fireEvent.change(screen.getByTestId('org-email-input'), {
        target: { value: 'info@test.com' },
      });
      fireEvent.change(screen.getByTestId('org-address-input'), {
        target: { value: '123 Main St' },
      });
      fireEvent.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(mockCreateOrganization).toHaveBeenCalledWith({
          name: 'Test Clinic',
          telecom: [
            { system: 'phone', value: '555-1234' },
            { system: 'email', value: 'info@test.com' },
          ],
          address: [{ text: '123 Main St' }],
        });
      });
    });
  });

  describe('Requirement 1.3: success behavior', () => {
    it('closes dialog and calls onCreated and refetchRoles on success', async () => {
      mockCreateOrganization.mockResolvedValue(mockOrg);
      const onCreated = jest.fn();
      const onClose = jest.fn();

      renderDialog({ onCreated, onClose });

      fireEvent.change(screen.getByTestId('org-name-input'), {
        target: { value: 'Test Clinic' },
      });
      fireEvent.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
        expect(onCreated).toHaveBeenCalledWith(mockOrg);
        expect(mockRefetchRoles).toHaveBeenCalled();
      });
    });
  });

  describe('Requirement 1.4: empty name validation', () => {
    it('shows validation error for empty name', async () => {
      renderDialog();

      fireEvent.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Organization name is required')).toBeTruthy();
      });

      expect(mockCreateOrganization).not.toHaveBeenCalled();
    });

    it('shows validation error for whitespace-only name', async () => {
      renderDialog();

      fireEvent.change(screen.getByTestId('org-name-input'), {
        target: { value: '   ' },
      });
      fireEvent.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Organization name is required')).toBeTruthy();
      });

      expect(mockCreateOrganization).not.toHaveBeenCalled();
    });

    it('clears validation error when user types', async () => {
      renderDialog();

      // Trigger error
      fireEvent.click(screen.getByTestId('submit-btn'));
      await waitFor(() => {
        expect(screen.getByText('Organization name is required')).toBeTruthy();
      });

      // Type a character — error should clear
      fireEvent.change(screen.getByTestId('org-name-input'), {
        target: { value: 'A' },
      });

      expect(screen.queryByText('Organization name is required')).toBeNull();
    });
  });

  describe('Requirement 1.5: server error display', () => {
    it('displays server error message inline', async () => {
      mockCreateOrganization.mockRejectedValue(
        new Error('Organization name already exists'),
      );

      renderDialog();

      fireEvent.change(screen.getByTestId('org-name-input'), {
        target: { value: 'Duplicate Clinic' },
      });
      fireEvent.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(
          screen.getByText('Organization name already exists'),
        ).toBeTruthy();
      });

      // Dialog should remain open
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Requirement 1.6: loading state', () => {
    it('disables submit button and shows loading indicator while submitting', async () => {
      // Create a promise we can control
      let resolveCreate!: (value: IOrganization) => void;
      mockCreateOrganization.mockReturnValue(
        new Promise<IOrganization>((resolve) => {
          resolveCreate = resolve;
        }),
      );

      renderDialog();

      fireEvent.change(screen.getByTestId('org-name-input'), {
        target: { value: 'Test Clinic' },
      });
      fireEvent.click(screen.getByTestId('submit-btn'));

      // While submitting, button should be disabled and loading indicator shown
      await waitFor(() => {
        expect(screen.getByTestId('submit-btn')).toBeDisabled();
        expect(screen.getByTestId('loading-indicator')).toBeTruthy();
      });

      // Resolve the promise
      resolveCreate(mockOrg);

      // After resolution, button should be re-enabled
      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).toBeNull();
      });
    });
  });

  describe('dialog close behavior', () => {
    it('does not render when open is false', () => {
      renderDialog({ open: false });
      expect(screen.queryByText('Create Organization')).toBeNull();
    });
  });
});
