/**
 * Unit tests for StaffAssignmentForm component.
 *
 * Tests: form fields, submission, 409/400 error handling, success + form clear.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
 *
 * @module organizations/__tests__/StaffAssignmentForm.spec
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockAssignStaff = jest.fn();

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useAuthenticatedApi: () => ({}),
}));

jest.mock('../hooks/useOrgApi', () => ({
  useOrgApi: () => ({
    assignStaff: mockAssignStaff,
  }),
}));

import { StaffAssignmentForm } from '../components/StaffAssignmentForm';

// ─── Helpers ────────────────────────────────────────────────────────────────

const defaultProps = {
  organizationId: 'org-123',
  onAssigned: jest.fn(),
  onCancel: jest.fn(),
};

function renderForm(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<StaffAssignmentForm {...props} />);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('StaffAssignmentForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 7.1: form fields', () => {
    it('renders the heading', () => {
      renderForm();
      expect(screen.getByText('Assign Staff Role')).toBeTruthy();
    });

    it('renders a member ID text field', () => {
      renderForm();
      expect(screen.getByTestId('member-id-input')).toBeTruthy();
    });

    it('renders a role code selector', () => {
      renderForm();
      expect(screen.getByTestId('staff-role-select')).toBeTruthy();
    });

    it('renders submit and cancel buttons', () => {
      renderForm();
      expect(screen.getByTestId('staff-submit-btn')).toBeTruthy();
      expect(screen.getByTestId('staff-cancel-btn')).toBeTruthy();
    });

    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = jest.fn();
      renderForm({ onCancel });
      fireEvent.click(screen.getByTestId('staff-cancel-btn'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Requirement 7.1: client-side validation', () => {
    it('shows error when member ID is empty', async () => {
      renderForm();

      // Select a role but leave member ID empty
      const selectInput = screen.getByTestId('staff-role-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });

      fireEvent.click(screen.getByTestId('staff-submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Member ID is required')).toBeTruthy();
      });
      expect(mockAssignStaff).not.toHaveBeenCalled();
    });

    it('shows error when no role is selected', async () => {
      renderForm();

      // Enter member ID but leave role empty
      fireEvent.change(screen.getByTestId('member-id-input'), {
        target: { value: 'member-1' },
      });

      fireEvent.click(screen.getByTestId('staff-submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Please select a role')).toBeTruthy();
      });
      expect(mockAssignStaff).not.toHaveBeenCalled();
    });

    it('clears member ID error when user types', async () => {
      renderForm();

      fireEvent.click(screen.getByTestId('staff-submit-btn'));
      await waitFor(() => {
        expect(screen.getByText('Member ID is required')).toBeTruthy();
      });

      fireEvent.change(screen.getByTestId('member-id-input'), {
        target: { value: 'a' },
      });

      expect(screen.queryByText('Member ID is required')).toBeNull();
    });
  });

  describe('Requirement 7.2: submission', () => {
    it('sends POST with member ID, role code, and org ID', async () => {
      mockAssignStaff.mockResolvedValue({ _id: 'role-new' });

      renderForm();

      fireEvent.change(screen.getByTestId('member-id-input'), {
        target: { value: 'member-42' },
      });
      const selectInput = screen.getByTestId('staff-role-select-input');
      fireEvent.change(selectInput, { target: { value: '224535009' } });

      fireEvent.click(screen.getByTestId('staff-submit-btn'));

      await waitFor(() => {
        expect(mockAssignStaff).toHaveBeenCalledWith({
          memberId: 'member-42',
          roleCode: '224535009',
          organizationId: 'org-123',
        });
      });
    });
  });

  describe('Requirement 7.3: success + form clear', () => {
    it('shows success message on 201', async () => {
      mockAssignStaff.mockResolvedValue({ _id: 'role-new' });

      renderForm();

      fireEvent.change(screen.getByTestId('member-id-input'), {
        target: { value: 'member-42' },
      });
      const selectInput = screen.getByTestId('staff-role-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });

      fireEvent.click(screen.getByTestId('staff-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('staff-success')).toBeTruthy();
        expect(
          screen.getByText('Staff role assigned successfully.'),
        ).toBeTruthy();
      });
    });

    it('clears form fields on success', async () => {
      mockAssignStaff.mockResolvedValue({ _id: 'role-new' });

      renderForm();

      fireEvent.change(screen.getByTestId('member-id-input'), {
        target: { value: 'member-42' },
      });
      const selectInput = screen.getByTestId('staff-role-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });

      fireEvent.click(screen.getByTestId('staff-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('staff-success')).toBeTruthy();
      });

      const memberInput = screen.getByTestId(
        'member-id-input',
      ) as HTMLInputElement;
      expect(memberInput.value).toBe('');
    });

    it('calls onAssigned callback on success', async () => {
      mockAssignStaff.mockResolvedValue({ _id: 'role-new' });
      const onAssigned = jest.fn();

      renderForm({ onAssigned });

      fireEvent.change(screen.getByTestId('member-id-input'), {
        target: { value: 'member-42' },
      });
      const selectInput = screen.getByTestId('staff-role-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });

      fireEvent.click(screen.getByTestId('staff-submit-btn'));

      await waitFor(() => {
        expect(onAssigned).toHaveBeenCalled();
      });
    });
  });

  describe('Requirement 7.4: 409 conflict', () => {
    it('shows already assigned message on 409', async () => {
      mockAssignStaff.mockRejectedValue(
        new Error('CONFLICT: member already holds this role'),
      );

      renderForm();

      fireEvent.change(screen.getByTestId('member-id-input'), {
        target: { value: 'member-42' },
      });
      const selectInput = screen.getByTestId('staff-role-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });

      fireEvent.click(screen.getByTestId('staff-submit-btn'));

      await waitFor(() => {
        expect(
          screen.getByText(
            'This member already holds the selected role at this organization.',
          ),
        ).toBeTruthy();
      });
    });
  });

  describe('Requirement 7.5: INVALID_ROLE_CODE', () => {
    it('shows error message for INVALID_ROLE_CODE', async () => {
      mockAssignStaff.mockRejectedValue(
        new Error('INVALID_ROLE_CODE: not a valid practitioner role'),
      );

      renderForm();

      fireEvent.change(screen.getByTestId('member-id-input'), {
        target: { value: 'member-42' },
      });
      const selectInput = screen.getByTestId('staff-role-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });

      fireEvent.click(screen.getByTestId('staff-submit-btn'));

      await waitFor(() => {
        expect(
          screen.getByText('INVALID_ROLE_CODE: not a valid practitioner role'),
        ).toBeTruthy();
      });
    });
  });

  describe('Requirement 7.6: INACTIVE_ORGANIZATION', () => {
    it('shows inactive org message', async () => {
      mockAssignStaff.mockRejectedValue(new Error('INACTIVE_ORGANIZATION'));

      renderForm();

      fireEvent.change(screen.getByTestId('member-id-input'), {
        target: { value: 'member-42' },
      });
      const selectInput = screen.getByTestId('staff-role-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });

      fireEvent.click(screen.getByTestId('staff-submit-btn'));

      await waitFor(() => {
        expect(
          screen.getByText('The organization is not active.'),
        ).toBeTruthy();
      });
    });
  });

  describe('Requirement 7.7: 403 forbidden', () => {
    it('shows access denied message on 403', async () => {
      mockAssignStaff.mockRejectedValue(new Error('Forbidden'));

      renderForm();

      fireEvent.change(screen.getByTestId('member-id-input'), {
        target: { value: 'member-42' },
      });
      const selectInput = screen.getByTestId('staff-role-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });

      fireEvent.click(screen.getByTestId('staff-submit-btn'));

      await waitFor(() => {
        expect(
          screen.getByText(
            'Access denied. You do not have permission to assign staff roles.',
          ),
        ).toBeTruthy();
      });
    });
  });

  describe('Requirement 7.8: loading state', () => {
    it('disables submit button and shows loading indicator while submitting', async () => {
      let resolveAssign!: (value: unknown) => void;
      mockAssignStaff.mockReturnValue(
        new Promise((resolve) => {
          resolveAssign = resolve;
        }),
      );

      renderForm();

      fireEvent.change(screen.getByTestId('member-id-input'), {
        target: { value: 'member-42' },
      });
      const selectInput = screen.getByTestId('staff-role-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });

      fireEvent.click(screen.getByTestId('staff-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('staff-submit-btn')).toBeDisabled();
        expect(screen.getByTestId('loading-indicator')).toBeTruthy();
      });

      resolveAssign({ _id: 'role-new' });

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).toBeNull();
      });
    });

    it('disables cancel button while submitting', async () => {
      let resolveAssign!: (value: unknown) => void;
      mockAssignStaff.mockReturnValue(
        new Promise((resolve) => {
          resolveAssign = resolve;
        }),
      );

      renderForm();

      fireEvent.change(screen.getByTestId('member-id-input'), {
        target: { value: 'member-42' },
      });
      const selectInput = screen.getByTestId('staff-role-select-input');
      fireEvent.change(selectInput, { target: { value: '309343006' } });

      fireEvent.click(screen.getByTestId('staff-submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('staff-cancel-btn')).toBeDisabled();
      });

      resolveAssign({ _id: 'role-new' });

      await waitFor(() => {
        expect(screen.getByTestId('staff-cancel-btn')).not.toBeDisabled();
      });
    });
  });
});
