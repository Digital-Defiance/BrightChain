import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export interface IPowerUserContext {
  /** Whether power user mode is enabled */
  isPowerUser: boolean;
  /** Toggle power user mode */
  togglePowerUser: () => void;
  /** Whether to show advanced features inline (true) or behind expanders (false) */
  showAdvanced: boolean;
}

const PowerUserContext = createContext<IPowerUserContext>({
  isPowerUser: false,
  togglePowerUser: () => undefined,
  showAdvanced: false,
});

export interface IPowerUserProviderProps {
  children: ReactNode;
  /** Initial power user state (e.g., from user preferences) */
  initialPowerUser?: boolean;
}

/**
 * Context provider for progressive disclosure / power user mode.
 *
 * When power user mode is off (default), advanced features are hidden
 * behind "Advanced" expanders. When on, all features are shown inline.
 */
export function PowerUserProvider({
  children,
  initialPowerUser = false,
}: IPowerUserProviderProps) {
  const [isPowerUser, setIsPowerUser] = useState(initialPowerUser);

  const togglePowerUser = useCallback(() => {
    setIsPowerUser((prev) => !prev);
  }, []);

  const value = useMemo<IPowerUserContext>(
    () => ({
      isPowerUser,
      togglePowerUser,
      showAdvanced: isPowerUser,
    }),
    [isPowerUser, togglePowerUser],
  );

  return (
    <PowerUserContext.Provider value={value}>
      {children}
    </PowerUserContext.Provider>
  );
}

/**
 * Hook to access power user mode state.
 */
export function usePowerUser(): IPowerUserContext {
  return useContext(PowerUserContext);
}

export { PowerUserContext };
