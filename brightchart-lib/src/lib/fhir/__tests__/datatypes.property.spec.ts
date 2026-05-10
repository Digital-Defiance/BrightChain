/**
 * Property-Based Tests for FHIR R4 Base Datatypes and Enumerations
 *
 * Verifies:
 * (a) All FHIR datatype interfaces can be instantiated with arbitrary valid data
 * (b) Enum values are exhaustive and non-overlapping
 *
 * **Validates: Requirements 1.2, 9.2**
 *
 * @module fhir/__tests__/datatypes.property.spec
 */

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
  IOperationOutcome,
  IOperationOutcomeIssue,
} from '../operationOutcome';

jest.setTimeout(30000);

// --- Smart Generators ---

const periodArb: fc.Arbitrary<IPeriod> = fc.record(
  {
    start: fc
      .integer({ min: -2208988800000, max: 4102444800000 })
      .map((ms) => new Date(ms).toISOString()),
    end: fc
      .integer({ min: -2208988800000, max: 4102444800000 })
      .map((ms) => new Date(ms).toISOString()),
  },
  { requiredKeys: [] },
);

const codingArb: fc.Arbitrary<ICoding> = fc.record(
  {
    system: fc.webUrl(),
    version: fc.string({ minLength: 1, maxLength: 10 }),
    code: fc.string({ minLength: 1, maxLength: 30 }),
    display: fc.string({ minLength: 1, maxLength: 100 }),
    userSelected: fc.boolean(),
  },
  { requiredKeys: [] },
);

const codeableConceptArb: fc.Arbitrary<ICodeableConcept> = fc.record(
  {
    coding: fc.array(codingArb, { minLength: 0, maxLength: 3 }),
    text: fc.string({ minLength: 1, maxLength: 100 }),
  },
  { requiredKeys: [] },
);

const _extensionArb: fc.Arbitrary<IExtension> = fc
  .tuple(fc.webUrl(), fc.string({ minLength: 1, maxLength: 50 }))
  .map(([url, valueString]) => ({ url, valueString }));

const referenceArb: fc.Arbitrary<IReference> = fc.record(
  {
    reference: fc.string({ minLength: 1, maxLength: 100 }),
    type: fc.constantFrom('Patient', 'Practitioner', 'Organization'),
    display: fc.string({ minLength: 1, maxLength: 100 }),
  },
  { requiredKeys: [] },
);

const identifierArb: fc.Arbitrary<IIdentifier> = fc.record(
  {
    use: fc.constantFrom(...Object.values(IdentifierUse)),
    type: codeableConceptArb,
    system: fc.webUrl(),
    value: fc.string({ minLength: 1, maxLength: 50 }),
    period: periodArb,
    assigner: referenceArb,
  },
  { requiredKeys: [] },
);

const humanNameArb: fc.Arbitrary<IHumanName> = fc.record(
  {
    use: fc.constantFrom(...Object.values(NameUse)),
    text: fc.string({ minLength: 1, maxLength: 100 }),
    family: fc.string({ minLength: 1, maxLength: 50 }),
    given: fc.array(fc.string({ minLength: 1, maxLength: 30 }), {
      minLength: 1,
      maxLength: 3,
    }),
    prefix: fc.array(fc.string({ minLength: 1, maxLength: 10 }), {
      minLength: 0,
      maxLength: 2,
    }),
    suffix: fc.array(fc.string({ minLength: 1, maxLength: 10 }), {
      minLength: 0,
      maxLength: 2,
    }),
    period: periodArb,
  },
  { requiredKeys: [] },
);

const addressArb: fc.Arbitrary<IAddress> = fc.record(
  {
    use: fc.constantFrom(...Object.values(AddressUse)),
    type: fc.constantFrom(...Object.values(AddressType)),
    text: fc.string({ minLength: 1, maxLength: 200 }),
    line: fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
      minLength: 1,
      maxLength: 3,
    }),
    city: fc.string({ minLength: 1, maxLength: 50 }),
    district: fc.string({ minLength: 1, maxLength: 50 }),
    state: fc.string({ minLength: 1, maxLength: 50 }),
    postalCode: fc.string({ minLength: 1, maxLength: 20 }),
    country: fc.string({ minLength: 2, maxLength: 3 }),
    period: periodArb,
  },
  { requiredKeys: [] },
);

const contactPointArb: fc.Arbitrary<IContactPoint> = fc.record(
  {
    system: fc.constantFrom(...Object.values(ContactPointSystem)),
    value: fc.string({ minLength: 1, maxLength: 100 }),
    use: fc.constantFrom(...Object.values(ContactPointUse)),
    rank: fc.nat({ max: 10 }),
    period: periodArb,
  },
  { requiredKeys: [] },
);

