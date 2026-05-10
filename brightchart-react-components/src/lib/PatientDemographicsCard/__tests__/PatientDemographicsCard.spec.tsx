/**
 * Unit tests for PatientDemographicsCard component.
 *
 * Validates: Requirements 10.2, 10.6
 */
import type { IPatientResource } from '@brightchain/brightchart-lib';
import {
  AddressUse,
  AdministrativeGender,
  ContactPointSystem,
  ContactPointUse,
} from '@brightchain/brightchart-lib';
import '@testing-library/jest-dom';
import { cleanup, render, screen } from '@testing-library/react';
import { PatientDemographicsCard } from '../PatientDemographicsCard';

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
function makePatient(
  overrides: Partial<IPatientResource<string>> = {},
): IPatientResource<string> {
  return {
    resourceType: 'Patient' as const,
    id: 'test-patient-1',
    name: [{ family: 'Smith', given: ['John', 'Michael'] }],
    birthDate: '1990-05-15',
    gender: AdministrativeGender.Male,
    identifier: [{ system: 'http://hospital.example/mrn', value: 'MRN-12345' }],
    address: [
      {
        use: AddressUse.Home,
        line: ['123 Main St'],
        city: 'Springfield',
        state: 'IL',
        postalCode: '62701',
        country: 'US',
      },
    ],
    telecom: [
      {
        system: ContactPointSystem.Phone,
        value: '555-0100',
        use: ContactPointUse.Home,
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// (a) All demographic fields render
// ---------------------------------------------------------------------------
describe('PatientDemographicsCard renders all demographic fields', () => {
  it('renders name, birthDate, gender, identifier, address, and telecom', () => {
    const patient = makePatient();
    render(<PatientDemographicsCard patient={patient} />);

    // Name
    expect(screen.getByTestId('demographics-name')).toHaveTextContent(
      'John Michael Smith',
    );

    // Birth Date
    expect(screen.getByTestId('demographics-birthdate')).toHaveTextContent(
      '1990-05-15',
    );

    // Gender
    expect(screen.getByTestId('demographics-gender')).toHaveTextContent('male');

    // Identifier
    const identifierItems = screen.getAllByTestId(
      'demographics-identifier-item',
    );
    expect(identifierItems).toHaveLength(1);
    expect(identifierItems[0]).toHaveTextContent(
      'http://hospital.example/mrn: MRN-12345',
    );

    // Address
    const addressItems = screen.getAllByTestId('demographics-address-item');
    expect(addressItems).toHaveLength(1);
    expect(addressItems[0]).toHaveTextContent('123 Main St');
    expect(addressItems[0]).toHaveTextContent('Springfield');
    expect(addressItems[0]).toHaveTextContent('IL');

    // Telecom
    const telecomItems = screen.getAllByTestId('demographics-telecom-item');
    expect(telecomItems).toHaveLength(1);
    expect(telecomItems[0]).toHaveTextContent('phone: 555-0100 (home)');
  });

  it('renders the card with proper accessibility attributes', () => {
    const patient = makePatient();
    render(<PatientDemographicsCard patient={patient} />);

    const card = screen.getByTestId('patient-demographics-card');
    expect(card).toHaveAttribute('aria-label', 'Patient demographics');
    expect(card).toHaveAttribute('role', 'region');
  });
});

// ---------------------------------------------------------------------------
// (b) Multiple identifiers display
// ---------------------------------------------------------------------------
describe('PatientDemographicsCard multiple identifiers', () => {
  it('renders all identifiers when multiple are provided', () => {
    const patient = makePatient({
      identifier: [
        { system: 'http://hospital.example/mrn', value: 'MRN-12345' },
        { system: 'http://hl7.org/fhir/sid/us-ssn', value: '999-00-1234' },
        { system: 'http://dmv.example/dl', value: 'DL-ABC-789' },
      ],
    });

    render(<PatientDemographicsCard patient={patient} />);

    const identifierItems = screen.getAllByTestId(
      'demographics-identifier-item',
    );
    expect(identifierItems).toHaveLength(3);
    expect(identifierItems[0]).toHaveTextContent(
      'http://hospital.example/mrn: MRN-12345',
    );
    expect(identifierItems[1]).toHaveTextContent(
      'http://hl7.org/fhir/sid/us-ssn: 999-00-1234',
    );
    expect(identifierItems[2]).toHaveTextContent(
      'http://dmv.example/dl: DL-ABC-789',
    );
  });
});

// ---------------------------------------------------------------------------
// (c) Component handles missing optional fields gracefully
// ---------------------------------------------------------------------------
describe('PatientDemographicsCard handles missing optional fields', () => {
  it('renders gracefully when all optional fields are missing', () => {
    const patient: IPatientResource<string> = {
      resourceType: 'Patient',
    };

    render(<PatientDemographicsCard patient={patient} />);

    // Name fallback
    expect(screen.getByTestId('demographics-name')).toHaveTextContent(
      'Unknown Patient',
    );

    // Birth date fallback
    expect(screen.getByTestId('demographics-birthdate')).toHaveTextContent(
      'Not provided',
    );

    // Gender fallback
    expect(screen.getByTestId('demographics-gender')).toHaveTextContent(
      'Not provided',
    );

    // Identifiers fallback
    expect(
      screen.getByTestId('demographics-identifiers-empty'),
    ).toHaveTextContent('None');

    // Address fallback
    expect(
      screen.getByTestId('demographics-addresses-empty'),
    ).toHaveTextContent('Not provided');

    // Telecom fallback
    expect(screen.getByTestId('demographics-telecoms-empty')).toHaveTextContent(
      'Not provided',
    );
  });

  it('renders gracefully with empty arrays', () => {
    const patient: IPatientResource<string> = {
      resourceType: 'Patient',
      name: [],
      identifier: [],
      address: [],
      telecom: [],
    };

    render(<PatientDemographicsCard patient={patient} />);

    expect(screen.getByTestId('demographics-name')).toHaveTextContent(
      'Unknown Patient',
    );
    expect(
      screen.getByTestId('demographics-identifiers-empty'),
    ).toHaveTextContent('None');
    expect(
      screen.getByTestId('demographics-addresses-empty'),
    ).toHaveTextContent('Not provided');
    expect(screen.getByTestId('demographics-telecoms-empty')).toHaveTextContent(
      'Not provided',
    );
  });

  it('renders name from text field when given/family are missing', () => {
    const patient = makePatient({
      name: [{ text: 'Dr. Jane Doe' }],
    });

    render(<PatientDemographicsCard patient={patient} />);

    expect(screen.getByTestId('demographics-name')).toHaveTextContent(
      'Dr. Jane Doe',
    );
  });
});
