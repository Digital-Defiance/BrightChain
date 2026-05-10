import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';

export interface IDuressContext {
  /** Whether duress protocols are currently executing */
  isDuressActive: boolean;
  /** Activate duress mode (called by auth layer on duress password) */
  activateDuress: () => void;
}

const DuressContext = createContext<IDuressContext>({
  isDuressActive: false,
  activateDuress: () => undefined,
});

export interface IDuressProviderProps {
  children: ReactNode;
}

/**
 * Context provider for duress-aware UI behavior.
 *
 * When duress is active, the UI presents a normal-appearing interface
 * with no visual indication that protocols have been triggered.
 * Components can check `isDuressActive` to suppress any telltale UI
 * elements (e.g., canary status indicators, destruction confirmations).
 */
export function DuressProvider({ children }: IDuressProviderProps) {
  const [isDuressActive, setIsDuressActive] = useState(false);

  const value = useMemo<IDuressContext>(
    () => ({
      isDuressActive,
      activateDuress: () => setIsDuressActive(true),
    }),
    [isDuressActive],
  );

  return (
    <DuressContext.Provider value={value}>{children}</DuressContext.Provider>
  );
}

/**
 * Hook to access duress state. Components should use this to
 * conditionally hide any UI that would reveal protocol execution.
 */
export function useDuress(): IDuressContext {
  return useContext(DuressContext);
}

export { DuressContext };
