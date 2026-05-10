/**
 * PatientDemographicsCard Component
 *
 * A read-only summary card displaying a patient's demographic information
 * from an IPatientResource, including name, birthDate, gender, identifiers,
 * address, and telecom.
 *
 * Validates: Requirements 10.2, 10.6
 * @module PatientDemographicsCard
 */
import type {
  IAddress,
  IContactPoint,
  IHumanName,
  IIdentifier,
  IPatientResource,
} from '@brightchain/brightchart-lib';
import { BrightChartStrings } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

/**
 * Props for the PatientDemographicsCard component.
 */
export interface PatientDemographicsCardProps {
  /** The FHIR R4 Patient resource to display */
  patient: IPatientResource<string>;
}

/**
 * Formats a HumanName into a display string.
 */
function formatName(name: IHumanName): string {
  const parts: string[] = [];
  if (name.prefix?.length) parts.push(name.prefix.join(' '));
  if (name.given?.length) parts.push(name.given.join(' '));
  if (name.family) parts.push(name.family);
  if (name.suffix?.length) parts.push(name.suffix.join(' '));
  return parts.length > 0 ? parts.join(' ') : (name.text ?? 'Unknown');
}

/**
 * Formats an Address into a display string.
 */
function formatAddress(address: IAddress): string {
  if (address.text) return address.text;
  const parts: string[] = [];
  if (address.line?.length) parts.push(address.line.join(', '));
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.postalCode) parts.push(address.postalCode);
  if (address.country) parts.push(address.country);
  return parts.join(', ') || 'N/A';
}

/**
 * Formats a ContactPoint into a display string.
 */
function formatTelecom(telecom: IContactPoint): string {
  const system = telecom.system ?? 'other';
  const value = telecom.value ?? 'N/A';
  const use = telecom.use ? ` (${telecom.use})` : '';
  return `${system}: ${value}${use}`;
}

/**
 * Formats an Identifier into a display string.
 */
function formatIdentifier(identifier: IIdentifier<string>): string {
  const system = identifier.system ?? 'Unknown system';
  const value = identifier.value ?? 'N/A';
  return `${system}: ${value}`;
}

/**
 * PatientDemographicsCard — displays a patient's demographic data
 * in a read-only summary card with semantic HTML and ARIA attributes.
 */
export const PatientDemographicsCard: React.FC<
  PatientDemographicsCardProps
> = ({ patient }) => {
  const { t } = useBrightChartTranslation();
  const primaryName = patient.name?.[0];

  return (
    <article
      data-testid="patient-demographics-card"
      aria-label="Patient demographics"
      role="region"
    >
      {/* Name */}
      <section aria-label="Patient name">
        <h2 data-testid="demographics-name">
          {primaryName ? formatName(primaryName) : 'Unknown Patient'}
        </h2>
      </section>

      {/* Birth Date */}
      <section aria-label="Birth date">
        <dt>{t(BrightChartStrings.Form_BirthDate)}</dt>
        <dd data-testid="demographics-birthdate">
          {patient.birthDate ?? 'Not provided'}
        </dd>
      </section>

      {/* Gender */}
      <section aria-label="Gender">
        <dt>{t(BrightChartStrings.Form_Gender)}</dt>
        <dd data-testid="demographics-gender">
          {patient.gender ?? 'Not provided'}
        </dd>
      </section>

      {/* Identifiers */}
      <section aria-label="Patient identifiers">
        <dt>{t(BrightChartStrings.Form_Identifier)}</dt>
        {patient.identifier && patient.identifier.length > 0 ? (
          <ul data-testid="demographics-identifiers">
            {patient.identifier.map((id, index) => (
              <li
                key={`${id.system ?? ''}-${id.value ?? ''}-${index}`}
                data-testid="demographics-identifier-item"
              >
                {formatIdentifier(id)}
              </li>
            ))}
          </ul>
        ) : (
          <dd data-testid="demographics-identifiers-empty">None</dd>
        )}
      </section>

      {/* Address */}
      <section aria-label="Address">
        <dt>{t(BrightChartStrings.Form_Address)}</dt>
        {patient.address && patient.address.length > 0 ? (
          <ul data-testid="demographics-addresses">
            {patient.address.map((addr, index) => (
              <li key={index} data-testid="demographics-address-item">
                {addr.use && (
                  <span data-testid="demographics-address-use">
                    ({addr.use}){' '}
                  </span>
                )}
                {formatAddress(addr)}
              </li>
            ))}
          </ul>
        ) : (
          <dd data-testid="demographics-addresses-empty">Not provided</dd>
        )}
      </section>

      {/* Telecom */}
      <section aria-label="Contact information">
        <dt>{t(BrightChartStrings.Form_Contact)}</dt>
        {patient.telecom && patient.telecom.length > 0 ? (
          <ul data-testid="demographics-telecoms">
            {patient.telecom.map((tc, index) => (
              <li key={index} data-testid="demographics-telecom-item">
                {formatTelecom(tc)}
              </li>
            ))}
          </ul>
        ) : (
          <dd data-testid="demographics-telecoms-empty">Not provided</dd>
        )}
      </section>
    </article>
  );
};

export default PatientDemographicsCard;
