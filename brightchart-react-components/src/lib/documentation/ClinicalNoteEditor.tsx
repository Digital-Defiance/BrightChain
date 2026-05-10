/**
 * ClinicalNoteEditor Component
 *
 * A section-based clinical note editor that renders FHIR R4 Composition
 * sections as collapsible, editable panels. Supports initializing from
 * an existing composition or a note template, with status indicators
 * and save/sign actions.
 *
 * @module documentation/ClinicalNoteEditor
 */
import type {
  CompositionSection,
  ICompositionResource,
  INoteTemplate,
  ISpecialtyProfile,
} from '@brightchain/brightchart-lib';
import {
  CompositionStatus,
  NarrativeStatus,
} from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

/** Internal state for a single editable section */
interface SectionState {
  title: string;
  code: CompositionSection['code'];
  text: string;
  expanded: boolean;
}

export interface ClinicalNoteEditorProps {
  /** Existing composition to edit (if provided, template is ignored) */
  composition?: ICompositionResource<string>;
  /** Template to initialize a new note from (used when no composition provided) */
  template?: INoteTemplate;
  /** Specialty profile to determine available section types */
  specialtyProfile?: ISpecialtyProfile;
  /** Callback when the note is saved */
  onSave: (composition: ICompositionResource<string>) => void;
  /** Callback when the note is signed */
  onSign: (composition: ICompositionResource<string>) => void;
}

/** Map a CompositionStatus to a CSS modifier */
function getStatusModifier(status: CompositionStatus): string {
  switch (status) {
    case CompositionStatus.Preliminary:
      return 'draft';
    case CompositionStatus.Final:
      return 'signed';
    case CompositionStatus.Amended:
      return 'amended';
    case CompositionStatus.EnteredInError:
      return 'error';
    default:
      return 'unknown';
  }
}

/** Build section state from an existing composition */
function sectionsFromComposition(
  composition: ICompositionResource<string>,
): SectionState[] {
  return (composition.section ?? []).map((s) => ({
    title: s.title ?? 'Untitled Section',
    code: s.code,
    text: s.text?.div ?? '',
    expanded: true,
  }));
}

/** Build section state from a note template */
function sectionsFromTemplate(template: INoteTemplate): SectionState[] {
  return template.sections.map((s) => ({
    title: s.title,
    code: s.code,
    text: s.defaultText ?? '',
    expanded: true,
  }));
}

/** Build a composition object from the current editor state */
function buildComposition(
  sections: SectionState[],
  status: CompositionStatus,
  source?: ICompositionResource<string>,
): ICompositionResource<string> {
  const compositionSections: CompositionSection<string>[] = sections.map(
    (s) => ({
      title: s.title,
      code: s.code,
      text: s.text
        ? { status: NarrativeStatus.Generated, div: s.text }
        : undefined,
    }),
  );

  if (source) {
    return {
      ...source,
      status,
      section: compositionSections,
      date: new Date().toISOString(),
    };
  }

  return {
    resourceType: 'Composition',
    status,
    type: { text: 'Clinical Note' },
    date: new Date().toISOString(),
    title: 'Clinical Note',
    author: [],
    brightchainMetadata: {
      blockId: '',
      creatorMemberId: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      poolId: '',
      encryptionType: 0 as never,
    },
    section: compositionSections,
  };
}

export const ClinicalNoteEditor: React.FC<ClinicalNoteEditorProps> = ({
  composition,
  template,
  specialtyProfile: _specialtyProfile,
  onSave,
  onSign,
}) => {
  const initialStatus = composition?.status ?? CompositionStatus.Preliminary;
  const { tEnum } = useBrightChartTranslation();

  const getStatusLabel = (status: CompositionStatus): string =>
    tEnum(CompositionStatus, status);

  const initialSections = useMemo<SectionState[]>(() => {
    if (composition) return sectionsFromComposition(composition);
    if (template) return sectionsFromTemplate(template);
    return [];
  }, [composition, template]);

  const [sections, setSections] = useState<SectionState[]>(initialSections);
  const [status] = useState<CompositionStatus>(initialStatus);

  const hasContent = sections.length > 0;

  const toggleSection = useCallback((index: number) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, expanded: !s.expanded } : s)),
    );
  }, []);

  const updateSectionText = useCallback((index: number, text: string) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, text } : s)),
    );
  }, []);

  const handleSave = useCallback(() => {
    onSave(buildComposition(sections, status, composition));
  }, [sections, status, composition, onSave]);

  const handleSign = useCallback(() => {
    onSign(buildComposition(sections, status, composition));
  }, [sections, status, composition, onSign]);

  const canSign = status === CompositionStatus.Preliminary;

  if (!hasContent) {
    return (
      <div
        className="clinical-note-editor"
        role="region"
        aria-label="Clinical Note Editor"
      >
        <p className="clinical-note-editor__empty" role="status">
          No composition or template provided. Select a template to begin a new
          note.
        </p>
      </div>
    );
  }

  return (
    <div
      className="clinical-note-editor"
      role="region"
      aria-label="Clinical Note Editor"
    >
      {/* Status indicator */}
      <div className="clinical-note-editor__header">
        <span
          className={`clinical-note-editor__status clinical-note-editor__status--${getStatusModifier(status)}`}
          role="status"
          aria-label={`Note status: ${getStatusLabel(status)}`}
        >
          {status === CompositionStatus.Final && (
            <span
              className="clinical-note-editor__checkmark"
              aria-hidden="true"
            >
              ✓{' '}
            </span>
          )}
          {getStatusLabel(status)}
        </span>

        <div className="clinical-note-editor__actions">
          <button
            type="button"
            className="clinical-note-editor__save"
            onClick={handleSave}
          >
            Save
          </button>
          <button
            type="button"
            className="clinical-note-editor__sign"
            onClick={handleSign}
            disabled={!canSign}
            aria-disabled={!canSign}
          >
            Sign
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="clinical-note-editor__sections">
        {sections.map((section, idx) => (
          <div
            key={`${section.title}-${idx}`}
            className="clinical-note-editor__section"
          >
            <button
              type="button"
              className="clinical-note-editor__section-header"
              onClick={() => toggleSection(idx)}
              aria-expanded={section.expanded}
              aria-controls={`section-content-${idx}`}
            >
              <span className="clinical-note-editor__section-title">
                {section.expanded ? '▾' : '▸'} {section.title}
              </span>
              {section.code?.coding?.[0]?.code && (
                <span className="clinical-note-editor__section-code">
                  {section.code.coding[0].code}
                </span>
              )}
            </button>
            {section.expanded && (
              <div
                id={`section-content-${idx}`}
                className="clinical-note-editor__section-body"
                role="group"
                aria-label={`${section.title} content`}
              >
                <textarea
                  className="clinical-note-editor__textarea"
                  value={section.text}
                  onChange={(e) => updateSectionText(idx, e.target.value)}
                  aria-label={`${section.title} text`}
                  rows={6}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
