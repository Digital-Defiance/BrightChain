/**
 * Property-Based Tests for FHIR R4 Patient Resource Model
 *
 * Verifies:
 * (a) IPatientResource always has resourceType === 'Patient'
 * (b) The TID generic defaults to string and accepts Uint8Array
 * (c) brightchainMetadata fields are present alongside FHIR fields
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.6, 9.4**
 *
 * @module fhir/__tests__/patientResource.property.spec
 */

import { BlockEncryptionType } from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import type {
  IAddress,
  ICodeableConcept,
  ICoding,
  IContactPoint,
  IExtension,
  IHumanName,
  IIdentifier,
  IMeta,
  INarrative,
  IPatientCommunication,
  IPatientContact,
  IPatientLink,
  IPeriod,
  IReference,
} from '../datatypes';
import {
  AddressType,
  AddressUse,
  AdministrativeGender,
  ContactPointSystem,
  ContactPointUse,
  IdentifierUse,
  LinkType,
  NameUse,
  NarrativeStatus,
} from '../enumerations';
import type { IPatientIdentifier } from '../patientIdentifier';
import type {
  IBrightchainMetadata,
  IPatientResource,
} from '../patientResource';

jest.setTimeout(30000);

// --- Reusable Generators ---

const periodArb: fc.Arbitrary<IPeriod> = fc.record(
  {
    start: fc
      .integer({ min: 0, max: 4102444800000 })
      .map((ms) => new Date(ms).toISOString()),
    end: fc
      .integer({ min: 0, max: 4102444800000 })
      .map((ms) => new Date(ms).toISOString()),
  },
  { requiredKeys: [] },
);

const codingArb: fc.Arbitrary<ICoding> = fc.record(
  {
    system: fc.webUrl(),
    code: fc.string({ minLength: 1, maxLength: 20 }),
    display: fc.string({ minLength: 1, maxLength: 50 }),
  },
  { requiredKeys: [] },
);

const codeableConceptArb: fc.Arbitrary<ICodeableConcept> = fc.record(
  {
    coding: fc.array(codingArb, { minLength: 0, maxLength: 2 }),
    text: fc.string({ minLength: 1, maxLength: 50 }),
  },
  { requiredKeys: [] },
);

const extensionArb: fc.Arbitrary<IExtension> = fc
  .tuple(fc.webUrl(), fc.string({ minLength: 1, maxLength: 30 }))
  .map(([url, valueString]) => ({ url, valueString }));

const referenceArb: fc.Arbitrary<IReference<string>> = fc.record(
  {
    reference: fc.string({ minLength: 1, maxLength: 80 }),
    type: fc.constantFrom('Patient', 'Practitioner', 'Organization'),
    display: fc.string({ minLength: 1, maxLength: 80 }),
  },
  { requiredKeys: [] },
);

const identifierArb: fc.Arbitrary<IIdentifier<string>> = fc.record(
  {
    use: fc.constantFrom(...Object.values(IdentifierUse)),
    system: fc.webUrl(),
    value: fc.string({ minLength: 1, maxLength: 40 }),
    period: periodArb,
  },
  { requiredKeys: [] },
);

const humanNameArb: fc.Arbitrary<IHumanName> = fc.record(
  {
    use: fc.constantFrom(...Object.values(NameUse)),
    family: fc.string({ minLength: 1, maxLength: 40 }),
    given: fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
      minLength: 1,
      maxLength: 3,
    }),
  },
  { requiredKeys: [] },
);

const addressArb: fc.Arbitrary<IAddress> = fc.record(
  {
    use: fc.constantFrom(...Object.values(AddressUse)),
    type: fc.constantFrom(...Object.values(AddressType)),
    city: fc.string({ minLength: 1, maxLength: 40 }),
    state: fc.string({ minLength: 1, maxLength: 20 }),
    postalCode: fc.string({ minLength: 1, maxLength: 10 }),
  },
  { requiredKeys: [] },
);

const contactPointArb: fc.Arbitrary<IContactPoint> = fc.record(
  {
    system: fc.constantFrom(...Object.values(ContactPointSystem)),
    value: fc.string({ minLength: 1, maxLength: 50 }),
    use: fc.constantFrom(...Object.values(ContactPointUse)),
  },
  { requiredKeys: [] },
);

const narrativeArb: fc.Arbitrary<INarrative> = fc.record({
  status: fc.constantFrom(...Object.values(NarrativeStatus)),
  div: fc
    .string({ minLength: 1, maxLength: 100 })
    .map((s) => `<div>${s}</div>`),
});

const metaArb: fc.Arbitrary<IMeta> = fc.record(
  {
    versionId: fc.nat({ max: 99999 }).map((n) => String(n + 1)),
    lastUpdated: fc
      .integer({ min: 946684800000, max: 4102444800000 })
      .map((ms) => new Date(ms).toISOString()),
  },
  { requiredKeys: [] },
);

const patientContactArb: fc.Arbitrary<IPatientContact<string>> = fc.record(
  {
    name: humanNameArb,
    gender: fc.constantFrom(...Object.values(AdministrativeGender)),
  },
  { requiredKeys: [] },
);

