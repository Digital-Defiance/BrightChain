/**
 * Unit tests for PatientCreateEditForm component.
 *
 * Validates: Requirements 10.3, 10.6
 */
import type { IPatientResource } from '@brightchain/brightchart-lib';
import { AdministrativeGender } from '@brightchain/brightchart-lib';
import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PatientCreateEditForm } from '../PatientCreateEditForm';

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
    id: 'existing-patient-1',
    name: [{ family: 'Smith', given: ['John'] }],
    birthDate: '1990-05-15',
    gender: AdministrativeGender.Male,
    identifier: [{ system: 'http://hospital.example/mrn', value: 'MRN-12345' }],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// (a) Form renders all required fields
// ---------------------------------------------------------------------------
describe('PatientCreateEditForm renders all required fields', () => {
  it('renders family name, given name, gender, birthDate, identifier system, identifier value, and submit button', () => {
    const onSubmit = jest.fn();
    render(<PatientCreateEditForm onSubmit={onSubmit} />);

    expect(screen.getByLabelText(/family name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/given name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/birth date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/identifier system/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/identifier value/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create patient/i }),
    ).toBeInTheDocument();
  });

  it('renders the form with proper accessibility attributes in create mode', () => {
    const onSubmit = jest.fn();
    render(<PatientCreateEditForm onSubmit={onSubmit} />);

    const form = screen.getByTestId('patient-create-edit-form');
    expect(form).toHaveAttribute('aria-label', 'Create patient form');
  });

  it('marks required fields with aria-required', () => {
    const onSubmit = jest.fn();
    render(<PatientCreateEditForm onSubmit={onSubmit} />);

    expect(screen.getByLabelText(/family name/i)).toHaveAttribute(
      'aria-required',
      'true',
    );
    expect(screen.getByLabelText(/gender/i)).toHaveAttribute(
      'aria-required',
      'true',
    );
    expect(screen.getByLabelText(/birth date/i)).toHaveAttribute(
      'aria-required',
      'true',
    );
  });
});

// ---------------------------------------------------------------------------
// (b) Validation errors display for invalid input
// ---------------------------------------------------------------------------
describe('PatientCreateEditForm validation errors', () => {
  it('shows error when family name is empty', () => {
    const onSubmit = jest.fn();
    render(<PatientCreateEditForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /create patient/i }));

    expect(screen.getByTestId('error-family-name')).toHaveTextContent(
      'Family name is required',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows error when gender is not selected', () => {
    const onSubmit = jest.fn();
    render(<PatientCreateEditForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /create patient/i }));

    expect(screen.getByTestId('error-gender')).toHaveTextContent(
      'Gender is required',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows error when birth date is empty', () => {
    const onSubmit = jest.fn();
    render(<PatientCreateEditForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /create patient/i }));

    expect(screen.getByTestId('error-birth-date')).toHaveTextContent(
      'Birth date is required',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows error when birth date is not in YYYY-MM-DD format', () => {
    const onSubmit = jest.fn();
    render(<PatientCreateEditForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/family name/i), {
      target: { value: 'Smith' },
    });
    fireEvent.change(screen.getByLabelText(/gender/i), {
      target: { value: 'male' },
    });
    fireEvent.change(screen.getByLabelText(/birth date/i), {
      target: { value: '01/15/1990' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create patient/i }));

    expect(screen.getByTestId('error-birth-date')).toHaveTextContent(
      'YYYY-MM-DD',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows error when identifier system is not a valid URI', () => {
    const onSubmit = jest.fn();
    render(<PatientCreateEditForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/family name/i), {
      target: { value: 'Smith' },
    });
    fireEvent.change(screen.getByLabelText(/gender/i), {
      target: { value: 'male' },
    });
    fireEvent.change(screen.getByLabelText(/birth date/i), {
      target: { value: '1990-01-15' },
    });
    fireEvent.change(screen.getByLabelText(/identifier system/i), {
      target: { value: 'not-a-uri' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create patient/i }));

    expect(screen.getByTestId('error-identifier-system')).toHaveTextContent(
      'valid URI',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validation errors have role="alert" for accessibility', () => {
    const onSubmit = jest.fn();
    render(<PatientCreateEditForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /create patient/i }));

    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThanOrEqual(3); // familyName, gender, birthDate
  });
});

