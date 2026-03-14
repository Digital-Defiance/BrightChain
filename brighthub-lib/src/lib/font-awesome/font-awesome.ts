import {
  all,
  byPrefixAndName,
  IconDefinition,
} from '@awesome.me/kit-a20d532681/icons';
import type {
  IconPrefix as FAIconPrefix,
  IconFamily,
  IconStyle,
} from '@fortawesome/fontawesome-common-types';
import * as cssProperties from 'known-css-properties';
import postcss, { Declaration, Root } from 'postcss';

import { FontAwesomeTextStyleTypeEnum } from '../fontawesome-text-class';

export const DefaultIconClass = FontAwesomeTextStyleTypeEnum.Regular;

/**
 * All valid icon prefixes, derived at runtime from the kit's byPrefixAndName export.
 * No need to maintain a hardcoded list — this updates automatically when the kit changes.
 */
export const FontAwesomeIconPrefixStrings: string[] =
  Object.keys(byPrefixAndName).sort();
export const FontAwesomeIconPrefixes =
  FontAwesomeIconPrefixStrings as readonly string[];
export type FontAwesomeIconPrefix = FAIconPrefix;

/**
 * Mapping from prefix to family+style, derived from the kit's module structure.
 * The kit imports follow the pattern: `./family/style.mjs` → prefix.
 * We derive this from the icon data itself: each icon carries its prefix,
 * and the fontawesome-common-types package defines the canonical family/style types.
 *
 * For the markup parser, we care about the CSS class names (family + style),
 * which are the values users type in `{{ solid heart }}` or `{{ sharpsolid heart }}`.
 */

/**
 * All valid icon style names that can be used in markup.
 * Derived from the canonical IconStyle type plus compound family-style names
 * (e.g., 'sharpsolid') that the markup parser supports.
 *
 * The base styles come from @fortawesome/fontawesome-common-types IconStyle:
 * solid, regular, light, thin, duotone, brands, semibold
 *
 * We also include family names from IconFamily that can be used as style qualifiers:
 * classic, sharp, sharp-duotone, chisel, etch, graphite, jelly, jelly-duo,
 * jelly-fill, notdog, notdog-duo, slab, slab-press, thumbprint, utility,
 * utility-duo, utility-fill, whiteboard
 */
const BASE_STYLES: IconStyle[] = [
  'solid',
  'regular',
  'light',
  'thin',
  'duotone',
  'brands',
  'semibold',
];
const FAMILIES: IconFamily[] = [
  'classic',
  'duotone',
  'sharp',
  'sharp-duotone',
  'chisel',
  'etch',
  'graphite',
  'jelly',
  'jelly-duo',
  'jelly-fill',
  'notdog',
  'notdog-duo',
  'slab',
  'slab-press',
  'thumbprint',
  'utility',
  'utility-duo',
  'utility-fill',
  'whiteboard',
];

/**
 * Combined set of all valid style/family strings accepted in icon markup.
 * Includes base styles, family names, and legacy compound names like 'sharpsolid'.
 */
export const FontAwesomeIconStyleStrings: string[] = [
  ...new Set([
    ...BASE_STYLES,
    ...FAMILIES,
    // Legacy compound name kept for backward compatibility
    'sharpsolid',
  ]),
].sort();
export const FontAwesomeIconStyles =
  FontAwesomeIconStyleStrings as readonly string[];
export type FontAwesomeIconStyle = IconStyle | IconFamily | 'sharpsolid';

/**
 * Valid additional CSS utility classes for Font Awesome icons.
 * These are sizing and animation classes defined by the FA CSS framework.
 * See: https://docs.fontawesome.com/web/style/size
 * See: https://docs.fontawesome.com/web/style/animate
 *
 * Note: These are CSS utility classes, not derived from icon data.
 * They must be updated if Font Awesome adds new utility classes.
 */
export const FontAwesomeAdditionalClasses = [
  // Relative sizing (t-shirt sizes)
  '2xs',
  'xs',
  'sm',
  'lg',
  'xl',
  '2xl',
  // Literal sizing (1x–10x)
  '1x',
  '2x',
  '3x',
  '4x',
  '5x',
  '6x',
  '7x',
  '8x',
  '9x',
  '10x',
  // Animations
  'spin',
  'spin-reverse',
  'spin-pulse',
  'pulse', // deprecated alias for spin-pulse
  'beat',
  'beat-fade',
  'bounce',
  'fade',
  'flip',
  'shake',
  // Rotation & flipping
  'rotate-90',
  'rotate-180',
  'rotate-270',
  'rotate-by',
  'flip-horizontal',
  'flip-vertical',
  'flip-both',
  // Fixed width & canvas
  'fw',
  'width-auto',
  // Bordered & pulled
  'border',
  'pull-start',
  'pull-end',
  'pull-left', // legacy alias for pull-start
  'pull-right', // legacy alias for pull-end
  // Stacking
  'stack-1x',
  'stack-2x',
  'inverse',
  // Duotone
  'swap-opacity',
  // Lists
  'li',
  'ul',
] as const;
export const FontAwesomeAdditionalClassStrings: string[] = [
  ...FontAwesomeAdditionalClasses,
];
export type FontAwesomeAdditionalClass =
  (typeof FontAwesomeAdditionalClasses)[number];
