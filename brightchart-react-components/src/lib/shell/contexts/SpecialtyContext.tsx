/**
 * SpecialtyContext — React context provider for the active specialty profile.
 *
 * Holds the active ISpecialtyProfile and provides it to all child components.
 *
 * @module shell/contexts/SpecialtyContext
 */

import type { ISpecialtyProfile } from '@brightchain/brightchart-lib';
import React, { createContext, useContext, useMemo } from 'react';

export interface SpecialtyContextValue {
  /** The active specialty profile */
  profile: ISpecialtyProfile;
  /** Convenience: specialty code string */
  specialtyCode: string;
  /** Convenience: display name (e.g. "BrightChart Medical") */
  displayName: string;
}

const SpecialtyContext = createContext<SpecialtyContextValue | null>(null);

export interface SpecialtyContextProviderProps {
  profile: ISpecialtyProfile;
  children: React.ReactNode;
}

export const SpecialtyContextProvider: React.FC<
  SpecialtyContextProviderProps
> = ({ profile, children }) => {
  const value = useMemo<SpecialtyContextValue>(
    () => ({
      profile,
      specialtyCode: profile.specialtyCode,
      displayName: profile.displayName,
    }),
    [profile],
  );

  return (
    <SpecialtyContext.Provider value={value}>
      {children}
    </SpecialtyContext.Provider>
  );
};

/**
 * Hook to consume the SpecialtyContext.
 * Throws if used outside of SpecialtyContextProvider.
 */
export function useSpecialty(): SpecialtyContextValue {
  const ctx = useContext(SpecialtyContext);
  if (!ctx) {
    throw new Error(
      'useSpecialty must be used within a SpecialtyContextProvider',
    );
  }
  return ctx;
}

export { SpecialtyContext };
