/**
 * OrderEntryForm Component
 *
 * A form for creating or editing FHIR R4 ServiceRequest resources.
 * Supports lab orders, imaging orders, referrals, and procedure requests
 * with specialty-aware code filtering and inline validation.
 *
 * @module orders/OrderEntryForm
 */
import type {
  ICodeableConcept,
  IOrderSpecialtyExtension,
  IReference,
  IServiceRequestResource,
} from '@brightchain/brightchart-lib';
import {
  RequestPriority,
  ServiceRequestIntent,
  ServiceRequestStatus,
} from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

/** Supported order type categories. */
export type OrderType = 'lab' | 'imaging' | 'referral' | 'procedure';

export interface OrderEntryFormProps {
  /** Callback invoked with a complete IServiceRequestResource on submit. */
  onSubmit: (serviceRequest: IServiceRequestResource<string>) => void;
  /** Existing ServiceRequest for edit mode. */
  serviceRequest?: IServiceRequestResource<string>;
  /** Specialty profile for code filtering. */
  specialtyProfile?: IOrderSpecialtyExtension;
  /** Encounter reference to attach to the order. */
  encounter?: IReference<string>;
}

/** Maps order types to FHIR category codings. */
const ORDER_TYPE_CATEGORIES: Record<OrderType, ICodeableConcept> = {
  lab: {
    coding: [
      {
        system: 'http://snomed.info/sct',
        code: '108252007',
        display: 'Laboratory procedure',
      },
    ],
    text: 'Laboratory',
  },
  imaging: {
    coding: [
      {
        system: 'http://snomed.info/sct',
        code: '363679005',
        display: 'Imaging',
      },
    ],
    text: 'Imaging',
  },
  referral: {
    coding: [
      {
        system: 'http://snomed.info/sct',
        code: '3457005',
        display: 'Patient referral',
      },
    ],
    text: 'Referral',
  },
  procedure: {
    coding: [
      {
        system: 'http://snomed.info/sct',
        code: '387713003',
        display: 'Surgical procedure',
      },
    ],
    text: 'Procedure',
  },
};

const ORDER_TYPES: OrderType[] = ['lab', 'imaging', 'referral', 'procedure'];

interface FormState {
  orderType: OrderType;
  codeText: string;
  codeSystem: string;
  codeValue: string;
  priority: RequestPriority;
  performerRef: string;
  performerDisplay: string;
  reasonText: string;
  specimenRef: string;
  specimenDisplay: string;
  bodySiteText: string;
  notes: string;
  patientInstruction: string;
}

function detectOrderType(sr?: IServiceRequestResource<string>): OrderType {
  const catText = sr?.category?.[0]?.text?.toLowerCase() ?? '';
  if (catText.includes('lab')) return 'lab';
  if (catText.includes('imag')) return 'imaging';
  if (catText.includes('referral')) return 'referral';
  if (catText.includes('procedure') || catText.includes('surg'))
    return 'procedure';
  return 'lab';
}

function initState(sr?: IServiceRequestResource<string>): FormState {
  return {
    orderType: detectOrderType(sr),
    codeText: sr?.code?.text ?? sr?.code?.coding?.[0]?.display ?? '',
    codeSystem: sr?.code?.coding?.[0]?.system ?? '',
    codeValue: sr?.code?.coding?.[0]?.code ?? '',
    priority: (sr?.priority as RequestPriority) ?? RequestPriority.Routine,
    performerRef: sr?.performer?.[0]?.reference ?? '',
    performerDisplay: sr?.performer?.[0]?.display ?? '',
    reasonText:
      sr?.reasonCode?.[0]?.text ??
      sr?.reasonCode?.[0]?.coding?.[0]?.display ??
      '',
    specimenRef: sr?.specimen?.[0]?.reference ?? '',
    specimenDisplay: sr?.specimen?.[0]?.display ?? '',
    bodySiteText:
      sr?.bodySite?.[0]?.text ?? sr?.bodySite?.[0]?.coding?.[0]?.display ?? '',
    notes: sr?.note?.[0]?.text ?? '',
    patientInstruction: sr?.patientInstruction ?? '',
  };
}

