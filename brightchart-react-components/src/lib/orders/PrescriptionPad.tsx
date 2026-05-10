/**
 * PrescriptionPad Component
 *
 * A form for creating or editing FHIR R4 MedicationRequest resources.
 * Supports medication search, dosage builder (dose/route/frequency/duration),
 * dispense quantity, refills, substitution, pharmacy selector, and
 * drug interaction warnings.
 *
 * @module orders/PrescriptionPad
 */
import type {
  ICodeableConcept,
  IDosage,
  IMedicationRequestResource,
  IOrderSpecialtyExtension,
  MedicationRequestDispenseRequest,
  MedicationRequestSubstitution,
} from '@brightchain/brightchart-lib';
import {
  MedicationRequestIntent,
  MedicationRequestStatus,
  RequestPriority,
} from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

/** Drug interaction warning returned by the interaction checker. */
export interface IDrugInteractionWarning {
  /** Severity: low, moderate, high */
  severity: 'low' | 'moderate' | 'high';
  /** Description of the interaction */
  description: string;
  /** Interacting medication display name */
  interactingMedication?: string;
}

export interface PrescriptionPadProps {
  /** Callback invoked with a complete IMedicationRequestResource on submit. */
  onSubmit: (medicationRequest: IMedicationRequestResource<string>) => void;
  /** Existing MedicationRequest for edit mode. */
  medicationRequest?: IMedicationRequestResource<string>;
  /** Specialty profile for medication code filtering. */
  specialtyProfile?: IOrderSpecialtyExtension;
  /** Optional callback to check drug interactions. Returns warnings for the given medication code. */
  interactionChecker?: (
    medicationCode: ICodeableConcept,
  ) => Promise<IDrugInteractionWarning[]>;
}

const COMMON_ROUTES: { value: string; label: string }[] = [
  { value: 'oral', label: 'Oral' },
  { value: 'topical', label: 'Topical' },
  { value: 'intravenous', label: 'Intravenous (IV)' },
  { value: 'intramuscular', label: 'Intramuscular (IM)' },
  { value: 'subcutaneous', label: 'Subcutaneous (SC)' },
  { value: 'inhalation', label: 'Inhalation' },
  { value: 'rectal', label: 'Rectal' },
  { value: 'ophthalmic', label: 'Ophthalmic' },
  { value: 'otic', label: 'Otic' },
  { value: 'nasal', label: 'Nasal' },
  { value: 'transdermal', label: 'Transdermal' },
];

const COMMON_FREQUENCIES: { value: string; label: string }[] = [
  { value: 'QD', label: 'Once daily (QD)' },
  { value: 'BID', label: 'Twice daily (BID)' },
  { value: 'TID', label: 'Three times daily (TID)' },
  { value: 'QID', label: 'Four times daily (QID)' },
  { value: 'Q4H', label: 'Every 4 hours (Q4H)' },
  { value: 'Q6H', label: 'Every 6 hours (Q6H)' },
  { value: 'Q8H', label: 'Every 8 hours (Q8H)' },
  { value: 'Q12H', label: 'Every 12 hours (Q12H)' },
  { value: 'QHS', label: 'At bedtime (QHS)' },
  { value: 'PRN', label: 'As needed (PRN)' },
];

interface FormState {
  medicationText: string;
  medicationSystem: string;
  medicationCode: string;
  doseValue: string;
  doseUnit: string;
  route: string;
  frequency: string;
  durationValue: string;
  durationUnit: string;
  dispenseQuantity: string;
  dispenseUnit: string;
  refills: string;
  substitutionAllowed: boolean;
  pharmacyId: string;
  pharmacyName: string;
  notes: string;
  priority: RequestPriority;
}

function initState(mr?: IMedicationRequestResource<string>): FormState {
  const dosage = mr?.dosageInstruction?.[0];
  const doseAndRate = dosage?.doseAndRate?.[0];
  return {
    medicationText:
      mr?.medicationCodeableConcept?.text ??
      mr?.medicationCodeableConcept?.coding?.[0]?.display ??
      '',
    medicationSystem: mr?.medicationCodeableConcept?.coding?.[0]?.system ?? '',
    medicationCode: mr?.medicationCodeableConcept?.coding?.[0]?.code ?? '',
    doseValue: doseAndRate?.doseQuantity?.value?.toString() ?? '',
    doseUnit: doseAndRate?.doseQuantity?.unit ?? '',
    route: dosage?.route?.coding?.[0]?.code ?? dosage?.route?.text ?? '',
    frequency:
      dosage?.timing?.code?.coding?.[0]?.code ??
      dosage?.timing?.code?.text ??
      '',
    durationValue:
      dosage?.timing?.repeat?.boundsDuration?.value?.toString() ?? '',
    durationUnit: dosage?.timing?.repeat?.boundsDuration?.unit ?? 'd',
    dispenseQuantity: mr?.dispenseRequest?.quantity?.value?.toString() ?? '',
    dispenseUnit: mr?.dispenseRequest?.quantity?.unit ?? '',
    refills: mr?.dispenseRequest?.numberOfRepeatsAllowed?.toString() ?? '0',
    substitutionAllowed: mr?.substitution?.allowedBoolean ?? true,
    pharmacyId: mr?.dispenseRequest?.performer?.reference ?? '',
    pharmacyName: mr?.dispenseRequest?.performer?.display ?? '',
    notes: mr?.note?.[0]?.text ?? '',
    priority: (mr?.priority as RequestPriority) ?? RequestPriority.Routine,
  };
}

