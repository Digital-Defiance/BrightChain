/**
 * CSS class names for Font Awesome icon styles and families.
 *
 * These map to the `fa-*` classes used in HTML markup.
 * Updated to include all families available in Font Awesome 7 / the kit.
 */
export enum FontAwesomeTextStyleTypeEnum {
  // Styles (apply within a family)
  Solid = 'fa-solid',
  Regular = 'fa-regular',
  Light = 'fa-light',
  Thin = 'fa-thin',
  DuoTone = 'fa-duotone',
  Brands = 'fa-brands',
  Semibold = 'fa-semibold',
  Kit = 'fa-kit',

  // Families
  Classic = 'fa-classic',
  Sharp = 'fa-sharp',
  SharpDuotone = 'fa-sharp-duotone',
  Chisel = 'fa-chisel',
  Etch = 'fa-etch',
  Graphite = 'fa-graphite',
  Jelly = 'fa-jelly',
  JellyDuo = 'fa-jelly-duo',
  JellyFill = 'fa-jelly-fill',
  Notdog = 'fa-notdog',
  NotdogDuo = 'fa-notdog-duo',
  Slab = 'fa-slab',
  SlabPress = 'fa-slab-press',
  Thumbprint = 'fa-thumbprint',
  Utility = 'fa-utility',
  UtilityDuo = 'fa-utility-duo',
  UtilityFill = 'fa-utility-fill',
  Whiteboard = 'fa-whiteboard',

  // Legacy compound (kept for backward compatibility)
  SharpSolid = 'fa-sharp fa-solid',
}

/**
 * Abbreviation prefixes used in Font Awesome icon definitions.
 *
 * Each prefix encodes a family + style combination.
 * Derived from the kit's exports and @fortawesome/fontawesome-common-types IconPrefix.
 */
export enum FontAwesomeTextAbbreviation {
  // Classic family
  Solid = 'fas',
  Regular = 'far',
  Light = 'fal',
  Thin = 'fat',
  Brands = 'fab',

  // Duotone family
  DuoTone = 'fad',
  DuoToneRegular = 'fadr',
  DuoToneLight = 'fadl',
  DuoToneThin = 'fadt',

  // Sharp family
  SharpSolid = 'fass',
  SharpRegular = 'fasr',
  SharpLight = 'fasl',
  SharpThin = 'fast',

  // Sharp Duotone family
  SharpDuotoneSolid = 'fasds',
  SharpDuotoneRegular = 'fasdr',
  SharpDuotoneLight = 'fasdl',
  SharpDuotoneThin = 'fasdt',

  // Additional families (single-style)
  Chisel = 'facr',
  Etch = 'faes',
  Graphite = 'fagt',
  Jelly = 'fajr',
  JellyDuo = 'fajdr',
  JellyFill = 'fajfr',
  Notdog = 'fans',
  NotdogDuo = 'fands',
  Slab = 'faslr',
  SlabPress = 'faslpr',
  Thumbprint = 'fatl',
  Utility = 'fausb',
  UtilityDuo = 'faudsb',
  UtilityFill = 'faufsb',
  Whiteboard = 'fawsb',

  // Kit custom icons
  Kit = 'fak',
  KitDuotone = 'fakd',
}

