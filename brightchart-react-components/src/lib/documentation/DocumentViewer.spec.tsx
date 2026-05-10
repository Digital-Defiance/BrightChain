/**
 * DocumentViewer Unit Tests
 *
 * Tests composition rendering, document reference rendering, metadata headers,
 * attestation details, section display, attachment rendering, resource links,
 * and empty state.
 */
import type {
  ICompositionResource,
  IDocumentReferenceResource,
} from '@brightchain/brightchart-lib';
import {
  AttestationMode,
  CompositionStatus,
  DocumentReferenceStatus,
} from '@brightchain/brightchart-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { DocumentViewer } from './DocumentViewer';

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
    status: CompositionStatus.Final,
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
    section: [
      {
        title: 'Subjective',
        code: {
          coding: [
            { system: 'http://loinc.org', code: '10164-2', display: 'HPI' },
          ],
        },
        text: {
          status: 'generated' as never,
          div: '<p>Patient reports headache.</p>',
        },
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
        text: { status: 'generated' as never, div: '<p>Migraine.</p>' },
        entry: [
          { reference: 'Condition/123', display: 'Migraine' },
          { reference: 'Observation/456', display: 'Pain Scale' },
        ],
      },
    ],
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
    content: [
      {
        attachment: {
          contentType: 'application/pdf',
          url: 'https://example.com/report.pdf',
          title: 'Lab PDF',
        },
      },
    ],
    ...overrides,
  };
}

