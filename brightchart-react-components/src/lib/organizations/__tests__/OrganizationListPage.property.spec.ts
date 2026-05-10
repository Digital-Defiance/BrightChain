/**
 * Property-based test for OrganizationListPage item rendering.
 * Feature: org-role-ui-components, Property 2: Organization list item renders name and enrollment mode
 *
 * For any valid IOrganization object with a non-empty name and an enrollment
 * mode of either 'open' or 'invite-only', rendering that organization in the
 * Organization_List_Page SHALL produce output containing the organization's
 * name and a chip/badge reflecting the enrollment mode.
 *
 * **Validates: Requirements 2.2**
 */

// Async React property tests can exceed 5 s under parallel load — give them room.
jest.retryTimes(2, { logErrorsBeforeRetry: false });
jest.setTimeout(30000);

import { render, within } from '@testing-library/react';
import fc from 'fast-check';
import * as React from 'react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRefetch = jest.fn();
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

// We need to mock useOrganizations to return controlled data
let mockUseOrganizationsReturn: unknown = {
  data: null,
  loading: false,
  error: null,
  refetch: mockRefetch,
};

jest.mock('../hooks/useOrganizations', () => ({
  useOrganizations: () => mockUseOrganizationsReturn,
}));

jest.mock('../hooks/useOrgApi', () => ({
  useOrgApi: () => ({
    createOrganization: jest.fn(),
  }),
}));

// Import after mocks
import { OrganizationListPage } from '../components/OrganizationListPage';

// ─── Arbitraries ────────────────────────────────────────────────────────────

const enrollmentModeArb = fc.constantFrom(
  'open' as const,
  'invite-only' as const,
);

const validDateArb = fc
  .integer({ min: 946684800000, max: 1924905600000 }) // 2000-01-01 to 2030-12-31
  .map((ts) => new Date(ts));

const organizationArb = fc.record({
  _id: fc.uuid(),
  name: fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0),
  active: fc.boolean(),
  enrollmentMode: enrollmentModeArb,
  createdBy: fc.uuid(),
  createdAt: validDateArb.map((d) => d.toISOString()),
  updatedAt: validDateArb.map((d) => d.toISOString()),
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Feature: org-role-ui-components, Property 2: Organization list item renders name and enrollment mode', () => {
  it('renders org name and correct enrollment chip for any valid IOrganization', () => {
    fc.assert(
      fc.property(organizationArb, (org) => {
        // Set up mock to return this single org
        mockUseOrganizationsReturn = {
          data: {
            organizations: [org],
            total: 1,
            page: 1,
            limit: 10,
          },
          loading: false,
          error: null,
          refetch: mockRefetch,
        };

        const { unmount, container } = render(
          React.createElement(OrganizationListPage),
        );

        const view = within(container);

        // Verify the org item is rendered with the correct name
        const orgItem = view.getByTestId(`org-item-${org._id}`);
        expect(orgItem.textContent).toContain(org.name);

        // Verify the enrollment chip shows the correct label
        const expectedChipLabel =
          org.enrollmentMode === 'open' ? 'Open' : 'Invite Only';
        const chip = view.getByTestId(`enrollment-chip-${org._id}`);
        expect(chip.textContent).toBe(expectedChipLabel);

        unmount();
      }),
      { numRuns: 100 },
    );
  });
});
