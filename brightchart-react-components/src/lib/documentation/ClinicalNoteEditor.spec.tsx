/**
 * ClinicalNoteEditor Unit Tests
 *
 * Tests rendering, section collapsing, status indicators, save/sign callbacks,
 * template initialization, and empty state.
 */
import type {
  ICompositionResource,
  INoteTemplate,
} from '@brightchain/brightchart-lib';
import {
  CompositionStatus,
  NarrativeStatus,
} from '@brightchain/brightchart-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClinicalNoteEditor } from './ClinicalNoteEditor';

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
    currentLanguage: 'en-US',
  }),
}));

const baseMeta = {
  blockId: '',
  creatorMemberId: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  poolId: '',
  encryptionType: 0 as never,
};

function makeComposition(
  overrides?: Partial<ICompositionResource<string>>,
): ICompositionResource<string> {
  return {
    resourceType: 'Composition',
    status: CompositionStatus.Preliminary,
    type: { text: 'Progress Note' },
    date: '2024-01-01T00:00:00Z',
    title: 'Test Note',
    author: [],
    brightchainMetadata: baseMeta,
    section: [
      {
        title: 'Subjective',
        code: {
          coding: [
            { system: 'http://loinc.org', code: '10164-2', display: 'HPI' },
          ],
        },
        text: {
          status: NarrativeStatus.Generated,
          div: 'Patient reports headache.',
        },
      },
      {
        title: 'Objective',
        code: {
          coding: [
            { system: 'http://loinc.org', code: '29545-1', display: 'PE' },
          ],
        },
        text: { status: NarrativeStatus.Generated, div: 'BP 120/80.' },
      },
    ],
    ...overrides,
  };
}

function makeTemplate(): INoteTemplate {
  return {
    templateId: 'soap-1',
    name: 'SOAP Note',
    description: 'Standard SOAP note',
    loincTypeCode: '11506-3',
    specialtyCode: 'medical',
    isDefault: true,
    sections: [
      {
        title: 'Subjective',
        code: {
          coding: [
            { system: 'http://loinc.org', code: '10164-2', display: 'HPI' },
          ],
        },
        required: true,
        defaultText: 'Enter subjective findings...',
      },
      {
        title: 'Assessment',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '51848-0',
              display: 'Assessment',
            },
          ],
        },
        required: true,
      },
    ],
  };
}

