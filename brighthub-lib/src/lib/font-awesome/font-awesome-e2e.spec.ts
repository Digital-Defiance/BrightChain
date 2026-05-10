/**
 * End-to-end tests verifying the full chain:
 *   Picker markupStyle → {{}} markup → parseIconMarkup → <i> HTML
 *
 * Each entry mirrors a STYLE_OPTIONS row from the BrightHub FontAwesomeIconPicker.
 * The test ensures that the markup token the picker emits is accepted by the
 * parser and produces the correct CSS class string.
 */

import {
  isValidIconMarkup,
  parseIconMarkup,
} from './font-awesome';

/**
 * Every style option the picker can emit.
 * - markupStyle: the token the picker places before the icon name (empty = default regular)
 * - expectedCssPrefix: the CSS class(es) the parser should produce for that token
 */
const PICKER_STYLE_OPTIONS = [
  // Classic family
  { label: 'Solid', markupStyle: 'solid', expectedCssPrefix: 'fa-solid' },
  { label: 'Regular', markupStyle: '', expectedCssPrefix: 'fa-regular' },
  { label: 'Light', markupStyle: 'light', expectedCssPrefix: 'fa-light' },
  { label: 'Thin', markupStyle: 'thin', expectedCssPrefix: 'fa-thin' },
  // Brands
  { label: 'Brands', markupStyle: 'brands', expectedCssPrefix: 'fa-brands' },
  // Duotone family
  { label: 'Duotone', markupStyle: 'duotone', expectedCssPrefix: 'fa-duotone' },
  { label: 'Duotone Regular', markupStyle: 'duotoneregular', expectedCssPrefix: 'fa-duotone fa-regular' },
  { label: 'Duotone Light', markupStyle: 'duotonelight', expectedCssPrefix: 'fa-duotone fa-light' },
  { label: 'Duotone Thin', markupStyle: 'duotonethin', expectedCssPrefix: 'fa-duotone fa-thin' },
  // Sharp family
  { label: 'Sharp Solid', markupStyle: 'sharpsolid', expectedCssPrefix: 'fa-sharp fa-solid' },
  { label: 'Sharp Regular', markupStyle: 'sharpregular', expectedCssPrefix: 'fa-sharp fa-regular' },
  { label: 'Sharp Light', markupStyle: 'sharplight', expectedCssPrefix: 'fa-sharp fa-light' },
  { label: 'Sharp Thin', markupStyle: 'sharpthin', expectedCssPrefix: 'fa-sharp fa-thin' },
  // Sharp Duotone family
  { label: 'Sharp Duotone Solid', markupStyle: 'sharpduotonesolid', expectedCssPrefix: 'fa-sharp-duotone fa-solid' },
  { label: 'Sharp Duotone Regular', markupStyle: 'sharpduotoneregular', expectedCssPrefix: 'fa-sharp-duotone fa-regular' },
  { label: 'Sharp Duotone Light', markupStyle: 'sharpduotonelight', expectedCssPrefix: 'fa-sharp-duotone fa-light' },
  { label: 'Sharp Duotone Thin', markupStyle: 'sharpduotonethin', expectedCssPrefix: 'fa-sharp-duotone fa-thin' },
  // Specialty families
  { label: 'Chisel', markupStyle: 'chisel', expectedCssPrefix: 'fa-chisel fa-regular' },
  { label: 'Etch', markupStyle: 'etch', expectedCssPrefix: 'fa-etch fa-solid' },
  { label: 'Graphite', markupStyle: 'graphite', expectedCssPrefix: 'fa-graphite fa-thin' },
  { label: 'Jelly', markupStyle: 'jelly', expectedCssPrefix: 'fa-jelly fa-regular' },
  { label: 'Jelly Duo', markupStyle: 'jelly-duo', expectedCssPrefix: 'fa-jelly-duo fa-regular' },
  { label: 'Jelly Fill', markupStyle: 'jelly-fill', expectedCssPrefix: 'fa-jelly-fill fa-regular' },
  { label: 'Notdog', markupStyle: 'notdog', expectedCssPrefix: 'fa-notdog fa-solid' },
  { label: 'Notdog Duo', markupStyle: 'notdog-duo', expectedCssPrefix: 'fa-notdog-duo fa-solid' },
  { label: 'Slab', markupStyle: 'slab', expectedCssPrefix: 'fa-slab fa-regular' },
  { label: 'Slab Press', markupStyle: 'slab-press', expectedCssPrefix: 'fa-slab-press fa-regular' },
  { label: 'Thumbprint', markupStyle: 'thumbprint', expectedCssPrefix: 'fa-thumbprint fa-light' },
  { label: 'Utility', markupStyle: 'utility', expectedCssPrefix: 'fa-utility fa-semibold' },
  { label: 'Utility Duo', markupStyle: 'utility-duo', expectedCssPrefix: 'fa-utility-duo fa-semibold' },
  { label: 'Utility Fill', markupStyle: 'utility-fill', expectedCssPrefix: 'fa-utility-fill fa-semibold' },
  { label: 'Whiteboard', markupStyle: 'whiteboard', expectedCssPrefix: 'fa-whiteboard fa-semibold' },
];

