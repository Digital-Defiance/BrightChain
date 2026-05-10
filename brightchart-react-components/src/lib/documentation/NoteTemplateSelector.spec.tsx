/**
 * NoteTemplateSelector Unit Tests
 *
 * Tests template grouping by document type, section preview display,
 * specialty filtering, onSelect callback, and empty state.
 */
import type {
  INoteTemplate,
  ISpecialtyProfile,
} from '@brightchain/brightchart-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { NoteTemplateSelector } from './NoteTemplateSelector';

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
    currentLanguage: 'en-US',
  }),
}));

const LOINC = 'http://loinc.org';

function makeTemplate(overrides?: Partial<INoteTemplate>): INoteTemplate {
  return {
    templateId: 'tpl-1',
    name: 'SOAP Note',
    description: 'Standard SOAP format',
    loincTypeCode: '11506-3',
    specialtyCode: 'medical',
    isDefault: true,
    sections: [
      {
        title: 'Subjective',
        code: { coding: [{ system: LOINC, code: '10164-2', display: 'HPI' }] },
        required: true,
      },
      {
        title: 'Objective',
        code: { coding: [{ system: LOINC, code: '29545-1', display: 'PE' }] },
        required: true,
      },
      {
        title: 'Assessment',
        code: {
          coding: [{ system: LOINC, code: '51848-0', display: 'Assessment' }],
        },
        required: true,
      },
      {
        title: 'Plan',
        code: { coding: [{ system: LOINC, code: '18776-5', display: 'Plan' }] },
        required: true,
      },
    ],
    ...overrides,
  };
}

const medicalProfile: ISpecialtyProfile = {
  specialtyCode: 'medical',
  displayName: 'BrightChart Medical',
  terminologySets: [],
  resourceExtensions: [],
  validationRules: [],
};

const dentalProfile: ISpecialtyProfile = {
  specialtyCode: 'dental',
  displayName: 'BrightChart Dental',
  terminologySets: [],
  resourceExtensions: [],
  validationRules: [],
};

describe('NoteTemplateSelector', () => {
  it('renders empty state when no templates provided', () => {
    render(<NoteTemplateSelector templates={[]} onSelect={jest.fn()} />);
    expect(screen.getByText('No templates available')).toBeInTheDocument();
  });

  it('renders templates grouped by loincTypeCode', () => {
    const templates = [
      makeTemplate({
        templateId: 'soap',
        name: 'SOAP Note',
        loincTypeCode: '11506-3',
      }),
      makeTemplate({
        templateId: 'hp',
        name: 'History & Physical',
        loincTypeCode: '34117-2',
      }),
      makeTemplate({
        templateId: 'proc',
        name: 'Procedure Note',
        loincTypeCode: '28570-0',
      }),
    ];

    render(<NoteTemplateSelector templates={templates} onSelect={jest.fn()} />);

    // Each loincTypeCode should appear as a group heading
    expect(screen.getByText('11506-3')).toBeInTheDocument();
    expect(screen.getByText('34117-2')).toBeInTheDocument();
    expect(screen.getByText('28570-0')).toBeInTheDocument();
  });

  it('groups multiple templates under the same document type', () => {
    const templates = [
      makeTemplate({
        templateId: 'soap',
        name: 'SOAP Note',
        loincTypeCode: '11506-3',
      }),
      makeTemplate({
        templateId: 'brief',
        name: 'Brief Progress',
        loincTypeCode: '11506-3',
      }),
    ];

    render(<NoteTemplateSelector templates={templates} onSelect={jest.fn()} />);

    // One group heading for 11506-3
    const headings = screen.getAllByText('11506-3');
    expect(headings).toHaveLength(1);

    // Both template names visible
    expect(screen.getByText('SOAP Note')).toBeInTheDocument();
    expect(screen.getByText('Brief Progress')).toBeInTheDocument();
  });

  it('displays template name, description, and section summary', () => {
    const template = makeTemplate({
      templateId: 'soap',
      name: 'SOAP Note',
      description: 'Standard SOAP format',
    });

    render(
      <NoteTemplateSelector templates={[template]} onSelect={jest.fn()} />,
    );

    expect(screen.getByText('SOAP Note')).toBeInTheDocument();
    expect(screen.getByText('Standard SOAP format')).toBeInTheDocument();
    expect(
      screen.getByText('Subjective, Objective, Assessment, Plan'),
    ).toBeInTheDocument();
  });

  it('calls onSelect with the template when a card is clicked', () => {
    const onSelect = jest.fn();
    const template = makeTemplate({ templateId: 'soap', name: 'SOAP Note' });

    render(<NoteTemplateSelector templates={[template]} onSelect={onSelect} />);

    fireEvent.click(
      screen.getByRole('button', { name: /Select template: SOAP Note/i }),
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(template);
  });

  it('filters templates by specialtyProfile when provided', () => {
    const templates = [
      makeTemplate({
        templateId: 'soap',
        name: 'SOAP Note',
        specialtyCode: 'medical',
      }),
      makeTemplate({
        templateId: 'dental-exam',
        name: 'Dental Exam',
        specialtyCode: 'dental',
      }),
    ];

    render(
      <NoteTemplateSelector
        templates={templates}
        specialtyProfile={medicalProfile}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByText('SOAP Note')).toBeInTheDocument();
    expect(screen.queryByText('Dental Exam')).not.toBeInTheDocument();
  });

  it('shows empty state when specialty filter excludes all templates', () => {
    const templates = [
      makeTemplate({
        templateId: 'soap',
        name: 'SOAP Note',
        specialtyCode: 'medical',
      }),
    ];

    render(
      <NoteTemplateSelector
        templates={templates}
        specialtyProfile={dentalProfile}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByText('No templates available')).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    const template = makeTemplate({ templateId: 'soap', name: 'SOAP Note' });

    render(
      <NoteTemplateSelector templates={[template]} onSelect={jest.fn()} />,
    );

    expect(
      screen.getByRole('region', { name: 'Note Template Selector' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: /Document type 11506-3/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('renders without specialtyProfile (shows all templates)', () => {
    const templates = [
      makeTemplate({
        templateId: 'soap',
        name: 'SOAP Note',
        specialtyCode: 'medical',
      }),
      makeTemplate({
        templateId: 'dental-exam',
        name: 'Dental Exam',
        specialtyCode: 'dental',
      }),
    ];

    render(<NoteTemplateSelector templates={templates} onSelect={jest.fn()} />);

    expect(screen.getByText('SOAP Note')).toBeInTheDocument();
    expect(screen.getByText('Dental Exam')).toBeInTheDocument();
  });
});
