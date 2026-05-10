/**
 * PatientHeader — Reusable patient header bar.
 *
 * Displays patient name, age, gender, MRN, high-criticality allergies,
 * and a photo placeholder.
 *
 * @module shell/components/PatientHeader
 */

import type { IPatientResource } from '@brightchain/brightchart-lib';
import { BrightChartStrings } from '@brightchain/brightchart-lib';
import PersonIcon from '@mui/icons-material/Person';
import { Avatar, Box, Chip, Typography } from '@mui/material';
import React from 'react';
import { useBrightChartTranslation } from '../../hooks/useBrightChartTranslation';

export interface PatientHeaderProps {
  patient: IPatientResource;
  /** High-criticality allergy display strings */
  allergies?: string[];
}

/**
 * Compute age from a FHIR birthDate string (YYYY-MM-DD).
 */
function computeAge(birthDate?: string): string {
  if (!birthDate) return 'Unknown';
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return `${age}y`;
}

function getDisplayName(patient: IPatientResource): string {
  const name = patient.name?.[0];
  if (!name) return 'Unknown';
  const given = name.given?.join(' ') ?? '';
  const family = name.family ?? '';
  return `${given} ${family}`.trim() || name.text || 'Unknown';
}

function getMRN(patient: IPatientResource): string {
  const mrn = patient.identifier?.find((id) =>
    id.type?.coding?.some((c) => c.code === 'MR'),
  );
  return mrn?.value ?? patient.id ?? 'N/A';
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  patient,
  allergies = [],
}) => {
  const { t } = useBrightChartTranslation();
  return (
    <Box
      display="flex"
      alignItems="center"
      gap={2}
      p={1.5}
      sx={{ bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}
      role="banner"
      aria-label={t(BrightChartStrings.PatientHeader_AriaLabel)}
    >
      <Avatar sx={{ bgcolor: 'primary.main' }}>
        <PersonIcon />
      </Avatar>
      <Box>
        <Typography variant="subtitle1" fontWeight="bold">
          {getDisplayName(patient)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {computeAge(patient.birthDate)} · {patient.gender ?? 'Unknown'} ·{' '}
          {t(BrightChartStrings.PatientHeader_MRN)} {getMRN(patient)}
        </Typography>
      </Box>
      {allergies.length > 0 && (
        <Box display="flex" gap={0.5} flexWrap="wrap" ml="auto">
          {allergies.map((allergy) => (
            <Chip
              key={allergy}
              label={allergy}
              color="error"
              size="small"
              variant="outlined"
              aria-label={t(
                BrightChartStrings.PatientHeader_AllergyTemplate,
              ).replace('{NAME}', allergy)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
