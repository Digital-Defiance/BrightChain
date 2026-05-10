/**
 * PatientSearchForm Component
 *
 * A React component for searching patients by demographic criteria
 * and displaying search results with match classification indicators.
 *
 * @module PatientSearchForm
 */
import type {
  AdministrativeGender,
  IMatchCandidate,
  IPatientResource,
  IPatientSearchParams,
  MatchClassification,
} from '@brightchain/brightchart-lib';
import { BrightChartStrings } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

/**
 * Props for the PatientSearchForm component.
 */
export interface PatientSearchFormProps {
  /** Called when the user submits the search form */
  onSearch: (params: IPatientSearchParams) => void;
  /** Called when results are available (e.g. from parent after search completes) */
  onResults?: (results: IMatchCandidate<string>[]) => void;
  /** Search results to display */
  results?: IMatchCandidate<string>[];
}

/** Badge color mapping for match classifications */
const classificationColors: Record<string, string> = {
  certain: '#2e7d32',
  probable: '#f9a825',
  possible: '#e65100',
};

/** Human-readable labels for match classifications */
const classificationLabels: Record<string, string> = {
  certain: 'Certain Match',
  probable: 'Probable Match',
  possible: 'Possible Match',
};

/**
 * Returns the primary display name from a patient resource.
 */
function getPrimaryName(patient: IPatientResource<string>): string {
  const name = patient.name?.[0];
  if (!name) return 'Unknown';
  const parts: string[] = [];
  if (name.given?.length) parts.push(name.given.join(' '));
  if (name.family) parts.push(name.family);
  return parts.length > 0 ? parts.join(' ') : (name.text ?? 'Unknown');
}

/**
 * Returns the primary identifier value from a patient resource.
 */
function getPrimaryIdentifier(patient: IPatientResource<string>): string {
  const id = patient.identifier?.[0];
  if (!id) return 'N/A';
  return id.value ?? 'N/A';
}

/**
 * MatchBadge renders a colored badge/tag for match classification.
 */
function MatchBadge({
  classification,
}: {
  classification: MatchClassification;
}) {
  const color = classificationColors[classification];
  const label = classificationLabels[classification];
  if (!color || !label) return null;

  return (
    <span
      data-testid={`match-badge-${classification}`}
      role="status"
      aria-label={label}
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#fff',
        backgroundColor: color,
        marginLeft: '8px',
      }}
    >
      {label}
    </span>
  );
}

/**
 * PatientSearchForm — search for patients by demographic criteria
 * and display results with match classification indicators.
 */
export const PatientSearchForm: React.FC<PatientSearchFormProps> = ({
  onSearch,
  onResults,
  results,
}) => {
  const { t } = useBrightChartTranslation();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [identifier, setIdentifier] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params: IPatientSearchParams = {};
      if (name.trim()) params.family = name.trim();
      if (birthDate.trim()) params.birthDate = birthDate.trim();
      if (gender) params.gender = gender as AdministrativeGender;
      if (identifier.trim()) params.identifier = identifier.trim();
      onSearch(params);
    },
    [name, birthDate, gender, identifier, onSearch],
  );

  // Notify parent when results change
  React.useEffect(() => {
    if (results && onResults) {
      onResults(results);
    }
  }, [results, onResults]);

  return (
    <div data-testid="patient-search-form">
      <form onSubmit={handleSubmit} aria-label="Patient search form">
        <div>
          <label htmlFor="patient-search-name">Name</label>
          <input
            id="patient-search-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Family name"
            aria-label="Patient name"
          />
        </div>
        <div>
          <label htmlFor="patient-search-birthdate">Birth Date</label>
          <input
            id="patient-search-birthdate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            aria-label="Birth date"
          />
        </div>
        <div>
          <label htmlFor="patient-search-gender">Gender</label>
          <select
            id="patient-search-gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            aria-label="Gender"
          >
            <option value="">Any</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div>
          <label htmlFor="patient-search-identifier">Identifier</label>
          <input
            id="patient-search-identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="MRN, SSN, etc."
            aria-label="Patient identifier"
          />
        </div>
        <button type="submit" aria-label="Search patients">
          {t(BrightChartStrings.Common_Search)}
        </button>
      </form>

      {results && results.length > 0 && (
        <ul data-testid="patient-search-results" aria-label="Search results">
          {results.map((candidate, index) => (
            <li
              key={candidate.patient.id ?? index}
              data-testid="search-result-item"
            >
              <span data-testid="result-name">
                {getPrimaryName(candidate.patient)}
              </span>
              {candidate.patient.birthDate && (
                <span data-testid="result-birthdate">
                  {' '}
                  — {candidate.patient.birthDate}
                </span>
              )}
              {candidate.patient.gender && (
                <span data-testid="result-gender">
                  {' '}
                  — {candidate.patient.gender}
                </span>
              )}
              <span data-testid="result-identifier">
                {' '}
                — {getPrimaryIdentifier(candidate.patient)}
              </span>
              {candidate.matchClassification !== 'unlikely' && (
                <MatchBadge classification={candidate.matchClassification} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PatientSearchForm;
