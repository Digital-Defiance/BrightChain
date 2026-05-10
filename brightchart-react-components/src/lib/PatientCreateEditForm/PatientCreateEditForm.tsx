/**
 * PatientCreateEditForm Component
 *
 * A React component for creating or editing FHIR R4 Patient resources.
 * Supports both create mode (empty form) and edit mode (pre-populated).
 * Validates required fields and FHIR R4 constraints before submission.
 *
 * Validates: Requirements 10.3, 10.6
 * @module PatientCreateEditForm
 */
import type { IPatientResource } from '@brightchain/brightchart-lib';
import {
  AdministrativeGender,
  BrightChartStrings,
} from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

/**
 * Props for the PatientCreateEditForm component.
 */
export interface PatientCreateEditFormProps {
  /** Existing patient to edit. If omitted, the form starts empty (create mode). */
  patient?: IPatientResource<string>;
  /** Called when the form is submitted with a valid IPatientResource. */
  onSubmit: (patient: IPatientResource<string>) => void;
}

/** Validation errors keyed by field name. */
interface ValidationErrors {
  familyName?: string;
  gender?: string;
  birthDate?: string;
  identifierSystem?: string;
}

/** FHIR R4 date format: YYYY-MM-DD */
const FHIR_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Basic URI format check */
const URI_REGEX = /^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\/.+$/;

/**
 * Validates form fields and returns any errors found.
 */
function validate(
  familyName: string,
  gender: string,
  birthDate: string,
  identifierSystem: string,
): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!familyName.trim()) {
    errors.familyName = 'Family name is required';
  }

  if (!gender) {
    errors.gender = 'Gender is required';
  }

  if (!birthDate.trim()) {
    errors.birthDate = 'Birth date is required';
  } else if (!FHIR_DATE_REGEX.test(birthDate.trim())) {
    errors.birthDate = 'Birth date must be in YYYY-MM-DD format';
  }

  if (identifierSystem.trim() && !URI_REGEX.test(identifierSystem.trim())) {
    errors.identifierSystem =
      'Identifier system must be a valid URI (e.g. http://example.com)';
  }

  return errors;
}

/**
 * PatientCreateEditForm — create or edit a FHIR R4 Patient resource.
 *
 * In create mode (no `patient` prop), the form starts empty.
 * In edit mode (with `patient` prop), fields are pre-populated.
 */