export const OrderEntryForm: React.FC<OrderEntryFormProps> = ({
  onSubmit,
  serviceRequest,
  specialtyProfile,
  encounter,
}) => {
  const { tEnum } = useBrightChartTranslation();

  const PRIORITY_OPTIONS = [
    RequestPriority.Routine,
    RequestPriority.Urgent,
    RequestPriority.Asap,
    RequestPriority.Stat,
  ].map((v) => ({ value: v, label: tEnum(RequestPriority, v) }));

  const [form, setForm] = useState<FormState>(() => initState(serviceRequest));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(initState(serviceRequest));
  }, [serviceRequest]);

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

  /** Filterable code options from specialty profile order templates. */
  const codeOptions = useMemo(() => {
    if (!specialtyProfile?.orderTemplates) return [];
    return specialtyProfile.orderTemplates.map((t) => ({
      templateId: t.templateId,
      displayName: t.displayName,
      codes: t.codes,
    }));
  }, [specialtyProfile]);

  const filteredCodeOptions = useMemo(() => {
    const query = form.codeText.toLowerCase();
    if (!query) return codeOptions;
    return codeOptions.filter((o) =>
      o.displayName.toLowerCase().includes(query),
    );
  }, [codeOptions, form.codeText]);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!form.codeText.trim()) errs['codeText'] = 'Order code is required';
    if (
      form.orderType === 'lab' &&
      !form.specimenRef.trim() &&
      !form.specimenDisplay.trim()
    ) {
      // Specimen is recommended for lab but not strictly required — skip hard error
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      const sr: IServiceRequestResource<string> = {
        ...serviceRequest,
        resourceType: 'ServiceRequest',
        status: serviceRequest?.status ?? ServiceRequestStatus.Draft,
        intent: serviceRequest?.intent ?? ServiceRequestIntent.Order,
        category: [ORDER_TYPE_CATEGORIES[form.orderType]],
        priority: form.priority,
        code: {
          text: form.codeText,
          ...(form.codeSystem || form.codeValue
            ? {
                coding: [
                  {
                    system: form.codeSystem || undefined,
                    code: form.codeValue || undefined,
                    display: form.codeText,
                  },
                ],
              }
            : {}),
        },
        subject: serviceRequest?.subject ?? { reference: '' },
        brightchainMetadata: serviceRequest?.brightchainMetadata ?? {
          blockId: '',
          creatorMemberId: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          poolId: '',
          encryptionType: 0 as never,
        },
        ...(encounter ? { encounter } : {}),
        ...(form.performerRef
          ? {
              performer: [
                {
                  reference: form.performerRef,
                  display: form.performerDisplay || undefined,
                },
              ],
            }
          : {}),
        ...(form.reasonText ? { reasonCode: [{ text: form.reasonText }] } : {}),
        ...(form.specimenRef
          ? {
              specimen: [
                {
                  reference: form.specimenRef,
                  display: form.specimenDisplay || undefined,
                },
              ],
            }
          : {}),
        ...(form.bodySiteText
          ? { bodySite: [{ text: form.bodySiteText }] }
          : {}),
        ...(form.notes ? { note: [{ text: form.notes }] } : {}),
        ...(form.patientInstruction
          ? { patientInstruction: form.patientInstruction }
          : {}),
      };

      onSubmit(sr);
    },
    [form, serviceRequest, encounter, validate, onSubmit],
  );

  return (
    <form
      className="order-entry-form"
      onSubmit={handleSubmit}
      aria-label="Order Entry Form"
    >
      {/* Order Type */}
      <div className="order-entry-form__field">
        <label htmlFor="order-type">Order Type *</label>
        <select
          id="order-type"
          value={form.orderType}
          onChange={(e) => update('orderType', e.target.value as OrderType)}
          aria-required="true"
        >
          {ORDER_TYPES.map((ot) => (
            <option key={ot} value={ot}>
              {ORDER_TYPE_CATEGORIES[ot].text}
            </option>
          ))}
        </select>
      </div>

      {/* Code (searchable) */}
      <div className="order-entry-form__field">
        <label htmlFor="order-code">Order Code *</label>
        <input
          id="order-code"
          type="text"
          value={form.codeText}
          onChange={(e) => update('codeText', e.target.value)}
          placeholder="Search order code..."
          aria-required="true"
          list="order-code-options"
        />
        {codeOptions.length > 0 && (
          <datalist id="order-code-options">
            {filteredCodeOptions.map((opt) => (
              <option key={opt.templateId} value={opt.displayName} />
            ))}
          </datalist>
        )}
        {errors['codeText'] && (
          <span className="order-entry-form__error" role="alert">
            {errors['codeText']}
          </span>
        )}
      </div>

      {/* Code System */}
      <div className="order-entry-form__field">
        <label htmlFor="order-code-system">Code System</label>
        <input
          id="order-code-system"
          type="text"
          value={form.codeSystem}
          onChange={(e) => update('codeSystem', e.target.value)}
          placeholder="e.g. http://loinc.org"
        />
      </div>

      {/* Priority */}
      <div className="order-entry-form__field">
        <label htmlFor="order-priority">Priority</label>
        <select
          id="order-priority"
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

      {/* Performer */}
      <div className="order-entry-form__field">
        <label htmlFor="order-performer">Performer Reference</label>
        <input
          id="order-performer"
          type="text"
          value={form.performerRef}
          onChange={(e) => update('performerRef', e.target.value)}
          placeholder="Practitioner/123"
        />
      </div>

      <div className="order-entry-form__field">
        <label htmlFor="order-performer-display">Performer Name</label>
        <input
          id="order-performer-display"
          type="text"
          value={form.performerDisplay}
          onChange={(e) => update('performerDisplay', e.target.value)}
          placeholder="Dr. Smith"
        />
      </div>

      {/* Reason */}
      <div className="order-entry-form__field">
        <label htmlFor="order-reason">Reason</label>
        <input
          id="order-reason"
          type="text"
          value={form.reasonText}
          onChange={(e) => update('reasonText', e.target.value)}
          placeholder="Clinical reason for order"
        />
      </div>

      {/* Specimen (shown for lab orders) */}
      {form.orderType === 'lab' && (
        <>
          <div className="order-entry-form__field">
            <label htmlFor="order-specimen">Specimen Reference</label>
            <input
              id="order-specimen"
              type="text"
              value={form.specimenRef}
              onChange={(e) => update('specimenRef', e.target.value)}
              placeholder="Specimen/123"
            />
          </div>
          <div className="order-entry-form__field">
            <label htmlFor="order-specimen-display">Specimen Description</label>
            <input
              id="order-specimen-display"
              type="text"
              value={form.specimenDisplay}
              onChange={(e) => update('specimenDisplay', e.target.value)}
              placeholder="e.g. Blood, Urine"
            />
          </div>
        </>
      )}

      {/* Body Site */}
      <div className="order-entry-form__field">
        <label htmlFor="order-bodysite">Body Site</label>
        <input
          id="order-bodysite"
          type="text"
          value={form.bodySiteText}
          onChange={(e) => update('bodySiteText', e.target.value)}
          placeholder="e.g. Left arm"
        />
      </div>

      {/* Notes */}
      <div className="order-entry-form__field">
        <label htmlFor="order-notes">Notes</label>
        <textarea
          id="order-notes"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Additional notes for the order"
        />
      </div>

      {/* Patient Instructions */}
      <div className="order-entry-form__field">
        <label htmlFor="order-patient-instructions">Patient Instructions</label>
        <textarea
          id="order-patient-instructions"
          value={form.patientInstruction}
          onChange={(e) => update('patientInstruction', e.target.value)}
          placeholder="Instructions for the patient"
        />
      </div>

      <button type="submit" className="order-entry-form__submit">
        {serviceRequest ? 'Update Order' : 'Create Order'}
      </button>
    </form>
  );
};
