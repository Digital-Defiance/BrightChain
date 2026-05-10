/**
 * DocumentList Unit Tests
 *
 * Tests rendering, filtering, sorting, status display, signed indicators,
 * selection callbacks, and empty state.
 */
import type {
  ICompositionResource,
  IDocumentReferenceResource,
} from '@brightchain/brightchart-lib';
import {
  CompositionStatus,
  DocumentReferenceStatus,
} from '@brightchain/brightchart-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { DocumentList } from './DocumentList';

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
    id: 'comp-1',
    status: CompositionStatus.Preliminary,
    type: {
      text: 'Progress Note',
      coding: [
        {
          system: 'http://loinc.org',
          code: '11506-3',
          display: 'Progress Note',
        },
      ],
    },
    date: '2024-06-15T10:00:00Z',
    title: 'Visit Note',
    author: [{ display: 'Dr. Smith', reference: 'Practitioner/1' }],
    brightchainMetadata: baseMeta,
    ...overrides,
  };
}

function makeDocRef(
  overrides?: Partial<IDocumentReferenceResource<string>>,
): IDocumentReferenceResource<string> {
  return {
    resourceType: 'DocumentReference',
    id: 'docref-1',
    status: DocumentReferenceStatus.Current,
    type: {
      text: 'Lab Report',
      coding: [
        { system: 'http://loinc.org', code: '11502-2', display: 'Lab Report' },
      ],
    },
    date: '2024-06-10T08:00:00Z',
    description: 'Blood Work Results',
    author: [{ display: 'Lab System' }],
    brightchainMetadata: baseMeta,
    content: [{ attachment: { contentType: 'application/pdf' } }],
    ...overrides,
  };
}