describe('ClinicalNoteEditor', () => {
  const noop = jest.fn();

  afterEach(() => jest.clearAllMocks());

  it('renders empty state when no composition or template provided', () => {
    render(<ClinicalNoteEditor onSave={noop} onSign={noop} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'No composition or template provided',
    );
  });

  it('renders sections from a composition', () => {
    const comp = makeComposition();
    render(
      <ClinicalNoteEditor composition={comp} onSave={noop} onSign={noop} />,
    );
    expect(screen.getByText(/Subjective/)).toBeInTheDocument();
    expect(screen.getByText(/Objective/)).toBeInTheDocument();
    expect(screen.getByLabelText('Subjective text')).toHaveValue(
      'Patient reports headache.',
    );
    expect(screen.getByLabelText('Objective text')).toHaveValue('BP 120/80.');
  });

  it('renders sections from a template when no composition provided', () => {
    const tmpl = makeTemplate();
    render(<ClinicalNoteEditor template={tmpl} onSave={noop} onSign={noop} />);
    expect(screen.getByText(/Subjective/)).toBeInTheDocument();
    expect(screen.getByText(/Assessment/)).toBeInTheDocument();
    expect(screen.getByLabelText('Subjective text')).toHaveValue(
      'Enter subjective findings...',
    );
    expect(screen.getByLabelText('Assessment text')).toHaveValue('');
  });

  it('shows Draft status badge for preliminary composition', () => {
    render(
      <ClinicalNoteEditor
        composition={makeComposition()}
        onSave={noop}
        onSign={noop}
      />,
    );
    const badge = screen.getByLabelText('Note status: Preliminary');
    expect(badge).toHaveTextContent('Preliminary');
  });

  it('shows Signed status badge with checkmark for final composition', () => {
    const comp = makeComposition({ status: CompositionStatus.Final });
    render(
      <ClinicalNoteEditor composition={comp} onSave={noop} onSign={noop} />,
    );
    const badge = screen.getByLabelText('Note status: Final');
    expect(badge).toHaveTextContent('✓');
    expect(badge).toHaveTextContent('Final');
  });

  it('shows Amended status badge for amended composition', () => {
    const comp = makeComposition({ status: CompositionStatus.Amended });
    render(
      <ClinicalNoteEditor composition={comp} onSave={noop} onSign={noop} />,
    );
    expect(screen.getByLabelText('Note status: Amended')).toHaveTextContent(
      'Amended',
    );
  });

  it('shows Error status badge for entered-in-error composition', () => {
    const comp = makeComposition({ status: CompositionStatus.EnteredInError });
    render(
      <ClinicalNoteEditor composition={comp} onSave={noop} onSign={noop} />,
    );
    expect(
      screen.getByLabelText('Note status: Entered in Error'),
    ).toHaveTextContent('Entered in Error');
  });

  it('sign button is enabled for preliminary status', () => {
    render(
      <ClinicalNoteEditor
        composition={makeComposition()}
        onSave={noop}
        onSign={noop}
      />,
    );
    expect(screen.getByText('Sign')).not.toBeDisabled();
  });

  it('sign button is disabled for non-preliminary status', () => {
    const comp = makeComposition({ status: CompositionStatus.Final });
    render(
      <ClinicalNoteEditor composition={comp} onSave={noop} onSign={noop} />,
    );
    expect(screen.getByText('Sign')).toBeDisabled();
  });

  it('calls onSave with composition when Save is clicked', () => {
    const onSave = jest.fn();
    render(
      <ClinicalNoteEditor
        composition={makeComposition()}
        onSave={onSave}
        onSign={noop}
      />,
    );
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0] as ICompositionResource<string>;
    expect(saved.resourceType).toBe('Composition');
    expect(saved.section).toHaveLength(2);
  });

  it('calls onSign with composition when Sign is clicked', () => {
    const onSign = jest.fn();
    render(
      <ClinicalNoteEditor
        composition={makeComposition()}
        onSave={noop}
        onSign={onSign}
      />,
    );
    fireEvent.click(screen.getByText('Sign'));
    expect(onSign).toHaveBeenCalledTimes(1);
    const signed = onSign.mock.calls[0][0] as ICompositionResource<string>;
    expect(signed.resourceType).toBe('Composition');
  });

  it('collapses and expands sections on header click', () => {
    render(
      <ClinicalNoteEditor
        composition={makeComposition()}
        onSave={noop}
        onSign={noop}
      />,
    );
    const subjectiveHeader = screen.getByRole('button', { name: /Subjective/ });
    // Initially expanded
    expect(subjectiveHeader).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Subjective text')).toBeInTheDocument();

    // Collapse
    fireEvent.click(subjectiveHeader);
    expect(subjectiveHeader).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Subjective text')).not.toBeInTheDocument();

    // Re-expand
    fireEvent.click(subjectiveHeader);
    expect(subjectiveHeader).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Subjective text')).toBeInTheDocument();
  });

  it('updates section text on textarea change', () => {
    const onSave = jest.fn();
    render(
      <ClinicalNoteEditor
        composition={makeComposition()}
        onSave={onSave}
        onSign={noop}
      />,
    );
    const textarea = screen.getByLabelText('Subjective text');
    fireEvent.change(textarea, { target: { value: 'Updated text' } });
    expect(textarea).toHaveValue('Updated text');

    // Verify the updated text is included in the saved composition
    fireEvent.click(screen.getByText('Save'));
    const saved = onSave.mock.calls[0][0] as ICompositionResource<string>;
    expect(saved.section?.[0]?.text?.div).toBe('Updated text');
  });

  it('displays LOINC section codes', () => {
    render(
      <ClinicalNoteEditor
        composition={makeComposition()}
        onSave={noop}
        onSign={noop}
      />,
    );
    expect(screen.getByText('10164-2')).toBeInTheDocument();
    expect(screen.getByText('29545-1')).toBeInTheDocument();
  });

  it('prefers composition over template when both provided', () => {
    const comp = makeComposition();
    const tmpl = makeTemplate();
    render(
      <ClinicalNoteEditor
        composition={comp}
        template={tmpl}
        onSave={noop}
        onSign={noop}
      />,
    );
    // Should show composition sections (Subjective + Objective), not template sections (Subjective + Assessment)
    expect(screen.getByText(/Objective/)).toBeInTheDocument();
    expect(screen.queryByText(/Assessment/)).not.toBeInTheDocument();
  });
});
