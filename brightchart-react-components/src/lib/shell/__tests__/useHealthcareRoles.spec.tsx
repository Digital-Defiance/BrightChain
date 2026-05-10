/**
 * Unit tests for useHealthcareRoles API integration.
 *
 * Tests that:
 * 1. Roles from API response populate ActiveContext correctly
 * 2. RoleSwitcher renders "roleDisplay — organization.display" for each role
 * 3. Fallback behavior when API returns empty array
 *
 * @module shell/__tests__/useHealthcareRoles.spec
 */

import type { IHealthcareRole } from '@brightchain/brightchart-lib';
import {
  ADMIN,
  MEDICAL_SPECIALTY_PROFILE,
  PATIENT,
  PHYSICIAN,
  getRoleCodeDisplay,
} from '@brightchain/brightchart-lib';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { RoleSwitcher } from '../components/Header/RoleSwitcher';
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

// Mock the i18n translation hook used by RoleSwitcher
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
        <span key={i} data-testid={`role-${i}-display`}>
          {r.roleDisplay} — {r.organization?.display}
        </span>
      ))}
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

describe('useHealthcareRoles API integration', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  describe('API roles populate ActiveContext correctly', () => {
    it('passes API roles to ActiveContext with organization.display populated', () => {
      const apiRoles: IHealthcareRole[] = [
        makeApiRole({
          roleCode: PHYSICIAN,
          roleDisplay: getRoleCodeDisplay(PHYSICIAN),
          organization: {
            reference: 'Organization/org-1',
            display: 'Sunrise Clinic',
          },
        }),
        makeApiRole({
          roleCode: PATIENT,
          roleDisplay: getRoleCodeDisplay(PATIENT),
          organization: {
            reference: 'Organization/org-2',
            display: 'Downtown Health',
          },
          practitioner: undefined,
          patient: {
            reference: 'Patient/member-1',
            display: 'testuser',
          },
        }),
      ];

      render(
        <ActiveContextWrapper roles={apiRoles}>
          <ActiveContextReader />
        </ActiveContextWrapper>,
      );

      expect(screen.getByTestId('active-role-code').textContent).toBe(
        PHYSICIAN,
      );
      expect(screen.getByTestId('active-org-name').textContent).toBe(
        'Sunrise Clinic',
      );
      expect(screen.getByTestId('role-count').textContent).toBe('2');
      expect(screen.getByTestId('role-0-display').textContent).toBe(
        `${getRoleCodeDisplay(PHYSICIAN)} — Sunrise Clinic`,
      );
      expect(screen.getByTestId('role-1-display').textContent).toBe(
        `${getRoleCodeDisplay(PATIENT)} — Downtown Health`,
      );
    });

    it('sets activePatientRef when active role is a patient role', () => {
      const patientRole = makeApiRole({
        roleCode: PATIENT,
        roleDisplay: getRoleCodeDisplay(PATIENT),
        practitioner: undefined,
        patient: {
          reference: 'Patient/member-1',
          display: 'testuser',
        },
      });

      render(
        <ActiveContextWrapper roles={[patientRole]}>
          <ActiveContextReader />
        </ActiveContextWrapper>,
      );

      expect(screen.getByTestId('active-patient-ref').textContent).toBe(
        'Patient/member-1',
      );
    });
  });

  describe('RoleSwitcher renders "roleDisplay — organization.display"', () => {
    it('renders the active role label with org name when single role', () => {
      const roles = [
        makeApiRole({
          roleCode: PHYSICIAN,
          roleDisplay: getRoleCodeDisplay(PHYSICIAN),
          organization: {
            reference: 'Organization/org-1',
            display: 'Sunrise Clinic',
          },
        }),
      ];

      render(
        <ActiveContextWrapper roles={roles}>
          <RoleSwitcher />
        </ActiveContextWrapper>,
      );

      expect(
        screen.getByText(`${getRoleCodeDisplay(PHYSICIAN)} — Sunrise Clinic`),
      ).toBeTruthy();
    });

    it('renders all roles in dropdown with "roleDisplay — organization.display" format', () => {
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
          roleCode: ADMIN,
          roleDisplay: getRoleCodeDisplay(ADMIN),
          organization: {
            reference: 'Organization/org-1',
            display: 'Sunrise Clinic',
          },
        }),
        makeApiRole({
          roleCode: PATIENT,
          roleDisplay: getRoleCodeDisplay(PATIENT),
          organization: {
            reference: 'Organization/org-2',
            display: 'Downtown Health',
          },
          practitioner: undefined,
          patient: {
            reference: 'Patient/member-1',
            display: 'testuser',
          },
        }),
      ];

      render(
        <ActiveContextWrapper roles={roles}>
          <RoleSwitcher />
        </ActiveContextWrapper>,
      );

      // With multiple roles, RoleSwitcher renders a button
      const switchButton = screen.getByRole('button', {
        name: /RoleSwitcher_AriaLabel/,
      });
      fireEvent.click(switchButton);

      // All roles should appear in the menu
      // The active role text appears both in the button and the menu item,
      // so we use getAllByText for the first role
      const physicianElements = screen.getAllByText(
        `${getRoleCodeDisplay(PHYSICIAN)} — Sunrise Clinic`,
      );
      expect(physicianElements.length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(`${getRoleCodeDisplay(ADMIN)} — Sunrise Clinic`),
      ).toBeTruthy();
      expect(
        screen.getByText(`${getRoleCodeDisplay(PATIENT)} — Downtown Health`),
      ).toBeTruthy();
    });
  });

  describe('Fallback behavior when API returns empty array', () => {
    it('uses fallback roles when API returns empty data array', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: [] } });

      let latestResult: ReturnType<typeof useHealthcareRoles> | undefined;

      render(
        <HookRenderer
          onResult={(result) => {
            latestResult = result;
          }}
        />,
      );

      await waitFor(() => {
        expect(latestResult?.loading).toBe(false);
      });

      // Should fall back to PATIENT as the default (most restrictive) role
      expect(latestResult!.healthcareRoles.length).toBeGreaterThanOrEqual(1);
      expect(latestResult!.healthcareRoles[0].roleCode).toBe(PATIENT);
      expect(latestResult!.healthcareRoles[0].organization?.display).toBe(
        'Default Practice',
      );
    });

    it('uses fallback roles when API call fails', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      let latestResult: ReturnType<typeof useHealthcareRoles> | undefined;

      render(
        <HookRenderer
          onResult={(result) => {
            latestResult = result;
          }}
        />,
      );

      await waitFor(() => {
        expect(latestResult?.loading).toBe(false);
      });

      // Should fall back to PATIENT as the default (most restrictive) role
      expect(latestResult!.healthcareRoles.length).toBeGreaterThanOrEqual(1);
      expect(latestResult!.healthcareRoles[0].roleCode).toBe(PATIENT);
    });

    it('uses API roles when API returns non-empty data', async () => {
      const apiRoles: IHealthcareRole[] = [
        makeApiRole({
          roleCode: ADMIN,
          roleDisplay: getRoleCodeDisplay(ADMIN),
          organization: {
            reference: 'Organization/org-99',
            display: 'Test Org',
          },
        }),
      ];

      mockGet.mockResolvedValue({
        data: { success: true, data: apiRoles },
      });

      let latestResult: ReturnType<typeof useHealthcareRoles> | undefined;

      render(
        <HookRenderer
          onResult={(result) => {
            latestResult = result;
          }}
        />,
      );

      await waitFor(() => {
        expect(latestResult?.loading).toBe(false);
        expect(latestResult?.healthcareRoles[0]?.roleCode).toBe(ADMIN);
      });

      expect(latestResult!.healthcareRoles).toHaveLength(1);
      expect(latestResult!.healthcareRoles[0].organization?.display).toBe(
        'Test Org',
      );
      expect(latestResult!.initialRole.roleCode).toBe(ADMIN);
    });
  });
});
