/**
 * ResultsList Component
 *
 * Displays a list of FHIR R4 DiagnosticReport resources with
 * category/status/date-range filtering and abnormal result flagging.
 *
 * @module orders/ResultsList
 */
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import type {
  ICodeableConcept,
  IDiagnosticReportResource,
} from '@brightchain/brightchart-lib';
import { DiagnosticReportStatus } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

/** Category filter values. */
export type ReportCategoryFilter = 'all' | 'lab' | 'radiology' | 'pathology';

export interface ResultsListProps {
  /** Array of DiagnosticReport resources to display. */
  reports: IDiagnosticReportResource<string>[];
  /** Callback when a report is selected. */
  onSelect: (report: IDiagnosticReportResource<string>) => void;
  /** Optional pre-set filter for categories. */
  filterCategories?: ReportCategoryFilter;
}

/** Human-readable labels for report categories. */
const CATEGORY_LABELS: Record<ReportCategoryFilter, string> = {
  all: 'All Categories',
  lab: 'Laboratory',
  radiology: 'Radiology',
  pathology: 'Pathology',
};

/** All DiagnosticReport statuses for the filter dropdown. */
const ALL_STATUSES: string[] = Object.values(DiagnosticReportStatus);

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

/** Get the effective date from a DiagnosticReport. */
function getEffectiveDate(report: IDiagnosticReportResource<string>): string {
  return (
    report.effectiveDateTime ??
    report.effectivePeriod?.start ??
    report.issued ??
    ''
  );
}

/** Get performer display string from a DiagnosticReport. */
function getPerformerDisplay(
  report: IDiagnosticReportResource<string>,
): string {
  if (!report.performer?.length) return '';
  return report.performer
    .map((p) => p.display ?? p.reference ?? '')
    .filter(Boolean)
    .join(', ');
}

/** Get category display string from a DiagnosticReport. */
function getCategoryDisplay(report: IDiagnosticReportResource<string>): string {
  if (!report.category?.length) return '';
  return report.category.map(codeDisplay).filter(Boolean).join(', ');
}

/**
 * Determine whether a report's category matches a filter value.
 * Checks category coding codes and display text for common terms.
 */
function matchesCategory(
  report: IDiagnosticReportResource<string>,
  filter: ReportCategoryFilter,
): boolean {
  if (filter === 'all') return true;
  if (!report.category?.length) return false;

  const categoryTerms: Record<string, string[]> = {
    lab: ['LAB', 'laboratory', 'lab'],
    radiology: ['RAD', 'radiology', 'imaging'],
    pathology: ['PAT', 'pathology', 'surgical pathology'],
  };

  const terms = categoryTerms[filter] ?? [];
  return report.category.some((cat) => {
    const code = cat.coding?.[0]?.code?.toLowerCase() ?? '';
    const display = (cat.coding?.[0]?.display ?? '').toLowerCase();
    const text = (cat.text ?? '').toLowerCase();
    return terms.some(
      (t) =>
        code === t.toLowerCase() ||
        display.includes(t.toLowerCase()) ||
        text.includes(t.toLowerCase()),
    );
  });
}

/**
 * Determine whether a report contains abnormal results.
 *
 * Checks the report's `conclusionCode` for abnormal interpretation codes
 * and the `conclusion` text for keywords indicating abnormality.
 */
