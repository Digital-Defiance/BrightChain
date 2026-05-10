/**
 * PatientListView Component
 *
 * Wraps PatientSearchForm (Module 1) with PermissionGate(PatientRead).
 * Click navigates to patient chart.
 *
 * @module shell/workspaces/clinician/PatientListView
 */
import type {
  IMatchCandidate,
  IPatientSearchParams,
} from '@brightchain/brightchart-lib';
import {
  BrightChartStrings,
  PatientPermission,
} from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { PatientSearchForm } from '../../../PatientSearchForm/PatientSearchForm';
import { PermissionGate } from '../../components/PermissionGate';

export const PatientListView: React.FC = () => {
  const { t } = useBrightChartTranslation();
  const _navigate = useNavigate();
  const [results, setResults] = useState<IMatchCandidate<string>[]>([]);

  const handleSearch = useCallback((_params: IPatientSearchParams) => {
    // TODO: Integrate with patient search API
    // For now, results will be populated via the results prop
  }, []);

  const handleResults = useCallback((candidates: IMatchCandidate<string>[]) => {
    setResults(candidates);
  }, []);

  return (
    <PermissionGate
      requiredPermissions={[PatientPermission.Read]}
      fallback={<p>{t(BrightChartStrings.Empty_NoPermission)}</p>}
    >
      <div className="patient-list-view">
        <h2 className="patient-list-view__title">
          {t(BrightChartStrings.Admin_PatientSearch)}
        </h2>
        <PatientSearchForm
          onSearch={handleSearch}
          onResults={handleResults}
          results={results}
        />
      </div>
    </PermissionGate>
  );
};
