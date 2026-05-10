import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChartStringKey,
  BrightChartStrings,
} from '../../enumerations/BrightChartStrings';
import { BrightChartAmericanEnglishStrings } from './englishUs';

export const BrightChartBritishEnglishStrings: ComponentStrings<BrightChartStringKey> =
  {
    ...BrightChartAmericanEnglishStrings,
    // British spelling overrides
    [BrightChartStrings.ObservationStatus_Cancelled]: 'Cancelled',
    [BrightChartStrings.EncounterStatus_Cancelled]: 'Cancelled',
    [BrightChartStrings.AppointmentStatus_Cancelled]: 'Cancelled',
    [BrightChartStrings.EncounterClass_Ambulatory]: 'Ambulatory',
    [BrightChartStrings.ClaimUse_Preauthorization]: 'Pre-authorisation',
    [BrightChartStrings.EligibilityPurpose_AuthRequirements]:
      'Authorisation Requirements',

    // New keys (ClinicalTimeline, NoteTemplateSelector, WorkflowBoard,
    // ScheduleEditor, Connectivity, NotificationBell, RoleSwitcher,
    // PatientHeader, Sidebar) are inherited from AmericanEnglish via spread.
    // No British spelling overrides needed for these entries.
  };
