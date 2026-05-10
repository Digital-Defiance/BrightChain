/**
 * Navigation Configs — Predefined navigation configurations per workspace.
 *
 * Labels use i18n string keys (BrightChartStrings) for internationalization.
 * Icons use FontAwesome IconDefinitions rendered via FontAwesomeIcon.
 *
 * @module shell/config/navigationConfigs
 */

import {
  faCalendarDays,
  faChair,
  faClipboardList,
  faCreditCard,
  faFileInvoiceDollar,
  faFileLines,
  faGear,
  faHeart,
  faHistory,
  faInbox,
  faList,
  faMoneyCheckDollar,
  faPaw,
  faPeopleGroup,
  faReceipt,
  faScaleBalanced,
  faShieldHalved,
  faSitemap,
  faSliders,
  faTractor,
  faUserCheck,
  faUserPlus,
  faUsers,
  faUserShield,
  faVial,
} from '@awesome.me/kit-a20d532681/icons/classic/solid';
import type {
  INavigationConfig,
  INavigationItem,
} from '@brightchain/brightchart-lib';
import {
  BillingPermission,
  BrightChartStrings,
  ClinicalPermission,
  DocumentPermission,
  EncounterPermission,
  OrderPermission,
  PatientPermission,
  SchedulingPermission,
} from '@brightchain/brightchart-lib';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

/** Specialty-aware label key helper */
function patientLabelKey(specialtyCode: string): string {
  return specialtyCode === 'veterinary'
    ? BrightChartStrings.Nav_Clients
    : BrightChartStrings.Nav_Patients;
}

/** Build clinician navigation items */
function buildClinicianItems(specialtyCode: string): INavigationItem[] {
  const items: INavigationItem[] = [
    {
      id: 'clin-patients',
      label: patientLabelKey(specialtyCode),
      icon: <FontAwesomeIcon icon={faUsers} />,
      route: 'patients',
      requiredPermissions: [PatientPermission.Read],
      visible: true,
    },
    {
      id: 'clin-encounters',
      label: BrightChartStrings.Nav_Encounters,
      icon: <FontAwesomeIcon icon={faClipboardList} />,
      route: 'encounters',
      requiredPermissions: [EncounterPermission.EncounterRead],
      visible: true,
    },
    {
      id: 'clin-schedule',
      label: BrightChartStrings.Nav_Schedule,
      icon: <FontAwesomeIcon icon={faCalendarDays} />,
      route: 'schedule',
      requiredPermissions: [SchedulingPermission.SchedulingRead],
      visible: true,
    },
    {
      id: 'clin-inbox',
      label: BrightChartStrings.Nav_Inbox,
      icon: <FontAwesomeIcon icon={faInbox} />,
      route: 'inbox',
      requiredPermissions: [
        DocumentPermission.DocumentRead,
        OrderPermission.OrderRead,
      ],
      visible: true,
    },
  ];

  // Dental-specific items
  if (specialtyCode === 'dental') {
    items.push({
      id: 'clin-operatory',
      label: BrightChartStrings.Nav_OperatoryView,
      icon: <FontAwesomeIcon icon={faChair} />,
      route: 'operatory',
      requiredPermissions: [EncounterPermission.EncounterRead],
      visible: true,
    });
    items.push({
      id: 'clin-treatment-plans',
      label: BrightChartStrings.Nav_TreatmentPlans,
      icon: <FontAwesomeIcon icon={faFileLines} />,
      route: 'treatment-plans',
      requiredPermissions: [ClinicalPermission.ClinicalRead],
      visible: true,
    });
  }

  // Veterinary-specific items
  if (specialtyCode === 'veterinary') {
    items.push({
      id: 'clin-species-filter',
      label: BrightChartStrings.Nav_SpeciesFilter,
      icon: <FontAwesomeIcon icon={faPaw} />,
      route: 'species-filter',
      requiredPermissions: [PatientPermission.Read],
      visible: true,
    });
    items.push({
      id: 'clin-farm-calls',
      label: BrightChartStrings.Nav_FarmCalls,
      icon: <FontAwesomeIcon icon={faTractor} />,
      route: 'farm-calls',
      requiredPermissions: [SchedulingPermission.SchedulingRead],
      visible: true,
    });
  }

  return items;
}

export function getClinicianNav(
  specialtyCode: string,
  roleCode: string,
): INavigationConfig {
  return {
    items: buildClinicianItems(specialtyCode),
    specialtyCode,
    roleCode,
  };
}

export function getPatientPortalNav(specialtyCode: string): INavigationConfig {
  return {
    items: [
      {
        id: 'portal-health',
        label: BrightChartStrings.Nav_MyHealth,
        icon: <FontAwesomeIcon icon={faHeart} />,
        route: 'health',
        requiredPermissions: [PatientPermission.Read],
        visible: true,
      },
      {
        id: 'portal-appointments',
        label: BrightChartStrings.Nav_Appointments,
        icon: <FontAwesomeIcon icon={faCalendarDays} />,
        route: 'appointments',
        requiredPermissions: [PatientPermission.Read],
        visible: true,
      },
      {
        id: 'portal-results',
        label: BrightChartStrings.Nav_TestResults,
        icon: <FontAwesomeIcon icon={faVial} />,
        route: 'results',
        requiredPermissions: [PatientPermission.Read],
        visible: true,
      },
      {
        id: 'portal-billing',
        label: BrightChartStrings.Nav_BillsPayments,
        icon: <FontAwesomeIcon icon={faReceipt} />,
        route: 'billing',
        requiredPermissions: [PatientPermission.Read],
        visible: true,
      },
    ],
    specialtyCode,
    roleCode: 'patient',
  };
}

