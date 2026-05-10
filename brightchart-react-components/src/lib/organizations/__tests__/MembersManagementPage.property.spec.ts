/**
 * Property-based test for MembersManagementPage member grouping.
 * Feature: org-role-ui-components, Property 4: Members grouped by role code with correct details
 *
 * For any set of IHealthcareRoleDocument objects with varying role codes,
 * rendering the Members_Management_Page SHALL group each member under a
 * section header matching its roleDisplay, and each member entry SHALL
 * display the member's identifier and role display name within the correct group.
 *
 * **Validates: Requirements 4.1, 4.2**
 */

// Async React property tests can exceed 5 s under parallel load — give them room.
jest.retryTimes(2, { logErrorsBeforeRetry: false });
jest.setTimeout(30000);

import { render, within } from '@testing-library/react';
import fc from 'fast-check';
import * as React from 'react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useAuthenticatedApi: () => ({}),
}));

jest.mock('../hooks/useOrgApi', () => ({
  useOrgApi: () => ({
    removeRole: jest.fn(),
  }),
}));

let mockMembersData: unknown = null;
let mockMembersLoading = false;
let mockMembersError: string | null = null;
const mockRefetch = jest.fn();

jest.mock('../hooks/useOrgMembers', () => ({
  useOrgMembers: () => ({
    data: mockMembersData,
    loading: mockMembersLoading,
    error: mockMembersError,
    refetch: mockRefetch,
  }),
}));

// Import after mocks
import { MembersManagementPage } from '../components/MembersManagementPage';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Role code / display pairs matching SNOMED CT codes used in the system */
const rolePairs = [
  { roleCode: '309343006', roleDisplay: 'Physician' },
  { roleCode: '224535009', roleDisplay: 'Registered Nurse' },
  { roleCode: '224571005', roleDisplay: 'Medical Assistant' },
  { roleCode: '106289002', roleDisplay: 'Dentist' },
  { roleCode: '106290006', roleDisplay: 'Veterinarian' },
  { roleCode: 'ADMIN', roleDisplay: 'Administrator' },
  { roleCode: 'PATIENT', roleDisplay: 'Patient' },
] as const;

const rolePairArb = fc.constantFrom(...rolePairs);

/** Generate a valid ISO date string using integer timestamps to avoid Invalid Date */
const isoDateArb = fc
  .integer({ min: 946684800000, max: 1924905600000 }) // 2000-01-01 to 2030-12-31
  .map((ts) => new Date(ts).toISOString());

/** Generate a single IHealthcareRoleDocument with a given role pair */
const memberDocArb = (rolePair: { roleCode: string; roleDisplay: string }) =>
  fc.record({
    _id: fc.uuid(),
    memberId: fc.uuid(),
    roleCode: fc.constant(rolePair.roleCode),
    roleDisplay: fc.constant(rolePair.roleDisplay),
    organizationId: fc.uuid(),
    period: fc.record({
      start: isoDateArb,
    }),
    createdBy: fc.uuid(),
    createdAt: isoDateArb,
    updatedAt: isoDateArb,
  });

/**
 * Generate a random set of members grouped by role code.
 * Produces 1-4 role groups, each with 1-3 members.
 */
const membersGroupArb = fc
  .array(rolePairArb, { minLength: 1, maxLength: 4 })
  .chain((selectedRoles) => {
    // Deduplicate role codes
    const uniqueRoles = selectedRoles.filter(
      (r, i, arr) => arr.findIndex((x) => x.roleCode === r.roleCode) === i,
    );
    // For each unique role, generate 1-3 members
    const groupArbs = uniqueRoles.map((role) =>
      fc
        .array(memberDocArb(role), { minLength: 1, maxLength: 3 })
        .map((members) => [role.roleCode, members] as const),
    );
    return fc.tuple(
      ...(groupArbs as [(typeof groupArbs)[0], ...typeof groupArbs]),
    );
  })
  .map((groups) => {
    const members: Record<string, unknown[]> = {};
    for (const [roleCode, memberList] of groups) {
      members[roleCode] = memberList;
    }
    return members;
  });

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Feature: org-role-ui-components, Property 4: Members grouped by role code with correct details', () => {
  beforeEach(() => {
    mockMembersLoading = false;
    mockMembersError = null;
  });

  it('renders each member under the correct role group header with identifier and role display', () => {
    fc.assert(
      fc.property(membersGroupArb, (members) => {
        mockMembersData = { members };

        const { unmount, container } = render(
          React.createElement(MembersManagementPage, {
            organizationId: 'org-test',
          }),
        );

        const view = within(container);

        // Verify each role group exists with correct header
        for (const [roleCode, roleMembers] of Object.entries(members)) {
          const typedMembers = roleMembers as Array<{
            _id: string;
            memberId: string;
            roleDisplay: string;
          }>;

          // Role group should exist
          const group = view.getByTestId(`role-group-${roleCode}`);
          expect(group).toBeTruthy();

          // Header should show the roleDisplay
          const header = view.getByTestId(`role-header-${roleCode}`);
          expect(header.textContent).toBe(typedMembers[0].roleDisplay);

          // Each member should be rendered within the group
          for (const member of typedMembers) {
            const memberItem = within(group).getByTestId(
              `member-item-${member._id}`,
            );
            expect(memberItem).toBeTruthy();

            // Member text should contain memberId and roleDisplay
            const memberText = within(group).getByTestId(
              `member-text-${member._id}`,
            );
            expect(memberText.textContent).toContain(member.memberId);
            expect(memberText.textContent).toContain(member.roleDisplay);
          }
        }

        unmount();
      }),
      { numRuns: 100 },
    );
  });
});