export const FontAbbreviationToClassTable: Record<string, string> = {
  // Classic family
  [FontAwesomeTextAbbreviation.Solid]: FontAwesomeTextStyleTypeEnum.Solid,
  [FontAwesomeTextAbbreviation.Regular]: FontAwesomeTextStyleTypeEnum.Regular,
  [FontAwesomeTextAbbreviation.Light]: FontAwesomeTextStyleTypeEnum.Light,
  [FontAwesomeTextAbbreviation.Thin]: FontAwesomeTextStyleTypeEnum.Thin,
  [FontAwesomeTextAbbreviation.Brands]: FontAwesomeTextStyleTypeEnum.Brands,

  // Duotone family
  [FontAwesomeTextAbbreviation.DuoTone]: `${FontAwesomeTextStyleTypeEnum.DuoTone} ${FontAwesomeTextStyleTypeEnum.Solid}`,
  [FontAwesomeTextAbbreviation.DuoToneRegular]: `${FontAwesomeTextStyleTypeEnum.DuoTone} ${FontAwesomeTextStyleTypeEnum.Regular}`,
  [FontAwesomeTextAbbreviation.DuoToneLight]: `${FontAwesomeTextStyleTypeEnum.DuoTone} ${FontAwesomeTextStyleTypeEnum.Light}`,
  [FontAwesomeTextAbbreviation.DuoToneThin]: `${FontAwesomeTextStyleTypeEnum.DuoTone} ${FontAwesomeTextStyleTypeEnum.Thin}`,

  // Sharp family
  [FontAwesomeTextAbbreviation.SharpSolid]: `${FontAwesomeTextStyleTypeEnum.Sharp} ${FontAwesomeTextStyleTypeEnum.Solid}`,
  [FontAwesomeTextAbbreviation.SharpRegular]: `${FontAwesomeTextStyleTypeEnum.Sharp} ${FontAwesomeTextStyleTypeEnum.Regular}`,
  [FontAwesomeTextAbbreviation.SharpLight]: `${FontAwesomeTextStyleTypeEnum.Sharp} ${FontAwesomeTextStyleTypeEnum.Light}`,
  [FontAwesomeTextAbbreviation.SharpThin]: `${FontAwesomeTextStyleTypeEnum.Sharp} ${FontAwesomeTextStyleTypeEnum.Thin}`,

  // Sharp Duotone family
  [FontAwesomeTextAbbreviation.SharpDuotoneSolid]: `${FontAwesomeTextStyleTypeEnum.SharpDuotone} ${FontAwesomeTextStyleTypeEnum.Solid}`,
  [FontAwesomeTextAbbreviation.SharpDuotoneRegular]: `${FontAwesomeTextStyleTypeEnum.SharpDuotone} ${FontAwesomeTextStyleTypeEnum.Regular}`,
  [FontAwesomeTextAbbreviation.SharpDuotoneLight]: `${FontAwesomeTextStyleTypeEnum.SharpDuotone} ${FontAwesomeTextStyleTypeEnum.Light}`,
  [FontAwesomeTextAbbreviation.SharpDuotoneThin]: `${FontAwesomeTextStyleTypeEnum.SharpDuotone} ${FontAwesomeTextStyleTypeEnum.Thin}`,

  // Additional families
  [FontAwesomeTextAbbreviation.Chisel]: FontAwesomeTextStyleTypeEnum.Chisel,
  [FontAwesomeTextAbbreviation.Etch]: FontAwesomeTextStyleTypeEnum.Etch,
  [FontAwesomeTextAbbreviation.Graphite]: FontAwesomeTextStyleTypeEnum.Graphite,
  [FontAwesomeTextAbbreviation.Jelly]: FontAwesomeTextStyleTypeEnum.Jelly,
  [FontAwesomeTextAbbreviation.JellyDuo]: FontAwesomeTextStyleTypeEnum.JellyDuo,
  [FontAwesomeTextAbbreviation.JellyFill]:
    FontAwesomeTextStyleTypeEnum.JellyFill,
  [FontAwesomeTextAbbreviation.Notdog]: FontAwesomeTextStyleTypeEnum.Notdog,
  [FontAwesomeTextAbbreviation.NotdogDuo]:
    FontAwesomeTextStyleTypeEnum.NotdogDuo,
  [FontAwesomeTextAbbreviation.Slab]: FontAwesomeTextStyleTypeEnum.Slab,
  [FontAwesomeTextAbbreviation.SlabPress]:
    FontAwesomeTextStyleTypeEnum.SlabPress,
  [FontAwesomeTextAbbreviation.Thumbprint]:
    FontAwesomeTextStyleTypeEnum.Thumbprint,
  [FontAwesomeTextAbbreviation.Utility]: FontAwesomeTextStyleTypeEnum.Utility,
  [FontAwesomeTextAbbreviation.UtilityDuo]:
    FontAwesomeTextStyleTypeEnum.UtilityDuo,
  [FontAwesomeTextAbbreviation.UtilityFill]:
    FontAwesomeTextStyleTypeEnum.UtilityFill,
  [FontAwesomeTextAbbreviation.Whiteboard]:
    FontAwesomeTextStyleTypeEnum.Whiteboard,

  // Kit
  [FontAwesomeTextAbbreviation.Kit]: FontAwesomeTextStyleTypeEnum.Kit,
  [FontAwesomeTextAbbreviation.KitDuotone]: `${FontAwesomeTextStyleTypeEnum.Kit} ${FontAwesomeTextStyleTypeEnum.DuoTone}`,
};

