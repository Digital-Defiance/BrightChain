/**
 * EncounterDetailView Component
 *
 * Displays full details of a single FHIR R4 Encounter resource including
 * status timeline, class, type, period, participants, diagnoses, locations,
 * hospitalization, reason codes, service provider, and linked clinical
 * resources grouped by type.
 *
 * @module encounter/EncounterDetailView
 */
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import type {
  ClinicalResource,
  ClinicalResourceType,
  IEncounterResource,
  IEncounterWorkflowConfig,
} from '@brightchain/brightchart-lib';
import {
  EncounterLocationStatus,
  EncounterStatus,
} from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useMemo } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface EncounterDetailViewProps {
  encounter: IEncounterResource<string>;
  linkedResources?: ClinicalResource<string>[];
  workflowConfig?: IEncounterWorkflowConfig;
  onResourceSelect?: (resource: ClinicalResource<string>) => void;
}

const WORKFLOW_STATE_EXT_URL =
  'http://brightchart.org/fhir/StructureDefinition/encounter-workflow-state';

function getWorkflowStateCode(
  encounter: IEncounterResource<string>,
): string | undefined {
  return encounter.extension?.find((e) => e.url === WORKFLOW_STATE_EXT_URL)?.[
    'valueString'
  ];
}

function getStatusLabel(
  status: string,
  config?: IEncounterWorkflowConfig,
  enumTranslator?: (status: EncounterStatus) => string,
): string {
  if (config) {
    const state = config.states.find((s) => s.mappedFhirStatus === status);
    if (state) return state.displayName;
  }
  return enumTranslator ? enumTranslator(status as EncounterStatus) : status;
}

function getWorkflowDisplayName(
  code: string | undefined,
  config?: IEncounterWorkflowConfig,
): string | undefined {
  if (!code || !config) return undefined;
  return config.states.find((s) => s.code === code)?.displayName;
}

function getCodeableConceptDisplay(cc?: {
  text?: string;
  coding?: Array<{ display?: string; code?: string }>;
}): string {
  if (!cc) return '';
  return cc.text ?? cc.coding?.[0]?.display ?? cc.coding?.[0]?.code ?? '';
}

function getResourceDisplay(resource: ClinicalResource<string>): string {
  if ('code' in resource && resource.code) {
    return (
      resource.code.text ??
      resource.code.coding?.[0]?.display ??
      resource.code.coding?.[0]?.code ??
      'Unknown'
    );
  }
  return resource.id ?? 'Unknown';
}

