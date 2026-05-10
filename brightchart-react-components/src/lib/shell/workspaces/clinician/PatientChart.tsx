/**
 * PatientChart — Tabbed view aggregating all module components for a patient.
 *
 * Each tab is gated by appropriate permissions.
 *
 * @module shell/workspaces/clinician/PatientChart
 */

import {
  BillingPermission,
  BrightChartStrings,
  ClinicalPermission,
  DocumentPermission,
  EncounterPermission,
  OrderPermission,
  PatientPermission,
} from '@brightchain/brightchart-lib';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import React, { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AllergyList } from '../../../clinical/AllergyList';
import { ClinicalTimeline } from '../../../clinical/ClinicalTimeline';
import { ConditionList } from '../../../clinical/ConditionList';
import { MedicationList } from '../../../clinical/MedicationList';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { PermissionGate } from '../../components/PermissionGate';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`chart-tabpanel-${index}`}
    aria-labelledby={`chart-tab-${index}`}
  >
    {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
  </div>
);

const noop = () => {};

export const PatientChart: React.FC = () => {
  const { t } = useBrightChartTranslation();
  const { patientId } = useParams<{ patientId: string }>();
  const [tabIndex, setTabIndex] = useState(0);

  const handleResourceSelect = useCallback(() => {
    // TODO: open resource detail view
  }, []);

  if (!patientId) {
    return (
      <Typography>
        {t(BrightChartStrings.PatientChart_NoPatientSelected)}
      </Typography>
    );
  }

  return (
    <PermissionGate
      requiredPermissions={[
        PatientPermission.Read,
        ClinicalPermission.ClinicalRead,
      ]}
    >
      <Box>
        <Typography variant="h5" gutterBottom>
          {t(BrightChartStrings.PatientChart_Title)}
        </Typography>

        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Patient chart tabs"
        >
          <Tab
            label={t(BrightChartStrings.PatientChart_Summary)}
            id="chart-tab-0"
            aria-controls="chart-tabpanel-0"
          />
          <Tab
            label={t(BrightChartStrings.PatientChart_Problems)}
            id="chart-tab-1"
            aria-controls="chart-tabpanel-1"
          />
          <Tab
            label={t(BrightChartStrings.PatientChart_Medications)}
            id="chart-tab-2"
            aria-controls="chart-tabpanel-2"
          />
          <Tab
            label={t(BrightChartStrings.PatientChart_Allergies)}
            id="chart-tab-3"
            aria-controls="chart-tabpanel-3"
          />
          <Tab
            label={t(BrightChartStrings.PatientChart_Encounters)}
            id="chart-tab-4"
            aria-controls="chart-tabpanel-4"
          />
          <Tab
            label={t(BrightChartStrings.PatientChart_Documents)}
            id="chart-tab-5"
            aria-controls="chart-tabpanel-5"
          />
          <Tab
            label={t(BrightChartStrings.PatientChart_Orders)}
            id="chart-tab-6"
            aria-controls="chart-tabpanel-6"
          />
          <Tab
            label={t(BrightChartStrings.PatientChart_Results)}
            id="chart-tab-7"
            aria-controls="chart-tabpanel-7"
          />
          <Tab
            label={t(BrightChartStrings.PatientChart_Appointments)}
            id="chart-tab-8"
            aria-controls="chart-tabpanel-8"
          />
          <Tab
            label={t(BrightChartStrings.PatientChart_Insurance)}
            id="chart-tab-9"
            aria-controls="chart-tabpanel-9"
          />
          <Tab
            label={t(BrightChartStrings.PatientChart_Billing)}
            id="chart-tab-10"
            aria-controls="chart-tabpanel-10"
          />
        </Tabs>

        <TabPanel value={tabIndex} index={0}>
          <ClinicalTimeline
            patientId={patientId}
            resources={[]}
            onSelect={handleResourceSelect}
          />
        </TabPanel>
        <TabPanel value={tabIndex} index={1}>
          <PermissionGate
            requiredPermissions={[ClinicalPermission.ClinicalRead]}
          >
            <ConditionList conditions={[]} onSelect={noop} onAdd={noop} />
          </PermissionGate>
        </TabPanel>
        <TabPanel value={tabIndex} index={2}>
          <MedicationList medications={[]} onSelect={noop} />
        </TabPanel>
        <TabPanel value={tabIndex} index={3}>
          <PermissionGate
            requiredPermissions={[ClinicalPermission.ClinicalRead]}
          >
            <AllergyList allergies={[]} onSelect={noop} onAdd={noop} />
          </PermissionGate>
        </TabPanel>
        <TabPanel value={tabIndex} index={4}>
          <PermissionGate
            requiredPermissions={[EncounterPermission.EncounterRead]}
          >
            <Typography>
              Encounter list — Module 3 component placeholder
            </Typography>
          </PermissionGate>
        </TabPanel>
        <TabPanel value={tabIndex} index={5}>
          <PermissionGate
            requiredPermissions={[DocumentPermission.DocumentRead]}
          >
            <Typography>
              Document list — Module 4 component placeholder
            </Typography>
          </PermissionGate>
        </TabPanel>
        <TabPanel value={tabIndex} index={6}>
          <PermissionGate requiredPermissions={[OrderPermission.OrderRead]}>
            <Typography>Order list — Module 5 component placeholder</Typography>
          </PermissionGate>
        </TabPanel>
        <TabPanel value={tabIndex} index={7}>
          <PermissionGate requiredPermissions={[OrderPermission.OrderRead]}>
            <Typography>
              Results list — Module 5 component placeholder
            </Typography>
          </PermissionGate>
        </TabPanel>
        <TabPanel value={tabIndex} index={8}>
          <Typography>Appointments — Module 6 component placeholder</Typography>
        </TabPanel>
        <TabPanel value={tabIndex} index={9}>
          <PermissionGate
            requiredPermissions={[BillingPermission.BillingWrite]}
          >
            <Typography>Insurance — Module 7 component placeholder</Typography>
          </PermissionGate>
        </TabPanel>
        <TabPanel value={tabIndex} index={10}>
          <PermissionGate requiredPermissions={[BillingPermission.BillingRead]}>
            <Typography>Billing — Module 7 component placeholder</Typography>
          </PermissionGate>
        </TabPanel>
      </Box>
    </PermissionGate>
  );
};
