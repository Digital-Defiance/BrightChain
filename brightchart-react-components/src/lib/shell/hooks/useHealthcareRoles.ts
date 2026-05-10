/**
 * useHealthcareRoles — Fetches the authenticated user's healthcare roles.
 *
 * Calls GET /brightchart/healthcare-roles to resolve the member's
 * IHealthcareRole[] from the backend. The API returns roles with
 * `organization.display` populated from the organization's name field,
 * which maps directly to the IHealthcareRole interface consumed by
 * ActiveContext and RoleSwitcher.
 *
 * Falls back to default Physician/Patient roles derived from the auth
 * context when the API returns no roles or is unreachable.
 *
 * @module shell/hooks/useHealthcareRoles
 */

import type {
  IHealthcareRole,
  IShellMemberContext,
  ISpecialtyProfile,
} from '@brightchain/brightchart-lib';
import {
  ADMIN,
  BillingPermission,
  ClinicalPermission,
  DENTIST,
  DocumentPermission,
  EncounterPermission,
  getRoleCodeDisplay,
  MEDICAL_ASSISTANT,
  MEDICAL_SPECIALTY_PROFILE,
  OrderPermission,
  PATIENT,
  PatientPermission,
  PHYSICIAN,
  REGISTERED_NURSE,
  SchedulingPermission,
  VETERINARIAN,
} from '@brightchain/brightchart-lib';
import {
  useAuth,
  useAuthenticatedApi,
} from '@digitaldefiance/express-suite-react-components';
import { useCallback, useEffect, useMemo, useState } from 'react';

/** All permissions — granted to clinician/admin roles */
const ALL_PERMISSIONS: string[] = [
  PatientPermission.Read,
  PatientPermission.Write,
  PatientPermission.Admin,
  ClinicalPermission.ClinicalRead,
  ClinicalPermission.ClinicalWrite,
  ClinicalPermission.ClinicalAdmin,
  EncounterPermission.EncounterRead,
  EncounterPermission.EncounterWrite,
  EncounterPermission.EncounterAdmin,
  DocumentPermission.DocumentRead,
  DocumentPermission.DocumentWrite,
  DocumentPermission.DocumentAdmin,
  OrderPermission.OrderRead,
  OrderPermission.OrderWrite,
  OrderPermission.OrderSign,
  OrderPermission.OrderAdmin,
  SchedulingPermission.SchedulingRead,
  SchedulingPermission.SchedulingWrite,
  SchedulingPermission.SchedulingAdmin,
  BillingPermission.BillingRead,
  BillingPermission.BillingWrite,
  BillingPermission.BillingSubmit,
  BillingPermission.BillingAdmin,
];

/** Patient-level permissions (read-only, self-only) */
const PATIENT_PERMISSIONS: string[] = [
  PatientPermission.Read,
  ClinicalPermission.ClinicalRead,
  SchedulingPermission.SchedulingRead,
  BillingPermission.BillingRead,
];

/** Physician-level permissions (clinical R/W, no Admin-level, no Billing) */
const PHYSICIAN_PERMISSIONS: string[] = [
  PatientPermission.Read,
  PatientPermission.Write,
  ClinicalPermission.ClinicalRead,
  ClinicalPermission.ClinicalWrite,
  EncounterPermission.EncounterRead,
  EncounterPermission.EncounterWrite,
  DocumentPermission.DocumentRead,
  DocumentPermission.DocumentWrite,
  OrderPermission.OrderRead,
  OrderPermission.OrderWrite,
  OrderPermission.OrderSign,
  SchedulingPermission.SchedulingRead,
  SchedulingPermission.SchedulingWrite,
];

/** Registered Nurse permissions (clinical R/W, no orders, no billing, no admin) */
const REGISTERED_NURSE_PERMISSIONS: string[] = [
  PatientPermission.Read,
  ClinicalPermission.ClinicalRead,
  ClinicalPermission.ClinicalWrite,
  EncounterPermission.EncounterRead,
  EncounterPermission.EncounterWrite,
  DocumentPermission.DocumentRead,
  SchedulingPermission.SchedulingRead,
  SchedulingPermission.SchedulingWrite,
];

/** Medical Assistant permissions (limited clinical scope) */
const MEDICAL_ASSISTANT_PERMISSIONS: string[] = [
  PatientPermission.Read,
  PatientPermission.Write,
  ClinicalPermission.ClinicalRead,
  EncounterPermission.EncounterRead,
  SchedulingPermission.SchedulingRead,
  SchedulingPermission.SchedulingWrite,
  DocumentPermission.DocumentRead,
];

