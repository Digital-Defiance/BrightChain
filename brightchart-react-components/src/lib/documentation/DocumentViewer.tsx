/**
 * DocumentViewer Component
 *
 * Displays clinical documents in a read-only format. Renders FHIR R4
 * Composition sections with narrative text, or DocumentReference
 * attachments (PDF, image, or download link). Shows metadata header
 * with title, type, date, author(s), status, and attestation details.
 *
 * @module documentation/DocumentViewer
 */
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import type {
  CompositionAttester,
  CompositionSection,
  IAttachment,
  ICompositionResource,
  IDocumentReferenceResource,
  IReference,
} from '@brightchain/brightchart-lib';
import {
  AttestationMode,
  CompositionStatus,
  DocumentReferenceStatus,
} from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface DocumentViewerProps {
  /** Composition to display in read-only section view */
  composition?: ICompositionResource<string>;
  /** DocumentReference to display attachment content */
  documentReference?: IDocumentReferenceResource<string>;
  /** Callback when a linked resource reference is clicked */
  onResourceSelect?: (reference: IReference<string>) => void;
}

/** Extract display text from a type CodeableConcept */
function getTypeDisplay(type?: {
  text?: string;
  coding?: { display?: string }[];
}): string {
  if (!type) return '';
  return type.text ?? type.coding?.[0]?.display ?? '';
}

/** Extract author display names from an array of references */
function getAuthorDisplays(authors?: IReference<string>[]): string[] {
  if (!authors || authors.length === 0) return [];
  return authors.map((a) => a.display ?? a.reference ?? 'Unknown');
}

/** Map status to a BEM modifier */
function getStatusModifier(status: string): string {
  switch (status) {
    case 'preliminary':
      return 'draft';
    case 'final':
      return 'signed';
    case 'amended':
      return 'amended';
    case 'entered-in-error':
      return 'error';
    case 'current':
      return 'current';
    case 'superseded':
      return 'superseded';
    default:
      return 'unknown';
  }
}

