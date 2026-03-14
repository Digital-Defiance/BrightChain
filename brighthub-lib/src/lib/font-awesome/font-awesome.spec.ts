import {
  extractIconDetails,
  FontAwesomeAdditionalClasses,
  FontAwesomeAdditionalClassStrings,
  FontAwesomeIconNames,
  FontAwesomeIconPrefixStrings,
  FontAwesomeIconStyles,
  FontAwesomeIconStyleStrings,
  isValidIconMarkup,
  parseIconMarkup,
  stripIconMarkup,
} from './font-awesome';

describe('font-awesome', () => {
  // ─── Runtime-derived data ───────────────────────────────────────────

  describe('runtime-derived exports', () => {
    it('should derive icon prefixes from the kit at runtime', () => {
      expect(FontAwesomeIconPrefixStrings.length).toBeGreaterThan(0);
      // Spot-check well-known prefixes
      expect(FontAwesomeIconPrefixStrings).toContain('fas');
      expect(FontAwesomeIconPrefixStrings).toContain('far');
      expect(FontAwesomeIconPrefixStrings).toContain('fab');
      expect(FontAwesomeIconPrefixStrings).toContain('fal');
      expect(FontAwesomeIconPrefixStrings).toContain('fat');
      expect(FontAwesomeIconPrefixStrings).toContain('fad');
    });

    it('should include new FA7 prefixes', () => {
      // Sharp family
      expect(FontAwesomeIconPrefixStrings).toContain('fass');
      expect(FontAwesomeIconPrefixStrings).toContain('fasr');
      expect(FontAwesomeIconPrefixStrings).toContain('fasl');
      expect(FontAwesomeIconPrefixStrings).toContain('fast');
      // Sharp Duotone
      expect(FontAwesomeIconPrefixStrings).toContain('fasds');
      expect(FontAwesomeIconPrefixStrings).toContain('fasdr');
      // Small batch families
      expect(FontAwesomeIconPrefixStrings).toContain('facr'); // chisel
      expect(FontAwesomeIconPrefixStrings).toContain('faes'); // etch
      expect(FontAwesomeIconPrefixStrings).toContain('fagt'); // graphite
      expect(FontAwesomeIconPrefixStrings).toContain('fajr'); // jelly
      expect(FontAwesomeIconPrefixStrings).toContain('fawsb'); // whiteboard
    });

    it('should derive icon names from the kit at runtime', () => {
      expect(FontAwesomeIconNames.length).toBeGreaterThan(0);
      expect(FontAwesomeIconNames).toContain('heart');
      expect(FontAwesomeIconNames).toContain('star');
      expect(FontAwesomeIconNames).toContain('user');
    });

    it('should have no duplicate icon names', () => {
      const unique = new Set(FontAwesomeIconNames);
      expect(unique.size).toBe(FontAwesomeIconNames.length);
    });
  });

  // ─── Style / family lists ───────────────────────────────────────────

  describe('style and family lists', () => {
    it('should include all base styles', () => {
      expect(FontAwesomeIconStyleStrings).toContain('solid');
      expect(FontAwesomeIconStyleStrings).toContain('regular');
      expect(FontAwesomeIconStyleStrings).toContain('light');
      expect(FontAwesomeIconStyleStrings).toContain('thin');
      expect(FontAwesomeIconStyleStrings).toContain('duotone');
      expect(FontAwesomeIconStyleStrings).toContain('brands');
      expect(FontAwesomeIconStyleStrings).toContain('semibold');
    });

    it('should include all FA7 families', () => {
      const expectedFamilies = [
        'classic',
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
      expectedFamilies.forEach((family) => {
        expect(FontAwesomeIconStyleStrings).toContain(family);
      });
    });

    it('should include legacy sharpsolid compound name', () => {
      expect(FontAwesomeIconStyleStrings).toContain('sharpsolid');
    });
  });

  // ─── Additional classes list ────────────────────────────────────────

  describe('additional classes list', () => {
    it('should include all relative sizing classes', () => {
      ['2xs', 'xs', 'sm', 'lg', 'xl', '2xl'].forEach((cls) => {
        expect(FontAwesomeAdditionalClassStrings).toContain(cls);
      });
    });

    it('should include all literal sizing classes (1x–10x)', () => {
      for (let i = 1; i <= 10; i++) {
        expect(FontAwesomeAdditionalClassStrings).toContain(`${i}x`);
      }
    });

    it('should include all animation classes', () => {
      [
        'spin',
        'spin-reverse',
        'spin-pulse',
        'pulse',
        'beat',
        'beat-fade',
        'bounce',
        'fade',
        'flip',
        'shake',
      ].forEach((cls) => {
        expect(FontAwesomeAdditionalClassStrings).toContain(cls);
      });
    });

    it('should include rotation and flip classes', () => {
      [
        'rotate-90',
        'rotate-180',
        'rotate-270',
        'rotate-by',
        'flip-horizontal',
        'flip-vertical',
        'flip-both',
      ].forEach((cls) => {
        expect(FontAwesomeAdditionalClassStrings).toContain(cls);
      });
    });

    it('should include fixed-width and canvas classes', () => {
      expect(FontAwesomeAdditionalClassStrings).toContain('fw');
      expect(FontAwesomeAdditionalClassStrings).toContain('width-auto');
    });

    it('should include border and pull classes', () => {
      ['border', 'pull-start', 'pull-end', 'pull-left', 'pull-right'].forEach(
        (cls) => {
          expect(FontAwesomeAdditionalClassStrings).toContain(cls);
        },
      );
    });

    it('should include stacking classes', () => {
      ['stack-1x', 'stack-2x', 'inverse'].forEach((cls) => {
        expect(FontAwesomeAdditionalClassStrings).toContain(cls);
      });
    });

    it('should include duotone swap-opacity class', () => {
      expect(FontAwesomeAdditionalClassStrings).toContain('swap-opacity');
    });

    it('should include list classes', () => {
      expect(FontAwesomeAdditionalClassStrings).toContain('li');
      expect(FontAwesomeAdditionalClassStrings).toContain('ul');
    });
  });

  // ─── extractIconDetails ─────────────────────────────────────────────

  describe('extractIconDetails', () => {
    it('should extract icon details for valid input with icon class and name', () => {
      const parts = ['solid', 'heart'];
      const result = extractIconDetails(parts);
      expect(result).toEqual({
        iconName: 'heart',
        iconBaseClass: ['solid'],
        additionalClasses: [],
      });
    });

    it('should extract icon details for valid input with additional classes', () => {
      const parts = ['solid', 'heart', 'lg', 'spin'];
      const result = extractIconDetails(parts);
      expect(result).toEqual({
        iconName: 'heart',
        iconBaseClass: ['solid'],
        additionalClasses: ['lg', 'spin'],
      });
    });

    it('should extract icon details for valid input with default icon class', () => {
      const parts = ['heart'];
      const result = extractIconDetails(parts);
      expect(result).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: [],
      });
    });

    it('should extract icon details for valid input with default icon class and additional classes', () => {
      const parts = ['heart', 'lg', 'spin'];
      const result = extractIconDetails(parts);
      expect(result).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['lg', 'spin'],
      });
    });

    /* this test is misleading, when we provide invalid-class,
     * then since the first term was not one of FontAwesomeIconStyleStrings,
     * invalid-class becomes the iconName, and heart is expected to be an additional class.
     * invalid-class is therefore an invalid icon name.
     */
    it('should throw an error for invalid icon class', () => {
      const parts = ['invalid', 'heart'];
      expect(() => extractIconDetails(parts)).toThrow(
        'Invalid icon name: invalid',
      );
    });

    it('should throw an error for invalid icon name', () => {
      const parts = ['solid', 'invalid-icon'];
      expect(() => extractIconDetails(parts)).toThrow(
        'Invalid icon name: invalid-icon',
      );
    });

    it('should throw an error for invalid additional classes', () => {
      const parts = ['solid', 'heart', 'invalid-class'];
      expect(() => extractIconDetails(parts)).toThrow(
        'Invalid additional class: invalid-class',
      );
    });

    it('should throw an error for invalid icon name when first term is invalid class', () => {
      const parts = ['invalid-class'];
      expect(() => extractIconDetails(parts)).toThrow(
        'Invalid icon name: invalid-class',
      );
    });

    it('should handle empty input array', () => {
      const parts: string[] = [];
      expect(() => extractIconDetails(parts)).toThrow(
        'Invalid icon markup: no icon class or name specified',
      );
    });

    it('should handle input array with only invalid additional classes', () => {
      const parts = ['invalid-class'];
      expect(() => extractIconDetails(parts)).toThrow(
        'Invalid icon name: invalid-class',
      );
    });

    it('should handle input array with only valid additional classes', () => {
      const parts = ['lg', 'spin'];
      expect(() => extractIconDetails(parts)).toThrow('Invalid icon name: lg');
    });

    it('should handle input array with valid icon name and invalid additional classes', () => {
      const parts = ['heart', 'invalid-class'];
      expect(() => extractIconDetails(parts)).toThrow(
        'Invalid additional class: invalid-class',
      );
    });

    it('should handle input array with valid icon class, name, and invalid additional classes', () => {
      const parts = ['solid', 'heart', 'invalid-class'];
      expect(() => extractIconDetails(parts)).toThrow(
        'Invalid additional class: invalid-class',
      );
    });

    // ── New FA7 family tests ──

    it('should handle sharp family', () => {
      expect(extractIconDetails(['sharp', 'heart'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['sharp'],
        additionalClasses: [],
      });
    });

    it('should handle sharp-duotone family', () => {
      expect(extractIconDetails(['sharp-duotone', 'heart'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['sharp-duotone'],
        additionalClasses: [],
      });
    });

    it('should handle sharpsolid compound as two base classes', () => {
      expect(extractIconDetails(['sharpsolid', 'heart'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['sharp', 'solid'],
        additionalClasses: [],
      });
    });

    it('should handle chisel family', () => {
      expect(extractIconDetails(['chisel', 'heart'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['chisel'],
        additionalClasses: [],
      });
    });

    it('should handle jelly family', () => {
      expect(extractIconDetails(['jelly', 'heart'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['jelly'],
        additionalClasses: [],
      });
    });

    it('should handle utility family', () => {
      expect(extractIconDetails(['utility', 'heart'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['utility'],
        additionalClasses: [],
      });
    });

    it('should handle whiteboard family', () => {
      expect(extractIconDetails(['whiteboard', 'heart'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['whiteboard'],
        additionalClasses: [],
      });
    });

    it('should handle semibold style', () => {
      expect(extractIconDetails(['semibold', 'heart'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['semibold'],
        additionalClasses: [],
      });
    });

    // ── New additional class tests ──

    it('should accept new sizing class 2xs', () => {
      expect(extractIconDetails(['heart', '2xs'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['2xs'],
      });
    });

    it('should accept animation classes beat-fade, bounce, shake', () => {
      expect(
        extractIconDetails(['heart', 'beat-fade', 'bounce', 'shake']),
      ).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['beat-fade', 'bounce', 'shake'],
      });
    });

    it('should accept spin-pulse and spin-reverse', () => {
      expect(
        extractIconDetails(['heart', 'spin-pulse', 'spin-reverse']),
      ).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['spin-pulse', 'spin-reverse'],
      });
    });

    it('should accept rotation classes', () => {
      expect(extractIconDetails(['heart', 'rotate-90'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['rotate-90'],
      });
      expect(extractIconDetails(['heart', 'rotate-180'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['rotate-180'],
      });
      expect(extractIconDetails(['heart', 'rotate-270'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['rotate-270'],
      });
      expect(extractIconDetails(['heart', 'rotate-by'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['rotate-by'],
      });
    });

    it('should accept flip classes', () => {
      expect(extractIconDetails(['heart', 'flip-horizontal'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['flip-horizontal'],
      });
      expect(extractIconDetails(['heart', 'flip-vertical'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['flip-vertical'],
      });
      expect(extractIconDetails(['heart', 'flip-both'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['flip-both'],
      });
    });

    it('should accept fw and width-auto', () => {
      expect(extractIconDetails(['heart', 'fw'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['fw'],
      });
      expect(extractIconDetails(['heart', 'width-auto'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['width-auto'],
      });
    });

    it('should accept border and pull classes', () => {
      expect(extractIconDetails(['heart', 'border'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['border'],
      });
      expect(extractIconDetails(['heart', 'pull-start'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['pull-start'],
      });
      expect(extractIconDetails(['heart', 'pull-end'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['pull-end'],
      });
    });

    it('should accept stacking classes', () => {
      expect(extractIconDetails(['heart', 'stack-1x'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['stack-1x'],
      });
      expect(extractIconDetails(['heart', 'stack-2x'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['stack-2x'],
      });
      expect(extractIconDetails(['heart', 'inverse'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['regular'],
        additionalClasses: ['inverse'],
      });
    });

    it('should accept swap-opacity for duotone', () => {
      expect(extractIconDetails(['duotone', 'heart', 'swap-opacity'])).toEqual({
        iconName: 'heart',
        iconBaseClass: ['duotone'],
        additionalClasses: ['swap-opacity'],
      });
    });

    it('should throw error when style is provided without icon name', () => {
      expect(() => extractIconDetails(['solid'])).toThrow(
        'Invalid icon markup: no icon name specified',
      );
    });

    it('should throw error for multiple invalid additional classes', () => {
      expect(() =>
        extractIconDetails(['solid', 'heart', 'bad1', 'bad2']),
      ).toThrow('Invalid additional class: bad1, bad2');
    });
  });

  // ─── stripIconMarkup ────────────────────────────────────────────────

  describe('stripIconMarkup', () => {
    it('should strip simple icon markup', () => {
      expect(stripIconMarkup('Hello {{heart}} World')).toBe(
        'Hello World',
      );
    });

    it('should strip icon markup with style', () => {
      expect(stripIconMarkup('{{solid heart}}')).toBe('');
    });

    it('should strip icon markup with spaces inside braces', () => {
      expect(stripIconMarkup('{{ heart }}')).toBe('');
    });

    it('should strip multiple icon markups', () => {
      expect(stripIconMarkup('A {{heart}} B {{star}} C')).toBe('A B C');
    });

    it('should return original string when no markup present', () => {
      expect(stripIconMarkup('Hello World')).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(stripIconMarkup('')).toBe('');
    });

    it('should strip markup with CSS styles', () => {
      expect(stripIconMarkup('{{solid heart; color: red;}}')).toBe('');
    });
  });

  // ─── parseIconMarkup ───────────────────────────────────────────────

  describe('parseIconMarkup', () => {
    it('should handle single word icons', () => {
      expect(parseIconMarkup('{{heart}}')).toBe(
        '<i class="fa-regular fa-heart" style="display: inline-block;"></i>',
      );
    });

    it('should handle all valid style/family classes', () => {
      FontAwesomeIconStyles.filter(
        (iconClass) => iconClass !== 'sharpsolid',
      ).forEach((iconClass) => {
        expect(parseIconMarkup(`{{${iconClass} heart}}`)).toBe(
          `<i class="fa-${iconClass} fa-heart" style="display: inline-block;"></i>`,
        );
      });
      expect(parseIconMarkup('{{sharpsolid heart}}')).toBe(
        '<i class="fa-sharp fa-solid fa-heart" style="display: inline-block;"></i>',
      );
    });

    it('should handle all additional classes', () => {
      FontAwesomeAdditionalClasses.forEach((additionalClass) => {
        expect(parseIconMarkup(`{{heart ${additionalClass}}}`)).toBe(
          `<i class="fa-regular fa-heart fa-${additionalClass}" style="display: inline-block;"></i>`,
        );
      });
    });

    it('should handle multiple classes', () => {
      expect(parseIconMarkup('{{solid heart lg spin}}')).toBe(
        '<i class="fa-solid fa-heart fa-lg fa-spin" style="display: inline-block;"></i>',
      );
    });

    it('should handle custom styles', () => {
      expect(
        parseIconMarkup('{{solid heart; color: red; font-size: 20px;}}'),
      ).toBe(
        '<i class="fa-solid fa-heart" style="display: inline-block; color: red; font-size: 20px;"></i>',
      );
    });

    it('should handle multiple icons in a string', () => {
      const input = 'Hello {{heart}} World {{solid star 2x spin}}';
      const expected =
        'Hello <i class="fa-regular fa-heart" style="display: inline-block;"></i> World <i class="fa-solid fa-star fa-2x fa-spin" style="display: inline-block;"></i>';
      expect(parseIconMarkup(input)).toBe(expected);
    });

    it('should handle combined usage with multiple classes and icon name', () => {
      expect(parseIconMarkup('{{solid heart lg spin}}')).toBe(
        '<i class="fa-solid fa-heart fa-lg fa-spin" style="display: inline-block;"></i>',
      );
    });

    it('should leave invalid markup untouched', () => {
      expect(parseIconMarkup('{{invalid}}')).toBe('{{invalid}}');
    });

    // ── New FA7 family rendering tests ──

    it('should render sharp family icons', () => {
      expect(parseIconMarkup('{{sharp heart}}')).toBe(
        '<i class="fa-sharp fa-heart" style="display: inline-block;"></i>',
      );
    });

    it('should render sharp-duotone family icons', () => {
      expect(parseIconMarkup('{{sharp-duotone heart}}')).toBe(
        '<i class="fa-sharp-duotone fa-heart" style="display: inline-block;"></i>',
      );
    });

    it('should render chisel family icons', () => {
      expect(parseIconMarkup('{{chisel heart}}')).toBe(
        '<i class="fa-chisel fa-heart" style="display: inline-block;"></i>',
      );
    });

    it('should render utility family icons', () => {
      expect(parseIconMarkup('{{utility heart}}')).toBe(
        '<i class="fa-utility fa-heart" style="display: inline-block;"></i>',
      );
    });

    it('should render whiteboard family icons', () => {
      expect(parseIconMarkup('{{whiteboard heart}}')).toBe(
        '<i class="fa-whiteboard fa-heart" style="display: inline-block;"></i>',
      );
    });

    it('should render semibold style icons', () => {
      expect(parseIconMarkup('{{semibold heart}}')).toBe(
        '<i class="fa-semibold fa-heart" style="display: inline-block;"></i>',
      );
    });

    // ── New additional class rendering tests ──

    it('should render 2xs sizing class', () => {
      expect(parseIconMarkup('{{heart 2xs}}')).toBe(
        '<i class="fa-regular fa-heart fa-2xs" style="display: inline-block;"></i>',
      );
    });

    it('should render bounce animation', () => {
      expect(parseIconMarkup('{{solid heart bounce}}')).toBe(
        '<i class="fa-solid fa-heart fa-bounce" style="display: inline-block;"></i>',
      );
    });

    it('should render beat-fade animation', () => {
      expect(parseIconMarkup('{{solid heart beat-fade}}')).toBe(
        '<i class="fa-solid fa-heart fa-beat-fade" style="display: inline-block;"></i>',
      );
    });

    it('should render shake animation', () => {
      expect(parseIconMarkup('{{solid heart shake}}')).toBe(
        '<i class="fa-solid fa-heart fa-shake" style="display: inline-block;"></i>',
      );
    });

    it('should render spin-pulse animation', () => {
      expect(parseIconMarkup('{{solid spinner spin-pulse}}')).toBe(
        '<i class="fa-solid fa-spinner fa-spin-pulse" style="display: inline-block;"></i>',
      );
    });

    it('should render spin with spin-reverse', () => {
      expect(parseIconMarkup('{{solid gear spin spin-reverse}}')).toBe(
        '<i class="fa-solid fa-gear fa-spin fa-spin-reverse" style="display: inline-block;"></i>',
      );
    });

    it('should render rotation classes', () => {
      expect(parseIconMarkup('{{solid heart rotate-90}}')).toBe(
        '<i class="fa-solid fa-heart fa-rotate-90" style="display: inline-block;"></i>',
      );
      expect(parseIconMarkup('{{solid heart rotate-180}}')).toBe(
        '<i class="fa-solid fa-heart fa-rotate-180" style="display: inline-block;"></i>',
      );
      expect(parseIconMarkup('{{solid heart rotate-270}}')).toBe(
        '<i class="fa-solid fa-heart fa-rotate-270" style="display: inline-block;"></i>',
      );
    });

    it('should render flip classes', () => {
      expect(parseIconMarkup('{{solid heart flip-horizontal}}')).toBe(
        '<i class="fa-solid fa-heart fa-flip-horizontal" style="display: inline-block;"></i>',
      );
      expect(parseIconMarkup('{{solid heart flip-vertical}}')).toBe(
        '<i class="fa-solid fa-heart fa-flip-vertical" style="display: inline-block;"></i>',
      );
      expect(parseIconMarkup('{{solid heart flip-both}}')).toBe(
        '<i class="fa-solid fa-heart fa-flip-both" style="display: inline-block;"></i>',
      );
    });

    it('should render fixed-width class', () => {
      expect(parseIconMarkup('{{solid heart fw}}')).toBe(
        '<i class="fa-solid fa-heart fa-fw" style="display: inline-block;"></i>',
      );
    });

    it('should render border class', () => {
      expect(parseIconMarkup('{{solid heart border}}')).toBe(
        '<i class="fa-solid fa-heart fa-border" style="display: inline-block;"></i>',
      );
    });

    it('should render pull classes', () => {
      expect(parseIconMarkup('{{solid heart pull-start}}')).toBe(
        '<i class="fa-solid fa-heart fa-pull-start" style="display: inline-block;"></i>',
      );
      expect(parseIconMarkup('{{solid heart pull-end}}')).toBe(
        '<i class="fa-solid fa-heart fa-pull-end" style="display: inline-block;"></i>',
      );
    });

    it('should render swap-opacity for duotone icons', () => {
      expect(parseIconMarkup('{{duotone heart swap-opacity}}')).toBe(
        '<i class="fa-duotone fa-heart fa-swap-opacity" style="display: inline-block;"></i>',
      );
    });

    it('should render multiple new additional classes together', () => {
      expect(parseIconMarkup('{{solid heart 2xl bounce fw}}')).toBe(
        '<i class="fa-solid fa-heart fa-2xl fa-bounce fa-fw" style="display: inline-block;"></i>',
      );
    });

    // ── Edge cases ──

    it('should handle text with no icons', () => {
      expect(parseIconMarkup('Hello World')).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(parseIconMarkup('')).toBe('');
    });

    it('should handle icon at start of string', () => {
      expect(parseIconMarkup('{{heart}} hello')).toBe(
        '<i class="fa-regular fa-heart" style="display: inline-block;"></i> hello',
      );
    });

    it('should handle icon at end of string', () => {
      expect(parseIconMarkup('hello {{heart}}')).toBe(
        'hello <i class="fa-regular fa-heart" style="display: inline-block;"></i>',
      );
    });

    it('should handle adjacent icons', () => {
      expect(parseIconMarkup('{{heart}}{{star}}')).toBe(
        '<i class="fa-regular fa-heart" style="display: inline-block;"></i><i class="fa-regular fa-star" style="display: inline-block;"></i>',
      );
    });

    it('should preserve text around invalid markup', () => {
      expect(parseIconMarkup('before {{invalid}} after')).toBe(
        'before {{invalid}} after',
      );
    });

    it('should handle mix of valid and invalid markup', () => {
      const result = parseIconMarkup('{{heart}} and {{invalid}}');
      expect(result).toContain('fa-heart');
      expect(result).toContain('{{invalid}}');
    });
  });

  // ─── isValidIconMarkup ─────────────────────────────────────────────

  describe('isValidIconMarkup', () => {
    it('should return true for valid basic icon markup', () => {
      expect(isValidIconMarkup('{{heart}}')).toBe(true);
      expect(isValidIconMarkup('{{ heart }}')).toBe(true);
    });

    it('should return true for valid icon markup with style', () => {
      expect(isValidIconMarkup('{{solid heart}}')).toBe(true);
      expect(isValidIconMarkup('{{ solid heart }}')).toBe(true);
    });

    it('should return true for valid icon markup with additional classes', () => {
      expect(isValidIconMarkup('{{solid heart 2x}}')).toBe(true);
      expect(isValidIconMarkup('{{solid heart 2x spin}}')).toBe(true);
    });

    it('should return true for valid icon markup with style attributes', () => {
      expect(isValidIconMarkup('{{solid heart; color: red;}}')).toBe(true);
      expect(
        isValidIconMarkup('{{solid heart 2x; color: red; font-size: 20px;}}'),
      ).toBe(true);
    });

    it('should return true for valid icon markup with all original supported styles', () => {
      const styles = [
        'classic',
        'duotone',
        'light',
        'regular',
        'solid',
        'thin',
        'brands',
        'sharpsolid',
      ];
      styles.forEach((style) => {
        expect(isValidIconMarkup(`{{${style} heart}}`)).toBe(true);
      });
    });

    it('should return true for all new FA7 families', () => {
      const families = [
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
        'semibold',
      ];
      families.forEach((family) => {
        expect(isValidIconMarkup(`{{${family} heart}}`)).toBe(true);
      });
    });

    it('should return true for all new additional classes', () => {
      const newClasses = [
        '2xs',
        'beat-fade',
        'bounce',
        'shake',
        'spin-pulse',
        'spin-reverse',
        'rotate-90',
        'rotate-180',
        'rotate-270',
        'rotate-by',
        'flip-horizontal',
        'flip-vertical',
        'flip-both',
        'fw',
        'width-auto',
        'border',
        'pull-start',
        'pull-end',
        'stack-1x',
        'stack-2x',
        'inverse',
        'swap-opacity',
      ];
      newClasses.forEach((cls) => {
        expect(isValidIconMarkup(`{{heart ${cls}}}`)).toBe(true);
      });
    });

    it('should return false for invalid icon markup', () => {
      expect(isValidIconMarkup('heart')).toBe(false);
      expect(isValidIconMarkup('{heart}')).toBe(false);
      expect(isValidIconMarkup('{{}')).toBe(false);
      expect(isValidIconMarkup('{{}}')).toBe(false);
    });

    it('should return false for icon markup with invalid styles', () => {
      expect(isValidIconMarkup('{{invalid-style heart}}')).toBe(false);
    });

    it('should return false for icon markup with invalid additional classes', () => {
      expect(isValidIconMarkup('{{solid heart invalid-class}}')).toBe(false);
    });

    it('should return false for icon markup without an icon name', () => {
      expect(isValidIconMarkup('{{solid}}')).toBe(false);
      expect(isValidIconMarkup('{{; color: red;}}')).toBe(false);
    });

    it('should handle edge cases with spaces and empty content', () => {
      expect(isValidIconMarkup('{{ }}')).toBe(false);
      expect(isValidIconMarkup('{{}}')).toBe(false);
      expect(isValidIconMarkup('{{  }}')).toBe(false);
    });

    it('should return false for invalid symbols', () => {
      expect(isValidIconMarkup('{{invalid}}')).toBe(false);
      expect(isValidIconMarkup('{{invalid; color: red;}}')).toBe(false);
    });

    it('should not allow override of specific properties', () => {
      [
        'display',
        'position',
        'top',
        'left',
        'right',
        'bottom',
        'z-index',
        'margin',
        'padding',
      ].forEach((property) => {
        expect(isValidIconMarkup(`{{solid heart; ${property}: value;}}`)).toBe(
          false,
        );
      });
    });

    // ── Multiple CSS declarations validation ──

    it('should validate all CSS declarations, not just the first', () => {
      // Valid: both declarations are valid
      expect(
        isValidIconMarkup('{{solid heart; color: red; font-size: 20px;}}'),
      ).toBe(true);
      // Invalid: second declaration has bad property
      expect(
        isValidIconMarkup(
          '{{solid heart; color: red; fake-property: 20px;}}',
        ),
      ).toBe(false);
      // Invalid: third declaration has disallowed property
      expect(
        isValidIconMarkup(
          '{{solid heart; color: red; font-size: 20px; display: none;}}',
        ),
      ).toBe(false);
    });

    it('should handle single CSS declaration', () => {
      expect(isValidIconMarkup('{{solid heart; color: red;}}')).toBe(true);
    });

    it('should handle CSS with hex color values', () => {
      expect(isValidIconMarkup('{{solid heart; color: #ff0000;}}')).toBe(true);
      expect(isValidIconMarkup('{{solid heart; color: #f00;}}')).toBe(true);
    });

    it('should handle CSS with named color values', () => {
      expect(isValidIconMarkup('{{solid heart; color: red;}}')).toBe(true);
      expect(isValidIconMarkup('{{solid heart; color: blue;}}')).toBe(true);
    });

    it('should handle CSS with numeric values and units', () => {
      expect(isValidIconMarkup('{{solid heart; font-size: 20px;}}')).toBe(true);
      expect(isValidIconMarkup('{{solid heart; font-size: 1.5em;}}')).toBe(
        true,
      );
      expect(isValidIconMarkup('{{solid heart; font-size: 100%;}}')).toBe(true);
      expect(isValidIconMarkup('{{solid heart; font-size: 2rem;}}')).toBe(true);
    });

    it('should handle CSS keyword values', () => {
      expect(isValidIconMarkup('{{solid heart; visibility: inherit;}}')).toBe(
        true,
      );
      expect(isValidIconMarkup('{{solid heart; opacity: initial;}}')).toBe(
        true,
      );
    });
  });

  // ─── CSS Validation (extended) ─────────────────────────────────────

  describe('isValidIconMarkup CSS Validation', () => {
    it('should prevent bad css syntax', () => {
      expect(
        isValidIconMarkup('{{solid heart; invalid-property: invalidValue;}}'),
      ).toBe(false);
    });

    it('should prevent unknown CSS property', () => {
      expect(
        isValidIconMarkup('{{solid heart; unknown-property: value;}}'),
      ).toBe(false);
    });

    it('should flag invalid CSS syntax (invalid property structure)', () => {
      expect(isValidIconMarkup('{{solid heart; color: red;}}')).toBe(true);
      expect(
        isValidIconMarkup('{{solid heart; color: red invalid-syntax}}'),
      ).toBe(false);
    });

    it('should flag missing value for CSS property', () => {
      expect(isValidIconMarkup('{{solid heart; color: ;}}')).toBe(false);
    });

    it('should flag missing colon in CSS property', () => {
      expect(isValidIconMarkup('{{solid heart; color red;}}')).toBe(false);
    });

    it('should flag CSS property missing a semicolon', () => {
      expect(
        isValidIconMarkup('{{solid heart; color: red display: block;}}'),
      ).toBe(false);
    });

    it('should flag invalid CSS property names', () => {
      expect(isValidIconMarkup('{{solid heart; 123color: red;}}')).toBe(false);
    });

    it('should flag invalid CSS property names and values', () => {
      expect(isValidIconMarkup('{{solid heart; 123color: 456value;}}')).toBe(
        false,
      );
    });

    // ── Regex precedence bug regression tests ──

    it('should reject values that only partially match keywords', () => {
      // The colorRegex allows any all-alpha string as a named color,
      // so we test with non-alpha values that would have matched the
      // old broken valueRegex due to operator precedence
      expect(
        isValidIconMarkup('{{solid heart; color: 123auto456;}}'),
      ).toBe(false);
      expect(
        isValidIconMarkup('{{solid heart; color: 99inherit;}}'),
      ).toBe(false);
      expect(
        isValidIconMarkup('{{solid heart; color: initial99;}}'),
      ).toBe(false);
    });

    it('should accept exact keyword values', () => {
      expect(isValidIconMarkup('{{solid heart; font-size: auto;}}')).toBe(true);
      expect(isValidIconMarkup('{{solid heart; font-size: inherit;}}')).toBe(
        true,
      );
      expect(isValidIconMarkup('{{solid heart; font-size: initial;}}')).toBe(
        true,
      );
      expect(isValidIconMarkup('{{solid heart; font-size: none;}}')).toBe(true);
    });

    // ── Disallowed properties ──

    it('should reject all disallowed CSS properties', () => {
      const disallowed = [
        'display',
        'position',
        'top',
        'left',
        'right',
        'bottom',
        'z-index',
        'margin',
        'padding',
      ];
      disallowed.forEach((prop) => {
        expect(isValidIconMarkup(`{{solid heart; ${prop}: auto;}}`)).toBe(
          false,
        );
      });
    });

    // ── Valid CSS patterns ──

    it('should accept negative numeric values', () => {
      expect(isValidIconMarkup('{{solid heart; font-size: -5px;}}')).toBe(true);
    });

    it('should accept decimal numeric values', () => {
      expect(isValidIconMarkup('{{solid heart; font-size: 1.5em;}}')).toBe(
        true,
      );
      expect(isValidIconMarkup('{{solid heart; font-size: .5rem;}}')).toBe(
        true,
      );
    });

    it('should accept zero without units', () => {
      expect(isValidIconMarkup('{{solid heart; font-size: 0;}}')).toBe(true);
    });
  });
});
