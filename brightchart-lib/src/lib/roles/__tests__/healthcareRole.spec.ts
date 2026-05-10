/**
 * Unit Tests for Healthcare Role Layer
 *
 * Verifies:
 * (a) Role code constants match expected SNOMED CT values
 * (b) IHealthcareRole interface can be instantiated for each role type
 *
 * @module roles/__tests__/healthcareRole.spec
 */

import type { IHealthcareRole } from '../healthcareRole';
import {
  ADMIN,
  DENTIST,
  MEDICAL_ASSISTANT,
  PATIENT,
  PHYSICIAN,
  REGISTERED_NURSE,
  ROLE_CODE_DISPLAY,
  VETERINARIAN,
} from '../healthcareRoleCodes';

describe('Healthcare Role Codes - SNOMED CT values', () => {
  it('PHYSICIAN equals SNOMED CT 309343006', () => {
    expect(PHYSICIAN).toBe('309343006');
  });

  it('REGISTERED_NURSE equals SNOMED CT 224535009', () => {
    expect(REGISTERED_NURSE).toBe('224535009');
  });

  it('MEDICAL_ASSISTANT equals SNOMED CT 309453006', () => {
    expect(MEDICAL_ASSISTANT).toBe('309453006');
  });

  it('PATIENT equals SNOMED CT 116154003', () => {
    expect(PATIENT).toBe('116154003');
  });

  it('ADMIN equals SNOMED CT 394572006', () => {
    expect(ADMIN).toBe('394572006');
  });

  it('DENTIST equals SNOMED CT 106289002', () => {
    expect(DENTIST).toBe('106289002');
  });

  it('VETERINARIAN equals SNOMED CT 106290006', () => {
    expect(VETERINARIAN).toBe('106290006');
  });

  it('all role codes are unique', () => {
    const codes = [
      PHYSICIAN,
      REGISTERED_NURSE,
      MEDICAL_ASSISTANT,
      PATIENT,
      ADMIN,
      DENTIST,
      VETERINARIAN,
    ];
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('all role codes are numeric SNOMED CT strings', () => {
    const codes = [
      PHYSICIAN,
      REGISTERED_NURSE,
      MEDICAL_ASSISTANT,
      PATIENT,
      ADMIN,
      DENTIST,
      VETERINARIAN,
    ];
    for (const code of codes) {
      expect(code).toMatch(/^\d+$/);
    }
  });

  it('ROLE_CODE_DISPLAY has an entry for every role code', () => {
    const codes = [
      PHYSICIAN,
      REGISTERED_NURSE,
      MEDICAL_ASSISTANT,
      PATIENT,
      ADMIN,
      DENTIST,
      VETERINARIAN,
    ];
    for (const code of codes) {
      expect(ROLE_CODE_DISPLAY[code]).toBeDefined();
      expect(typeof ROLE_CODE_DISPLAY[code]).toBe('string');
      expect(ROLE_CODE_DISPLAY[code].length).toBeGreaterThan(0);
    }
  });
});

describe('IHealthcareRole interface instantiation', () => {
  it('can create a Physician role with default TID (string)', () => {
    const role: IHealthcareRole = {
      roleCode: PHYSICIAN,
      roleDisplay: ROLE_CODE_DISPLAY[PHYSICIAN],
      specialty: { text: 'Internal Medicine' },
      organization: {
        reference: 'Organization/1',
        display: 'General Hospital',
      },
      practitioner: { reference: 'Practitioner/42', display: 'Dr. Smith' },
      period: { start: '2020-01-01' },
    };
    expect(role.roleCode).toBe(PHYSICIAN);
    expect(role.roleDisplay).toBe('Physician');
  });

  it('can create a Registered Nurse role', () => {
    const role: IHealthcareRole = {
      roleCode: REGISTERED_NURSE,
      roleDisplay: ROLE_CODE_DISPLAY[REGISTERED_NURSE],
    };
    expect(role.roleCode).toBe(REGISTERED_NURSE);
    expect(role.roleDisplay).toBe('Registered Nurse');
  });

  it('can create a Medical Assistant role', () => {
    const role: IHealthcareRole = {
      roleCode: MEDICAL_ASSISTANT,
      roleDisplay: ROLE_CODE_DISPLAY[MEDICAL_ASSISTANT],
    };
    expect(role.roleCode).toBe(MEDICAL_ASSISTANT);
    expect(role.roleDisplay).toBe('Medical Assistant');
  });

  it('can create a Patient role', () => {
    const role: IHealthcareRole = {
      roleCode: PATIENT,
      roleDisplay: ROLE_CODE_DISPLAY[PATIENT],
      organization: {
        reference: 'Organization/2',
        display: 'Northside Family Practice',
      },
      patient: { reference: 'Patient/100', display: 'Jane Doe' },
    };
    expect(role.roleCode).toBe(PATIENT);
    expect(role.roleDisplay).toBe('Patient');
    expect(role.patient?.reference).toBe('Patient/100');
  });

  it('can create an Admin role', () => {
    const role: IHealthcareRole = {
      roleCode: ADMIN,
      roleDisplay: ROLE_CODE_DISPLAY[ADMIN],
      organization: { reference: 'Organization/1' },
    };
    expect(role.roleCode).toBe(ADMIN);
    expect(role.roleDisplay).toBe('Clinical Administrator');
  });

  it('can create a Dentist role', () => {
    const role: IHealthcareRole = {
      roleCode: DENTIST,
      roleDisplay: ROLE_CODE_DISPLAY[DENTIST],
      specialty: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '722163006',
            display: 'Dentistry',
          },
        ],
      },
    };
    expect(role.roleCode).toBe(DENTIST);
    expect(role.roleDisplay).toBe('Dentist');
  });

  it('can create a Veterinarian role', () => {
    const role: IHealthcareRole = {
      roleCode: VETERINARIAN,
      roleDisplay: ROLE_CODE_DISPLAY[VETERINARIAN],
      specialty: { text: 'Small Animal Medicine' },
    };
    expect(role.roleCode).toBe(VETERINARIAN);
    expect(role.roleDisplay).toBe('Veterinarian');
  });

  it('can create a role with Uint8Array TID (backend usage)', () => {
    const role: IHealthcareRole<Uint8Array> = {
      roleCode: PHYSICIAN,
      roleDisplay: 'Physician',
      organization: {
        reference: 'Organization/1',
        identifier: { value: 'org-1' },
      },
      practitioner: {
        reference: 'Practitioner/1',
        identifier: { value: 'prac-1' },
      },
    };
    expect(role.roleCode).toBe(PHYSICIAN);
    expect(role.organization?.reference).toBe('Organization/1');
  });

  it('optional fields can be omitted', () => {
    const role: IHealthcareRole = {
      roleCode: PHYSICIAN,
      roleDisplay: 'Physician',
    };
    expect(role.specialty).toBeUndefined();
    expect(role.organization).toBeUndefined();
    expect(role.practitioner).toBeUndefined();
    expect(role.patient).toBeUndefined();
    expect(role.period).toBeUndefined();
  });

  it('supports multi-org: same user as physician at one org and patient at another', () => {
    const physicianRole: IHealthcareRole = {
      roleCode: PHYSICIAN,
      roleDisplay: ROLE_CODE_DISPLAY[PHYSICIAN],
      organization: {
        reference: 'Organization/downtown',
        display: 'Downtown Medical Group',
      },
      practitioner: { reference: 'Practitioner/42', display: 'Dr. Smith' },
    };
    const patientRole: IHealthcareRole = {
      roleCode: PATIENT,
      roleDisplay: ROLE_CODE_DISPLAY[PATIENT],
      organization: {
        reference: 'Organization/northside',
        display: 'Northside Family Practice',
      },
      patient: { reference: 'Patient/42', display: 'Dr. Smith' },
    };
    expect(physicianRole.organization?.reference).not.toBe(
      patientRole.organization?.reference,
    );
    expect(physicianRole.practitioner?.reference).toBeDefined();
    expect(physicianRole.patient).toBeUndefined();
    expect(patientRole.patient?.reference).toBeDefined();
    expect(patientRole.practitioner).toBeUndefined();
  });
});
