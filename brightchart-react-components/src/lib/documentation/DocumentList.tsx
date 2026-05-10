/**
 * DocumentList Component
 *
 * Displays a filterable, sortable list of FHIR R4 Composition and
 * DocumentReference resources. Shows document type, title, date, author,
 * status, and signed indicators. Supports filtering by type code and status.
 *
 * @module documentation/DocumentList
 */
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import type {
  ICompositionResource,
  IDocumentReferenceResource,
} from '@brightchain/brightchart-lib';
import {
  CompositionStatus,
  DocumentReferenceStatus,
} from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useMemo } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface DocumentListProps {
  /** Array of Composition and/or DocumentReference resources */
  documents: (
    | ICompositionResource<string>
    | IDocumentReferenceResource<string>
  )[];
  /** Callback when a document is selected */
  onSelect: (
    document: ICompositionResource<string> | IDocumentReferenceResource<string>,
  ) => void;
  /** Optional filter by document type codes */
  filterTypes?: string[];
  /** Optional filter by status values */
  filterStatuses?: string[];
}

type AnyDocument =
  | ICompositionResource<string>
  | IDocumentReferenceResource<string>;

/** Type guard for Composition resources */
function isComposition(doc: AnyDocument): doc is ICompositionResource<string> {
  return doc.resourceType === 'Composition';
}

/** Extract the document type display text */
function getDocumentType(doc: AnyDocument): string {
  if (isComposition(doc)) {
    return doc.type?.text ?? doc.type?.coding?.[0]?.display ?? 'Clinical Note';
  }
  return doc.type?.text ?? doc.type?.coding?.[0]?.display ?? 'Document';
}

/** Extract the type code for filtering */
function getTypeCode(doc: AnyDocument): string | undefined {
  if (isComposition(doc)) {
    return doc.type?.coding?.[0]?.code;
  }
  return doc.type?.coding?.[0]?.code;
}

/** Extract the document title */
function getTitle(doc: AnyDocument): string {
  if (isComposition(doc)) {
    return doc.title || 'Untitled';
  }
  return doc.description || 'Untitled';
}

/** Extract the document date */
function getDate(doc: AnyDocument): string {
  if (isComposition(doc)) {
    return doc.date ?? '';
  }
  return doc.date ?? '';
}

/** Extract the first author display name */
function getAuthor(doc: AnyDocument): string {
  const authors = isComposition(doc) ? doc.author : doc.author;
  if (!authors || authors.length === 0) return '';
  const first = authors[0];
  return first.display ?? first.reference ?? '';
}

/** Get the status string for display */
function getStatus(doc: AnyDocument): string {
  return doc.status;
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

/** Determine if a document is signed (Composition with status final or has attesters) */
function isSigned(doc: AnyDocument): boolean {
  if (!isComposition(doc)) return false;
  return (
    doc.status === 'final' ||
    (Array.isArray(doc.attester) && doc.attester.length > 0)
  );
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onSelect,
  filterTypes,
  filterStatuses,
}) => {
  const { tEnum } = useBrightChartTranslation();
  const { formatDate } = useFormattedDate();

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

  const filteredAndSorted = useMemo(() => {
    let result = [...documents];

    // Filter by type codes
    if (filterTypes && filterTypes.length > 0) {
      result = result.filter((doc) => {
        const code = getTypeCode(doc);
        return code !== undefined && filterTypes.includes(code);
      });
    }

    // Filter by status values
    if (filterStatuses && filterStatuses.length > 0) {
      result = result.filter((doc) => filterStatuses.includes(getStatus(doc)));
    }

    // Sort by date descending (most recent first)
    result.sort((a, b) => {
      const dateA = getDate(a);
      const dateB = getDate(b);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return result;
  }, [documents, filterTypes, filterStatuses]);

  return (
    <div className="document-list" role="region" aria-label="Document List">
      {filteredAndSorted.length === 0 ? (
        <p className="document-list__empty" role="status">
          No documents found
        </p>
      ) : (
        <ul className="document-list__items" role="list">
          {filteredAndSorted.map((doc, idx) => {
            const status = getStatus(doc);
            const signed = isSigned(doc);

            return (
              <li
                key={doc.id ?? idx}
                className={`document-list__item document-list__item--${getStatusModifier(status)}`}
              >
                <button
                  type="button"
                  className="document-list__entry"
                  onClick={() => onSelect(doc)}
                  aria-label={`${getTitle(doc)}, ${getDocumentType(doc)}, ${getStatusLabel(status)}`}
                >
                  <span className="document-list__type">
                    {getDocumentType(doc)}
                  </span>
                  <span className="document-list__title">{getTitle(doc)}</span>
                  <span className="document-list__date">
                    {formatDate(getDate(doc))}
                  </span>
                  <span className="document-list__author">
                    {getAuthor(doc)}
                  </span>
                  <span
                    className={`document-list__status document-list__status--${getStatusModifier(status)}`}
                    role="status"
                  >
                    {getStatusLabel(status)}
                  </span>
                  {signed && (
                    <span
                      className="document-list__signed-badge"
                      aria-label="Signed"
                    >
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
