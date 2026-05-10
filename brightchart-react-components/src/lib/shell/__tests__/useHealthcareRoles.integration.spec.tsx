/**
 * Integration tests for useHealthcareRoles hook ↔ ActiveContext contract.
 *
 * Verifies that:
 * 1. API roles matching HealthcareRoleController output populate ActiveContext (Req 4.1)
 * 2. ActiveContext sets activeOrganizationName from initial role (Req 4.2)
 * 3. Role switch updates activeOrganizationName and activePatientRef (Req 4.3)
 * 4. Empty API response falls back to default roles with "Default Practice" (Req 4.4)
 *
 * @module shell/__tests__/useHealthcareRoles.integration.spec
 */

import type { IHealthcareRole } from '@brightchain/brightchart-lib';
import {
  ADMIN,
  MEDICAL_SPECIALTY_PROFILE,
  PATIENT,
  PHYSICIAN,
  REGISTERED_NURSE,
  getRoleCodeDisplay,
} from '@brightchain/brightchart-lib';
import { render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  ActiveContextProvider,
  useActiveContext,
} from '../contexts/ActiveContext';
import { useHealthcareRoles } from '../hooks/useHealthcareRoles';

// --- Mocks ---

const mockGet = jest.fn();

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useAuth: () => ({
    userData: {
      id: 'member-1',
      username: 'testuser',
      rolePrivileges: { admin: false },
      roles: [],
    },
  }),
  useAuthenticatedApi: () => ({
    get: mockGet,
  }),
}));

jest.mock('../../hooks/useBrightChartTranslation', () => ({
  useBrightChartTranslation: () => ({
    t: (key: string) => key,
    tEnum: (_enumType: unknown, value: unknown) => String(value),
  }),
}));

// --- Test helpers ---

/** Build a mock API role matching the shape returned by HealthcareRoleController */
function makeApiRole(
  overrides: Partial<IHealthcareRole> = {},
): IHealthcareRole {
  return {
    roleCode: PHYSICIAN,
    roleDisplay: getRoleCodeDisplay(PHYSICIAN),
    organization: {
      reference: 'Organization/org-1',
      display: 'Sunrise Clinic',
    },
    practitioner: {
      reference: 'Practitioner/member-1',
      display: 'testuser',
    },
    ...overrides,
  };
}

/** Wrapper that renders children inside ActiveContextProvider + MemoryRouter */
function ActiveContextWrapper({
  roles,
  children,
}: {
  roles: IHealthcareRole[];
  children?: React.ReactNode;
}) {
  const initialRole = roles[0];
  return (
    <MemoryRouter>
      <ActiveContextProvider
        member={{
          memberId: 'member-1',
          username: 'testuser',
          type: 'User',
        }}
        healthcareRoles={roles}
        initialRole={initialRole}
        specialtyProfile={MEDICAL_SPECIALTY_PROFILE}
      >
        {children}
      </ActiveContextProvider>
    </MemoryRouter>
  );
}

/** Component that reads ActiveContext and displays values for assertions */
function ActiveContextReader() {
  const ctx = useActiveContext();
  return (
    <div>
      <span data-testid="active-role-code">{ctx.activeRole.roleCode}</span>
      <span data-testid="active-org-name">
        {ctx.activeOrganizationName ?? ''}
      </span>
      <span data-testid="active-patient-ref">{ctx.activePatientRef ?? ''}</span>
      <span data-testid="role-count">{ctx.healthcareRoles.length}</span>
      {ctx.healthcareRoles.map((r: IHealthcareRole, i: number) => (
        <span key={i} data-testid={`role-${i}-org-display`}>
          {r.organization?.display ?? ''}
        </span>
      ))}
    </div>
  );
}

/** Component that exposes switchRole for testing role switches */
function RoleSwitchReader({ targetIndex }: { targetIndex: number }) {
  const ctx = useActiveContext();
  const [switched, setSwitched] = React.useState(false);

  React.useEffect(() => {
    if (!switched && ctx.healthcareRoles[targetIndex]) {
      ctx.switchRole(ctx.healthcareRoles[targetIndex]);
      setSwitched(true);
    }
  }, [ctx, targetIndex, switched]);

  return (
    <div>
      <span data-testid="switched-role-code">{ctx.activeRole.roleCode}</span>
      <span data-testid="switched-org-name">
        {ctx.activeOrganizationName ?? ''}
      </span>
      <span data-testid="switched-patient-ref">
        {ctx.activePatientRef ?? ''}
      </span>
    </div>
  );
}

