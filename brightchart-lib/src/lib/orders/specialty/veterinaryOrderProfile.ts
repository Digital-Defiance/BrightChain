/**
 * Veterinary Order Specialty Profile
 *
 * Species-specific lab panels, species-aware medication dosing
 * references, and veterinary-specific order sets.
 *
 * @module orders/specialty/veterinaryOrderProfile
 */

import type { IValidationResult } from '../../clinical/specialty/specialtyTypes';
import type { IOrderSpecialtyExtension } from './orderSpecialtyTypes';

/** VeNom coding system URI */
const VENOM_SYSTEM = 'http://www.venomcoding.org';

/** LOINC code system URI (used for vet lab panels) */
const LOINC_SYSTEM = 'http://loinc.org';

/** Valid species codes for species-specific order validation */
const VALID_SPECIES_CODES = [
  'canine',
  'feline',
  'equine',
  'bovine',
  'avian',
  'exotic',
];

/**
 * Veterinary order specialty extension.
 *
 * Includes VeNom and LOINC order code sets, species-specific lab
 * panels, medication dosing references, and veterinary-specific
 * order templates.
 *
 * @see Requirement 14.4
 */
export const VETERINARY_ORDER_EXTENSION: IOrderSpecialtyExtension = {
  specialtyCode: 'veterinary',

  orderCodeSets: [
    {
      system: VENOM_SYSTEM,
      name: 'VeNom',
      description:
        'Veterinary Nomenclature codes for veterinary procedures and diagnostics',
    },
    {
      system: LOINC_SYSTEM,
      name: 'LOINC',
      description: 'LOINC codes adapted for veterinary lab panels',
    },
  ],

  orderTemplates: [
    {
      templateId: 'vet-canine-wellness-panel',
      displayName: 'Canine Wellness Panel',
      description:
        'CBC, chemistry panel, thyroid (T4), urinalysis for canine wellness screening',
      codes: [
        {
          coding: [
            { system: LOINC_SYSTEM, code: '58410-2', display: 'CBC panel' },
          ],
          text: 'CBC',
        },
        {
          coding: [
            {
              system: LOINC_SYSTEM,
              code: '24323-8',
              display: 'Comprehensive metabolic panel',
            },
          ],
          text: 'Chemistry Panel',
        },
        {
          coding: [
            { system: LOINC_SYSTEM, code: '3026-2', display: 'Thyroxine (T4)' },
          ],
          text: 'Thyroid T4',
        },
        {
          coding: [
            {
              system: LOINC_SYSTEM,
              code: '24357-6',
              display: 'Urinalysis panel',
            },
          ],
          text: 'Urinalysis',
        },
      ],
    },
    {
      templateId: 'vet-feline-wellness-panel',
      displayName: 'Feline Wellness Panel',
      description:
        'CBC, chemistry panel, thyroid (T4), FeLV/FIV screening for feline wellness',
      codes: [
        {
          coding: [
            { system: LOINC_SYSTEM, code: '58410-2', display: 'CBC panel' },
          ],
          text: 'CBC',
        },
        {
          coding: [
            {
              system: LOINC_SYSTEM,
              code: '24323-8',
              display: 'Comprehensive metabolic panel',
            },
          ],
          text: 'Chemistry Panel',
        },
        {
          coding: [
            { system: LOINC_SYSTEM, code: '3026-2', display: 'Thyroxine (T4)' },
          ],
          text: 'Thyroid T4',
        },
        {
          coding: [
            {
              system: VENOM_SYSTEM,
              code: 'VET-FELV-FIV',
              display: 'FeLV/FIV combo test',
            },
          ],
          text: 'FeLV/FIV Screen',
        },
      ],
    },
    {
      templateId: 'vet-equine-cbc-chem',
      displayName: 'Equine CBC & Chemistry',
      description: 'CBC and chemistry panel for equine patients',
      codes: [
        {
          coding: [
            { system: LOINC_SYSTEM, code: '58410-2', display: 'CBC panel' },
          ],
          text: 'CBC',
        },
        {
          coding: [
            {
              system: LOINC_SYSTEM,
              code: '24323-8',
              display: 'Comprehensive metabolic panel',
            },
          ],
          text: 'Chemistry Panel',
        },
      ],
    },
    {
      templateId: 'vet-pre-anesthetic-panel',
      displayName: 'Pre-Anesthetic Panel',
      description:
        'CBC, chemistry, coagulation panel for pre-surgical screening',
      codes: [
        {
          coding: [
            { system: LOINC_SYSTEM, code: '58410-2', display: 'CBC panel' },
          ],
          text: 'CBC',
        },
        {
          coding: [
            {
              system: LOINC_SYSTEM,
              code: '51990-0',
              display: 'Basic metabolic panel',
            },
          ],
          text: 'BMP',
        },
        {
          coding: [
            {
              system: LOINC_SYSTEM,
              code: '38875-1',
              display: 'Coagulation panel',
            },
          ],
          text: 'Coagulation Panel',
        },
      ],
    },
    {
      templateId: 'vet-heartworm-tick-panel',
      displayName: 'Heartworm & Tick-Borne Disease Panel',
      description: 'Heartworm antigen, Lyme, Ehrlichia, Anaplasma screening',
      codes: [
        {
          coding: [
            {
              system: VENOM_SYSTEM,
              code: 'VET-4DX',
              display: 'SNAP 4Dx Plus test',
            },
          ],
          text: 'Heartworm/Tick Panel',
        },
      ],
    },
  ],

  validationRules: [
    {
      resourceType: 'Observation',
      field: 'extension[species]',
      description: 'Species code must be a recognized veterinary species',
      rule: (value: unknown): IValidationResult => {
        if (value === undefined || value === null)
          return { valid: true, errors: [] };
        const code = value as string;
        if (!VALID_SPECIES_CODES.includes(code)) {
          return {
            valid: false,
            errors: [
              {
                field: 'extension[species]',
                message: `Unrecognized species code: ${code}. Must be one of ${VALID_SPECIES_CODES.join(', ')}`,
                rule: 'vet-order-species-code',
              },
            ],
          };
        }
        return { valid: true, errors: [] };
      },
    },
  ],
};
