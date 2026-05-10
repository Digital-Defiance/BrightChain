/**
 * Specialty Themes
 *
 * CSS custom property sets for each specialty: medical (blue palette),
 * dental (teal palette), veterinary (green palette).
 *
 * @module shell/config/specialtyThemes
 */

export interface SpecialtyTheme {
  /** CSS class name applied to the layout root */
  className: string;
  /** CSS custom properties */
  properties: Record<string, string>;
}

export const SPECIALTY_THEMES: Record<string, SpecialtyTheme> = {
  medical: {
    className: 'brightchart-theme--medical',
    properties: {
      '--bc-primary': '#1565C0',
      '--bc-primary-light': '#42A5F5',
      '--bc-primary-dark': '#0D47A1',
      '--bc-accent': '#2196F3',
      '--bc-sidebar-bg': '#E3F2FD',
      '--bc-header-bg': '#1565C0',
      '--bc-header-text': '#FFFFFF',
    },
  },
  dental: {
    className: 'brightchart-theme--dental',
    properties: {
      '--bc-primary': '#00897B',
      '--bc-primary-light': '#4DB6AC',
      '--bc-primary-dark': '#00695C',
      '--bc-accent': '#009688',
      '--bc-sidebar-bg': '#E0F2F1',
      '--bc-header-bg': '#00897B',
      '--bc-header-text': '#FFFFFF',
    },
  },
  veterinary: {
    className: 'brightchart-theme--veterinary',
    properties: {
      '--bc-primary': '#2E7D32',
      '--bc-primary-light': '#66BB6A',
      '--bc-primary-dark': '#1B5E20',
      '--bc-accent': '#4CAF50',
      '--bc-sidebar-bg': '#E8F5E9',
      '--bc-header-bg': '#2E7D32',
      '--bc-header-text': '#FFFFFF',
    },
  },
};

/** Get the theme for a specialty code, falling back to medical */
export function getSpecialtyTheme(specialtyCode: string): SpecialtyTheme {
  return SPECIALTY_THEMES[specialtyCode] ?? SPECIALTY_THEMES['medical'];
}
