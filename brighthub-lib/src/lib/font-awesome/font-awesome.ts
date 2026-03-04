import * as fs from 'fs';
import * as cssProperties from 'known-css-properties';
import * as path from 'path';
import postcss, { Declaration, Root } from 'postcss';

import { FontAwesomeTextStyleTypeEnum } from '../fontawesome-text-class';

export const DefaultIconClass = FontAwesomeTextStyleTypeEnum.Regular;
export const FontAwesomeIconPrefixes = [
  'fab',
  'fal',
  'far',
  'fas',
  'fat',
  'fad',
  'fasl',
  'fasr',
  'fass',
  'fast',
  'fasds',
] as const;
export const FontAwesomeIconPrefixStrings = [
  'fab',
  'fal',
  'far',
  'fas',
  'fat',
  'fad',
  'fasl',
  'fasr',
  'fass',
  'fast',
  'fasds',
];
export type FontAwesomeIconPrefix = (typeof FontAwesomeIconPrefixes)[number];
export const FontAwesomeIconStyles = [
  'classic',
  'duotone',
  'light',
  'regular',
  'solid',
  'thin',
  'brands',
  'sharpsolid',
] as const;
export const FontAwesomeIconStyleStrings = [
  'classic',
  'duotone',
  'light',
  'regular',
  'solid',
  'thin',
  'brands',
  'sharpsolid',
];
export type FontAwesomeIconStyle = (typeof FontAwesomeIconStyles)[number];
export const FontAwesomeAdditionalClasses = [
  'xs',
  'sm',
  'lg',
  'xl',
  '2xl',
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
  'spin',
  'pulse',
  'beat',
  'fade',
  'flip',
] as const;
export const FontAwesomeAdditionalClassStrings = [
  'xs',
  'sm',
  'lg',
  'xl',
  '2xl',
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
  'spin',
  'pulse',
  'beat',
  'fade',
  'flip',
];
export type FontAwesomeAdditionalClass =
  (typeof FontAwesomeAdditionalClasses)[number];
export const DisallowedIconPropertyRegex =
  /^(display|position|top|left|right|bottom|z-index|margin|padding)$/;

/**
 * Get all available icon names from the Font Awesome kit metadata.
 * Reads from the kit's icons.json metadata file.
 * @returns Array of unique icon names
 */
export function getIconNames(): string[] {
  try {
    // Try to find the kit's icons.json metadata file
    const possiblePaths = [
      // When running from workspace root
      path.join(
        process.cwd(),
        'node_modules/@awesome.me/kit-a20d532681/icons/metadata/icons.json',
      ),
      // When running from brighthub-lib directory
      path.join(
        process.cwd(),
        '../node_modules/@awesome.me/kit-a20d532681/icons/metadata/icons.json',
      ),
      // Resolve from this file's location
      path.join(
        __dirname,
        '../../../../node_modules/@awesome.me/kit-a20d532681/icons/metadata/icons.json',
      ),
    ];

    for (const iconPath of possiblePaths) {
      if (fs.existsSync(iconPath)) {
        const iconsData = JSON.parse(fs.readFileSync(iconPath, 'utf-8'));
        return Object.keys(iconsData);
      }
    }

    // Fallback: return empty array if metadata not found
    console.warn(
      'FontAwesome kit icons.json not found, icon validation will be disabled',
    );
    return [];
  } catch (error) {
    console.warn('Error loading FontAwesome icon names:', error);
    return [];
  }
}

export const FontAwesomeIconNames = getIconNames();

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

  const [property, value] = declaration.split(':').map((str) => str.trim());

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
    /^[-+]?[0-9]*\.?[0-9]+(px|em|rem|%)?|auto|inherit|initial|none$/;
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
        /^[-+]?[0-9]*\.?[0-9]+(px|em|rem|%)?|auto|inherit|initial|none$/;
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

  const parts = content.split(';', 2);
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
