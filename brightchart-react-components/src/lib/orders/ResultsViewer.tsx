/**
 * ResultsViewer Component
 *
 * Displays a FHIR R4 DiagnosticReport with its linked Observations,
 * abnormal result flagging, and presentedForm attachment viewer.
 *
 * @module orders/ResultsViewer
 */
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import type {
  IAttachment,
  ICodeableConcept,
  IDiagnosticReportResource,
  IObservationResource,
  ObservationReferenceRange,
} from '@brightchain/brightchart-lib';
import { DiagnosticReportStatus } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface ResultsViewerProps {
  /** The DiagnosticReport to display. */
  report: IDiagnosticReportResource<string>;
  /** Resolved Observation resources linked via report.result references. */
  observations?: IObservationResource<string>[];
  /** Callback when a linked Observation is selected. */
  onObservationSelect?: (observation: IObservationResource<string>) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract a human-readable display string from a CodeableConcept. */
function codeDisplay(concept?: ICodeableConcept): string {
  if (!concept) return '';
  return (
    concept.text ??
    concept.coding?.[0]?.display ??
    concept.coding?.[0]?.code ??
    ''
  );
}

/** Get the display value from an Observation's value[x] fields. */
function getObservationValue(
  obs: IObservationResource<string>,
  formatDateTime: (date: Date | string) => string,
): string {
  if (obs.valueQuantity) {
    const v = obs.valueQuantity.value;
    const u = obs.valueQuantity.unit ?? obs.valueQuantity.code ?? '';
    return v != null ? `${v} ${u}`.trim() : '';
  }
  if (obs.valueCodeableConcept) return codeDisplay(obs.valueCodeableConcept);
  if (obs.valueString != null) return obs.valueString;
  if (obs.valueBoolean != null) return obs.valueBoolean ? 'true' : 'false';
  if (obs.valueInteger != null) return String(obs.valueInteger);
  if (obs.valueDateTime) return formatDateTime(obs.valueDateTime);
  if (obs.valueTime) return obs.valueTime;
  if (obs.valueRange) {
    const lo = obs.valueRange.low?.value;
    const hi = obs.valueRange.high?.value;
    return `${lo ?? ''} – ${hi ?? ''}`.trim();
  }
  if (obs.valueRatio) {
    const n = obs.valueRatio.numerator?.value ?? '';
    const d = obs.valueRatio.denominator?.value ?? '';
    return `${n}/${d}`;
  }
  return '';
}

/** Build a reference range display string from an Observation's referenceRange. */
function getReferenceRangeText(ranges?: ObservationReferenceRange[]): string {
  if (!ranges?.length) return '';
  const r = ranges[0];
  if (r.text) return r.text;
  const lo = r.low?.value;
  const hi = r.high?.value;
  const unit = r.low?.unit ?? r.high?.unit ?? '';
  if (lo != null && hi != null) return `${lo} – ${hi} ${unit}`.trim();
  if (lo != null) return `≥ ${lo} ${unit}`.trim();
  if (hi != null) return `≤ ${hi} ${unit}`.trim();
  return '';
}

/**
 * Determine whether an Observation value is abnormal.
 *
 * Checks the FHIR `interpretation` codes first (H, HH, L, LL, A, AA, etc.).
 * Falls back to numeric comparison against `referenceRange` low/high.
 */
function isAbnormal(obs: IObservationResource<string>): boolean {
  // Check interpretation codes
  if (obs.interpretation?.length) {
    const abnormalCodes = new Set([
      'H',
      'HH',
      'L',
      'LL',
      'A',
      'AA',
      'HU',
      'LU',
      'high',
      'low',
      'abnormal',
      'critical',
    ]);
    for (const interp of obs.interpretation) {
      const code = interp.coding?.[0]?.code;
      if (code && abnormalCodes.has(code)) return true;
    }
  }

  // Numeric range check
  if (obs.valueQuantity?.value != null && obs.referenceRange?.length) {
    const val = obs.valueQuantity.value;
    const range = obs.referenceRange[0];
    if (range.low?.value != null && val < range.low.value) return true;
    if (range.high?.value != null && val > range.high.value) return true;
  }

  return false;
}

/** Determine MIME-based viewer type for an attachment. */
function attachmentViewerType(att: IAttachment): 'pdf' | 'image' | 'other' {
  const ct = att.contentType?.toLowerCase() ?? '';
  if (ct.includes('pdf')) return 'pdf';
  if (ct.startsWith('image/')) return 'image';
  return 'other';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ResultsViewer: React.FC<ResultsViewerProps> = ({
  report,
  observations,
  onObservationSelect,
}) => {
  const { tEnum } = useBrightChartTranslation();
  const { formatDateTime } = useFormattedDate();

  const handleObservationClick = useCallback(
    (obs: IObservationResource<string>) => {
      onObservationSelect?.(obs);
    },
    [onObservationSelect],
  );

  /** Performers as a comma-separated display string. */
  const performerDisplay = useMemo(() => {
    if (!report.performer?.length) return '';
    return report.performer
      .map((p) => p.display ?? p.reference ?? '')
      .filter(Boolean)
      .join(', ');
  }, [report.performer]);

  /** Category display. */
  const categoryDisplay = useMemo(() => {
    if (!report.category?.length) return '';
    return report.category.map(codeDisplay).filter(Boolean).join(', ');
  }, [report.category]);

  return (
    <div
      className="results-viewer"
      role="region"
      aria-label="Diagnostic Report Viewer"
    >
      {/* Report Header */}
      <div className="results-viewer__header">
        <h2 className="results-viewer__title">
          {codeDisplay(report.code) || 'Diagnostic Report'}
        </h2>
        <span className="results-viewer__status">
          {tEnum(DiagnosticReportStatus, report.status)}
        </span>
      </div>

      {/* Report Details */}
      <dl className="results-viewer__details">
        {categoryDisplay && (
          <>
            <dt>Category</dt>
            <dd>{categoryDisplay}</dd>
          </>
        )}
        {(report.effectiveDateTime || report.effectivePeriod) && (
          <>
            <dt>Effective Date</dt>
            <dd>
              {report.effectiveDateTime
                ? formatDateTime(report.effectiveDateTime)
                : `${report.effectivePeriod?.start ? formatDateTime(report.effectivePeriod.start) : ''} – ${report.effectivePeriod?.end ? formatDateTime(report.effectivePeriod.end) : ''}`}
            </dd>
          </>
        )}
        {performerDisplay && (
          <>
            <dt>Performer</dt>
            <dd>{performerDisplay}</dd>
          </>
        )}
        {report.conclusion && (
          <>
            <dt>Conclusion</dt>
            <dd>{report.conclusion}</dd>
          </>
        )}
        {report.conclusionCode && report.conclusionCode.length > 0 && (
          <>
            <dt>Conclusion Codes</dt>
            <dd>
              {report.conclusionCode
                .map(codeDisplay)
                .filter(Boolean)
                .join(', ')}
            </dd>
          </>
        )}
      </dl>

      {/* Observations Table */}
      {observations && observations.length > 0 && (
        <div className="results-viewer__observations">
          <h3>Observations</h3>
          <table className="results-viewer__table" role="table">
            <thead>
              <tr>
                <th scope="col">Test</th>
                <th scope="col">Value</th>
                <th scope="col">Reference Range</th>
                <th scope="col">Status</th>
                <th scope="col">Flag</th>
              </tr>
            </thead>
            <tbody>
              {observations.map((obs, idx) => {
                const abnormal = isAbnormal(obs);
                const rowClasses = [
                  'results-viewer__observation-row',
                  abnormal ? 'results-viewer__observation-row--abnormal' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <tr
                    key={obs.id ?? idx}
                    className={rowClasses}
                    onClick={() => handleObservationClick(obs)}
                    role="row"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleObservationClick(obs);
                      }
                    }}
                    aria-label={`Observation: ${codeDisplay(obs.code)}${abnormal ? ' (abnormal)' : ''}`}
                    style={{
                      cursor: onObservationSelect ? 'pointer' : undefined,
                    }}
                  >
                    <td>{codeDisplay(obs.code)}</td>
                    <td
                      className={
                        abnormal ? 'results-viewer__value--abnormal' : ''
                      }
                    >
                      {getObservationValue(obs, formatDateTime)}
                    </td>
                    <td>{getReferenceRangeText(obs.referenceRange)}</td>
                    <td>{obs.status}</td>
                    <td>
                      {abnormal && (
                        <span
                          className="results-viewer__flag"
                          aria-label="Abnormal result"
                        >
                          ⚠️
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Presented Form Attachments */}
      {report.presentedForm && report.presentedForm.length > 0 && (
        <div className="results-viewer__attachments">
          <h3>Attachments</h3>
          {report.presentedForm.map((att, idx) => {
            const viewerType = attachmentViewerType(att);
            const src =
              att.url ??
              (att.data
                ? `data:${att.contentType ?? 'application/octet-stream'};base64,${att.data}`
                : '');
            const title = att.title ?? `Attachment ${idx + 1}`;

            return (
              <div key={idx} className="results-viewer__attachment">
                <span className="results-viewer__attachment-title">
                  {title}
                </span>
                {viewerType === 'pdf' && src && (
                  <iframe
                    className="results-viewer__pdf-viewer"
                    src={src}
                    title={title}
                    width="100%"
                    height="600"
                  />
                )}
                {viewerType === 'image' && src && (
                  <img
                    className="results-viewer__image-viewer"
                    src={src}
                    alt={title}
                  />
                )}
                {viewerType === 'other' && src && (
                  <a
                    className="results-viewer__download-link"
                    href={src}
                    download={title}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download {title}
                  </a>
                )}
                {!src && (
                  <span className="results-viewer__no-content">
                    No content available
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