export function getFrontDeskNav(specialtyCode: string): INavigationConfig {
  return {
    items: [
      {
        id: 'fd-schedule',
        label: BrightChartStrings.Nav_Schedule,
        icon: <FontAwesomeIcon icon={faCalendarDays} />,
        route: 'schedule',
        requiredPermissions: [SchedulingPermission.SchedulingRead],
        visible: true,
      },
      {
        id: 'fd-checkin',
        label: BrightChartStrings.Nav_CheckIn,
        icon: <FontAwesomeIcon icon={faUserCheck} />,
        route: 'check-in',
        requiredPermissions: [EncounterPermission.EncounterWrite],
        visible: true,
      },
      {
        id: 'fd-waitlist',
        label: BrightChartStrings.Nav_Waitlist,
        icon: <FontAwesomeIcon icon={faList} />,
        route: 'waitlist',
        requiredPermissions: [SchedulingPermission.SchedulingWrite],
        visible: true,
      },
      {
        id: 'fd-registration',
        label: BrightChartStrings.Nav_Registration,
        icon: <FontAwesomeIcon icon={faUserPlus} />,
        route: 'registration',
        requiredPermissions: [PatientPermission.Write],
        visible: true,
      },
      {
        id: 'fd-insurance',
        label: BrightChartStrings.Nav_Insurance,
        icon: <FontAwesomeIcon icon={faShieldHalved} />,
        route: 'insurance',
        requiredPermissions: [BillingPermission.BillingWrite],
        visible: true,
      },
    ],
    specialtyCode,
    roleCode: 'front-desk',
  };
}

export function getBillingNav(specialtyCode: string): INavigationConfig {
  return {
    items: [
      {
        id: 'bill-superbills',
        label: BrightChartStrings.Nav_Superbills,
        icon: <FontAwesomeIcon icon={faFileInvoiceDollar} />,
        route: 'superbills',
        requiredPermissions: [BillingPermission.BillingWrite],
        visible: true,
      },
      {
        id: 'bill-claims',
        label: BrightChartStrings.Nav_Claims,
        icon: <FontAwesomeIcon icon={faFileLines} />,
        route: 'claims',
        requiredPermissions: [BillingPermission.BillingWrite],
        visible: true,
      },
      {
        id: 'bill-tracking',
        label: BrightChartStrings.Nav_ClaimTracking,
        icon: <FontAwesomeIcon icon={faHistory} />,
        route: 'tracking',
        requiredPermissions: [BillingPermission.BillingRead],
        visible: true,
      },
      {
        id: 'bill-payments',
        label: BrightChartStrings.Nav_Payments,
        icon: <FontAwesomeIcon icon={faCreditCard} />,
        route: 'payments',
        requiredPermissions: [BillingPermission.BillingWrite],
        visible: true,
      },
      {
        id: 'bill-ledger',
        label: BrightChartStrings.Nav_PatientLedger,
        icon: <FontAwesomeIcon icon={faScaleBalanced} />,
        route: 'ledger',
        requiredPermissions: [BillingPermission.BillingRead],
        visible: true,
      },
      {
        id: 'bill-fees',
        label: BrightChartStrings.Nav_FeeSchedules,
        icon: <FontAwesomeIcon icon={faMoneyCheckDollar} />,
        route: 'fee-schedules',
        requiredPermissions: [BillingPermission.BillingAdmin],
        visible: true,
      },
    ],
    specialtyCode,
    roleCode: 'billing',
  };
}

export function getAdminNav(specialtyCode: string): INavigationConfig {
  return {
    items: [
      {
        id: 'admin-users',
        label: BrightChartStrings.Nav_Users,
        icon: <FontAwesomeIcon icon={faPeopleGroup} />,
        route: 'users',
        requiredPermissions: [PatientPermission.Admin],
        visible: true,
      },
      {
        id: 'admin-roles',
        label: BrightChartStrings.Nav_Roles,
        icon: <FontAwesomeIcon icon={faUserShield} />,
        route: 'roles',
        requiredPermissions: [PatientPermission.Admin],
        visible: true,
      },
      {
        id: 'admin-audit',
        label: BrightChartStrings.Nav_AuditLog,
        icon: <FontAwesomeIcon icon={faHistory} />,
        route: 'audit',
        requiredPermissions: [ClinicalPermission.ClinicalAdmin],
        visible: true,
      },
      {
        id: 'admin-specialty',
        label: BrightChartStrings.Nav_SpecialtyConfig,
        icon: <FontAwesomeIcon icon={faSliders} />,
        route: 'specialty',
        requiredPermissions: [EncounterPermission.EncounterAdmin],
        visible: true,
      },
      {
        id: 'admin-settings',
        label: BrightChartStrings.Nav_Settings,
        icon: <FontAwesomeIcon icon={faGear} />,
        route: 'settings',
        requiredPermissions: [BillingPermission.BillingAdmin],
        visible: true,
      },
      {
        id: 'admin-organizations',
        label: BrightChartStrings.Nav_Organizations,
        icon: <FontAwesomeIcon icon={faSitemap} />,
        route: 'organizations',
        requiredPermissions: [PatientPermission.Admin],
        visible: true,
      },
    ],
    specialtyCode,
    roleCode: 'admin',
  };
}