describe('DocumentViewer', () => {
  afterEach(() => jest.clearAllMocks());

  describe('empty state', () => {
    it('shows "No document to display" when neither composition nor documentReference provided', () => {
      render(<DocumentViewer />);
      expect(screen.getByRole('status')).toHaveTextContent(
        'No document to display',
      );
    });
  });

  describe('composition rendering', () => {
    it('renders composition metadata header with title, type, date, authors, and status', () => {
      render(<DocumentViewer composition={makeComposition()} />);
      expect(screen.getByText('Visit Note')).toBeInTheDocument();
      expect(screen.getByText('Progress Note')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('Final')).toBeInTheDocument();
    });

    it('renders composition sections with titles and LOINC codes', () => {
      render(<DocumentViewer composition={makeComposition()} />);
      expect(screen.getByText('Subjective')).toBeInTheDocument();
      expect(screen.getByText('10164-2')).toBeInTheDocument();
      expect(screen.getByText('Assessment')).toBeInTheDocument();
      expect(screen.getByText('51848-0')).toBeInTheDocument();
    });

    it('renders section narrative text as HTML', () => {
      const { container } = render(
        <DocumentViewer composition={makeComposition()} />,
      );
      const textDivs = container.querySelectorAll(
        '.document-viewer__section-text',
      );
      expect(textDivs[0].innerHTML).toContain('Patient reports headache.');
      expect(textDivs[1].innerHTML).toContain('Migraine.');
    });

    it('renders section entries as clickable links when onResourceSelect is provided', () => {
      const onResourceSelect = jest.fn();
      render(
        <DocumentViewer
          composition={makeComposition()}
          onResourceSelect={onResourceSelect}
        />,
      );
      const migraineLink = screen.getByRole('button', { name: /Migraine/i });
      fireEvent.click(migraineLink);
      expect(onResourceSelect).toHaveBeenCalledWith({
        reference: 'Condition/123',
        display: 'Migraine',
      });
    });

    it('renders section entries as plain text when onResourceSelect is not provided', () => {
      render(<DocumentViewer composition={makeComposition()} />);
      expect(
        screen.queryByRole('button', { name: /Migraine/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByText('Migraine')).toBeInTheDocument();
    });

    it('renders attestation details when attesters are present', () => {
      const comp = makeComposition({
        attester: [
          {
            mode: AttestationMode.Professional,
            time: '2024-06-15T12:00:00Z',
            party: { display: 'Dr. Jones', reference: 'Practitioner/2' },
          },
        ],
      });
      render(<DocumentViewer composition={comp} />);
      expect(screen.getByText('Dr. Jones')).toBeInTheDocument();
      expect(screen.getByText('(Professional)')).toBeInTheDocument();
    });

    it('composition takes priority over documentReference when both provided', () => {
      render(
        <DocumentViewer
          composition={makeComposition()}
          documentReference={makeDocRef()}
        />,
      );
      expect(screen.getByText('Visit Note')).toBeInTheDocument();
      expect(screen.queryByText('Blood Work Results')).not.toBeInTheDocument();
    });

    it('renders sections with no text gracefully', () => {
      const comp = makeComposition({
        section: [{ title: 'Empty Section' }],
      });
      render(<DocumentViewer composition={comp} />);
      expect(screen.getByText('Empty Section')).toBeInTheDocument();
    });
  });

  describe('documentReference rendering', () => {
    it('renders document reference metadata header', () => {
      render(<DocumentViewer documentReference={makeDocRef()} />);
      expect(screen.getByText('Blood Work Results')).toBeInTheDocument();
      expect(screen.getByText('Lab Report')).toBeInTheDocument();
      expect(screen.getByText('Lab System')).toBeInTheDocument();
      expect(screen.getByText('Current')).toBeInTheDocument();
    });

    it('renders PDF attachment as an object element', () => {
      const { container } = render(
        <DocumentViewer documentReference={makeDocRef()} />,
      );
      const pdfObject = container.querySelector(
        'object[type="application/pdf"]',
      );
      expect(pdfObject).toBeInTheDocument();
      expect(pdfObject).toHaveAttribute(
        'data',
        'https://example.com/report.pdf',
      );
    });

    it('renders image attachment as an img element', () => {
      const docRef = makeDocRef({
        content: [
          {
            attachment: {
              contentType: 'image/png',
              url: 'https://example.com/scan.png',
              title: 'X-Ray Scan',
            },
          },
        ],
      });
      const { container } = render(
        <DocumentViewer documentReference={docRef} />,
      );
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/scan.png');
      expect(img).toHaveAttribute('alt', 'X-Ray Scan');
    });

    it('renders other attachment types with title and download link', () => {
      const docRef = makeDocRef({
        content: [
          {
            attachment: {
              contentType: 'text/plain',
              url: 'https://example.com/notes.txt',
              title: 'Text Notes',
            },
          },
        ],
      });
      render(<DocumentViewer documentReference={docRef} />);
      expect(screen.getByText('Text Notes')).toBeInTheDocument();
      expect(screen.getByText('Download')).toHaveAttribute(
        'href',
        'https://example.com/notes.txt',
      );
    });

    it('renders base64 PDF data as object src', () => {
      const docRef = makeDocRef({
        content: [
          {
            attachment: {
              contentType: 'application/pdf',
              data: 'JVBERi0xLjQ=',
              title: 'Inline PDF',
            },
          },
        ],
      });
      const { container } = render(
        <DocumentViewer documentReference={docRef} />,
      );
      const pdfObject = container.querySelector(
        'object[type="application/pdf"]',
      );
      expect(pdfObject).toBeInTheDocument();
      expect(pdfObject?.getAttribute('data')).toContain(
        'data:application/pdf;base64,',
      );
    });

    it('renders multiple attachments', () => {
      const docRef = makeDocRef({
        content: [
          {
            attachment: {
              contentType: 'application/pdf',
              url: 'https://example.com/a.pdf',
            },
          },
          {
            attachment: {
              contentType: 'image/jpeg',
              url: 'https://example.com/b.jpg',
              title: 'Photo',
            },
          },
        ],
      });
      const { container } = render(
        <DocumentViewer documentReference={docRef} />,
      );
      expect(
        container.querySelector('object[type="application/pdf"]'),
      ).toBeInTheDocument();
      expect(container.querySelector('img')).toBeInTheDocument();
    });
  });

  describe('ARIA and BEM', () => {
    it('has proper ARIA region label', () => {
      render(<DocumentViewer composition={makeComposition()} />);
      expect(screen.getByRole('region')).toHaveAttribute(
        'aria-label',
        'Document Viewer',
      );
    });

    it('applies composition BEM modifier', () => {
      const { container } = render(
        <DocumentViewer composition={makeComposition()} />,
      );
      expect(
        container.querySelector('.document-viewer--composition'),
      ).toBeInTheDocument();
    });

    it('applies document-reference BEM modifier', () => {
      const { container } = render(
        <DocumentViewer documentReference={makeDocRef()} />,
      );
      expect(
        container.querySelector('.document-viewer--document-reference'),
      ).toBeInTheDocument();
    });

    it('applies status BEM modifier on composition header', () => {
      const { container } = render(
        <DocumentViewer
          composition={makeComposition({ status: CompositionStatus.Amended })}
        />,
      );
      expect(
        container.querySelector('.document-viewer__status--amended'),
      ).toBeInTheDocument();
    });
  });
});
