/**
 * NoteTemplateSelector Component
 *
 * Displays available clinical note templates grouped by LOINC document type.
 * Each template is rendered as a card showing name, description, and section
 * summary. Supports optional specialty filtering via a specialty profile prop.
 *
 * @module documentation/NoteTemplateSelector
 */
import type {
  INoteTemplate,
  ISpecialtyProfile,
} from '@brightchain/brightchart-lib';
import { BrightChartStrings } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useMemo } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface NoteTemplateSelectorProps {
  /** Array of available note templates */
  templates: INoteTemplate[];
  /** Optional specialty profile to filter templates by specialty */
  specialtyProfile?: ISpecialtyProfile;
  /** Callback when a template is selected */
  onSelect: (template: INoteTemplate) => void;
}

/** Group templates by their loincTypeCode */
function groupByDocumentType(
  templates: INoteTemplate[],
): Map<string, INoteTemplate[]> {
  const groups = new Map<string, INoteTemplate[]>();
  for (const template of templates) {
    const key = template.loincTypeCode;
    const existing = groups.get(key);
    if (existing) {
      existing.push(template);
    } else {
      groups.set(key, [template]);
    }
  }
  return groups;
}

/** Build a comma-separated summary of section titles */
function getSectionSummary(template: INoteTemplate): string {
  return template.sections.map((s) => s.title).join(', ');
}

export const NoteTemplateSelector: React.FC<NoteTemplateSelectorProps> = ({
  templates,
  specialtyProfile,
  onSelect,
}) => {
  const { t } = useBrightChartTranslation();
  const filtered = useMemo(() => {
    if (!specialtyProfile) return templates;
    return templates.filter(
      (tmpl) => tmpl.specialtyCode === specialtyProfile.specialtyCode,
    );
  }, [templates, specialtyProfile]);

  const grouped = useMemo(() => groupByDocumentType(filtered), [filtered]);

  if (filtered.length === 0) {
    return (
      <div
        className="note-template-selector"
        role="region"
        aria-label={t(BrightChartStrings.NoteTemplateSelector_AriaLabel)}
      >
        <p className="note-template-selector__empty" role="status">
          {t(BrightChartStrings.NoteTemplateSelector_Empty)}
        </p>
      </div>
    );
  }

  return (
    <div
      className="note-template-selector"
      role="region"
      aria-label={t(BrightChartStrings.NoteTemplateSelector_AriaLabel)}
    >
      {Array.from(grouped.entries()).map(([loincTypeCode, groupTemplates]) => (
        <div
          key={loincTypeCode}
          className="note-template-selector__group"
          role="group"
          aria-label={t(
            BrightChartStrings.NoteTemplateSelector_GroupAriaTemplate,
          ).replace('{CODE}', loincTypeCode)}
        >
          <h3 className="note-template-selector__group-heading">
            {loincTypeCode}
          </h3>
          <ul className="note-template-selector__list" role="list">
            {groupTemplates.map((template) => (
              <li
                key={template.templateId}
                className="note-template-selector__item"
              >
                <button
                  type="button"
                  className="note-template-selector__card"
                  onClick={() => onSelect(template)}
                  aria-label={t(
                    BrightChartStrings.NoteTemplateSelector_SelectTemplate,
                  ).replace('{NAME}', template.name)}
                >
                  <span className="note-template-selector__card-name">
                    {template.name}
                  </span>
                  <span className="note-template-selector__card-description">
                    {template.description}
                  </span>
                  <span className="note-template-selector__card-sections">
                    {getSectionSummary(template)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};