/** Component that renders the hook result for testing */
function HookRenderer({
  onResult,
}: {
  onResult: (result: ReturnType<typeof useHealthcareRoles>) => void;
}) {
  const result = useHealthcareRoles();
  React.useEffect(() => {
    onResult(result);
  });
  return null;
}

// --- Tests ---

describe('useHealthcareRoles hook integration with ActiveContext', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  /**
   * Validates: Requirements 4.1
   * API roles matching HealthcareRoleController output populate ActiveContext with all roles.
   */
  it('API roles populate ActiveContext with all roles and organization.display', async () => {
    const roles: IHealthcareRole[] = [
      makeApiRole({
        roleCode: PHYSICIAN,
        roleDisplay: getRoleCodeDisplay(PHYSICIAN),
        organization: {
          reference: 'Organization/org-1',
          display: 'Sunrise Clinic',
        },
      }),
      makeApiRole({
        roleCode: REGISTERED_NURSE,
        roleDisplay: getRoleCodeDisplay(REGISTERED_NURSE),
        organization: {
          reference: 'Organization/org-2',
          display: 'Mountain View Hospital',
        },
      }),
      makeApiRole({
        roleCode: ADMIN,
        roleDisplay: getRoleCodeDisplay(ADMIN),
        organization: {
          reference: 'Organization/org-3',
          display: 'Valley Health Center',
        },
      }),
    ];

    render(
      <ActiveContextWrapper roles={roles}>
        <ActiveContextReader />
      </ActiveContextWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('role-count').textContent).toBe('3');
    });

    expect(screen.getByTestId('role-0-org-display').textContent).toBe(
      'Sunrise Clinic',
    );
    expect(screen.getByTestId('role-1-org-display').textContent).toBe(
      'Mountain View Hospital',
    );
    expect(screen.getByTestId('role-2-org-display').textContent).toBe(
      'Valley Health Center',
    );
  });

  /**
   * Validates: Requirements 4.2
   * ActiveContext sets activeOrganizationName to the organization.display of the initial role.
   */
  it('ActiveContext sets activeOrganizationName from initial role', async () => {
    const roles: IHealthcareRole[] = [
      makeApiRole({
        roleCode: PHYSICIAN,
        roleDisplay: getRoleCodeDisplay(PHYSICIAN),
        organization: {
          reference: 'Organization/org-sunrise',
          display: 'Sunrise Clinic',
        },
      }),
    ];

    render(
      <ActiveContextWrapper roles={roles}>
        <ActiveContextReader />
      </ActiveContextWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('active-org-name').textContent).toBe(
        'Sunrise Clinic',
      );
    });
  });

  /**
   * Validates: Requirements 4.3
   * Role switch updates activeOrganizationName and activePatientRef to reflect the newly selected role.
   */
  it('Role switch updates activeOrganizationName and activePatientRef', async () => {
    const roles: IHealthcareRole[] = [
      makeApiRole({
        roleCode: PHYSICIAN,
        roleDisplay: getRoleCodeDisplay(PHYSICIAN),
        organization: {
          reference: 'Organization/org-sunrise',
          display: 'Sunrise Clinic',
        },
      }),
      makeApiRole({
        roleCode: PATIENT,
        roleDisplay: getRoleCodeDisplay(PATIENT),
        organization: {
          reference: 'Organization/org-mountain',
          display: 'Mountain View Hospital',
        },
        patient: {
          reference: 'Patient/patient-42',
          display: 'testuser',
        },
      }),
    ];

    render(
      <ActiveContextWrapper roles={roles}>
        <RoleSwitchReader targetIndex={1} />
      </ActiveContextWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('switched-org-name').textContent).toBe(
        'Mountain View Hospital',
      );
    });

    expect(screen.getByTestId('switched-patient-ref').textContent).toBe(
      'Patient/patient-42',
    );
  });

  /**
   * Validates: Requirements 4.4
   * Empty API response falls back to default roles with organization.display set to "Default Practice".
   */
  it('Empty API response falls back to default roles with "Default Practice"', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [] } });

    let latestResult: ReturnType<typeof useHealthcareRoles> | undefined;

    render(
      <MemoryRouter>
        <HookRenderer
          onResult={(result) => {
            latestResult = result;
          }}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(latestResult?.loading).toBe(false);
    });

    // Should fall back to default roles since API returned empty.
    // The fix changed the fallback to PATIENT (most restrictive) instead of PHYSICIAN.
    expect(latestResult!.healthcareRoles.length).toBeGreaterThanOrEqual(1);
    expect(latestResult!.healthcareRoles[0].roleCode).toBe(PATIENT);
    expect(latestResult!.healthcareRoles[0].organization?.display).toBe(
      'Default Practice',
    );
  });
});