/** Resolve permissions for a given role code */
export function permissionsForRole(roleCode: string): string[] {
  switch (roleCode) {
    case PATIENT:
      return PATIENT_PERMISSIONS;
    case PHYSICIAN:
    case DENTIST:
    case VETERINARIAN:
      return PHYSICIAN_PERMISSIONS;
    case REGISTERED_NURSE:
      return REGISTERED_NURSE_PERMISSIONS;
    case MEDICAL_ASSISTANT:
      return MEDICAL_ASSISTANT_PERMISSIONS;
    case ADMIN:
      return ALL_PERMISSIONS;
    default:
      return PATIENT_PERMISSIONS;
  }
}

export interface UseHealthcareRolesResult {
  /** Whether the hook is still loading */
  loading: boolean;
  /** The authenticated member context */
  member: IShellMemberContext;
  /** Resolved healthcare roles */
  healthcareRoles: IHealthcareRole[];
  /** The initial/primary role */
  initialRole: IHealthcareRole;
  /** Active specialty profile */
  specialtyProfile: ISpecialtyProfile;
  /** SMART scopes (empty until backend implements them) */
  scopes: string[];
  /** Resolved permission strings for the initial role */
  resolvedPermissions: string[];
  /** Refetch roles from the API */
  refetch: () => void;
}

/**
 * Hook that resolves the current user's healthcare roles.
 *
 * Calls GET /brightchart/healthcare-roles which returns IHealthcareRole[]
 * with organization.display populated from the organization's name field.
 * The response shape maps directly to the IHealthcareRole interface:
 *   - roleCode, roleDisplay, specialty — direct fields
 *   - organization: IReference with reference and display
 *   - practitioner/patient: IReference with reference and display
 *   - period: IPeriod with start and optional end
 *
 * Falls back to sensible defaults when the API returns no roles or errors.
 */
export function useHealthcareRoles(): UseHealthcareRolesResult {
  const { userData } = useAuth();
  const api = useAuthenticatedApi();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<IHealthcareRole[] | null>(null);

  const member = useMemo<IShellMemberContext>(
    () => ({
      memberId: userData?.id ?? '',
      username: userData?.username ?? '',
      type: userData?.rolePrivileges?.admin ? 'Admin' : 'User',
      roles: userData?.roles?.map((r) =>
        typeof r === 'string' ? r : ((r as { name?: string }).name ?? ''),
      ),
    }),
    [userData],
  );

  const fetchRoles = useCallback(() => {
    if (!userData?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    api
      .get('/brightchart/healthcare-roles')
      .then((res) => {
        const data = res.data?.data;
        if (Array.isArray(data) && data.length > 0) {
          setRoles(data as IHealthcareRole[]);
        }
      })
      .catch(() => {
        // API unreachable or error — fall back to defaults
      })
      .finally(() => {
        setLoading(false);
      });
  }, [api, userData?.id]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Build fallback roles from the RBAC context when the API isn't available.
  // PATIENT is the default (most restrictive) so it is always first.
  const fallbackRoles = useMemo<IHealthcareRole[]>(() => {
    const isAdmin = userData?.rolePrivileges?.admin ?? false;
    const hasClinicalAccess =
      (userData?.rolePrivileges?.member ?? false) &&
      !(userData?.rolePrivileges?.child ?? false);
    const result: IHealthcareRole[] = [];

    // Default: give the user a Patient role (most restrictive fallback)
    result.push({
      roleCode: PATIENT,
      roleDisplay: getRoleCodeDisplay(PATIENT),
      organization: {
        display: 'Default Practice',
      },
      patient: {
        reference: `Patient/${member.memberId}`,
        display: member.username,
      },
    });

    // Only add Physician if rolePrivileges indicates clinical access
    if (hasClinicalAccess) {
      result.push({
        roleCode: PHYSICIAN,
        roleDisplay: getRoleCodeDisplay(PHYSICIAN),
        organization: {
          display: 'Default Practice',
        },
        practitioner: {
          reference: `Practitioner/${member.memberId}`,
          display: member.username,
        },
      });
    }

    if (isAdmin) {
      result.push({
        roleCode: ADMIN,
        roleDisplay: getRoleCodeDisplay(ADMIN),
        organization: {
          display: 'Default Practice',
        },
      });
    }

    return result;
  }, [userData, member]);

  const healthcareRoles = roles ?? fallbackRoles;
  const initialRole = healthcareRoles[0];
  const specialtyProfile = MEDICAL_SPECIALTY_PROFILE;
  const resolvedPermissions = permissionsForRole(initialRole.roleCode);

  return {
    loading,
    member,
    healthcareRoles,
    initialRole,
    specialtyProfile,
    scopes: [],
    resolvedPermissions,
    refetch: fetchRoles,
  };
}
