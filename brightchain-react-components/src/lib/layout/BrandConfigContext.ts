import { createContext, useContext } from 'react';
import { BrandConfig } from './types';

export const BrandConfigContext = createContext<BrandConfig | null>(null);

export function useBrandConfig(): BrandConfig {
  const ctx = useContext(BrandConfigContext);
  if (!ctx) {
    throw new Error('useBrandConfig must be used within a LayoutShell');
  }
  return ctx;
}
