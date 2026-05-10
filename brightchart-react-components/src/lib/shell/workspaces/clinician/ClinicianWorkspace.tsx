/**
 * ClinicianWorkspace — Root component for the clinician workspace.
 *
 * Provides sub-routing for patient list, patient chart, encounter dashboard,
 * schedule, and inbox.
 *
 * @module shell/workspaces/clinician/ClinicianWorkspace
 */

import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { EncounterDashboard } from './EncounterDashboard';
import { InboxView } from './InboxView';
import { PatientChart } from './PatientChart';
import { PatientListView } from './PatientListView';

export const ClinicianWorkspace: React.FC = () => {
  return (
    <Routes>
      <Route index element={<EncounterDashboard />} />
      <Route path="patients" element={<PatientListView />} />
      <Route path="patients/:patientId" element={<PatientChart />} />
      <Route path="encounters" element={<EncounterDashboard />} />
      <Route path="inbox" element={<InboxView />} />
    </Routes>
  );
};
