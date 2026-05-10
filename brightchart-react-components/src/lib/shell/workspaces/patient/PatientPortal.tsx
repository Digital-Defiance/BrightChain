/**
 * PatientPortal — Root component for the patient portal workspace.
 *
 * Enforces self-only access: on mount, reads the active role's `patient`
 * reference from the ActiveContext and locks `activePatient` to that
 * resource. If the active role has no patient reference (i.e. the user
 * isn't a patient at any organization), access is denied.
 *
 * This means patients can only ever see their own data — there is no
 * patient selector in the portal.
 *
 * @module shell/workspaces/patient/PatientPortal
 */

import React, { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AccessDenied } from '../../components/AccessDenied';
import { useActiveContext } from '../../contexts/ActiveContext';
import { MyAppointments } from './MyAppointments';
import { MyBilling } from './MyBilling';
import { MyHealthSummary } from './MyHealthSummary';
import { MyResults } from './MyResults';

export const PatientPortal: React.FC = () => {
  const { activeRole, activePatientRef, setActivePatient } = useActiveContext();

  // Lock the active patient to the authenticated user's own Patient resource
  useEffect(() => {
    if (activeRole.patient?.reference) {
      setActivePatient({
        resourceType: 'Patient',
        id: activeRole.patient.reference,
        name: activeRole.patient.display
          ? [{ text: activeRole.patient.display }]
          : undefined,
      });
    }

    return () => {
      // Clear when leaving the portal
      setActivePatient(undefined);
    };
  }, [activeRole.patient, setActivePatient]);

  // If the active role has no patient reference, the user can't use the portal
  if (!activePatientRef) {
    return <AccessDenied />;
  }

  return (
    <Routes>
      <Route index element={<MyHealthSummary />} />
      <Route path="health" element={<MyHealthSummary />} />
      <Route path="appointments" element={<MyAppointments />} />
      <Route path="results" element={<MyResults />} />
      <Route path="billing" element={<MyBilling />} />
    </Routes>
  );
};
