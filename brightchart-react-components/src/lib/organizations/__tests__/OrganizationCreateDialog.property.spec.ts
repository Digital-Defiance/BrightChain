/**
 * Property-based test for OrganizationCreateDialog name validation.
 * Feature: org-role-ui-components, Property 1: Empty/whitespace name validation rejection
 *
 * For any string composed entirely of whitespace characters (including the
 * empty string), submitting the Organization_Create_Dialog with that string
 * as the name SHALL be rejected by client-side validation — the form SHALL
 * display an inline validation error and SHALL NOT invoke the API.
 *
 * **Validates: Requirements 1.4**
 */

// Async React property tests can exceed 5 s under parallel load — give them room.
jest.retryTimes(2, { logErrorsBeforeRetry: false });
jest.setTimeout(30000);

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import * as React from 'react';

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

// Import after mocks
import { OrganizationCreateDialog } from '../components/OrganizationCreateDialog';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Feature: org-role-ui-components, Property 1: Empty/whitespace name validation rejection', () => {
  beforeEach(() => {
    mockCreateOrganization.mockReset();
    mockRefetchRoles.mockReset();
  });

  it('rejects any whitespace-only or empty name without calling the API', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate strings that are empty or contain only whitespace characters
        fc.stringMatching(/^[\s]*$/),
        async (whitespaceStr) => {
          mockCreateOrganization.mockReset();

          const onClose = jest.fn();
          const onCreated = jest.fn();

          const { unmount } = render(
            React.createElement(OrganizationCreateDialog, {
              open: true,
              onClose,
              onCreated,
            }),
          );

          // Type the whitespace-only string into the name field
          const nameInput = screen.getByTestId('org-name-input');
          fireEvent.change(nameInput, { target: { value: whitespaceStr } });

          // Click submit
          const submitBtn = screen.getByTestId('submit-btn');
          fireEvent.click(submitBtn);

          // Wait for any async effects to settle
          await waitFor(() => {
            // The API should NOT have been called
            expect(mockCreateOrganization).not.toHaveBeenCalled();
          });

          // Validation error should be displayed
          const nameField = screen.getByTestId('org-name-field');
          expect(
            nameField.querySelector('.Mui-error') ||
              screen.getByText('Organization name is required'),
          ).toBeTruthy();

          // Dialog should NOT have closed
          expect(onClose).not.toHaveBeenCalled();
          expect(onCreated).not.toHaveBeenCalled();

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });
});