export const PatientCreateEditForm: React.FC<PatientCreateEditFormProps> = ({
  patient,
  onSubmit,
}) => {
  const { t } = useBrightChartTranslation();
  const [familyName, setFamilyName] = useState('');
  const [givenName, setGivenName] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [identifierSystem, setIdentifierSystem] = useState('');
  const [identifierValue, setIdentifierValue] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitted, setSubmitted] = useState(false);

  // Pre-populate fields in edit mode
  useEffect(() => {
    if (patient) {
      const name = patient.name?.[0];
      setFamilyName(name?.family ?? '');
      setGivenName(name?.given?.join(' ') ?? '');
      setGender(patient.gender ?? '');
      setBirthDate(patient.birthDate ?? '');
      const id = patient.identifier?.[0];
      setIdentifierSystem(id?.system ?? '');
      setIdentifierValue(id?.value ?? '');
    }
  }, [patient]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitted(true);

      const validationErrors = validate(
        familyName,
        gender,
        birthDate,
        identifierSystem,
      );
      setErrors(validationErrors);

      if (Object.keys(validationErrors).length > 0) {
        return;
      }

      const result: IPatientResource<string> = {
        resourceType: 'Patient',
        ...(patient?.id ? { id: patient.id } : {}),
        name: [
          {
            family: familyName.trim(),
            ...(givenName.trim()
              ? { given: givenName.trim().split(/\s+/) }
              : {}),
          },
        ],
        gender: gender as AdministrativeGender,
        birthDate: birthDate.trim(),
        ...(identifierSystem.trim() || identifierValue.trim()
          ? {
              identifier: [
                {
                  ...(identifierSystem.trim()
                    ? { system: identifierSystem.trim() }
                    : {}),
                  ...(identifierValue.trim()
                    ? { value: identifierValue.trim() }
                    : {}),
                },
              ],
            }
          : {}),
      };

      onSubmit(result);
    },
    [
      familyName,
      givenName,
      gender,
      birthDate,
      identifierSystem,
      identifierValue,
      patient,
      onSubmit,
    ],
  );

  const isEditMode = !!patient;

  return (
    <form
      data-testid="patient-create-edit-form"
      onSubmit={handleSubmit}
      aria-label={isEditMode ? 'Edit patient form' : 'Create patient form'}
      noValidate
    >
      {/* Family Name (required) */}
      <div>
        <label htmlFor="patient-family-name">
          {t(BrightChartStrings.Form_FamilyName)} *
        </label>
        <input
          id="patient-family-name"
          type="text"
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          aria-required="true"
          aria-invalid={submitted && !!errors.familyName}
          aria-describedby={errors.familyName ? 'error-family-name' : undefined}
        />
        {submitted && errors.familyName && (
          <span
            id="error-family-name"
            role="alert"
            data-testid="error-family-name"
          >
            {errors.familyName}
          </span>
        )}
      </div>

      {/* Given Name (optional) */}
      <div>
        <label htmlFor="patient-given-name">
          {t(BrightChartStrings.Form_GivenName)}
        </label>
        <input
          id="patient-given-name"
          type="text"
          value={givenName}
          onChange={(e) => setGivenName(e.target.value)}
        />
      </div>

      {/* Gender (required) */}
      <div>
        <label htmlFor="patient-gender">
          {t(BrightChartStrings.Form_Gender)} *
        </label>
        <select
          id="patient-gender"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          aria-required="true"
          aria-invalid={submitted && !!errors.gender}
          aria-describedby={errors.gender ? 'error-gender' : undefined}
        >
          <option value="">Select gender</option>
          <option value={AdministrativeGender.Male}>Male</option>
          <option value={AdministrativeGender.Female}>Female</option>
          <option value={AdministrativeGender.Other}>Other</option>
          <option value={AdministrativeGender.Unknown}>Unknown</option>
        </select>
        {submitted && errors.gender && (
          <span id="error-gender" role="alert" data-testid="error-gender">
            {errors.gender}
          </span>
        )}
      </div>

      {/* Birth Date (required) */}
      <div>
        <label htmlFor="patient-birth-date">
          {t(BrightChartStrings.Form_BirthDate)} *
        </label>
        <input
          id="patient-birth-date"
          type="text"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          placeholder="YYYY-MM-DD"
          aria-required="true"
          aria-invalid={submitted && !!errors.birthDate}
          aria-describedby={errors.birthDate ? 'error-birth-date' : undefined}
        />
        {submitted && errors.birthDate && (
          <span
            id="error-birth-date"
            role="alert"
            data-testid="error-birth-date"
          >
            {errors.birthDate}
          </span>
        )}
      </div>

      {/* Identifier System (optional, URI validated) */}
      <div>
        <label htmlFor="patient-identifier-system">Identifier System</label>
        <input
          id="patient-identifier-system"
          type="text"
          value={identifierSystem}
          onChange={(e) => setIdentifierSystem(e.target.value)}
          placeholder="http://example.com/mrn"
          aria-invalid={submitted && !!errors.identifierSystem}
          aria-describedby={
            errors.identifierSystem ? 'error-identifier-system' : undefined
          }
        />
        {submitted && errors.identifierSystem && (
          <span
            id="error-identifier-system"
            role="alert"
            data-testid="error-identifier-system"
          >
            {errors.identifierSystem}
          </span>
        )}
      </div>

      {/* Identifier Value (optional) */}
      <div>
        <label htmlFor="patient-identifier-value">Identifier Value</label>
        <input
          id="patient-identifier-value"
          type="text"
          value={identifierValue}
          onChange={(e) => setIdentifierValue(e.target.value)}
          placeholder="MRN-12345"
        />
      </div>

      <button
        type="submit"
        aria-label={isEditMode ? 'Update patient' : 'Create patient'}
      >
        {isEditMode
          ? t(BrightChartStrings.Form_UpdatePatient)
          : t(BrightChartStrings.Form_CreatePatient)}
      </button>
    </form>
  );
};

export default PatientCreateEditForm;