const patientCommunicationArb: fc.Arbitrary<IPatientCommunication> = fc.record(
  {
    language: codeableConceptArb,
    preferred: fc.boolean(),
  },
  { requiredKeys: ['language'] },
);

const patientLinkArb: fc.Arbitrary<IPatientLink<string>> = fc.record({
  other: referenceArb,
  type: fc.constantFrom(...Object.values(LinkType)),
});

const blockEncryptionTypeArb = fc.constantFrom(
  ...Object.values(BlockEncryptionType).filter(
    (v): v is BlockEncryptionType => typeof v === 'number',
  ),
);

const brightchainMetadataArb: fc.Arbitrary<IBrightchainMetadata<string>> =
  fc.record({
    blockId: fc.uuid(),
    creatorMemberId: fc.uuid(),
    createdAt: fc.date({
      min: new Date('2000-01-01'),
      max: new Date('2099-12-31'),
    }),
    updatedAt: fc.date({
      min: new Date('2000-01-01'),
      max: new Date('2099-12-31'),
    }),
    poolId: fc.uuid(),
    encryptionType: blockEncryptionTypeArb,
  });

const fhirDateArb = fc
  .tuple(
    fc.integer({ min: 1900, max: 2099 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(
    ([y, m, d]) =>
      `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
  );

/** Generator for a full IPatientResource<string> */
const patientResourceArb: fc.Arbitrary<IPatientResource<string>> = fc.record(
  {
    resourceType: fc.constant('Patient' as const),
    id: fc.uuid(),
    meta: metaArb,
    text: narrativeArb,
    extension: fc.array(extensionArb, { minLength: 0, maxLength: 2 }),
    identifier: fc.array(identifierArb, { minLength: 0, maxLength: 3 }),
    active: fc.boolean(),
    name: fc.array(humanNameArb, { minLength: 1, maxLength: 3 }),
    telecom: fc.array(contactPointArb, { minLength: 0, maxLength: 3 }),
    gender: fc.constantFrom(...Object.values(AdministrativeGender)),
    birthDate: fhirDateArb,
    deceasedBoolean: fc.boolean(),
    deceasedDateTime: fc.option(
      fc
        .integer({ min: 946684800000, max: 4102444800000 })
        .map((ms) => new Date(ms).toISOString()),
      { nil: undefined },
    ),
    address: fc.array(addressArb, { minLength: 0, maxLength: 2 }),
    maritalStatus: codeableConceptArb,
    multipleBirthBoolean: fc.boolean(),
    multipleBirthInteger: fc.option(fc.integer({ min: 1, max: 8 }), {
      nil: undefined,
    }),
    contact: fc.array(patientContactArb, { minLength: 0, maxLength: 2 }),
    communication: fc.array(patientCommunicationArb, {
      minLength: 0,
      maxLength: 2,
    }),
    generalPractitioner: fc.array(referenceArb, { minLength: 0, maxLength: 2 }),
    managingOrganization: referenceArb,
    link: fc.array(patientLinkArb, { minLength: 0, maxLength: 2 }),
    brightchainMetadata: brightchainMetadataArb,
  },
  { requiredKeys: ['resourceType'] },
);

// --- Property Tests ---

describe('FHIR R4 Patient Resource - Property Tests', () => {
  /**
   * Property (a): IPatientResource always has resourceType === 'Patient'
   *
   * **Validates: Requirements 1.3**
   */
  describe('resourceType is always Patient', () => {
    it('every generated IPatientResource has resourceType "Patient"', () => {
      fc.assert(
        fc.property(patientResourceArb, (patient: IPatientResource<string>) => {
          expect(patient.resourceType).toBe('Patient');
        }),
        { numRuns: 200 },
      );
    });

    it('resourceType cannot be overridden by the generator', () => {
      fc.assert(
        fc.property(patientResourceArb, (patient: IPatientResource<string>) => {
          // The literal type 'Patient' ensures this at compile time;
          // at runtime we verify the generated value is always the string 'Patient'
          expect(typeof patient.resourceType).toBe('string');
          expect(patient.resourceType).toStrictEqual('Patient');
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property (b): TID generic defaults to string and accepts Uint8Array
   *
   * **Validates: Requirements 1.2**
   */
  describe('TID parameterization', () => {
    it('default TID (string) works for all ID-bearing fields', () => {
      fc.assert(
        fc.property(patientResourceArb, (patient: IPatientResource<string>) => {
          // Verify brightchainMetadata IDs are strings when TID = string
          if (patient.brightchainMetadata) {
            expect(typeof patient.brightchainMetadata.blockId).toBe('string');
            expect(typeof patient.brightchainMetadata.creatorMemberId).toBe(
              'string',
            );
          }
          // Verify identifier assigner references use string TID
          if (patient.identifier) {
            for (const id of patient.identifier) {
              if (id.assigner?.identifier?.assigner) {
                // nested references also use string
                expect(
                  typeof id.assigner.reference === 'string' ||
                    id.assigner.reference === undefined,
                ).toBe(true);
              }
            }
          }
        }),
        { numRuns: 100 },
      );
    });

    it('TID = Uint8Array is accepted for IPatientResource', () => {
      // Compile-time check: construct a minimal IPatientResource<Uint8Array>
      const uint8Patient: IPatientResource<Uint8Array> = {
        resourceType: 'Patient',
        brightchainMetadata: {
          blockId: new Uint8Array([1, 2, 3]),
          creatorMemberId: new Uint8Array([4, 5, 6]),
          createdAt: new Date(),
          updatedAt: new Date(),
          poolId: 'pool-1',
          encryptionType: BlockEncryptionType.None,
        },
        identifier: [
          {
            system: 'urn:example',
            value: 'ABC',
            assigner: {
              reference: 'Organization/1',
              identifier: {
                system: 'urn:org',
                value: '123',
              },
            },
          },
        ],
        generalPractitioner: [
          {
            reference: 'Practitioner/1',
            identifier: {
              system: 'urn:prac',
              value: '456',
            },
          },
        ],
        managingOrganization: {
          reference: 'Organization/2',
        },
        link: [
          {
            other: { reference: 'Patient/2' },
            type: LinkType.SeeAlso,
          },
        ],
        contact: [
          {
            organization: {
              reference: 'Organization/3',
              identifier: {
                system: 'urn:org',
                value: '789',
              },
            },
          },
        ],
      };

      expect(uint8Patient.resourceType).toBe('Patient');
      expect(uint8Patient.brightchainMetadata?.blockId).toBeInstanceOf(
        Uint8Array,
      );
      expect(uint8Patient.brightchainMetadata?.creatorMemberId).toBeInstanceOf(
        Uint8Array,
      );
    });
  });

  /**
   * Property (c): brightchainMetadata fields are present alongside FHIR fields
   *
   * **Validates: Requirements 1.6**
   */
  describe('brightchainMetadata coexists with FHIR fields', () => {
    it('brightchainMetadata and FHIR fields coexist without collision', () => {
      fc.assert(
        fc.property(patientResourceArb, (patient: IPatientResource<string>) => {
          // FHIR fields
          expect(patient.resourceType).toBe('Patient');

          // When brightchainMetadata is present, verify all its fields
          if (patient.brightchainMetadata) {
            const meta = patient.brightchainMetadata;
            expect(typeof meta.blockId).toBe('string');
            expect(typeof meta.creatorMemberId).toBe('string');
            expect(meta.createdAt).toBeInstanceOf(Date);
            expect(meta.updatedAt).toBeInstanceOf(Date);
            expect(typeof meta.poolId).toBe('string');
            expect(
              Object.values(BlockEncryptionType).filter(
                (v): v is number => typeof v === 'number',
              ),
            ).toContain(meta.encryptionType);
          }

          // FHIR fields remain accessible alongside brightchainMetadata
          if (patient.name) {
            expect(Array.isArray(patient.name)).toBe(true);
          }
          if (patient.gender) {
            expect(Object.values(AdministrativeGender)).toContain(
              patient.gender,
            );
          }
          if (patient.identifier) {
            expect(Array.isArray(patient.identifier)).toBe(true);
          }
        }),
        { numRuns: 200 },
      );
    });

    it('brightchainMetadata keys do not overlap with FHIR Patient field keys', () => {
      const fhirKeys = new Set([
        'resourceType',
        'id',
        'meta',
        'text',
        'extension',
        'identifier',
        'active',
        'name',
        'telecom',
        'gender',
        'birthDate',
        'deceasedBoolean',
        'deceasedDateTime',
        'address',
        'maritalStatus',
        'multipleBirthBoolean',
        'multipleBirthInteger',
        'contact',
        'communication',
        'generalPractitioner',
        'managingOrganization',
        'link',
      ]);
      const metadataKeys = new Set([
        'blockId',
        'creatorMemberId',
        'createdAt',
        'updatedAt',
        'poolId',
        'encryptionType',
      ]);

      // No key in brightchainMetadata collides with a FHIR field name
      for (const key of metadataKeys) {
        expect(fhirKeys.has(key)).toBe(false);
      }
    });
  });
});

describe('IPatientIdentifier - Property Tests', () => {
  /**
   * IPatientIdentifier always has required system and value fields.
   *
   * **Validates: Requirements 1.1**
   */
  const patientIdentifierArb: fc.Arbitrary<IPatientIdentifier<string>> =
    fc.record(
      {
        system: fc.webUrl(),
        value: fc.string({ minLength: 1, maxLength: 50 }),
        use: fc.option(fc.constantFrom(...Object.values(IdentifierUse)), {
          nil: undefined,
        }),
        period: fc.option(periodArb, { nil: undefined }),
      },
      { requiredKeys: ['system', 'value'] },
    );

  it('IPatientIdentifier always has system and value', () => {
    fc.assert(
      fc.property(patientIdentifierArb, (id: IPatientIdentifier<string>) => {
        expect(typeof id.system).toBe('string');
        expect(id.system.length).toBeGreaterThan(0);
        expect(typeof id.value).toBe('string');
        expect(id.value.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});