const narrativeArb: fc.Arbitrary<INarrative> = fc.record({
  status: fc.constantFrom(...Object.values(NarrativeStatus)),
  div: fc
    .string({ minLength: 1, maxLength: 200 })
    .map((s) => `<div>${s}</div>`),
});

const metaArb: fc.Arbitrary<IMeta> = fc.record(
  {
    versionId: fc.nat({ max: 99999 }).map((n) => String(n + 1)),
    lastUpdated: fc
      .integer({ min: 946684800000, max: 4102444800000 })
      .map((ms) => new Date(ms).toISOString()),
    source: fc.webUrl(),
    profile: fc.array(fc.webUrl(), { minLength: 0, maxLength: 2 }),
    security: fc.array(codingArb, { minLength: 0, maxLength: 2 }),
    tag: fc.array(codingArb, { minLength: 0, maxLength: 2 }),
  },
  { requiredKeys: [] },
);

const patientContactArb: fc.Arbitrary<IPatientContact> = fc.record(
  {
    relationship: fc.array(codeableConceptArb, { minLength: 0, maxLength: 2 }),
    name: humanNameArb,
    telecom: fc.array(contactPointArb, { minLength: 0, maxLength: 2 }),
    address: addressArb,
    gender: fc.constantFrom(...Object.values(AdministrativeGender)),
    organization: referenceArb,
    period: periodArb,
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

const patientLinkArb: fc.Arbitrary<IPatientLink> = fc.record({
  other: referenceArb,
  type: fc.constantFrom(...Object.values(LinkType)),
});

// --- Property Tests ---

describe('FHIR R4 Base Datatypes - Property Tests', () => {
  /**
   * Property (a): All FHIR datatype interfaces can be instantiated with arbitrary valid data.
   *
   * **Validates: Requirements 1.2, 9.2**
   */
  describe('datatype instantiation with arbitrary valid data', () => {
    it('IPeriod accepts arbitrary valid period data', () => {
      fc.assert(
        fc.property(periodArb, (period: IPeriod) => {
          expect(period).toBeDefined();
          if (period.start !== undefined)
            expect(typeof period.start).toBe('string');
          if (period.end !== undefined)
            expect(typeof period.end).toBe('string');
        }),
        { numRuns: 100 },
      );
    });

    it('ICoding accepts arbitrary valid coding data', () => {
      fc.assert(
        fc.property(codingArb, (coding: ICoding) => {
          expect(coding).toBeDefined();
          if (coding.system !== undefined)
            expect(typeof coding.system).toBe('string');
          if (coding.code !== undefined)
            expect(typeof coding.code).toBe('string');
        }),
        { numRuns: 100 },
      );
    });

    it('ICodeableConcept accepts arbitrary valid codeable concept data', () => {
      fc.assert(
        fc.property(codeableConceptArb, (concept: ICodeableConcept) => {
          expect(concept).toBeDefined();
          if (concept.coding !== undefined)
            expect(Array.isArray(concept.coding)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('IIdentifier accepts arbitrary valid identifier data', () => {
      fc.assert(
        fc.property(identifierArb, (identifier: IIdentifier) => {
          expect(identifier).toBeDefined();
          if (identifier.use !== undefined) {
            expect(Object.values(IdentifierUse)).toContain(identifier.use);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('IReference accepts arbitrary valid reference data', () => {
      fc.assert(
        fc.property(referenceArb, (ref: IReference) => {
          expect(ref).toBeDefined();
        }),
        { numRuns: 100 },
      );
    });

    it('IHumanName accepts arbitrary valid human name data', () => {
      fc.assert(
        fc.property(humanNameArb, (name: IHumanName) => {
          expect(name).toBeDefined();
          if (name.use !== undefined) {
            expect(Object.values(NameUse)).toContain(name.use);
          }
          if (name.given !== undefined)
            expect(Array.isArray(name.given)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('IAddress accepts arbitrary valid address data', () => {
      fc.assert(
        fc.property(addressArb, (address: IAddress) => {
          expect(address).toBeDefined();
          if (address.use !== undefined) {
            expect(Object.values(AddressUse)).toContain(address.use);
          }
          if (address.type !== undefined) {
            expect(Object.values(AddressType)).toContain(address.type);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('IContactPoint accepts arbitrary valid contact point data', () => {
      fc.assert(
        fc.property(contactPointArb, (cp: IContactPoint) => {
          expect(cp).toBeDefined();
          if (cp.system !== undefined) {
            expect(Object.values(ContactPointSystem)).toContain(cp.system);
          }
          if (cp.use !== undefined) {
            expect(Object.values(ContactPointUse)).toContain(cp.use);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('INarrative accepts arbitrary valid narrative data', () => {
      fc.assert(
        fc.property(narrativeArb, (narrative: INarrative) => {
          expect(narrative).toBeDefined();
          expect(Object.values(NarrativeStatus)).toContain(narrative.status);
          expect(typeof narrative.div).toBe('string');
        }),
        { numRuns: 100 },
      );
    });

    it('IMeta accepts arbitrary valid meta data', () => {
      fc.assert(
        fc.property(metaArb, (meta: IMeta) => {
          expect(meta).toBeDefined();
          if (meta.versionId !== undefined)
            expect(typeof meta.versionId).toBe('string');
        }),
        { numRuns: 100 },
      );
    });

    it('IPatientContact accepts arbitrary valid patient contact data', () => {
      fc.assert(
        fc.property(patientContactArb, (contact: IPatientContact) => {
          expect(contact).toBeDefined();
          if (contact.gender !== undefined) {
            expect(Object.values(AdministrativeGender)).toContain(
              contact.gender,
            );
          }
        }),
        { numRuns: 100 },
      );
    });

    it('IPatientCommunication accepts arbitrary valid patient communication data', () => {
      fc.assert(
        fc.property(patientCommunicationArb, (comm: IPatientCommunication) => {
          expect(comm).toBeDefined();
          expect(comm.language).toBeDefined();
        }),
        { numRuns: 100 },
      );
    });

    it('IPatientLink accepts arbitrary valid patient link data', () => {
      fc.assert(
        fc.property(patientLinkArb, (link: IPatientLink) => {
          expect(link).toBeDefined();
          expect(Object.values(LinkType)).toContain(link.type);
          expect(link.other).toBeDefined();
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property (a) continued: IOperationOutcome can be instantiated with arbitrary valid data.
   *
   * **Validates: Requirements 1.2, 9.2**
   */
  describe('OperationOutcome instantiation', () => {
    const issueSeverityArb = fc.constantFrom(
      'fatal' as const,
      'error' as const,
      'warning' as const,
      'information' as const,
    );
    const issueCodeArb = fc.constantFrom(
      'invalid' as const,
      'structure' as const,
      'required' as const,
      'value' as const,
      'security' as const,
      'not-found' as const,
      'conflict' as const,
      'processing' as const,
      'not-supported' as const,
      'duplicate' as const,
      'forbidden' as const,
      'exception' as const,
    );

    const operationOutcomeIssueArb: fc.Arbitrary<IOperationOutcomeIssue> =
      fc.record(
        {
          severity: issueSeverityArb,
          code: issueCodeArb,
          details: fc.option(codeableConceptArb, { nil: undefined }),
          diagnostics: fc.option(fc.string({ minLength: 1, maxLength: 200 }), {
            nil: undefined,
          }),
          expression: fc.option(
            fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
              minLength: 1,
              maxLength: 3,
            }),
            { nil: undefined },
          ),
        },
        { requiredKeys: ['severity', 'code'] },
      );

    const operationOutcomeArb: fc.Arbitrary<IOperationOutcome> = fc.record(
      {
        resourceType: fc.constant('OperationOutcome' as const),
        id: fc.option(fc.string({ minLength: 1, maxLength: 50 }), {
          nil: undefined,
        }),
        meta: fc.option(metaArb, { nil: undefined }),
        issue: fc.array(operationOutcomeIssueArb, {
          minLength: 1,
          maxLength: 5,
        }),
      },
      { requiredKeys: ['resourceType', 'issue'] },
    );

    it('IOperationOutcome accepts arbitrary valid data and always has resourceType OperationOutcome', () => {
      fc.assert(
        fc.property(operationOutcomeArb, (outcome: IOperationOutcome) => {
          expect(outcome).toBeDefined();
          expect(outcome.resourceType).toBe('OperationOutcome');
          expect(outcome.issue.length).toBeGreaterThanOrEqual(1);
          for (const issue of outcome.issue) {
            expect(['fatal', 'error', 'warning', 'information']).toContain(
              issue.severity,
            );
            expect(typeof issue.code).toBe('string');
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});

describe('FHIR R4 Enumerations - Exhaustiveness and Non-Overlapping', () => {
  /**
   * Property (b): Enum values are exhaustive and non-overlapping.
   *
   * **Validates: Requirements 1.2, 9.2**
   */

  /** Helper: asserts all values in an enum are unique (non-overlapping) */
  function assertUniqueValues(
    enumObj: Record<string, string>,
    expectedCount: number,
    _enumName: string,
  ) {
    const values = Object.values(enumObj);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
    expect(values.length).toBe(expectedCount);
    // Verify no empty strings
    for (const v of values) {
      expect(v.length).toBeGreaterThan(0);
    }
  }

  it('AdministrativeGender has exactly 4 unique values matching FHIR R4', () => {
    assertUniqueValues(AdministrativeGender, 4, 'AdministrativeGender');
    const expected = ['male', 'female', 'other', 'unknown'];
    expect(Object.values(AdministrativeGender).sort()).toEqual(expected.sort());
  });

  it('NameUse has exactly 7 unique values matching FHIR R4', () => {
    assertUniqueValues(NameUse, 7, 'NameUse');
    const expected = [
      'usual',
      'official',
      'temp',
      'nickname',
      'anonymous',
      'old',
      'maiden',
    ];
    expect(Object.values(NameUse).sort()).toEqual(expected.sort());
  });

  it('AddressUse has exactly 5 unique values matching FHIR R4', () => {
    assertUniqueValues(AddressUse, 5, 'AddressUse');
    const expected = ['home', 'work', 'temp', 'old', 'billing'];
    expect(Object.values(AddressUse).sort()).toEqual(expected.sort());
  });

  it('AddressType has exactly 3 unique values matching FHIR R4', () => {
    assertUniqueValues(AddressType, 3, 'AddressType');
    const expected = ['postal', 'physical', 'both'];
    expect(Object.values(AddressType).sort()).toEqual(expected.sort());
  });

  it('ContactPointSystem has exactly 7 unique values matching FHIR R4', () => {
    assertUniqueValues(ContactPointSystem, 7, 'ContactPointSystem');
    const expected = ['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'];
    expect(Object.values(ContactPointSystem).sort()).toEqual(expected.sort());
  });

  it('ContactPointUse has exactly 5 unique values matching FHIR R4', () => {
    assertUniqueValues(ContactPointUse, 5, 'ContactPointUse');
    const expected = ['home', 'work', 'temp', 'old', 'mobile'];
    expect(Object.values(ContactPointUse).sort()).toEqual(expected.sort());
  });

  it('NarrativeStatus has exactly 4 unique values matching FHIR R4', () => {
    assertUniqueValues(NarrativeStatus, 4, 'NarrativeStatus');
    const expected = ['generated', 'extensions', 'additional', 'empty'];
    expect(Object.values(NarrativeStatus).sort()).toEqual(expected.sort());
  });

  it('LinkType has exactly 4 unique values matching FHIR R4', () => {
    assertUniqueValues(LinkType, 4, 'LinkType');
    const expected = ['replaced-by', 'replaces', 'refer', 'seealso'];
    expect(Object.values(LinkType).sort()).toEqual(expected.sort());
  });

  it('IdentifierUse has exactly 5 unique values matching FHIR R4', () => {
    assertUniqueValues(IdentifierUse, 5, 'IdentifierUse');
    const expected = ['usual', 'official', 'temp', 'secondary', 'old'];
    expect(Object.values(IdentifierUse).sort()).toEqual(expected.sort());
  });

  it('no two FHIR enums share the same set of values (non-overlapping across enums)', () => {
    const allEnumValueSets = [
      new Set(Object.values(AdministrativeGender)),
      new Set(Object.values(NameUse)),
      new Set(Object.values(AddressUse)),
      new Set(Object.values(AddressType)),
      new Set(Object.values(ContactPointSystem)),
      new Set(Object.values(ContactPointUse)),
      new Set(Object.values(NarrativeStatus)),
      new Set(Object.values(LinkType)),
      new Set(Object.values(IdentifierUse)),
    ];

    // Each enum's value set should be distinct from every other
    for (let i = 0; i < allEnumValueSets.length; i++) {
      for (let j = i + 1; j < allEnumValueSets.length; j++) {
        const setA = allEnumValueSets[i];
        const setB = allEnumValueSets[j];
        const serializedA = JSON.stringify([...setA].sort());
        const serializedB = JSON.stringify([...setB].sort());
        expect(serializedA).not.toBe(serializedB);
      }
    }
  });

  it('every enum value generated by fast-check is a member of its enum', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(AdministrativeGender)),
        (gender) => {
          expect(Object.values(AdministrativeGender)).toContain(gender);
        },
      ),
      { numRuns: 50 },
    );

    fc.assert(
      fc.property(fc.constantFrom(...Object.values(NameUse)), (use) => {
        expect(Object.values(NameUse)).toContain(use);
      }),
      { numRuns: 50 },
    );

    fc.assert(
      fc.property(fc.constantFrom(...Object.values(LinkType)), (type) => {
        expect(Object.values(LinkType)).toContain(type);
      }),
      { numRuns: 50 },
    );
  });
});
