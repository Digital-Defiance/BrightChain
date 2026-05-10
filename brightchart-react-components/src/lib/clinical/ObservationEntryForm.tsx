/**
 * ObservationEntryForm Component
 *
 * A form for creating or editing FHIR R4 Observation resources with
 * specialty-aware validation and type-appropriate value inputs.
 *
 * @module clinical/ObservationEntryForm
 */
import type {
  IObservationResource,
  ISpecialtyProfile,
  ObservationStatus,
} from '@brightchain/brightchart-lib';
import { BrightChartStrings } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface ObservationEntryFormProps {
  onSubmit: (obs: IObservationResource<string>) => void;
  observation?: IObservationResource<string>;
  specialtyProfile?: ISpecialtyProfile;
}

type ValueType = 'quantity' | 'string' | 'boolean';

interface FormState {
  categoryText: string;
  codeText: string;
  codeSystem: string;
  valueType: ValueType;
  valueNumeric: string;
  valueUnit: string;
  valueString: string;
  valueBoolean: boolean;
  effectiveDateTime: string;
  notes: string;
}

function initState(obs?: IObservationResource<string>): FormState {
  return {
    categoryText:
      obs?.category?.[0]?.text ??
      obs?.category?.[0]?.coding?.[0]?.display ??
      '',
    codeText: obs?.code?.text ?? obs?.code?.coding?.[0]?.display ?? '',
    codeSystem: obs?.code?.coding?.[0]?.system ?? '',
    valueType: obs?.valueQuantity
      ? 'quantity'
      : obs?.valueBoolean !== undefined
        ? 'boolean'
        : 'string',
    valueNumeric: obs?.valueQuantity?.value?.toString() ?? '',
    valueUnit: obs?.valueQuantity?.unit ?? '',
    valueString: obs?.valueString ?? '',
    valueBoolean: obs?.valueBoolean ?? false,
    effectiveDateTime: obs?.effectiveDateTime ?? '',
    notes: obs?.note?.[0]?.text ?? '',
  };
}

export const ObservationEntryForm: React.FC<ObservationEntryFormProps> = ({
  onSubmit,
  observation,
  specialtyProfile: _specialtyProfile,
}) => {
  const { t } = useBrightChartTranslation();
  const [form, setForm] = useState<FormState>(() => initState(observation));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(initState(observation));
  }, [observation]);

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

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!form.codeText.trim()) errs['codeText'] = 'Code is required';
    if (!form.effectiveDateTime.trim())
      errs['effectiveDateTime'] = 'Effective date/time is required';
    if (form.valueType === 'quantity' && !form.valueNumeric.trim())
      errs['valueNumeric'] = 'Value is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      const obs: IObservationResource<string> = {
        ...observation,
        resourceType: 'Observation',
        status: (observation?.status ?? 'preliminary') as ObservationStatus,
        code: {
          text: form.codeText,
          coding: form.codeSystem
            ? [{ system: form.codeSystem, display: form.codeText }]
            : undefined,
        },
        brightchainMetadata: observation?.brightchainMetadata ?? {
          blockId: '',
          creatorMemberId: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          poolId: '',
          encryptionType: 0 as never,
        },
        effectiveDateTime: form.effectiveDateTime,
        ...(form.categoryText
          ? { category: [{ text: form.categoryText }] }
          : {}),
        ...(form.valueType === 'quantity'
          ? {
              valueQuantity: {
                value: parseFloat(form.valueNumeric),
                unit: form.valueUnit,
              },
            }
          : {}),
        ...(form.valueType === 'string'
          ? { valueString: form.valueString }
          : {}),
        ...(form.valueType === 'boolean'
          ? { valueBoolean: form.valueBoolean }
          : {}),
        ...(form.notes ? { note: [{ text: form.notes }] } : {}),
      };
      onSubmit(obs);
    },
    [form, observation, validate, onSubmit],
  );

  return (
    <form
      className="observation-entry-form"
      onSubmit={handleSubmit}
      aria-label="Observation Entry Form"
    >
      <div className="observation-entry-form__field">
        <label htmlFor="obs-category">Category</label>
        <input
          id="obs-category"
          type="text"
          value={form.categoryText}
          onChange={(e) => update('categoryText', e.target.value)}
        />
      </div>

      <div className="observation-entry-form__field">
        <label htmlFor="obs-code">Code *</label>
        <input
          id="obs-code"
          type="text"
          value={form.codeText}
          onChange={(e) => update('codeText', e.target.value)}
          aria-required="true"
        />
        {errors['codeText'] && (
          <span className="observation-entry-form__error" role="alert">
            {errors['codeText']}
          </span>
        )}
      </div>

      <fieldset className="observation-entry-form__field">
        <legend>Value Type</legend>
        {(['quantity', 'string', 'boolean'] as ValueType[]).map((vt) => (
          <label key={vt}>
            <input
              type="radio"
              name="valueType"
              value={vt}
              checked={form.valueType === vt}
              onChange={() => update('valueType', vt)}
            />
            {vt}
          </label>
        ))}
      </fieldset>

      {form.valueType === 'quantity' && (
        <div className="observation-entry-form__field">
          <label htmlFor="obs-value-num">Value *</label>
          <input
            id="obs-value-num"
            type="number"
            step="any"
            value={form.valueNumeric}
            onChange={(e) => update('valueNumeric', e.target.value)}
            aria-required="true"
          />
          {errors['valueNumeric'] && (
            <span className="observation-entry-form__error" role="alert">
              {errors['valueNumeric']}
            </span>
          )}
          <label htmlFor="obs-unit">Unit</label>
          <input
            id="obs-unit"
            type="text"
            value={form.valueUnit}
            onChange={(e) => update('valueUnit', e.target.value)}
          />
        </div>
      )}
      {form.valueType === 'string' && (
        <div className="observation-entry-form__field">
          <label htmlFor="obs-value-str">Value</label>
          <input
            id="obs-value-str"
            type="text"
            value={form.valueString}
            onChange={(e) => update('valueString', e.target.value)}
          />
        </div>
      )}
      {form.valueType === 'boolean' && (
        <div className="observation-entry-form__field">
          <label htmlFor="obs-value-bool">Value</label>
          <input
            id="obs-value-bool"
            type="checkbox"
            checked={form.valueBoolean}
            onChange={(e) => update('valueBoolean', e.target.checked)}
          />
        </div>
      )}

      <div className="observation-entry-form__field">
        <label htmlFor="obs-datetime">Effective Date/Time *</label>
        <input
          id="obs-datetime"
          type="datetime-local"
          value={form.effectiveDateTime}
          onChange={(e) => update('effectiveDateTime', e.target.value)}
          aria-required="true"
        />
        {errors['effectiveDateTime'] && (
          <span className="observation-entry-form__error" role="alert">
            {errors['effectiveDateTime']}
          </span>
        )}
      </div>

      <div className="observation-entry-form__field">
        <label htmlFor="obs-notes">Notes</label>
        <textarea
          id="obs-notes"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
        />
      </div>

      <button type="submit" className="observation-entry-form__submit">
        {observation
          ? t(BrightChartStrings.Form_UpdateObservation)
          : t(BrightChartStrings.Form_CreateObservation)}
      </button>
    </form>
  );
};
