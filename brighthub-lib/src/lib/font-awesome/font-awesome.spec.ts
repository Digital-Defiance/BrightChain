import {
  extractIconDetails,
  FontAwesomeAdditionalClasses,
  FontAwesomeIconStyles,
  isValidIconMarkup,
  parseIconMarkup,
} from './font-awesome';

describe('font-awesome', () => {
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
  });

  describe('parseIconMarkup', () => {
    it('should handle single word icons', () => {
      expect(parseIconMarkup('{{heart}}')).toBe(
        '<i class="fa-regular fa-heart" style="display: inline-block;"></i>',
      );
    });

    it('should handle all valid classes', () => {
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
  });

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

    it('should return true for valid icon markup with all supported styles', () => {
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
  });

  // more extensive testing of css validation
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

    // it('should flag invalid CSS value (invalid value structure)', () => {
    //   expect(isValidIconMarkup('{{solid heart; color: invalidValue;}}')).toBe(false);
    // });

    it('should flag missing value for CSS property', () => {
      expect(isValidIconMarkup('{{solid heart; color: ;}}')).toBe(false);
    });

    it('should flag missing colon in CSS property', () => {
      expect(isValidIconMarkup('{{solid heart; color red;}}')).toBe(false);
    });

    // it('should prevent CSS with extra semicolon', () => {
    //   expect(isValidIconMarkup('{{solid heart; color: red;;}}')).toBe(false);
    // });

    it('should flag CSS property missing a semicolon', () => {
      expect(
        isValidIconMarkup('{{solid heart; color: red display: block;}}'),
      ).toBe(false);
    });

    // it('should flag invalid characters in CSS property', () => {
    //   expect(isValidIconMarkup('{{solid heart; color: red; @invalid: value;}}')).toBe(false);
    // });

    it('should flag invalid CSS property names', () => {
      expect(isValidIconMarkup('{{solid heart; 123color: red;}}')).toBe(false);
    });

    it('should flag invalid CSS property names and values', () => {
      expect(isValidIconMarkup('{{solid heart; 123color: 456value;}}')).toBe(
        false,
      );
    });
  });
});