export const EncounterDetailView: React.FC<EncounterDetailViewProps> = ({
  encounter,
  linkedResources,
  workflowConfig,
  onResourceSelect,
}) => {
  const { tEnum } = useBrightChartTranslation();
  const { formatDateTime } = useFormattedDate();

  /** Format a date string for display, returning '—' for empty/undefined. */
  const fmtDate = (dateStr?: string): string => {
    if (!dateStr) return '—';
    return formatDateTime(dateStr) || dateStr;
  };

  const currentWorkflowLabel = getWorkflowDisplayName(
    getWorkflowStateCode(encounter),
    workflowConfig,
  );

  // Group linked resources by type
  const groupedResources = useMemo(() => {
    if (!linkedResources?.length) return {};
    const groups: Record<string, ClinicalResource<string>[]> = {};
    for (const r of linkedResources) {
      const type = r.resourceType as ClinicalResourceType;
      (groups[type] ??= []).push(r);
    }
    return groups;
  }, [linkedResources]);

  return (
    <div
      className="encounter-detail"
      role="region"
      aria-label="Encounter Detail"
    >
      {/* Status */}
      <section className="encounter-detail__section">
        <h3 className="encounter-detail__heading">Status</h3>
        <p className="encounter-detail__value">
          {currentWorkflowLabel
            ? `${currentWorkflowLabel} (${tEnum(EncounterStatus, encounter.status as EncounterStatus)})`
            : tEnum(EncounterStatus, encounter.status as EncounterStatus)}
        </p>
      </section>

      {/* Status History Timeline */}
      {encounter.statusHistory && encounter.statusHistory.length > 0 && (
        <section className="encounter-detail__section">
          <h3 className="encounter-detail__heading">Status Timeline</h3>
          <ol
            className="encounter-detail__timeline"
            role="list"
            aria-label="Status history timeline"
          >
            {encounter.statusHistory.map((sh, idx) => (
              <li key={idx} className="encounter-detail__timeline-entry">
                <span className="encounter-detail__timeline-status">
                  {getStatusLabel(sh.status, workflowConfig, (s) =>
                    tEnum(EncounterStatus, s),
                  )}
                </span>
                <span className="encounter-detail__timeline-period">
                  {fmtDate(sh.period.start)} – {fmtDate(sh.period.end)}
                </span>
              </li>
            ))}
            {/* Current status */}
            <li className="encounter-detail__timeline-entry encounter-detail__timeline-entry--current">
              <span className="encounter-detail__timeline-status">
                {currentWorkflowLabel ??
                  tEnum(EncounterStatus, encounter.status as EncounterStatus)}
              </span>
              <span className="encounter-detail__timeline-period">
                {fmtDate(encounter.period?.start)} – present
              </span>
            </li>
          </ol>
        </section>
      )}

      {/* Class */}
      <section className="encounter-detail__section">
        <h3 className="encounter-detail__heading">Class</h3>
        <p className="encounter-detail__value">
          {encounter.class.display ?? encounter.class.code ?? '—'}
        </p>
      </section>

      {/* Type */}
      {encounter.type && encounter.type.length > 0 && (
        <section className="encounter-detail__section">
          <h3 className="encounter-detail__heading">Type</h3>
          <ul className="encounter-detail__list" role="list">
            {encounter.type.map((t, idx) => (
              <li key={idx}>{getCodeableConceptDisplay(t)}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Period */}
      {encounter.period && (
        <section className="encounter-detail__section">
          <h3 className="encounter-detail__heading">Period</h3>
          <p className="encounter-detail__value">
            {fmtDate(encounter.period.start)} –{' '}
            {fmtDate(encounter.period.end)}
          </p>
        </section>
      )}

      {/* Participants */}
      {encounter.participant && encounter.participant.length > 0 && (
        <section className="encounter-detail__section">
          <h3 className="encounter-detail__heading">Participants</h3>
          <ul className="encounter-detail__list" role="list">
            {encounter.participant.map((p, idx) => (
              <li key={idx} className="encounter-detail__participant">
                <span className="encounter-detail__participant-name">
                  {p.individual?.display ??
                    p.individual?.reference ??
                    'Unknown'}
                </span>
                {p.type && p.type.length > 0 && (
                  <span className="encounter-detail__participant-role">
                    (
                    {p.type.map((t) => getCodeableConceptDisplay(t)).join(', ')}
                    )
                  </span>
                )}
                {p.period && (
                  <span className="encounter-detail__participant-period">
                    {fmtDate(p.period.start)} – {fmtDate(p.period.end)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Diagnoses */}
      {encounter.diagnosis && encounter.diagnosis.length > 0 && (
        <section className="encounter-detail__section">
          <h3 className="encounter-detail__heading">Diagnoses</h3>
          <ul className="encounter-detail__list" role="list">
            {encounter.diagnosis.map((d, idx) => (
              <li key={idx} className="encounter-detail__diagnosis">
                <span className="encounter-detail__diagnosis-condition">
                  {d.condition.display ?? d.condition.reference ?? 'Unknown'}
                </span>
                {d.use && (
                  <span className="encounter-detail__diagnosis-use">
                    Use: {getCodeableConceptDisplay(d.use)}
                  </span>
                )}
                {d.rank !== undefined && (
                  <span className="encounter-detail__diagnosis-rank">
                    Rank: {d.rank}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Locations */}
      {encounter.location && encounter.location.length > 0 && (
        <section className="encounter-detail__section">
          <h3 className="encounter-detail__heading">Locations</h3>
          <ul className="encounter-detail__list" role="list">
            {encounter.location.map((loc, idx) => (
              <li key={idx} className="encounter-detail__location">
                <span className="encounter-detail__location-name">
                  {loc.location.display ?? loc.location.reference ?? 'Unknown'}
                </span>
                {loc.status && (
                  <span className="encounter-detail__location-status">
                    Status:{' '}
                    {tEnum(
                      EncounterLocationStatus,
                      loc.status as EncounterLocationStatus,
                    )}
                  </span>
                )}
                {loc.physicalType && (
                  <span className="encounter-detail__location-type">
                    Type: {getCodeableConceptDisplay(loc.physicalType)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Hospitalization */}
      {encounter.hospitalization && (
        <section className="encounter-detail__section">
          <h3 className="encounter-detail__heading">Hospitalization</h3>
          <dl className="encounter-detail__dl">
            {encounter.hospitalization.admitSource && (
              <>
                <dt>Admit Source</dt>
                <dd>
                  {getCodeableConceptDisplay(
                    encounter.hospitalization.admitSource,
                  )}
                </dd>
              </>
            )}
            {encounter.hospitalization.dischargeDisposition && (
              <>
                <dt>Discharge Disposition</dt>
                <dd>
                  {getCodeableConceptDisplay(
                    encounter.hospitalization.dischargeDisposition,
                  )}
                </dd>
              </>
            )}
            {encounter.hospitalization.reAdmission && (
              <>
                <dt>Re-Admission</dt>
                <dd>
                  {getCodeableConceptDisplay(
                    encounter.hospitalization.reAdmission,
                  )}
                </dd>
              </>
            )}
            {encounter.hospitalization.dietPreference &&
              encounter.hospitalization.dietPreference.length > 0 && (
                <>
                  <dt>Diet Preferences</dt>
                  <dd>
                    {encounter.hospitalization.dietPreference
                      .map((d) => getCodeableConceptDisplay(d))
                      .join(', ')}
                  </dd>
                </>
              )}
            {encounter.hospitalization.specialArrangement &&
              encounter.hospitalization.specialArrangement.length > 0 && (
                <>
                  <dt>Special Arrangements</dt>
                  <dd>
                    {encounter.hospitalization.specialArrangement
                      .map((s) => getCodeableConceptDisplay(s))
                      .join(', ')}
                  </dd>
                </>
              )}
          </dl>
        </section>
      )}

      {/* Reason Codes */}
      {encounter.reasonCode && encounter.reasonCode.length > 0 && (
        <section className="encounter-detail__section">
          <h3 className="encounter-detail__heading">Reason Codes</h3>
          <ul className="encounter-detail__list" role="list">
            {encounter.reasonCode.map((rc, idx) => (
              <li key={idx}>{getCodeableConceptDisplay(rc)}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Service Provider */}
      {encounter.serviceProvider && (
        <section className="encounter-detail__section">
          <h3 className="encounter-detail__heading">Service Provider</h3>
          <p className="encounter-detail__value">
            {encounter.serviceProvider.display ??
              encounter.serviceProvider.reference ??
              '—'}
          </p>
        </section>
      )}

      {/* Linked Clinical Resources */}
      {Object.keys(groupedResources).length > 0 && (
        <section className="encounter-detail__section">
          <h3 className="encounter-detail__heading">
            Linked Clinical Resources
          </h3>
          {Object.entries(groupedResources).map(([type, resources]) => (
            <div key={type} className="encounter-detail__resource-group">
              <h4 className="encounter-detail__resource-type">{type}</h4>
              <ul className="encounter-detail__list" role="list">
                {resources.map((r, idx) => (
                  <li
                    key={r.id ?? idx}
                    className="encounter-detail__resource-item"
                  >
                    {onResourceSelect ? (
                      <button
                        type="button"
                        className="encounter-detail__resource-link"
                        onClick={() => onResourceSelect(r)}
                      >
                        {getResourceDisplay(r)}
                      </button>
                    ) : (
                      <span>{getResourceDisplay(r)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
