/**
 * Unit tests for PatientSearchForm component.
 *
 * Validates: Requirements 10.1, 10.4, 10.5
 */
import type { IMatchCandidate } from '@brightchain/brightchart-lib';
import {
  AdministrativeGender,
  MatchClassification,
} from '@brightchain/brightchart-lib';
import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PatientSearchForm } from '../PatientSearchForm';

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
    currentLanguage: 'en-US',
  }),
}));

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
function makeCandidate(
  overrides: {
    id?: string;
    family?: string;
    given?: string[];
    birthDate?: string;
    gender?: AdministrativeGender;
    identifierValue?: string;
    matchScore?: number;
    matchClassification?: MatchClassification;
  } = {},
): IMatchCandidate<string> {
  return {
    patient: {
      resourceType: 'Patient' as const,
      id: overrides.id ?? 'p-1',
      name: [
        {
          family: overrides.family ?? 'Smith',
          given: overrides.given ?? ['John'],
        },
      ],
      birthDate: overrides.birthDate ?? '1990-01-15',
      gender: overrides.gender ?? AdministrativeGender.Male,
      identifier: [
        {
          system: 'http://hospital.example/mrn',
          value: overrides.identifierValue ?? 'MRN-12345',
        },
      ],
    },
    matchScore: overrides.matchScore ?? 0.97,
    matchClassification:
      overrides.matchClassification ?? MatchClassification.Certain,
  };
}

// ---------------------------------------------------------------------------
// (a) Form renders all search fields
// ---------------------------------------------------------------------------
describe('PatientSearchForm renders all search fields', () => {
  it('renders name, birthDate, gender, identifier inputs and a submit button', () => {
    const onSearch = jest.fn();
    render(<PatientSearchForm onSearch={onSearch} />);

    expect(screen.getByLabelText('Patient name')).toBeInTheDocument();
    expect(screen.getByLabelText('Birth date')).toBeInTheDocument();
    expect(screen.getByLabelText('Gender')).toBeInTheDocument();
    expect(screen.getByLabelText('Patient identifier')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('renders associated labels for accessibility', () => {
    const onSearch = jest.fn();
    render(<PatientSearchForm onSearch={onSearch} />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Birth Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Gender')).toBeInTheDocument();
    expect(screen.getByLabelText('Identifier')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// (b) onSearch callback fires with correct params
// ---------------------------------------------------------------------------
describe('PatientSearchForm onSearch callback', () => {
  it('fires onSearch with populated params on form submit', () => {
    const onSearch = jest.fn();
    render(<PatientSearchForm onSearch={onSearch} />);

    fireEvent.change(screen.getByLabelText('Patient name'), {
      target: { value: 'Smith' },
    });
    fireEvent.change(screen.getByLabelText('Birth date'), {
      target: { value: '1990-01-15' },
    });
    fireEvent.change(screen.getByLabelText('Gender'), {
      target: { value: 'female' },
    });
    fireEvent.change(screen.getByLabelText('Patient identifier'), {
      target: { value: 'MRN-999' },
    });

    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith({
      family: 'Smith',
      birthDate: '1990-01-15',
      gender: 'female',
      identifier: 'MRN-999',
    });
  });

  it('omits empty fields from search params', () => {
    const onSearch = jest.fn();
    render(<PatientSearchForm onSearch={onSearch} />);

    fireEvent.change(screen.getByLabelText('Patient name'), {
      target: { value: 'Doe' },
    });

    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).toHaveBeenCalledWith({ family: 'Doe' });
  });
});

// ---------------------------------------------------------------------------
// (c) Results list renders patient data
// ---------------------------------------------------------------------------
describe('PatientSearchForm results display', () => {
  it('renders a list of results with name, birthDate, gender, and identifier', () => {
    const onSearch = jest.fn();
    const results: IMatchCandidate<string>[] = [
      makeCandidate({
        id: 'p-1',
        family: 'Smith',
        given: ['John'],
        birthDate: '1990-01-15',
        gender: AdministrativeGender.Male,
        identifierValue: 'MRN-12345',
      }),
      makeCandidate({
        id: 'p-2',
        family: 'Doe',
        given: ['Jane'],
        birthDate: '1985-06-20',
        gender: AdministrativeGender.Female,
        identifierValue: 'MRN-67890',
      }),
    ];

    render(<PatientSearchForm onSearch={onSearch} results={results} />);

    const items = screen.getAllByTestId('search-result-item');
    expect(items).toHaveLength(2);

    // First result
    const names = screen.getAllByTestId('result-name');
    expect(names[0]).toHaveTextContent('John Smith');
    expect(names[1]).toHaveTextContent('Jane Doe');

    const birthDates = screen.getAllByTestId('result-birthdate');
    expect(birthDates[0]).toHaveTextContent('1990-01-15');
    expect(birthDates[1]).toHaveTextContent('1985-06-20');

    const genders = screen.getAllByTestId('result-gender');
    expect(genders[0]).toHaveTextContent('male');
    expect(genders[1]).toHaveTextContent('female');

    const identifiers = screen.getAllByTestId('result-identifier');
    expect(identifiers[0]).toHaveTextContent('MRN-12345');
    expect(identifiers[1]).toHaveTextContent('MRN-67890');
  });

  it('does not render results list when results is empty', () => {
    const onSearch = jest.fn();
    render(<PatientSearchForm onSearch={onSearch} results={[]} />);

    expect(
      screen.queryByTestId('patient-search-results'),
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// (d) Match classification badges render correctly
// ---------------------------------------------------------------------------
describe('PatientSearchForm match classification badges', () => {
  it('renders a green "Certain Match" badge for certain classification', () => {
    const onSearch = jest.fn();
    const results = [
      makeCandidate({ matchClassification: MatchClassification.Certain }),
    ];

    render(<PatientSearchForm onSearch={onSearch} results={results} />);

    const badge = screen.getByTestId('match-badge-certain');
    expect(badge).toHaveTextContent('Certain Match');
    expect(badge).toHaveStyle({ backgroundColor: '#2e7d32' });
  });

  it('renders a yellow "Probable Match" badge for probable classification', () => {
    const onSearch = jest.fn();
    const results = [
      makeCandidate({ matchClassification: MatchClassification.Probable }),
    ];

    render(<PatientSearchForm onSearch={onSearch} results={results} />);

    const badge = screen.getByTestId('match-badge-probable');
    expect(badge).toHaveTextContent('Probable Match');
    expect(badge).toHaveStyle({ backgroundColor: '#f9a825' });
  });

  it('renders an orange "Possible Match" badge for possible classification', () => {
    const onSearch = jest.fn();
    const results = [
      makeCandidate({ matchClassification: MatchClassification.Possible }),
    ];

    render(<PatientSearchForm onSearch={onSearch} results={results} />);

    const badge = screen.getByTestId('match-badge-possible');
    expect(badge).toHaveTextContent('Possible Match');
    expect(badge).toHaveStyle({ backgroundColor: '#e65100' });
  });

  it('does not render a badge for unlikely classification', () => {
    const onSearch = jest.fn();
    const results = [
      makeCandidate({ matchClassification: MatchClassification.Unlikely }),
    ];

    render(<PatientSearchForm onSearch={onSearch} results={results} />);

    expect(
      screen.queryByTestId('match-badge-unlikely'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('match-badge-certain')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('match-badge-probable'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('match-badge-possible'),
    ).not.toBeInTheDocument();
  });
});
