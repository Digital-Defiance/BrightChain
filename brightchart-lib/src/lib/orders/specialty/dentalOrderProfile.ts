/**
 * Dental Order Specialty Profile
 *
 * CDT procedure codes with tooth/surface context and dental-specific
 * order sets (panoramic x-ray, periapical series, prophylaxis, etc.).
 *
 * @module orders/specialty/dentalOrderProfile
 */

import type { IValidationResult } from '../../clinical/specialty/specialtyTypes';
import type { IOrderSpecialtyExtension } from './orderSpecialtyTypes';

/** CDT code system URI */
const CDT_SYSTEM = 'http://www.ada.org/cdt';

/** Valid ADA universal tooth numbers (1-32 for permanent, A-T for primary) */
const VALID_TOOTH_NUMBER_MIN = 1;
const VALID_TOOTH_NUMBER_MAX = 32;

/** Valid tooth surface codes */
const VALID_SURFACE_CODES = ['M', 'D', 'O', 'B', 'L', 'I', 'F'];

/**
 * Dental order specialty extension.
 *
 * Includes CDT procedure code sets, tooth/surface context validation,
 * and dental-specific order templates for imaging and procedures.
 *
 * @see Requirement 14.3
 */
export const DENTAL_ORDER_EXTENSION: IOrderSpecialtyExtension = {
  specialtyCode: 'dental',

  orderCodeSets: [
    {
      system: CDT_SYSTEM,
      name: 'CDT',
      description:
        'Code on Dental Procedures and Nomenclature for dental procedure orders',
    },
  ],

  orderTemplates: [
    {
      templateId: 'dental-panoramic-xray',
      displayName: 'Panoramic X-Ray',
      description: 'Full-mouth panoramic radiograph',
      codes: [
        {
          coding: [
            {
              system: CDT_SYSTEM,
              code: 'D0330',
              display: 'Panoramic radiographic image',
            },
          ],
          text: 'Panoramic X-Ray',
        },
      ],
    },
    {
      templateId: 'dental-periapical-series',
      displayName: 'Periapical Series',
      description: 'Full-mouth periapical radiographic series',
      codes: [
        {
          coding: [
            {
              system: CDT_SYSTEM,
              code: 'D0210',
              display: 'Intraoral - complete series of radiographic images',
            },
          ],
          text: 'Periapical Series',
        },
      ],
    },
    {
      templateId: 'dental-bitewing-series',
      displayName: 'Bitewing X-Rays',
      description: 'Bitewing radiographic images (4 films)',
      codes: [
        {
          coding: [
            {
              system: CDT_SYSTEM,
              code: 'D0274',
              display: 'Bitewings - four radiographic images',
            },
          ],
          text: 'Bitewing X-Rays',
        },
      ],
    },
    {
      templateId: 'dental-prophylaxis',
      displayName: 'Prophylaxis (Cleaning)',
      description: 'Dental prophylaxis - adult or child',
      codes: [
        {
          coding: [
            {
              system: CDT_SYSTEM,
              code: 'D1110',
              display: 'Prophylaxis - adult',
            },
          ],
          text: 'Adult Prophylaxis',
        },
        {
          coding: [
            {
              system: CDT_SYSTEM,
              code: 'D1120',
              display: 'Prophylaxis - child',
            },
          ],
          text: 'Child Prophylaxis',
        },
      ],
    },
    {
      templateId: 'dental-sealants',
      displayName: 'Sealants',
      description: 'Sealant application per tooth',
      codes: [
        {
          coding: [
            {
              system: CDT_SYSTEM,
              code: 'D1351',
              display: 'Sealant - per tooth',
            },
          ],
          text: 'Sealant',
        },
      ],
    },
  ],

  validationRules: [
    {
      resourceType: 'Procedure',
      field: 'extension[toothNumber]',
      description:
        'Tooth number must be 1-32 for permanent dentition when present',
      rule: (value: unknown): IValidationResult => {
        if (value === undefined || value === null)
          return { valid: true, errors: [] };
        const num = value as number;
        if (
          num < VALID_TOOTH_NUMBER_MIN ||
          num > VALID_TOOTH_NUMBER_MAX ||
          !Number.isInteger(num)
        ) {
          return {
            valid: false,
            errors: [
              {
                field: 'extension[toothNumber]',
                message: `Tooth number must be ${VALID_TOOTH_NUMBER_MIN}-${VALID_TOOTH_NUMBER_MAX}, got ${num}`,
                rule: 'dental-order-tooth-number',
              },
            ],
          };
        }
        return { valid: true, errors: [] };
      },
    },
    {
      resourceType: 'Procedure',
      field: 'extension[surface]',
      description:
        'Surface codes must be valid ADA surface codes (M, D, O, B, L, I, F)',
      rule: (value: unknown): IValidationResult => {
        if (value === undefined || value === null)
          return { valid: true, errors: [] };
        const code = value as string;
        if (!VALID_SURFACE_CODES.includes(code)) {
          return {
            valid: false,
            errors: [
              {
                field: 'extension[surface]',
                message: `Invalid surface code: ${code}. Must be one of ${VALID_SURFACE_CODES.join(', ')}`,
                rule: 'dental-order-surface-code',
              },
            ],
          };
        }
        return { valid: true, errors: [] };
      },
    },
  ],
};