function hasAbnormalResults(
  report: IDiagnosticReportResource<string>,
): boolean {
  // Check conclusionCode for abnormal interpretation codes
  if (report.conclusionCode?.length) {
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
    for (const cc of report.conclusionCode) {
      const code = cc.coding?.[0]?.code;
      if (code && abnormalCodes.has(code)) return true;
      const display = (cc.coding?.[0]?.display ?? '').toLowerCase();
      if (display.includes('abnormal') || display.includes('critical'))
        return true;
    }
  }

  // Check conclusion text for abnormal keywords
  if (report.conclusion) {
    const lower = report.conclusion.toLowerCase();
    if (
      lower.includes('abnormal') ||
      lower.includes('critical') ||
      lower.includes('out of range')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Check whether a date string falls within a date range.
 */
function isWithinDateRange(
  dateStr: string,
  startDate: string,
  endDate: string,
): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr).getTime();
  if (isNaN(d)) return false;
  if (startDate) {
    const s = new Date(startDate).getTime();
    if (!isNaN(s) && d < s) return false;
  }
  if (endDate) {
    // Include the entire end date day
    const e = new Date(endDate).getTime() + 86400000 - 1;
    if (!isNaN(e) && d > e) return false;
  }
  return true;
}

/**
 * Returns CSS modifier class for status-based styling.
 */
function statusModifier(status: string): string {
  switch (status) {
    case DiagnosticReportStatus.Final:
    case DiagnosticReportStatus.Amended:
    case DiagnosticReportStatus.Corrected:
      return 'results-list__item--final';
    case DiagnosticReportStatus.Preliminary:
    case DiagnosticReportStatus.Partial:
      return 'results-list__item--preliminary';
    case DiagnosticReportStatus.Cancelled:
    case DiagnosticReportStatus.EnteredInError:
      return 'results-list__item--cancelled';
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ResultsList: React.FC<ResultsListProps> = ({
  reports,
  onSelect,
  filterCategories: initialCategoryFilter,
}) => {
  const { tEnum } = useBrightChartTranslation();
  const { formatDate } = useFormattedDate();

  const [categoryFilter, setCategoryFilter] = useState<ReportCategoryFilter>(
    initialCategoryFilter ?? 'all',
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Category filter
      if (!matchesCategory(report, categoryFilter)) return false;

      // Status filter
      if (statusFilter !== 'all' && report.status !== statusFilter)
        return false;

      // Date range filter
      if (dateStart || dateEnd) {
        const effectiveDate = getEffectiveDate(report);
        if (!isWithinDateRange(effectiveDate, dateStart, dateEnd)) return false;
      }

      return true;
    });
  }, [reports, categoryFilter, statusFilter, dateStart, dateEnd]);

  const handleSelect = useCallback(
    (report: IDiagnosticReportResource<string>) => {
      onSelect(report);
    },
    [onSelect],
  );

  return (
    <div className="results-list" role="region" aria-label="Results List">
      {/* Filters */}
      <div className="results-list__filters">
        <div className="results-list__filter">
          <label htmlFor="results-list-category-filter">Category</label>
          <select
            id="results-list-category-filter"
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as ReportCategoryFilter)
            }
          >
            {(Object.keys(CATEGORY_LABELS) as ReportCategoryFilter[]).map(
              (key) => (
                <option key={key} value={key}>
                  {CATEGORY_LABELS[key]}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="results-list__filter">
          <label htmlFor="results-list-status-filter">Status</label>
          <select
            id="results-list-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {tEnum(DiagnosticReportStatus, s)}
              </option>
            ))}
          </select>
        </div>

        <div className="results-list__filter">
          <label htmlFor="results-list-date-start">From</label>
          <input
            id="results-list-date-start"
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
          />
        </div>

        <div className="results-list__filter">
          <label htmlFor="results-list-date-end">To</label>
          <input
            id="results-list-date-end"
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
          />
        </div>
      </div>

      {/* Report Items */}
      {filteredReports.length === 0 ? (
        <p className="results-list__empty">
          No reports match the current filters.
        </p>
      ) : (
        <ul className="results-list__items" role="list">
          {filteredReports.map((report, index) => {
            const abnormal = hasAbnormalResults(report);
            const itemClasses = [
              'results-list__item',
              statusModifier(report.status),
              abnormal ? 'results-list__item--abnormal' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <li key={report.id ?? index} className={itemClasses}>
                <button
                  type="button"
                  className="results-list__item-button"
                  onClick={() => handleSelect(report)}
                  aria-label={`Select report: ${codeDisplay(report.code)}${abnormal ? ' (abnormal results)' : ''}`}
                >
                  <span className="results-list__code">
                    {codeDisplay(report.code)}
                  </span>
                  <span className="results-list__category">
                    {getCategoryDisplay(report)}
                  </span>
                  <span className="results-list__status">
                    {tEnum(DiagnosticReportStatus, report.status)}
                  </span>
                  <span className="results-list__date">
                    {formatDate(getEffectiveDate(report))}
                  </span>
                  <span className="results-list__performer">
                    {getPerformerDisplay(report)}
                  </span>
                  {abnormal && (
                    <span
                      className="results-list__abnormal-flag"
                      aria-label="Abnormal results present"
                    >
                      ⚠️ Abnormal
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
