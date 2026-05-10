/**
 * Property-Based Tests for Patient Serializer
 *
 * Verifies:
 * (a) Round-trip: serialize → deserialize → serialize produces byte-identical JSON
 * (b) Null/undefined fields are omitted from output
 * (c) Unrecognized fields are preserved in extensions
 * (d) Invalid JSON produces descriptive errors
 * (e) Date formatting conforms to FHIR R4 patterns
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
 *
 * @module fhir/__tests__/patientSerializer.property.spec
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
import type {
  IBrightchainMetadata,
  IPatientResource,
} from '../patientResource';
import { PatientSerializer } from '../patientSerializer';

jest.setTimeout(30000);

const serializer = new PatientSerializer();

// --- Reusable Generators (matching patientResource tests) ---

const periodArb: fc.Arbitrary<IPeriod> = fc.record(
  {
    start: fc
      .integer({ min: 946684800000, max: 4102444800000 })
      .map((ms) => new Date(ms).toISOString()),
    end: fc
      .integer({ min: 946684800000, max: 4102444800000 })
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
    createdAt: fc
      .integer({ min: 946684800000, max: 4102444800000 })
      .map((ms) => new Date(ms)),
    updatedAt: fc
      .integer({ min: 946684800000, max: 4102444800000 })
      .map((ms) => new Date(ms)),
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

/** Generator for a full IPatientResource<string> with all fields populated */
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
    generalPractitioner: fc.array(referenceArb, {
      minLength: 0,
      maxLength: 2,
    }),
    managingOrganization: referenceArb,
    link: fc.array(patientLinkArb, { minLength: 0, maxLength: 2 }),
    brightchainMetadata: brightchainMetadataArb,
  },
  { requiredKeys: ['resourceType'] },
);

// --- Property Tests ---