export const DisallowedIconPropertyRegex =
  /^(display|position|top|left|right|bottom|z-index|margin|padding)$/;

/**
 * All available icon names from the Font Awesome kit, derived at runtime
 * from the kit's ES module exports. No filesystem access needed.
 */
export const FontAwesomeIconNames: readonly string[] = [
  ...new Set(all.map((icon: IconDefinition) => icon.iconName)),
];

/**
 * Extract icon details from icon markup.
 * @param parts
 * @returns
 */
export function extractIconDetails(parts: string[]): {
  iconName: string;
  iconBaseClass: string[];
  additionalClasses: string[];
} {
  if (parts.length === 0) {
    throw new Error('Invalid icon markup: no icon class or name specified');
  }

  let iconBaseClass: string[] = ['regular'];
  let additionalClasses: string[] = [];

  if (
    FontAwesomeIconStyleStrings.includes(parts[0]) ||
    parts[0] === 'sharpsolid'
  ) {
    const styleClass = parts.shift() as string;
    iconBaseClass =
      styleClass === 'sharpsolid' ? ['sharp', 'solid'] : [styleClass];
  }

  if (parts.length === 0) {
    throw new Error('Invalid icon markup: no icon name specified');
  }

  const iconName = parts.shift() as string;
  additionalClasses = parts;

  if (!FontAwesomeIconNames.includes(iconName)) {
    throw new Error(`Invalid icon name: ${iconName}`);
  }

  const invalidAdditionalClasses = additionalClasses.filter(
    (cls) => !FontAwesomeAdditionalClassStrings.includes(cls),
  );
  if (invalidAdditionalClasses.length > 0) {
    throw new Error(
      `Invalid additional class: ${invalidAdditionalClasses.join(', ')}`,
    );
  }

  return { iconName, iconBaseClass, additionalClasses };
}

/**
 * Strip icon markup tags from the input string.
 * @param input
 * @returns
 */
