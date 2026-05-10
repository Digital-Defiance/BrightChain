/**
 * InsuranceCardEditor Component
 *
 * Form component for entering and editing patient insurance (Coverage)
 * information. Supports create and edit modes, inline validation,
 * and emits a complete ICoverageResource<string> on submit.
 *
 * @module billing/InsuranceCardEditor
 */
import type {
  CoverageStatus,
  ICoverageResource,
} from '@brightchain/brightchart-lib';
import { BrightChartStrings } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

/** Validation error map keyed by field name. */
interface ValidationErrors {
  [field: string]: string;
}

export interface InsuranceCardEditorProps {
  /** Called with the constructed Coverage resource on valid submit. */
  onSubmit: (coverage: ICoverageResource<string>) => void;
  /** Existing coverage to pre-populate for edit mode. */
  coverage?: ICoverageResource<string>;
}

const RELATIONSHIP_OPTIONS = [
  { value: 'self', display: 'Self' },
  { value: 'spouse', display: 'Spouse' },
  { value: 'child', display: 'Child' },
  { value: 'other', display: 'Other' },
];

const PLAN_TYPE_OPTIONS = [
  { value: 'medical', display: 'Medical' },
  { value: 'dental', display: 'Dental' },
  { value: 'vision', display: 'Vision' },
  { value: 'pharmacy', display: 'Pharmacy' },
];

function _extractText(concept?: {
  text?: string;
  coding?: { display?: string }[];
}): string {
  return concept?.text ?? concept?.coding?.[0]?.display ?? '';
}

function _extractMoneyValue(
  coverage?: ICoverageResource<string>,
  typeCode?: string,
): string {
  const entry = coverage?.costToBeneficiary?.find(
    (c) => c.type?.coding?.[0]?.code === typeCode,
  );
  return entry?.valueMoney?.value?.toString() ?? '';
}

export const InsuranceCardEditor: React.FC<InsuranceCardEditorProps> = ({
  onSubmit,
  coverage,
}) => {
  const { t } = useBrightChartTranslation();
  const [planType, setPlanType] = React.useState<string>(
    coverage?.type?.coding?.[0]?.code ?? '',
  );
  const [subscriberName, setSubscriberName] = React.useState<string>(
    coverage?.subscriber?.display ?? '',
  );
  const [memberId, setMemberId] = React.useState<string>(
    coverage?.subscriberId ?? '',
  );
  const [relationship, setRelationship] = React.useState<string>(
    coverage?.relationship?.coding?.[0]?.code ?? 'self',
  );
  const [groupNumber, setGroupNumber] = React.useState<string>(
    coverage?.class?.find((c) => c.type?.coding?.[0]?.code === 'group')
      ?.value ?? '',
  );
  const [payerName, setPayerName] = React.useState<string>(
    coverage?.payor?.[0]?.display ?? '',
  );
  const [errors, setErrors] = React.useState<ValidationErrors>({});

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};
    if (!payerName.trim()) newErrors['payerName'] = 'Payer name is required';
    if (!memberId.trim()) newErrors['memberId'] = 'Member ID is required';
    if (!planType) newErrors['planType'] = 'Plan type is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const result = {
      ...(coverage ?? {}),
      resourceType: 'Coverage' as const,
      status: (coverage?.status ?? 'active') as CoverageStatus,
      subscriberId: memberId,
      subscriber: { display: subscriberName },
      relationship: {
        coding: [
          {
            code: relationship,
            display: RELATIONSHIP_OPTIONS.find((r) => r.value === relationship)
              ?.display,
          },
        ],
      },
      type: {
        coding: [
          {
            code: planType,
            display: PLAN_TYPE_OPTIONS.find((p) => p.value === planType)
              ?.display,
          },
        ],
      },
      payor: [{ display: payerName }],
      class: groupNumber
        ? [
            {
              type: { coding: [{ code: 'group' }] },
              value: groupNumber,
              name: groupNumber,
            },
          ]
        : [],
    } as ICoverageResource<string>;

    onSubmit(result);
  };

  return (
    <div data-testid="insurance-card-editor">
      <form onSubmit={handleSubmit} aria-label="Insurance card editor">
        <div>
          <label htmlFor="ice-payer">
            {t(BrightChartStrings.Insurance_PayerName)}
          </label>
          <input
            id="ice-payer"
            type="text"
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
            aria-label="Payer name"
          />
          {errors['payerName'] && (
            <span role="alert" style={{ color: 'red' }}>
              {errors['payerName']}
            </span>
          )}
        </div>
        <div>
          <label htmlFor="ice-member-id">
            {t(BrightChartStrings.Insurance_MemberID)}
          </label>
          <input
            id="ice-member-id"
            type="text"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            aria-label="Member ID"
          />
          {errors['memberId'] && (
            <span role="alert" style={{ color: 'red' }}>
              {errors['memberId']}
            </span>
          )}
        </div>
        <div>
          <label htmlFor="ice-subscriber">
            {t(BrightChartStrings.Insurance_SubscriberName)}
          </label>
          <input
            id="ice-subscriber"
            type="text"
            value={subscriberName}
            onChange={(e) => setSubscriberName(e.target.value)}
            aria-label="Subscriber name"
          />
        </div>
        <div>
          <label htmlFor="ice-plan-type">
            {t(BrightChartStrings.Insurance_PlanType)}
          </label>
          <select
            id="ice-plan-type"
            value={planType}
            onChange={(e) => setPlanType(e.target.value)}
            aria-label="Plan type"
          >
            <option value="">Select...</option>
            {PLAN_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.display}
              </option>
            ))}
          </select>
          {errors['planType'] && (
            <span role="alert" style={{ color: 'red' }}>
              {errors['planType']}
            </span>
          )}
        </div>
        <div>
          <label htmlFor="ice-relationship">
            {t(BrightChartStrings.Insurance_Relationship)}
          </label>
          <select
            id="ice-relationship"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            aria-label="Relationship to subscriber"
          >
            {RELATIONSHIP_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.display}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ice-group">
            {t(BrightChartStrings.Insurance_GroupNumber)}
          </label>
          <input
            id="ice-group"
            type="text"
            value={groupNumber}
            onChange={(e) => setGroupNumber(e.target.value)}
            aria-label="Group number"
          />
        </div>
        <button type="submit" aria-label="Save insurance information">
          {t(BrightChartStrings.Common_Save)}
        </button>
      </form>
    </div>
  );
};