export const PrescriptionPad: React.FC<PrescriptionPadProps> = ({
  onSubmit,
  medicationRequest,
  specialtyProfile,
  interactionChecker,
}) => {
  const { tEnum } = useBrightChartTranslation();

  const PRIORITY_OPTIONS = [
    RequestPriority.Routine,
    RequestPriority.Urgent,
    RequestPriority.Asap,
    RequestPriority.Stat,
  ].map((v) => ({ value: v, label: tEnum(RequestPriority, v) }));

  const [form, setForm] = useState<FormState>(() =>
    initState(medicationRequest),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [interactionWarnings, setInteractionWarnings] = useState<
    IDrugInteractionWarning[]
  >([]);
  const [checkingInteractions, setCheckingInteractions] = useState(false);

  useEffect(() => {
    setForm(initState(medicationRequest));
  }, [medicationRequest]);

  const update = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  /** Filterable medication options from specialty profile order templates. */
  const medicationOptions = useMemo(() => {
    if (!specialtyProfile?.orderTemplates) return [];
    return specialtyProfile.orderTemplates.map((t) => ({
      templateId: t.templateId,
      displayName: t.displayName,
      codes: t.codes,
    }));
  }, [specialtyProfile]);

  const filteredMedicationOptions = useMemo(() => {
    const query = form.medicationText.toLowerCase();
    if (!query) return medicationOptions;
    return medicationOptions.filter((o) =>
      o.displayName.toLowerCase().includes(query),
    );
  }, [medicationOptions, form.medicationText]);

  /** Check drug interactions when medication changes. */
  useEffect(() => {
    if (!interactionChecker || !form.medicationText.trim()) {
      setInteractionWarnings([]);
      return;
    }

    const medicationConcept: ICodeableConcept = {
      text: form.medicationText,
      ...(form.medicationSystem || form.medicationCode
        ? {
            coding: [
              {
                system: form.medicationSystem || undefined,
                code: form.medicationCode || undefined,
                display: form.medicationText,
              },
            ],
          }
        : {}),
    };

    let cancelled = false;
    setCheckingInteractions(true);
    interactionChecker(medicationConcept)
      .then((warnings) => {
        if (!cancelled) setInteractionWarnings(warnings);
      })
      .catch(() => {
        if (!cancelled) setInteractionWarnings([]);
      })
      .finally(() => {
        if (!cancelled) setCheckingInteractions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    interactionChecker,
    form.medicationText,
    form.medicationSystem,
    form.medicationCode,
  ]);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!form.medicationText.trim())
      errs['medicationText'] = 'Medication is required';
    if (!form.doseValue.trim()) errs['doseValue'] = 'Dose is required';
    if (!form.route.trim()) errs['route'] = 'Route is required';
    if (!form.frequency.trim()) errs['frequency'] = 'Frequency is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      const dosage: IDosage = {
        text: `${form.doseValue} ${form.doseUnit} ${form.route} ${form.frequency}`.trim(),
        route: {
          text:
            COMMON_ROUTES.find((r) => r.value === form.route)?.label ??
            form.route,
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: form.route,
              display:
                COMMON_ROUTES.find((r) => r.value === form.route)?.label ??
                form.route,
            },
          ],
        },
        timing: {
          code: {
            text:
              COMMON_FREQUENCIES.find((f) => f.value === form.frequency)
                ?.label ?? form.frequency,
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/v3-GTSAbbreviation',
                code: form.frequency,
                display:
                  COMMON_FREQUENCIES.find((f) => f.value === form.frequency)
                    ?.label ?? form.frequency,
              },
            ],
          },
          ...(form.durationValue
            ? {
                repeat: {
                  boundsDuration: {
                    value: parseFloat(form.durationValue),
                    unit: form.durationUnit,
                    system: 'http://unitsofmeasure.org',
                    code: form.durationUnit,
                  },
                },
              }
            : {}),
        },
        doseAndRate: [
          {
            doseQuantity: {
              value: parseFloat(form.doseValue),
              unit: form.doseUnit || undefined,
            },
          },
        ],
      };

      const dispenseRequest: MedicationRequestDispenseRequest<string> = {
        ...(form.dispenseQuantity
          ? {
              quantity: {
                value: parseFloat(form.dispenseQuantity),
                unit: form.dispenseUnit || undefined,
              },
            }
          : {}),
        numberOfRepeatsAllowed: parseInt(form.refills, 10) || 0,
        ...(form.pharmacyId
          ? {
              performer: {
                reference: form.pharmacyId,
                display: form.pharmacyName || undefined,
              },
            }
          : {}),
      };

      const substitution: MedicationRequestSubstitution<string> = {
        allowedBoolean: form.substitutionAllowed,
      };

      const mr: IMedicationRequestResource<string> = {
        ...medicationRequest,
        resourceType: 'MedicationRequest',
        status: medicationRequest?.status ?? MedicationRequestStatus.Draft,
        intent: medicationRequest?.intent ?? MedicationRequestIntent.Order,
        priority: form.priority,
        medicationCodeableConcept: {
          text: form.medicationText,
          ...(form.medicationSystem || form.medicationCode
            ? {
                coding: [
                  {
                    system: form.medicationSystem || undefined,
                    code: form.medicationCode || undefined,
                    display: form.medicationText,
                  },
                ],
              }
            : {}),
        },
        subject: medicationRequest?.subject ?? { reference: '' },
        brightchainMetadata: medicationRequest?.brightchainMetadata ?? {
          blockId: '',
          creatorMemberId: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          poolId: '',
          encryptionType: 0 as never,
        },
        dosageInstruction: [dosage],
        dispenseRequest,
        substitution,
        ...(form.notes ? { note: [{ text: form.notes }] } : {}),
      };

      onSubmit(mr);
    },
    [form, medicationRequest, validate, onSubmit],
  );

  return (
    <form
      className="prescription-pad"
      onSubmit={handleSubmit}
      aria-label="Prescription Pad"
    >
      {/* Interaction Warnings */}
      {interactionWarnings.length > 0 && (
        <div className="prescription-pad__warnings" role="alert">
          <strong>Drug Interaction Warnings:</strong>
          <ul>
            {interactionWarnings.map((w, i) => (
              <li
                key={i}
                className={`prescription-pad__warning prescription-pad__warning--${w.severity}`}
              >
                <span className="prescription-pad__warning-severity">
                  [{w.severity.toUpperCase()}]
                </span>{' '}
                {w.description}
                {w.interactingMedication &&
                  ` (interacts with ${w.interactingMedication})`}
              </li>
            ))}
          </ul>
        </div>
      )}
      {checkingInteractions && (
        <div className="prescription-pad__checking" aria-live="polite">
          Checking drug interactions...
        </div>
      )}

      {/* Medication (searchable) */}
      <div className="prescription-pad__field">
        <label htmlFor="rx-medication">Medication *</label>
        <input
          id="rx-medication"
          type="text"
          value={form.medicationText}
          onChange={(e) => update('medicationText', e.target.value)}
          placeholder="Search medication..."
          aria-required="true"
          list="rx-medication-options"
        />
        {medicationOptions.length > 0 && (
          <datalist id="rx-medication-options">
            {filteredMedicationOptions.map((opt) => (
              <option key={opt.templateId} value={opt.displayName} />
            ))}
          </datalist>
        )}
        {errors['medicationText'] && (
          <span className="prescription-pad__error" role="alert">
            {errors['medicationText']}
          </span>
        )}
      </div>

      {/* Medication Code System */}
      <div className="prescription-pad__field">
        <label htmlFor="rx-medication-system">Code System</label>
        <input
          id="rx-medication-system"
          type="text"
          value={form.medicationSystem}
          onChange={(e) => update('medicationSystem', e.target.value)}
          placeholder="e.g. http://www.nlm.nih.gov/research/umls/rxnorm"
        />
      </div>

      {/* Priority */}
      <div className="prescription-pad__field">
        <label htmlFor="rx-priority">Priority</label>
        <select
          id="rx-priority"
          value={form.priority}
          onChange={(e) =>
            update('priority', e.target.value as RequestPriority)
          }
        >
          {PRIORITY_OPTIONS.map((po) => (
            <option key={po.value} value={po.value}>
              {po.label}
            </option>
          ))}
        </select>
      </div>

      {/* Dosage Builder */}
      <fieldset className="prescription-pad__dosage">
        <legend>Dosage Instructions</legend>

        {/* Dose */}
        <div className="prescription-pad__field prescription-pad__field--inline">
          <label htmlFor="rx-dose-value">Dose *</label>
          <input
            id="rx-dose-value"
            type="number"
            value={form.doseValue}
            onChange={(e) => update('doseValue', e.target.value)}
            placeholder="e.g. 500"
            aria-required="true"
            min="0"
            step="any"
          />
          <input
            id="rx-dose-unit"
            type="text"
            value={form.doseUnit}
            onChange={(e) => update('doseUnit', e.target.value)}
            placeholder="mg"
            aria-label="Dose unit"
          />
          {errors['doseValue'] && (
            <span className="prescription-pad__error" role="alert">
              {errors['doseValue']}
            </span>
          )}
        </div>

        {/* Route */}
        <div className="prescription-pad__field">
          <label htmlFor="rx-route">Route *</label>
          <select
            id="rx-route"
            value={form.route}
            onChange={(e) => update('route', e.target.value)}
            aria-required="true"
          >
            <option value="">Select route...</option>
            {COMMON_ROUTES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {errors['route'] && (
            <span className="prescription-pad__error" role="alert">
              {errors['route']}
            </span>
          )}
        </div>

        {/* Frequency */}
        <div className="prescription-pad__field">
          <label htmlFor="rx-frequency">Frequency *</label>
          <select
            id="rx-frequency"
            value={form.frequency}
            onChange={(e) => update('frequency', e.target.value)}
            aria-required="true"
          >
            <option value="">Select frequency...</option>
            {COMMON_FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          {errors['frequency'] && (
            <span className="prescription-pad__error" role="alert">
              {errors['frequency']}
            </span>
          )}
        </div>

        {/* Duration */}
        <div className="prescription-pad__field prescription-pad__field--inline">
          <label htmlFor="rx-duration-value">Duration</label>
          <input
            id="rx-duration-value"
            type="number"
            value={form.durationValue}
            onChange={(e) => update('durationValue', e.target.value)}
            placeholder="e.g. 10"
            min="0"
            step="1"
          />
          <select
            id="rx-duration-unit"
            value={form.durationUnit}
            onChange={(e) => update('durationUnit', e.target.value)}
            aria-label="Duration unit"
          >
            <option value="d">Days</option>
            <option value="wk">Weeks</option>
            <option value="mo">Months</option>
          </select>
        </div>
      </fieldset>

      {/* Dispense Quantity */}
      <div className="prescription-pad__field prescription-pad__field--inline">
        <label htmlFor="rx-dispense-qty">Dispense Quantity</label>
        <input
          id="rx-dispense-qty"
          type="number"
          value={form.dispenseQuantity}
          onChange={(e) => update('dispenseQuantity', e.target.value)}
          placeholder="e.g. 30"
          min="0"
          step="1"
        />
        <input
          id="rx-dispense-unit"
          type="text"
          value={form.dispenseUnit}
          onChange={(e) => update('dispenseUnit', e.target.value)}
          placeholder="tablets"
          aria-label="Dispense unit"
        />
      </div>

      {/* Refills */}
      <div className="prescription-pad__field">
        <label htmlFor="rx-refills">Refills</label>
        <input
          id="rx-refills"
          type="number"
          value={form.refills}
          onChange={(e) => update('refills', e.target.value)}
          min="0"
          step="1"
        />
      </div>

      {/* Substitution */}
      <div className="prescription-pad__field prescription-pad__field--checkbox">
        <label htmlFor="rx-substitution">
          <input
            id="rx-substitution"
            type="checkbox"
            checked={form.substitutionAllowed}
            onChange={(e) => update('substitutionAllowed', e.target.checked)}
          />
          Substitution allowed
        </label>
      </div>

      {/* Pharmacy Selector */}
      <div className="prescription-pad__field">
        <label htmlFor="rx-pharmacy-id">Pharmacy Reference</label>
        <input
          id="rx-pharmacy-id"
          type="text"
          value={form.pharmacyId}
          onChange={(e) => update('pharmacyId', e.target.value)}
          placeholder="Organization/pharmacy-123"
        />
      </div>

      <div className="prescription-pad__field">
        <label htmlFor="rx-pharmacy-name">Pharmacy Name</label>
        <input
          id="rx-pharmacy-name"
          type="text"
          value={form.pharmacyName}
          onChange={(e) => update('pharmacyName', e.target.value)}
          placeholder="e.g. Main Street Pharmacy"
        />
      </div>

      {/* Notes */}
      <div className="prescription-pad__field">
        <label htmlFor="rx-notes">Notes</label>
        <textarea
          id="rx-notes"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Additional notes for the prescription"
        />
      </div>

      <button type="submit" className="prescription-pad__submit">
        {medicationRequest ? 'Update Prescription' : 'Create Prescription'}
      </button>
    </form>
  );
};