describe('DocumentList', () => {
  const noop = jest.fn();

  afterEach(() => jest.clearAllMocks());

  it('renders empty state when no documents provided', () => {
    render(<DocumentList documents={[]} onSelect={noop} />);
    expect(screen.getByRole('status')).toHaveTextContent('No documents found');
  });

  it('renders a list of documents with type, title, date, author, and status', () => {
    const comp = makeComposition();
    const docRef = makeDocRef();
    render(<DocumentList documents={[comp, docRef]} onSelect={noop} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);

    // Composition entry
    expect(screen.getByText('Progress Note')).toBeInTheDocument();
    expect(screen.getByText('Visit Note')).toBeInTheDocument();
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument();

    // DocumentReference entry
    expect(screen.getByText('Lab Report')).toBeInTheDocument();
    expect(screen.getByText('Blood Work Results')).toBeInTheDocument();
    expect(screen.getByText('Lab System')).toBeInTheDocument();
  });

  it('sorts documents by date descending (most recent first)', () => {
    const older = makeComposition({
      id: 'old',
      date: '2024-01-01T00:00:00Z',
      title: 'Older Note',
    });
    const newer = makeComposition({
      id: 'new',
      date: '2024-06-15T00:00:00Z',
      title: 'Newer Note',
    });
    render(<DocumentList documents={[older, newer]} onSelect={noop} />);

    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText('Newer Note')).toBeInTheDocument();
    expect(within(items[1]).getByText('Older Note')).toBeInTheDocument();
  });

  it('calls onSelect with the document when a list item is clicked', () => {
    const onSelect = jest.fn();
    const comp = makeComposition();
    render(<DocumentList documents={[comp]} onSelect={onSelect} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(comp);
  });

  it('filters by type codes', () => {
    const progress = makeComposition({ id: 'p1' });
    const discharge = makeComposition({
      id: 'd1',
      title: 'Discharge Note',
      type: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '18842-5',
            display: 'Discharge Summary',
          },
        ],
      },
    });
    render(
      <DocumentList
        documents={[progress, discharge]}
        onSelect={noop}
        filterTypes={['18842-5']}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(screen.getByText('Discharge Note')).toBeInTheDocument();
  });

  it('filters by status values', () => {
    const draft = makeComposition({
      id: 'draft',
      status: CompositionStatus.Preliminary,
    });
    const signed = makeComposition({
      id: 'signed',
      status: CompositionStatus.Final,
      title: 'Signed Note',
    });
    render(
      <DocumentList
        documents={[draft, signed]}
        onSelect={noop}
        filterStatuses={['final']}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(screen.getByText('Signed Note')).toBeInTheDocument();
  });

  it('shows empty state when filters exclude all documents', () => {
    const comp = makeComposition();
    render(
      <DocumentList
        documents={[comp]}
        onSelect={noop}
        filterTypes={['nonexistent-code']}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('No documents found');
  });

  it('displays Draft label for preliminary status', () => {
    render(<DocumentList documents={[makeComposition()]} onSelect={noop} />);
    expect(screen.getByText('Preliminary')).toBeInTheDocument();
  });

  it('displays Signed label for final status', () => {
    const comp = makeComposition({ status: CompositionStatus.Final });
    render(<DocumentList documents={[comp]} onSelect={noop} />);
    expect(screen.getByText('Final')).toBeInTheDocument();
  });

  it('displays Amended label for amended status', () => {
    const comp = makeComposition({ status: CompositionStatus.Amended });
    render(<DocumentList documents={[comp]} onSelect={noop} />);
    expect(screen.getByText('Amended')).toBeInTheDocument();
  });

  it('displays Error label for entered-in-error status', () => {
    const comp = makeComposition({ status: CompositionStatus.EnteredInError });
    render(<DocumentList documents={[comp]} onSelect={noop} />);
    expect(screen.getByText('Entered in Error')).toBeInTheDocument();
  });

  it('displays Current label for current DocumentReference status', () => {
    render(<DocumentList documents={[makeDocRef()]} onSelect={noop} />);
    expect(screen.getByText('Current')).toBeInTheDocument();
  });

  it('displays Superseded label for superseded DocumentReference status', () => {
    const docRef = makeDocRef({ status: DocumentReferenceStatus.Superseded });
    render(<DocumentList documents={[docRef]} onSelect={noop} />);
    expect(screen.getByText('Superseded')).toBeInTheDocument();
  });

  it('shows signed badge (✓) for compositions with status final', () => {
    const comp = makeComposition({ status: CompositionStatus.Final });
    render(<DocumentList documents={[comp]} onSelect={noop} />);
    expect(screen.getByLabelText('Signed')).toHaveTextContent('✓');
  });

  it('shows signed badge for compositions with attesters', () => {
    const comp = makeComposition({
      status: CompositionStatus.Preliminary,
      attester: [
        {
          mode: 'professional' as never,
          time: '2024-06-15T10:00:00Z',
          party: { reference: 'Practitioner/1' },
        },
      ],
    });
    render(<DocumentList documents={[comp]} onSelect={noop} />);
    expect(screen.getByLabelText('Signed')).toHaveTextContent('✓');
  });

  it('does not show signed badge for DocumentReference resources', () => {
    const docRef = makeDocRef();
    render(<DocumentList documents={[docRef]} onSelect={noop} />);
    expect(screen.queryByLabelText('Signed')).not.toBeInTheDocument();
  });

  it('does not show signed badge for preliminary compositions without attesters', () => {
    const comp = makeComposition({ status: CompositionStatus.Preliminary });
    render(<DocumentList documents={[comp]} onSelect={noop} />);
    expect(screen.queryByLabelText('Signed')).not.toBeInTheDocument();
  });

  it('uses description as title for DocumentReference', () => {
    const docRef = makeDocRef({ description: 'MRI Scan Report' });
    render(<DocumentList documents={[docRef]} onSelect={noop} />);
    expect(screen.getByText('MRI Scan Report')).toBeInTheDocument();
  });

  it('shows Untitled when composition has no title', () => {
    const comp = makeComposition({ title: '' });
    render(<DocumentList documents={[comp]} onSelect={noop} />);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('shows Untitled when DocumentReference has no description', () => {
    const docRef = makeDocRef({ description: undefined });
    render(<DocumentList documents={[docRef]} onSelect={noop} />);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('falls back to author reference when display is not available', () => {
    const comp = makeComposition({
      author: [{ reference: 'Practitioner/42' }],
    });
    render(<DocumentList documents={[comp]} onSelect={noop} />);
    expect(screen.getByText('Practitioner/42')).toBeInTheDocument();
  });

  it('uses type coding display when type text is not available', () => {
    const comp = makeComposition({
      type: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '11506-3',
            display: 'Progress Note',
          },
        ],
      },
    });
    render(<DocumentList documents={[comp]} onSelect={noop} />);
    expect(screen.getByText('Progress Note')).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    render(<DocumentList documents={[makeComposition()]} onSelect={noop} />);
    expect(screen.getByRole('region')).toHaveAttribute(
      'aria-label',
      'Document List',
    );
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('applies status-specific BEM modifier classes', () => {
    const comp = makeComposition({ status: CompositionStatus.Final });
    const { container } = render(
      <DocumentList documents={[comp]} onSelect={noop} />,
    );
    const item = container.querySelector('.document-list__item--signed');
    expect(item).toBeInTheDocument();
  });
});