/** Render attestation details for a composition */
const AttestationDetails: React.FC<{
  attesters: CompositionAttester<string>[];
}> = ({ attesters }) => {
  const { tEnum } = useBrightChartTranslation();
  const { formatDateTime } = useFormattedDate();

  if (attesters.length === 0) return null;

  return (
    <div className="document-viewer__attestations">
      <span className="document-viewer__attestations-label">Attestations:</span>
      <ul className="document-viewer__attestation-list" role="list">
        {attesters.map((att, idx) => (
          <li key={idx} className="document-viewer__attestation-item">
            <span className="document-viewer__attestation-signer">
              {att.party?.display ?? att.party?.reference ?? 'Unknown'}
            </span>
            <span className="document-viewer__attestation-mode">
              ({tEnum(AttestationMode, att.mode as AttestationMode)})
            </span>
            {att.time && (
              <span className="document-viewer__attestation-time">
                {formatDateTime(att.time)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Render a single composition section in read-only format */
const SectionView: React.FC<{
  section: CompositionSection<string>;
  onResourceSelect?: (reference: IReference<string>) => void;
  index: number;
}> = ({ section, onResourceSelect, index }) => {
  const sectionCode = section.code?.coding?.[0]?.code;
  const sectionCodeDisplay = section.code?.coding?.[0]?.display;

  return (
    <div
      className="document-viewer__section"
      role="group"
      aria-label={section.title ?? `Section ${index + 1}`}
    >
      <div className="document-viewer__section-header">
        <h3 className="document-viewer__section-title">
          {section.title ?? 'Untitled Section'}
        </h3>
        {sectionCode && (
          <span
            className="document-viewer__section-code"
            title={sectionCodeDisplay}
          >
            {sectionCode}
          </span>
        )}
      </div>

      {section.text?.div && (
        <div
          className="document-viewer__section-text"
          dangerouslySetInnerHTML={{ __html: section.text.div }}
        />
      )}

      {section.entry && section.entry.length > 0 && (
        <ul className="document-viewer__section-entries" role="list">
          {section.entry.map((entry, entryIdx) => (
            <li key={entryIdx} className="document-viewer__section-entry">
              {onResourceSelect ? (
                <button
                  type="button"
                  className="document-viewer__resource-link"
                  onClick={() => onResourceSelect(entry)}
                  aria-label={`View ${entry.display ?? entry.reference ?? 'resource'}`}
                >
                  {entry.display ?? entry.reference ?? 'Resource'}
                </button>
              ) : (
                <span className="document-viewer__resource-ref">
                  {entry.display ?? entry.reference ?? 'Resource'}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {section.section && section.section.length > 0 && (
        <div className="document-viewer__subsections">
          {section.section.map((sub, subIdx) => (
            <SectionView
              key={subIdx}
              section={sub}
              onResourceSelect={onResourceSelect}
              index={subIdx}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/** Render an attachment based on its content type */
const AttachmentView: React.FC<{ attachment: IAttachment }> = ({
  attachment,
}) => {
  const contentType = attachment.contentType ?? '';
  const src =
    attachment.url ??
    (attachment.data
      ? `data:${contentType};base64,${attachment.data}`
      : undefined);

  if (contentType.startsWith('application/pdf') && src) {
    return (
      <div className="document-viewer__attachment document-viewer__attachment--pdf">
        <object
          data={src}
          type="application/pdf"
          className="document-viewer__pdf-object"
          aria-label={attachment.title ?? 'PDF document'}
        >
          <p>
            Unable to display PDF.{' '}
            <a href={src} target="_blank" rel="noopener noreferrer">
              Download PDF
            </a>
          </p>
        </object>
      </div>
    );
  }

  if (contentType.startsWith('image/') && src) {
    return (
      <div className="document-viewer__attachment document-viewer__attachment--image">
        <img
          src={src}
          alt={attachment.title ?? 'Document image'}
          className="document-viewer__image"
        />
      </div>
    );
  }

  return (
    <div className="document-viewer__attachment document-viewer__attachment--other">
      <span className="document-viewer__attachment-title">
        {attachment.title ?? 'Attachment'}
      </span>
      {src && (
        <a
          href={src}
          className="document-viewer__download-link"
          target="_blank"
          rel="noopener noreferrer"
          download={attachment.title}
        >
          Download
        </a>
      )}
    </div>
  );
};

/** Composition metadata header */
const CompositionHeader: React.FC<{
  composition: ICompositionResource<string>;
}> = ({ composition }) => {
  const { tEnum } = useBrightChartTranslation();
  const { formatDateTime } = useFormattedDate();
  const typeDisplay = getTypeDisplay(composition.type);
  const authors = getAuthorDisplays(composition.author);
  const statusMod = getStatusModifier(composition.status);

  /** Map status to a display label using i18n */
  function getStatusLabel(status: string): string {
    if (
      Object.values(CompositionStatus).includes(status as CompositionStatus)
    ) {
      return tEnum(CompositionStatus, status as CompositionStatus);
    }
    if (
      Object.values(DocumentReferenceStatus).includes(
        status as DocumentReferenceStatus,
      )
    ) {
      return tEnum(DocumentReferenceStatus, status as DocumentReferenceStatus);
    }
    return status;
  }

  return (
    <header className="document-viewer__header" role="banner">
      <h2 className="document-viewer__title">{composition.title}</h2>
      {typeDisplay && (
        <span className="document-viewer__type">{typeDisplay}</span>
      )}
      <span className="document-viewer__date">
        {composition.date ? formatDateTime(composition.date) : ''}
      </span>
      {authors.length > 0 && (
        <span className="document-viewer__authors">{authors.join(', ')}</span>
      )}
      <span
        className={`document-viewer__status document-viewer__status--${statusMod}`}
        role="status"
      >
        {getStatusLabel(composition.status)}
      </span>
      {composition.attester && composition.attester.length > 0 && (
        <AttestationDetails attesters={composition.attester} />
      )}
    </header>
  );
};

/** DocumentReference metadata header */
const DocumentReferenceHeader: React.FC<{
  documentReference: IDocumentReferenceResource<string>;
}> = ({ documentReference }) => {
  const { tEnum } = useBrightChartTranslation();
  const { formatDateTime } = useFormattedDate();
  const typeDisplay = getTypeDisplay(documentReference.type);
  const authors = getAuthorDisplays(documentReference.author);
  const statusMod = getStatusModifier(documentReference.status);

  /** Map status to a display label using i18n */
  function getStatusLabel(status: string): string {
    if (
      Object.values(CompositionStatus).includes(status as CompositionStatus)
    ) {
      return tEnum(CompositionStatus, status as CompositionStatus);
    }
    if (
      Object.values(DocumentReferenceStatus).includes(
        status as DocumentReferenceStatus,
      )
    ) {
      return tEnum(DocumentReferenceStatus, status as DocumentReferenceStatus);
    }
    return status;
  }

  return (
    <header className="document-viewer__header" role="banner">
      {documentReference.description && (
        <h2 className="document-viewer__title">
          {documentReference.description}
        </h2>
      )}
      {typeDisplay && (
        <span className="document-viewer__type">{typeDisplay}</span>
      )}
      <span className="document-viewer__date">
        {documentReference.date ? formatDateTime(documentReference.date) : ''}
      </span>
      {authors.length > 0 && (
        <span className="document-viewer__authors">{authors.join(', ')}</span>
      )}
      <span
        className={`document-viewer__status document-viewer__status--${statusMod}`}
        role="status"
      >
        {getStatusLabel(documentReference.status)}
      </span>
    </header>
  );
};

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  composition,
  documentReference,
  onResourceSelect,
}) => {
  // Composition takes priority
  if (composition) {
    return (
      <div
        className="document-viewer document-viewer--composition"
        role="region"
        aria-label="Document Viewer"
      >
        <CompositionHeader composition={composition} />
        <div className="document-viewer__sections">
          {(composition.section ?? []).map((section, idx) => (
            <SectionView
              key={idx}
              section={section}
              onResourceSelect={onResourceSelect}
              index={idx}
            />
          ))}
        </div>
      </div>
    );
  }

  if (documentReference) {
    return (
      <div
        className="document-viewer document-viewer--document-reference"
        role="region"
        aria-label="Document Viewer"
      >
        <DocumentReferenceHeader documentReference={documentReference} />
        <div className="document-viewer__content">
          {documentReference.content.map((content, idx) => (
            <AttachmentView key={idx} attachment={content.attachment} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="document-viewer" role="region" aria-label="Document Viewer">
      <p className="document-viewer__empty" role="status">
        No document to display
      </p>
    </div>
  );
};