describe('Patient Serializer - Property Tests', () => {
  /**
   * Property (a): Round-trip serialize → deserialize → serialize
   * produces byte-identical JSON.
   *
   * **Validates: Requirements 2.5**
   */
  describe('round-trip idempotency', () => {
    it('serialize(deserialize(serialize(p))) === serialize(p)', () => {
      fc.assert(
        fc.property(patientResourceArb, (patient: IPatientResource<string>) => {
          const json1 = serializer.serialize(patient);
          const deserialized = serializer.deserialize(json1);
          const json2 = serializer.serialize(deserialized);
          expect(json2).toBe(json1);
        }),
        { numRuns: 200 },
      );
    });
  });

  /**
   * Property (b): Null/undefined fields are omitted from serialized output.
   *
   * **Validates: Requirements 2.6**
   */
  describe('null/undefined omission', () => {
    it('serialized JSON never contains null values', () => {
      fc.assert(
        fc.property(patientResourceArb, (patient: IPatientResource<string>) => {
          const json = serializer.serialize(patient);
          const parsed = JSON.parse(json);
          assertNoNulls(parsed);
        }),
        { numRuns: 200 },
      );
    });

    it('explicitly null fields are omitted', () => {
      const patient: IPatientResource = {
        resourceType: 'Patient',
        id: 'test-1',
        gender: undefined as unknown as AdministrativeGender,
        birthDate: undefined,
        active: undefined,
      };
      const json = serializer.serialize(patient);
      const parsed = JSON.parse(json);
      expect(parsed).not.toHaveProperty('gender');
      expect(parsed).not.toHaveProperty('birthDate');
      expect(parsed).not.toHaveProperty('active');
      expect(parsed.resourceType).toBe('Patient');
      expect(parsed.id).toBe('test-1');
    });
  });

  /**
   * Property (c): Unrecognized fields are preserved in extensions.
   *
   * **Validates: Requirements 2.4**
   */
  describe('unrecognized field preservation', () => {
    it('unrecognized top-level fields are moved to extensions on deserialize', () => {
      const input = JSON.stringify({
        resourceType: 'Patient',
        id: 'test-1',
        customField: 'customValue',
        anotherUnknown: 42,
      });
      const result = serializer.deserialize(input);
      expect(result.extension).toBeDefined();
      expect(result.extension!.length).toBeGreaterThanOrEqual(2);

      const customExt = result.extension!.find(
        (e) => e['url'] === 'urn:brightchart:unrecognized:customField',
      );
      expect(customExt).toBeDefined();
      expect(customExt!['valueString']).toBe('customValue');

      const anotherExt = result.extension!.find(
        (e) => e['url'] === 'urn:brightchart:unrecognized:anotherUnknown',
      );
      expect(anotherExt).toBeDefined();
      expect(anotherExt!['valueString']).toBe('42');
    });

    it('existing extensions are preserved alongside unrecognized fields', () => {
      const input = JSON.stringify({
        resourceType: 'Patient',
        extension: [{ url: 'urn:existing', valueString: 'keep' }],
        unknownField: 'test',
      });
      const result = serializer.deserialize(input);
      expect(result.extension!.length).toBe(2);
      expect(result.extension!.some((e) => e['url'] === 'urn:existing')).toBe(
        true,
      );
      expect(
        result.extension!.some(
          (e) => e['url'] === 'urn:brightchart:unrecognized:unknownField',
        ),
      ).toBe(true);
    });
  });

  /**
   * Property (d): Invalid JSON produces descriptive errors.
   *
   * **Validates: Requirements 2.3**
   */
  describe('invalid JSON error handling', () => {
    it('non-JSON strings produce descriptive parse errors', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => {
            try {
              JSON.parse(s);
              return false;
            } catch {
              return true;
            }
          }),
          (invalidJson: string) => {
            expect(() => serializer.deserialize(invalidJson)).toThrow(
              /Invalid JSON/,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('valid JSON without resourceType throws descriptive error', () => {
      expect(() => serializer.deserialize('{}')).toThrow(
        /expected resourceType "Patient"/,
      );
    });

    it('valid JSON with wrong resourceType throws descriptive error', () => {
      expect(() =>
        serializer.deserialize('{"resourceType":"Observation"}'),
      ).toThrow(/expected resourceType "Patient", got "Observation"/);
    });

    it('JSON array throws descriptive error', () => {
      expect(() => serializer.deserialize('[]')).toThrow(
        /expected a JSON object, got array/,
      );
    });

    it('JSON primitive throws descriptive error', () => {
      expect(() => serializer.deserialize('"hello"')).toThrow(
        /expected a JSON object/,
      );
    });
  });

  /**
   * Property (e): Date formatting conforms to FHIR R4 patterns.
   *
   * **Validates: Requirements 2.7**
   */
  describe('date formatting', () => {
    const FHIR_DATE_REGEX = /^\d{4}(-\d{2}(-\d{2})?)?$/;
    const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

    it('birthDate fields conform to FHIR R4 date pattern', () => {
      fc.assert(
        fc.property(patientResourceArb, (patient: IPatientResource<string>) => {
          const json = serializer.serialize(patient);
          const parsed = JSON.parse(json);
          if (parsed.birthDate) {
            expect(parsed.birthDate).toMatch(FHIR_DATE_REGEX);
          }
        }),
        { numRuns: 200 },
      );
    });

    it('brightchainMetadata date fields are ISO 8601 dateTime strings', () => {
      fc.assert(
        fc.property(patientResourceArb, (patient: IPatientResource<string>) => {
          const json = serializer.serialize(patient);
          const parsed = JSON.parse(json);
          if (parsed.brightchainMetadata) {
            if (parsed.brightchainMetadata.createdAt) {
              expect(parsed.brightchainMetadata.createdAt).toMatch(
                ISO_DATETIME_REGEX,
              );
            }
            if (parsed.brightchainMetadata.updatedAt) {
              expect(parsed.brightchainMetadata.updatedAt).toMatch(
                ISO_DATETIME_REGEX,
              );
            }
          }
        }),
        { numRuns: 200 },
      );
    });

    it('deserialized brightchainMetadata dates are Date objects', () => {
      fc.assert(
        fc.property(patientResourceArb, (patient: IPatientResource<string>) => {
          const json = serializer.serialize(patient);
          const deserialized = serializer.deserialize(json);
          if (deserialized.brightchainMetadata) {
            expect(deserialized.brightchainMetadata.createdAt).toBeInstanceOf(
              Date,
            );
            expect(deserialized.brightchainMetadata.updatedAt).toBeInstanceOf(
              Date,
            );
          }
        }),
        { numRuns: 200 },
      );
    });
  });
});

// --- Helpers ---

/** Recursively assert no null values exist in a parsed JSON object */
function assertNoNulls(obj: unknown, path = ''): void {
  if (obj === null) {
    throw new Error(`Found null at path: ${path || 'root'}`);
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => assertNoNulls(item, `${path}[${i}]`));
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      assertNoNulls(value, `${path}.${key}`);
    }
  }
}