// ---------------------------------------------------------------------------
// (c) onSubmit fires with valid IPatientResource
// ---------------------------------------------------------------------------
describe('PatientCreateEditForm onSubmit', () => {
  it('fires onSubmit with a valid IPatientResource when all required fields are filled', () => {
    const onSubmit = jest.fn();
    render(<PatientCreateEditForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/family name/i), {
      target: { value: 'Doe' },
    });
    fireEvent.change(screen.getByLabelText(/given name/i), {
      target: { value: 'Jane' },
    });
    fireEvent.change(screen.getByLabelText(/gender/i), {
      target: { value: 'female' },
    });
    fireEvent.change(screen.getByLabelText(/birth date/i), {
      target: { value: '1985-06-20' },
    });
    fireEvent.change(screen.getByLabelText(/identifier system/i), {
      target: { value: 'http://hospital.example/mrn' },
    });
    fireEvent.change(screen.getByLabelText(/identifier value/i), {
      target: { value: 'MRN-999' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create patient/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0] as IPatientResource<string>;
    expect(submitted.resourceType).toBe('Patient');
    expect(submitted.name?.[0]?.family).toBe('Doe');
    expect(submitted.name?.[0]?.given).toEqual(['Jane']);
    expect(submitted.gender).toBe('female');
    expect(submitted.birthDate).toBe('1985-06-20');
    expect(submitted.identifier?.[0]?.system).toBe(
      'http://hospital.example/mrn',
    );
    expect(submitted.identifier?.[0]?.value).toBe('MRN-999');
  });

  it('omits identifier when neither system nor value is provided', () => {
    const onSubmit = jest.fn();
    render(<PatientCreateEditForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/family name/i), {
      target: { value: 'Doe' },
    });
    fireEvent.change(screen.getByLabelText(/gender/i), {
      target: { value: 'male' },
    });
    fireEvent.change(screen.getByLabelText(/birth date/i), {
      target: { value: '1985-06-20' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create patient/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0] as IPatientResource<string>;
    expect(submitted.identifier).toBeUndefined();
  });

  it('omits given name when not provided', () => {
    const onSubmit = jest.fn();
    render(<PatientCreateEditForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/family name/i), {
      target: { value: 'Solo' },
    });
    fireEvent.change(screen.getByLabelText(/gender/i), {
      target: { value: 'other' },
    });
    fireEvent.change(screen.getByLabelText(/birth date/i), {
      target: { value: '2000-01-01' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create patient/i }));

    const submitted = onSubmit.mock.calls[0][0] as IPatientResource<string>;
    expect(submitted.name?.[0]?.given).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// (d) Edit mode pre-populates fields
// ---------------------------------------------------------------------------
describe('PatientCreateEditForm edit mode', () => {
  it('pre-populates all fields from existing patient', () => {
    const onSubmit = jest.fn();
    const patient = makePatient();
    render(<PatientCreateEditForm patient={patient} onSubmit={onSubmit} />);

    expect(screen.getByLabelText(/family name/i)).toHaveValue('Smith');
    expect(screen.getByLabelText(/given name/i)).toHaveValue('John');
    expect(screen.getByLabelText(/gender/i)).toHaveValue('male');
    expect(screen.getByLabelText(/birth date/i)).toHaveValue('1990-05-15');
    expect(screen.getByLabelText(/identifier system/i)).toHaveValue(
      'http://hospital.example/mrn',
    );
    expect(screen.getByLabelText(/identifier value/i)).toHaveValue('MRN-12345');
  });

  it('shows "Update Patient" button in edit mode', () => {
    const onSubmit = jest.fn();
    const patient = makePatient();
    render(<PatientCreateEditForm patient={patient} onSubmit={onSubmit} />);

    expect(
      screen.getByRole('button', { name: /update patient/i }),
    ).toBeInTheDocument();
  });

  it('sets aria-label to "Edit patient form" in edit mode', () => {
    const onSubmit = jest.fn();
    const patient = makePatient();
    render(<PatientCreateEditForm patient={patient} onSubmit={onSubmit} />);

    const form = screen.getByTestId('patient-create-edit-form');
    expect(form).toHaveAttribute('aria-label', 'Edit patient form');
  });

  it('preserves patient id on submit in edit mode', () => {
    const onSubmit = jest.fn();
    const patient = makePatient();
    render(<PatientCreateEditForm patient={patient} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /update patient/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0] as IPatientResource<string>;
    expect(submitted.id).toBe('existing-patient-1');
  });
});
