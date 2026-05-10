/**
 * EncounterCheckInForm Component
 *
 * A form for creating new encounters or editing existing ones. Supports
 * patient selection, encounter class/type/priority, participants,
 * location, reason codes, and appointment reference. Uses workflow config
 * to set the initial status and workflow state.
 *
 * @module encounter/EncounterCheckInForm
 */
import type {
  EncounterStatus,
  IEncounterResource,
  IEncounterWorkflowConfig,
  ISpecialtyProfile,
} from '@brightchain/brightchart-lib';
import {
  BrightChartStrings,
  ENCOUNTER_CLASS_AMB,
  ENCOUNTER_CLASS_EMER,
  ENCOUNTER_CLASS_HH,
  ENCOUNTER_CLASS_IMP,
  ENCOUNTER_CLASS_VR,
} from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface EncounterCheckInFormProps {
  onSubmit: (encounter: IEncounterResource<string>) => void;
  encounter?: IEncounterResource<string>;
  specialtyProfile?: ISpecialtyProfile;
  workflowConfig?: IEncounterWorkflowConfig;
}

const WORKFLOW_STATE_EXT_URL =
  'http://brightchart.org/fhir/StructureDefinition/encounter-workflow-state';

const DEFAULT_CLASS_OPTIONS = [
  ENCOUNTER_CLASS_AMB,
  ENCOUNTER_CLASS_IMP,
  ENCOUNTER_CLASS_EMER,
  ENCOUNTER_CLASS_HH,
  ENCOUNTER_CLASS_VR,
];

interface FormState {
  patientRef: string;
  patientDisplay: string;
  classCode: string;
  typeText: string;
  typeCode: string;
  priorityText: string;
  participants: Array<{ reference: string; display: string; roleText: string }>;
  locationRef: string;
  locationDisplay: string;
  reasonCodes: string[];
  appointmentRef: string;
}

function initState(enc?: IEncounterResource<string>): FormState {
  return {
    patientRef: enc?.subject?.reference ?? '',
    patientDisplay: enc?.subject?.display ?? '',
    classCode: enc?.class.code ?? 'AMB',
    typeText:
      enc?.type?.[0]?.text ?? enc?.type?.[0]?.coding?.[0]?.display ?? '',
    typeCode: enc?.type?.[0]?.coding?.[0]?.code ?? '',
    priorityText:
      enc?.priority?.text ?? enc?.priority?.coding?.[0]?.display ?? '',
    participants:
      enc?.participant?.map((p) => ({
        reference: p.individual?.reference ?? '',
        display: p.individual?.display ?? '',
        roleText: p.type?.[0]?.text ?? p.type?.[0]?.coding?.[0]?.display ?? '',
      })) ?? [],
    locationRef: enc?.location?.[0]?.location.reference ?? '',
    locationDisplay: enc?.location?.[0]?.location.display ?? '',
    reasonCodes:
      enc?.reasonCode?.map((rc) => rc.text ?? rc.coding?.[0]?.display ?? '') ??
      [],
    appointmentRef: enc?.appointment?.[0]?.reference ?? '',
  };
}