export function stripIconMarkup(input: string): string {
  // replace {{iconName}} or {{ iconName }} with ''
  const regex = /\s*\{\{\s*([a-zA-Z0-9-_;:%#&*!^ ]+)\s*\}\}\s*/g;
  return input.replace(regex, ' ').trim();
}

/**
 * Checks if a CSS declaration (property and value) is valid.
 * @param declaration The CSS declaration to validate.
 * @returns `true` if valid, `false` otherwise.
 */
function isValidCSSProperty(declaration: string): boolean {
  // Check for extra semicolons
  if (declaration.includes(';;')) {
    return false;
  }

  const [property, ...valueParts] = declaration
    .split(':')
    .map((str) => str.trim());
  const value = valueParts.join(':').trim();

  if (!property || !value) {
    return false;
  }

  // Validate the property name
  if (!cssProperties.all.includes(property)) {
    return false;
  }

  // Restrict specific properties
  if (DisallowedIconPropertyRegex.test(property)) {
    return false;
  }

  // Validate value structure
  const valueRegex =
    /^([-+]?[0-9]*\.?[0-9]+(px|em|rem|%)?|auto|inherit|initial|none)$/;
  const colorRegex = /^#[0-9A-Fa-f]{3,6}$|^[a-zA-Z]+$/;
  if (!valueRegex.test(value) && !colorRegex.test(value)) {
    return false;
  }

  // Check for invalid characters in property name
  if (!/^[a-zA-Z-]+$/.test(property)) {
    return false;
  }

  return true;
}

/**
 * Validates the CSS properties using the `css` library.
 *
 * @param cssString The CSS string to validate
 * @returns `true` if the CSS is valid, `false` otherwise
 */
function isValidCSS(cssString: string): boolean {
  try {
    const root: Root = postcss.parse(`i { ${cssString} }`);

    root.walkDecls((decl: Declaration) => {
      const property = decl.prop;
      const value = decl.value;

      // Validate the property name
      if (!cssProperties.all.includes(property)) {
        throw new Error(`Invalid property: ${property}`);
      }

      // Restrict specific properties
      if (DisallowedIconPropertyRegex.test(property)) {
        throw new Error(`Disallowed property: ${property}`);
      }

      // Validate value structure
      const valueRegex =
        /^([-+]?[0-9]*\.?[0-9]+(px|em|rem|%)?|auto|inherit|initial|none)$/;
      const colorRegex = /^#[0-9A-Fa-f]{3,6}$|^[a-zA-Z]+$/;
      if (!valueRegex.test(value) && !colorRegex.test(value)) {
        throw new Error(`Invalid value: ${value}`);
      }
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Validates the icon markup to ensure it follows the correct syntax and contains valid icon names, classes, and additional classes.
 *
 * ## Validation Rules
 *
 * 1. The markup must be enclosed in double curly braces `{{ }}`.
 * 2. The icon name must be a valid Font Awesome icon name.
 * 3. The icon class (if specified) must be one of the valid Font Awesome classes.
 * 4. Any additional classes must be valid Font Awesome additional classes.
 * 5. The style attributes (if specified) must be valid CSS properties.
 *
 * @param markup The icon markup string to validate
 * @returns `true` if the markup is valid, `false` otherwise
 */
export function isValidIconMarkup(markup: string): boolean {
  if (!markup.startsWith('{{') || !markup.endsWith('}}')) {
    return false;
  }

  const content = markup.slice(2, -2).trim();
  if (!content) {
    return false;
  }

  const parts = content.split(/;(.*)/s);
  const mainPart = parts[0].trim();
  const stylePart = parts[1] ? parts[1].trim() : '';

  const mainParts = mainPart.split(/\s+/);
  if (mainParts.length < 1) {
    return false;
  }

  try {
    const { iconName, additionalClasses } = extractIconDetails(mainParts);

    if (!FontAwesomeIconNames.includes(iconName)) {
      return false;
    }

    for (const additionalClass of additionalClasses) {
      if (!FontAwesomeAdditionalClassStrings.includes(additionalClass)) {
        return false;
      }
    }

    if (stylePart) {
      const styleDeclarations = stylePart
        .split(';')
        .map((decl) => decl.trim())
        .filter((decl) => decl);
      for (const declaration of styleDeclarations) {
        if (!isValidCSSProperty(declaration)) {
          return false;
        }
      }
      if (!isValidCSS(stylePart)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * This function takes the input text and parses it to convert Font Awesome icon markup into HTML.
 * The icon markup syntax provides a flexible way to insert Font Awesome icons into text with optional styling.
 * The syntax is enclosed in double curly braces `{{ }}`.
 *
 * ## Basic Syntax
 *
 * ```
 * {{iconName}}
 * ```
 * - Renders as `fa-regular fa-iconName`
 * - Example: `{{heart}}` becomes `<i class="fa-regular fa-heart" style="display: inline-block;"></i>`
 *
 * ## Specifying Icon Style
 *
 * ```
 * {{class iconName}}
 * ```
 * - `class` can be one of:
 *   - classic
 *   - duotone
 *   - light
 *   - regular
 *   - solid
 *   - thin
 *   - brands
 *   - sharpsolid
 * - Example: `{{solid heart}}` becomes `<i class="fa-solid fa-heart" style="display: inline-block;"></i>`
 *
 * ## Additional Classes
 *
 * ```
 * {{class iconName additionalClass1 additionalClass2 ...}}
 * ```
 * - Additional classes can include:
 *   - Sizes: xs, sm, lg, xl, 2xl, 1x, 2x, 3x, 4x, 5x, 6x, 7x, 8x, 9x, 10x
 *   - Animations: spin, pulse, beat, fade, flip
 * - Example: `{{solid heart lg spin}}` becomes `<i class="fa-solid fa-heart fa-lg fa-spin" style="display: inline-block;"></i>`
 *
 * ## Custom Styling
 *
 * ```
 * {{class iconName additionalClasses; style1; style2; ...}}
 * ```
 * - CSS styles can be added after a semicolon
 * - Example: `{{solid heart; color: red; font-size: 20px;}}` becomes `<i class="fa-solid fa-heart" style="display: inline-block; color: red; font-size: 20px;"></i>`
 *
 * ## Important Notes
 *
 * 1. The `display: inline-block;` style is always included and cannot be overridden.
 * 2. Multiple icons can be used in a single string.
 * 3. Invalid markup is left untouched in the output.
 * 4. The parser sanitizes and validates CSS styles for security.
 *
 * @param text The string to be parsed
 * @returns The parsed markup as a string
 */
export function parseIconMarkup(input: string): string {
  return input.replace(/\{\{([^}]+)\}\}/g, (match, content) => {
    if (isValidIconMarkup(match)) {
      const [iconPart, stylePart] = content
        .split(/;(.*)/)
        .map((part: string) => part.trim());
      const { iconName, iconBaseClass, additionalClasses } = extractIconDetails(
        iconPart.split(/\s+/),
      );
      const baseStyle = 'display: inline-block;';
      const customStyle = stylePart ? `${baseStyle} ${stylePart}` : baseStyle;
      const classNames = [
        `${iconBaseClass.map((c) => `fa-${c}`).join(' ')}`,
        `fa-${iconName}`,
        ...additionalClasses.map((c) => `fa-${c}`),
      ].join(' ');
      return `<i class="${classNames}" style="${customStyle}"></i>`;
    }
    return match;
  });
}