describe('Picker → Markup → HTML end-to-end', () => {
  describe.each(PICKER_STYLE_OPTIONS)(
    '$label (markupStyle: "$markupStyle")',
    ({ markupStyle, expectedCssPrefix }) => {
      const iconName = 'heart';
      const markup = markupStyle
        ? `{{${markupStyle} ${iconName}}}`
        : `{{${iconName}}}`;
      const expectedHtml =
        `<i class="${expectedCssPrefix} fa-${iconName}" style="display: inline-block;"></i>`;

      it(`markup "${markup}" is valid`, () => {
        expect(isValidIconMarkup(markup)).toBe(true);
      });

      it(`parses to correct HTML`, () => {
        expect(parseIconMarkup(markup)).toBe(expectedHtml);
      });
    },
  );

  describe('with additional classes', () => {
    it('handles animation + size', () => {
      const markup = '{{solid heart lg spin}}';
      expect(isValidIconMarkup(markup)).toBe(true);
      expect(parseIconMarkup(markup)).toBe(
        '<i class="fa-solid fa-heart fa-lg fa-spin" style="display: inline-block;"></i>',
      );
    });

    it('handles specialty family + animation', () => {
      const markup = '{{chisel heart bounce}}';
      expect(isValidIconMarkup(markup)).toBe(true);
      expect(parseIconMarkup(markup)).toBe(
        '<i class="fa-chisel fa-regular fa-heart fa-bounce" style="display: inline-block;"></i>',
      );
    });

    it('handles rotation', () => {
      const markup = '{{solid heart rotate-90}}';
      expect(isValidIconMarkup(markup)).toBe(true);
      expect(parseIconMarkup(markup)).toBe(
        '<i class="fa-solid fa-heart fa-rotate-90" style="display: inline-block;"></i>',
      );
    });
  });

  describe('with CSS styles', () => {
    it('handles color', () => {
      const markup = '{{solid heart; color: red}}';
      expect(isValidIconMarkup(markup)).toBe(true);
      expect(parseIconMarkup(markup)).toBe(
        '<i class="fa-solid fa-heart" style="display: inline-block; color: red"></i>',
      );
    });

    it('handles specialty family + color', () => {
      const markup = '{{chisel heart; color: blue}}';
      expect(isValidIconMarkup(markup)).toBe(true);
      expect(parseIconMarkup(markup)).toBe(
        '<i class="fa-chisel fa-regular fa-heart" style="display: inline-block; color: blue"></i>',
      );
    });

    it('handles full combo: family + additional classes + CSS', () => {
      const markup = '{{sharpduotonesolid heart lg spin; color: red; font-size: 20px}}';
      expect(isValidIconMarkup(markup)).toBe(true);
      expect(parseIconMarkup(markup)).toBe(
        '<i class="fa-sharp-duotone fa-solid fa-heart fa-lg fa-spin" style="display: inline-block; color: red; font-size: 20px"></i>',
      );
    });
  });

  describe('uniqueness — each picker option produces distinct markup', () => {
    it('all markupStyle tokens are unique', () => {
      const nonEmpty = PICKER_STYLE_OPTIONS
        .map((o) => o.markupStyle)
        .filter((s) => s !== '');
      const unique = new Set(nonEmpty);
      expect(unique.size).toBe(nonEmpty.length);
    });

    it('all expectedCssPrefix values are unique', () => {
      const prefixes = PICKER_STYLE_OPTIONS.map((o) => o.expectedCssPrefix);
      const unique = new Set(prefixes);
      expect(unique.size).toBe(prefixes.length);
    });
  });
});
