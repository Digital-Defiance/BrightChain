/**
 * ActiveContext — React context provider for the BrightChart shell state.
 *
 * Holds the authenticated member, healthcare roles, active role,
 * specialty profile, active patient, and active encounter.
 *
 * @module shell/contexts/ActiveContext
 */

import type {
  IActiveContext,
  IEncounterResource,
  IHealthcareRole,
  IPatientResource,
  IShellMemberContext,
  ISpecialtyProfile,
} from '@brightchain/brightchart-lib';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

const ActiveContext = createContext<IActiveContext | null>(null);

export interface ActiveContextProviderProps {
  member: IShellMemberContext;
  healthcareRoles: IHealthcareRole[];
  initialRole: IHealthcareRole;
  specialtyProfile: ISpecialtyProfile;
  /** Optional callback to refetch healthcare roles after role-creating mutations */
  refetchRoles?: () => void;
  children: React.ReactNode;
}

export const ActiveContextProvider: React.FC<ActiveContextProviderProps> = ({
  member,
  healthcareRoles,
  initialRole,
  specialtyProfile,
  refetchRoles,
  children,
}) => {
  const [activeRole, setActiveRole] = useState<IHealthcareRole>(initialRole);
  const [activePatient, setActivePatient] = useState<
    IPatientResource | undefined
  >();
  const [activeEncounter, setActiveEncounter] = useState<
    IEncounterResource | undefined
  >();

  const switchRole = useCallback((role: IHealthcareRole) => {
    setActiveRole(role);
    // Clear patient/encounter when switching roles
    setActivePatient(undefined);
    setActiveEncounter(undefined);
  }, []);

  const value = useMemo<IActiveContext>(
    () => ({
      member,
      healthcareRoles,
      activeRole,
      specialtyProfile,
      activeOrganizationName: activeRole.organization?.display,
      activePatientRef: activeRole.patient?.reference,
      activePatient,
      activeEncounter,
      setActivePatient,
      setActiveEncounter,
      switchRole,
      refetchRoles,
    }),
    [
      member,
      healthcareRoles,
      activeRole,
      specialtyProfile,
      activePatient,
      activeEncounter,
      switchRole,
      refetchRoles,
    ],
  );

  return (
    <ActiveContext.Provider value={value}>{children}</ActiveContext.Provider>
  );
};

/**
 * Hook to consume the ActiveContext.
 * Throws if used outside of ActiveContextProvider.
 */
export function useActiveContext(): IActiveContext {
  const ctx = useContext(ActiveContext);
  if (!ctx) {
    throw new Error(
      'useActiveContext must be used within an ActiveContextProvider',
    );
  }
  return ctx;
}

export { ActiveContext };
