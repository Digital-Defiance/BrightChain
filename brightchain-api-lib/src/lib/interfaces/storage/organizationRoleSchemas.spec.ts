/**
 * Unit tests for Organization, Healthcare Role, and Invitation schemas,
 * and SchemaCollection enum extensions.
 *
 * _Requirements: 10.1, 10.2, 10.3, 10.4_
 */

import { SchemaCollection } from '../../enumerations/schema-collection';
import { HEALTHCARE_ROLE_SCHEMA } from './healthcareRoleSchema';
import { INVITATION_SCHEMA } from './invitationSchema';
import { ORGANIZATION_SCHEMA } from './organizationSchema';

describe('SchemaCollection enum extensions', () => {
  it('has Organization entry mapped to "organizations"', () => {
    expect(SchemaCollection.Organization).toBe('organizations');
  });

  it('has HealthcareRole entry mapped to "healthcare_roles"', () => {
    expect(SchemaCollection.HealthcareRole).toBe('healthcare_roles');
  });

  it('has Invitation entry mapped to "invitations"', () => {
    expect(SchemaCollection.Invitation).toBe('invitations');
  });
});

describe('ORGANIZATION_SCHEMA', () => {
  const props = ORGANIZATION_SCHEMA.properties ?? {};
  const expectedFields = [
    '_id',
    'name',
    'type',
    'telecom',
    'address',
    'active',
    'enrollmentMode',
    'createdBy',
    'createdAt',
    'updatedAt',
  ];

  it('has all expected fields', () => {
    for (const field of expectedFields) {
      expect(props).toHaveProperty(field);
    }
  });

  it('marks required fields correctly', () => {
    expect(ORGANIZATION_SCHEMA.required).toEqual(
      expect.arrayContaining([
        '_id',
        'name',
        'active',
        'enrollmentMode',
        'createdBy',
        'createdAt',
        'updatedAt',
      ]),
    );
  });

  it('has correct field types', () => {
    expect(props['_id'].type).toBe('string');
    expect(props['name'].type).toBe('string');
    expect(props['type'].type).toBe('object');
    expect(props['telecom'].type).toBe('array');
    expect(props['address'].type).toBe('array');
    expect(props['active'].type).toBe('boolean');
    expect(props['enrollmentMode'].type).toBe('string');
    expect(props['enrollmentMode'].enum).toEqual(['open', 'invite-only']);
  });

  it('defines indexes on name and active', () => {
    const indexes = ORGANIZATION_SCHEMA.indexes ?? [];
    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fields: { name: 1 } }),
        expect.objectContaining({ fields: { active: 1 } }),
      ]),
    );
  });

  it('uses strict validation with error action', () => {
    expect(ORGANIZATION_SCHEMA.validationLevel).toBe('strict');
    expect(ORGANIZATION_SCHEMA.validationAction).toBe('error');
  });
});

describe('HEALTHCARE_ROLE_SCHEMA', () => {
  const props = HEALTHCARE_ROLE_SCHEMA.properties ?? {};
  const expectedFields = [
    '_id',
    'memberId',
    'roleCode',
    'roleDisplay',
    'specialty',
    'organizationId',
    'practitionerRef',
    'patientRef',
    'period',
    'createdBy',
    'createdAt',
    'updatedAt',
  ];

  it('has all expected fields', () => {
    for (const field of expectedFields) {
      expect(props).toHaveProperty(field);
    }
  });

  it('marks required fields correctly', () => {
    expect(HEALTHCARE_ROLE_SCHEMA.required).toEqual(
      expect.arrayContaining([
        '_id',
        'memberId',
        'roleCode',
        'roleDisplay',
        'organizationId',
        'period',
        'createdBy',
        'createdAt',
        'updatedAt',
      ]),
    );
  });

  it('has correct field types', () => {
    expect(props['_id'].type).toBe('string');
    expect(props['memberId'].type).toBe('string');
    expect(props['roleCode'].type).toBe('string');
    expect(props['roleDisplay'].type).toBe('string');
    expect(props['specialty'].type).toBe('object');
    expect(props['organizationId'].type).toBe('string');
    expect(props['practitionerRef'].type).toBe('string');
    expect(props['patientRef'].type).toBe('string');
    expect(props['period'].type).toBe('object');
  });

  it('defines indexes on memberId, organizationId, and unique compound', () => {
    const indexes = HEALTHCARE_ROLE_SCHEMA.indexes ?? [];
    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fields: { memberId: 1 } }),
        expect.objectContaining({ fields: { organizationId: 1 } }),
        expect.objectContaining({
          fields: { memberId: 1, roleCode: 1, organizationId: 1 },
          options: { unique: true },
        }),
      ]),
    );
  });

  it('uses strict validation with error action', () => {
    expect(HEALTHCARE_ROLE_SCHEMA.validationLevel).toBe('strict');
    expect(HEALTHCARE_ROLE_SCHEMA.validationAction).toBe('error');
  });
});

describe('INVITATION_SCHEMA', () => {
  const props = INVITATION_SCHEMA.properties ?? {};
  const expectedFields = [
    '_id',
    'token',
    'organizationId',
    'roleCode',
    'targetEmail',
    'createdBy',
    'expiresAt',
    'usedBy',
    'usedAt',
    'createdAt',
  ];

  it('has all expected fields', () => {
    for (const field of expectedFields) {
      expect(props).toHaveProperty(field);
    }
  });

  it('marks required fields correctly', () => {
    expect(INVITATION_SCHEMA.required).toEqual(
      expect.arrayContaining([
        '_id',
        'token',
        'organizationId',
        'roleCode',
        'createdBy',
        'expiresAt',
        'createdAt',
      ]),
    );
  });

  it('has correct field types', () => {
    expect(props['_id'].type).toBe('string');
    expect(props['token'].type).toBe('string');
    expect(props['organizationId'].type).toBe('string');
    expect(props['roleCode'].type).toBe('string');
    expect(props['targetEmail'].type).toBe('string');
    expect(props['createdBy'].type).toBe('string');
    expect(props['expiresAt'].type).toBe('string');
    expect(props['usedBy'].type).toBe('string');
    expect(props['usedAt'].type).toBe('string');
  });

  it('defines unique index on token and indexes on organizationId and expiresAt', () => {
    const indexes = INVITATION_SCHEMA.indexes ?? [];
    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fields: { token: 1 },
          options: { unique: true },
        }),
        expect.objectContaining({ fields: { organizationId: 1 } }),
        expect.objectContaining({ fields: { expiresAt: 1 } }),
      ]),
    );
  });

  it('uses strict validation with error action', () => {
    expect(INVITATION_SCHEMA.validationLevel).toBe('strict');
    expect(INVITATION_SCHEMA.validationAction).toBe('error');
  });
});