export const FontClassToAbbreviationNameTable: Record<string, string> = {
  [FontAwesomeTextStyleTypeEnum.Solid]: FontAwesomeTextAbbreviation.Solid,
  [FontAwesomeTextStyleTypeEnum.Regular]: FontAwesomeTextAbbreviation.Regular,
  [FontAwesomeTextStyleTypeEnum.Light]: FontAwesomeTextAbbreviation.Light,
  [FontAwesomeTextStyleTypeEnum.Thin]: FontAwesomeTextAbbreviation.Thin,
  [FontAwesomeTextStyleTypeEnum.DuoTone]: FontAwesomeTextAbbreviation.DuoTone,
  [FontAwesomeTextStyleTypeEnum.Brands]: FontAwesomeTextAbbreviation.Brands,
  [FontAwesomeTextStyleTypeEnum.Kit]: FontAwesomeTextAbbreviation.Kit,
  [FontAwesomeTextStyleTypeEnum.SharpSolid]:
    FontAwesomeTextAbbreviation.SharpSolid,
  [FontAwesomeTextStyleTypeEnum.Sharp]: FontAwesomeTextAbbreviation.SharpSolid,
  [FontAwesomeTextStyleTypeEnum.SharpDuotone]:
    FontAwesomeTextAbbreviation.SharpDuotoneSolid,
  [FontAwesomeTextStyleTypeEnum.Chisel]: FontAwesomeTextAbbreviation.Chisel,
  [FontAwesomeTextStyleTypeEnum.Etch]: FontAwesomeTextAbbreviation.Etch,
  [FontAwesomeTextStyleTypeEnum.Graphite]: FontAwesomeTextAbbreviation.Graphite,
  [FontAwesomeTextStyleTypeEnum.Jelly]: FontAwesomeTextAbbreviation.Jelly,
  [FontAwesomeTextStyleTypeEnum.JellyDuo]: FontAwesomeTextAbbreviation.JellyDuo,
  [FontAwesomeTextStyleTypeEnum.JellyFill]:
    FontAwesomeTextAbbreviation.JellyFill,
  [FontAwesomeTextStyleTypeEnum.Notdog]: FontAwesomeTextAbbreviation.Notdog,
  [FontAwesomeTextStyleTypeEnum.NotdogDuo]:
    FontAwesomeTextAbbreviation.NotdogDuo,
  [FontAwesomeTextStyleTypeEnum.Slab]: FontAwesomeTextAbbreviation.Slab,
  [FontAwesomeTextStyleTypeEnum.SlabPress]:
    FontAwesomeTextAbbreviation.SlabPress,
  [FontAwesomeTextStyleTypeEnum.Thumbprint]:
    FontAwesomeTextAbbreviation.Thumbprint,
  [FontAwesomeTextStyleTypeEnum.Utility]: FontAwesomeTextAbbreviation.Utility,
  [FontAwesomeTextStyleTypeEnum.UtilityDuo]:
    FontAwesomeTextAbbreviation.UtilityDuo,
  [FontAwesomeTextStyleTypeEnum.UtilityFill]:
    FontAwesomeTextAbbreviation.UtilityFill,
  [FontAwesomeTextStyleTypeEnum.Whiteboard]:
    FontAwesomeTextAbbreviation.Whiteboard,
};

export const FontClassToNameTable: Record<string, string> = {
  [FontAwesomeTextStyleTypeEnum.Solid]: 'Solid',
  [FontAwesomeTextStyleTypeEnum.Regular]: 'Regular',
  [FontAwesomeTextStyleTypeEnum.Light]: 'Light',
  [FontAwesomeTextStyleTypeEnum.Thin]: 'Thin',
  [FontAwesomeTextStyleTypeEnum.DuoTone]: 'DuoTone',
  [FontAwesomeTextStyleTypeEnum.Brands]: 'Brands',
  [FontAwesomeTextStyleTypeEnum.Semibold]: 'Semibold',
  [FontAwesomeTextStyleTypeEnum.Kit]: 'Kit',
  [FontAwesomeTextStyleTypeEnum.Classic]: 'Classic',
  [FontAwesomeTextStyleTypeEnum.Sharp]: 'Sharp',
  [FontAwesomeTextStyleTypeEnum.SharpDuotone]: 'SharpDuotone',
  [FontAwesomeTextStyleTypeEnum.SharpSolid]: 'SharpSolid',
  [FontAwesomeTextStyleTypeEnum.Chisel]: 'Chisel',
  [FontAwesomeTextStyleTypeEnum.Etch]: 'Etch',
  [FontAwesomeTextStyleTypeEnum.Graphite]: 'Graphite',
  [FontAwesomeTextStyleTypeEnum.Jelly]: 'Jelly',
  [FontAwesomeTextStyleTypeEnum.JellyDuo]: 'JellyDuo',
  [FontAwesomeTextStyleTypeEnum.JellyFill]: 'JellyFill',
  [FontAwesomeTextStyleTypeEnum.Notdog]: 'Notdog',
  [FontAwesomeTextStyleTypeEnum.NotdogDuo]: 'NotdogDuo',
  [FontAwesomeTextStyleTypeEnum.Slab]: 'Slab',
  [FontAwesomeTextStyleTypeEnum.SlabPress]: 'SlabPress',
  [FontAwesomeTextStyleTypeEnum.Thumbprint]: 'Thumbprint',
  [FontAwesomeTextStyleTypeEnum.Utility]: 'Utility',
  [FontAwesomeTextStyleTypeEnum.UtilityDuo]: 'UtilityDuo',
  [FontAwesomeTextStyleTypeEnum.UtilityFill]: 'UtilityFill',
  [FontAwesomeTextStyleTypeEnum.Whiteboard]: 'Whiteboard',
};