export const EncounterCheckInForm: React.FC<EncounterCheckInFormProps> = ({
  onSubmit,
  encounter,
  specialtyProfile: _specialtyProfile,
  workflowConfig,
}) => {
  const { t } = useBrightChartTranslation();
  const [form, setForm] = useState<FormState>(() => initState(encounter));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(initState(encounter));
  }, [encounter]);

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

  const addParticipant = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      participants: [
        ...prev.participants,
        { reference: '', display: '', roleText: '' },
      ],
    }));
  }, []);

  const removeParticipant = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== idx),
    }));
  }, []);

  const updateParticipant = useCallback(
    (idx: number, field: string, value: string) => {
      setForm((prev) => ({
        ...prev,
        participants: prev.participants.map((p, i) =>
          i === idx ? { ...p, [field]: value } : p,
        ),
      }));
    },
    [],
  );

  const addReasonCode = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      reasonCodes: [...prev.reasonCodes, ''],
    }));
  }, []);

  const removeReasonCode = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      reasonCodes: prev.reasonCodes.filter((_, i) => i !== idx),
    }));
  }, []);

  const updateReasonCode = useCallback((idx: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      reasonCodes: prev.reasonCodes.map((rc, i) => (i === idx ? value : rc)),
    }));
  }, []);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!form.patientRef.trim()) errs['patientRef'] = 'Patient is required';
    if (!form.classCode.trim())
      errs['classCode'] = 'Encounter class is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      // Determine initial status from workflow config
      let initialStatus: EncounterStatus = 'arrived' as EncounterStatus;
      let workflowStateCode: string | undefined;

      if (workflowConfig) {
        const defaultState = workflowConfig.states.find(
          (s) => s.code === workflowConfig.defaultInitialState,
        );
        if (defaultState) {
          initialStatus = defaultState.mappedFhirStatus;
          workflowStateCode = defaultState.code;
        }
      }

      const classOption = DEFAULT_CLASS_OPTIONS.find(
        (c) => c.code === form.classCode,
      ) ?? {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: form.classCode,
      };

      const enc: IEncounterResource<string> = {
        ...encounter,
        resourceType: 'Encounter',
        status: initialStatus,
        class: classOption,
        brightchainMetadata: encounter?.brightchainMetadata ?? {
          blockId: '',
          creatorMemberId: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          poolId: '',
          encryptionType: 0 as never,
        },
        subject: {
          reference: form.patientRef,
          display: form.patientDisplay || undefined,
        },
        ...(form.typeText
          ? {
              type: [
                {
                  text: form.typeText,
                  ...(form.typeCode
                    ? {
                        coding: [
                          { code: form.typeCode, display: form.typeText },
                        ],
                      }
                    : {}),
                },
              ],
            }
          : {}),
        ...(form.priorityText ? { priority: { text: form.priorityText } } : {}),
        ...(form.participants.length > 0
          ? {
              participant: form.participants
                .filter((p) => p.reference.trim())
                .map((p) => ({
                  individual: {
                    reference: p.reference,
                    display: p.display || undefined,
                  },
                  ...(p.roleText ? { type: [{ text: p.roleText }] } : {}),
                })),
            }
          : {}),
        ...(form.locationRef
          ? {
              location: [
                {
                  location: {
                    reference: form.locationRef,
                    display: form.locationDisplay || undefined,
                  },
                },
              ],
            }
          : {}),
        ...(form.reasonCodes.filter(Boolean).length > 0
          ? {
              reasonCode: form.reasonCodes
                .filter(Boolean)
                .map((rc) => ({ text: rc })),
            }
          : {}),
        ...(form.appointmentRef
          ? { appointment: [{ reference: form.appointmentRef }] }
          : {}),
        ...(workflowStateCode
          ? {
              extension: [
                ...(encounter?.extension?.filter(
                  (e) => e.url !== WORKFLOW_STATE_EXT_URL,
                ) ?? []),
                {
                  url: WORKFLOW_STATE_EXT_URL,
                  valueString: workflowStateCode,
                },
              ],
            }
          : {}),
      };

      onSubmit(enc);
    },
    [form, encounter, workflowConfig, validate, onSubmit],
  );

  return (
    <form
      className="encounter-checkin-form"
      onSubmit={handleSubmit}
      aria-label="Encounter Check-In Form"
    >
      {/* Patient */}
      <div className="encounter-checkin-form__field">
        <label htmlFor="enc-patient">Patient Reference *</label>
        <input
          id="enc-patient"
          type="text"
          value={form.patientRef}
          onChange={(e) => update('patientRef', e.target.value)}
          placeholder="Patient/123"
          aria-required="true"
        />
        {errors['patientRef'] && (
          <span className="encounter-checkin-form__error" role="alert">
            {errors['patientRef']}
          </span>
        )}
      </div>

      <div className="encounter-checkin-form__field">
        <label htmlFor="enc-patient-display">Patient Name</label>
        <input
          id="enc-patient-display"
          type="text"
          value={form.patientDisplay}
          onChange={(e) => update('patientDisplay', e.target.value)}
          placeholder="Search patient..."
        />
      </div>

      {/* Class */}
      <div className="encounter-checkin-form__field">
        <label htmlFor="enc-class">Encounter Class *</label>
        <select
          id="enc-class"
          value={form.classCode}
          onChange={(e) => update('classCode', e.target.value)}
          aria-required="true"
        >
          {DEFAULT_CLASS_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.display ?? c.code}
            </option>
          ))}
        </select>
        {errors['classCode'] && (
          <span className="encounter-checkin-form__error" role="alert">
            {errors['classCode']}
          </span>
        )}
      </div>

      {/* Type */}
      <div className="encounter-checkin-form__field">
        <label htmlFor="enc-type">Encounter Type</label>
        <input
          id="enc-type"
          type="text"
          value={form.typeText}
          onChange={(e) => update('typeText', e.target.value)}
          placeholder="Search encounter type..."
        />
      </div>

      <div className="encounter-checkin-form__field">
        <label htmlFor="enc-type-code">Type Code</label>
        <input
          id="enc-type-code"
          type="text"
          value={form.typeCode}
          onChange={(e) => update('typeCode', e.target.value)}
          placeholder="e.g. 270427003"
        />
      </div>

      {/* Priority */}
      <div className="encounter-checkin-form__field">
        <label htmlFor="enc-priority">Priority</label>
        <input
          id="enc-priority"
          type="text"
          value={form.priorityText}
          onChange={(e) => update('priorityText', e.target.value)}
          placeholder="e.g. Urgent, Routine"
        />
      </div>

      {/* Participants */}
      <fieldset className="encounter-checkin-form__fieldset">
        <legend>Participants</legend>
        {form.participants.map((p, idx) => (
          <div key={idx} className="encounter-checkin-form__participant-row">
            <input
              type="text"
              value={p.reference}
              onChange={(e) =>
                updateParticipant(idx, 'reference', e.target.value)
              }
              placeholder="Practitioner/123"
              aria-label={`Participant ${idx + 1} reference`}
            />
            <input
              type="text"
              value={p.display}
              onChange={(e) =>
                updateParticipant(idx, 'display', e.target.value)
              }
              placeholder="Name"
              aria-label={`Participant ${idx + 1} name`}
            />
            <input
              type="text"
              value={p.roleText}
              onChange={(e) =>
                updateParticipant(idx, 'roleText', e.target.value)
              }
              placeholder="Role"
              aria-label={`Participant ${idx + 1} role`}
            />
            <button
              type="button"
              onClick={() => removeParticipant(idx)}
              aria-label={`Remove participant ${idx + 1}`}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="encounter-checkin-form__add"
          onClick={addParticipant}
        >
          + Add Participant
        </button>
      </fieldset>

      {/* Location */}
      <div className="encounter-checkin-form__field">
        <label htmlFor="enc-location">Location Reference</label>
        <input
          id="enc-location"
          type="text"
          value={form.locationRef}
          onChange={(e) => update('locationRef', e.target.value)}
          placeholder="Location/123"
        />
      </div>

      <div className="encounter-checkin-form__field">
        <label htmlFor="enc-location-display">Location Name</label>
        <input
          id="enc-location-display"
          type="text"
          value={form.locationDisplay}
          onChange={(e) => update('locationDisplay', e.target.value)}
          placeholder="Room 101"
        />
      </div>

      {/* Reason Codes */}
      <fieldset className="encounter-checkin-form__fieldset">
        <legend>Reason Codes</legend>
        {form.reasonCodes.map((rc, idx) => (
          <div key={idx} className="encounter-checkin-form__reason-row">
            <input
              type="text"
              value={rc}
              onChange={(e) => updateReasonCode(idx, e.target.value)}
              placeholder="Reason for visit"
              aria-label={`Reason code ${idx + 1}`}
            />
            <button
              type="button"
              onClick={() => removeReasonCode(idx)}
              aria-label={`Remove reason code ${idx + 1}`}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="encounter-checkin-form__add"
          onClick={addReasonCode}
        >
          + Add Reason Code
        </button>
      </fieldset>

      {/* Appointment Reference */}
      <div className="encounter-checkin-form__field">
        <label htmlFor="enc-appointment">Appointment Reference</label>
        <input
          id="enc-appointment"
          type="text"
          value={form.appointmentRef}
          onChange={(e) => update('appointmentRef', e.target.value)}
          placeholder="Appointment/123"
        />
      </div>

      <button type="submit" className="encounter-checkin-form__submit">
        {encounter
          ? t(BrightChartStrings.Form_UpdateEncounter)
          : t(BrightChartStrings.Form_CheckIn)}
      </button>
    </form>
  );
};
