/**
 * SuperbillForm Component
 *
 * Encounter-level charge capture form with diagnosis entry (ICD-10),
 * procedure line items (CPT/CDT with modifiers, quantity), auto-pricing
 * from fee schedule, encounter auto-populate, and total.
 *
 * @module billing/SuperbillForm
 */
import type {
  ICodeableConcept,
  IEncounterResource,
  IFeeSchedule,
  ISpecialtyProfile,
  ISuperbill,
  ISuperbillLineItem,
  SuperbillStatus,
} from '@brightchain/brightchart-lib';
import { BrightChartStrings } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface SuperbillFormProps {
  encounter?: IEncounterResource<string>;
  onFinalize: (superbill: ISuperbill<string>) => void;
  specialtyProfile?: ISpecialtyProfile;
  feeSchedule?: IFeeSchedule;
}

interface DxEntry {
  index: number;
  code: string;
  display: string;
}

interface ProcEntry {
  sequence: number;
  code: string;
  display: string;
  modifiers: string;
  quantity: number;
  unitCharge: number;
  diagnosisPointers: number[];
}

function lookupCharge(code: string, feeSchedule?: IFeeSchedule): number {
  if (!feeSchedule) return 0;
  const entry = feeSchedule.entries.find((e) => e.code === code);
  return entry?.defaultCharge?.value ?? 0;
}

export const SuperbillForm: React.FC<SuperbillFormProps> = ({
  encounter,
  onFinalize,
  specialtyProfile,
  feeSchedule,
}) => {
  const { t } = useBrightChartTranslation();

  const [diagnoses, setDiagnoses] = useState<DxEntry[]>(() => {
    if (!encounter?.diagnosis) return [];
    return encounter.diagnosis.map((d, i) => ({
      index: i,
      code: d.condition?.reference ?? '',
      display: '',
    }));
  });

  const [procedures, setProcedures] = useState<ProcEntry[]>([]);
  const [newDxCode, setNewDxCode] = useState('');
  const [newDxDisplay, setNewDxDisplay] = useState('');
  const [newProcCode, setNewProcCode] = useState('');
  const [newProcDisplay, setNewProcDisplay] = useState('');
  const [newProcQty, setNewProcQty] = useState(1);

  const total = useMemo(
    () => procedures.reduce((sum, p) => sum + p.quantity * p.unitCharge, 0),
    [procedures],
  );

  const addDiagnosis = useCallback(() => {
    if (!newDxCode.trim()) return;
    setDiagnoses((prev) => [
      ...prev,
      {
        index: prev.length,
        code: newDxCode.trim(),
        display: newDxDisplay.trim(),
      },
    ]);
    setNewDxCode('');
    setNewDxDisplay('');
  }, [newDxCode, newDxDisplay]);

  const addProcedure = useCallback(() => {
    if (!newProcCode.trim()) return;
    const charge = lookupCharge(newProcCode.trim(), feeSchedule);
    setProcedures((prev) => [
      ...prev,
      {
        sequence: prev.length + 1,
        code: newProcCode.trim(),
        display: newProcDisplay.trim(),
        modifiers: '',
        quantity: newProcQty,
        unitCharge: charge,
        diagnosisPointers: [],
      },
    ]);
    setNewProcCode('');
    setNewProcDisplay('');
    setNewProcQty(1);
  }, [newProcCode, newProcDisplay, newProcQty, feeSchedule]);

  const removeProcedure = useCallback((seq: number) => {
    setProcedures((prev) => prev.filter((p) => p.sequence !== seq));
  }, []);

  const handleFinalize = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const superbill: ISuperbill<string> = {
        superbillId: `sb-${Date.now()}`,
        encounterId: encounter?.id ?? '',
        patientId: encounter?.subject?.reference ?? '',
        providerId: encounter?.participant?.[0]?.individual?.reference ?? '',
        dateOfService: new Date(),
        diagnoses: diagnoses.map(
          (d): ICodeableConcept => ({
            coding: [{ code: d.code, display: d.display }],
          }),
        ),
        lineItems: procedures.map(
          (p): ISuperbillLineItem => ({
            sequence: p.sequence,
            procedureCode: { coding: [{ code: p.code, display: p.display }] },
            modifiers: [],
            quantity: p.quantity,
            unitCharge: { value: p.unitCharge, currency: 'USD' },
            totalCharge: { value: p.quantity * p.unitCharge, currency: 'USD' },
            diagnosisPointers: p.diagnosisPointers,
          }),
        ),
        status: 'finalized' as SuperbillStatus,
        totalCharge: { value: total, currency: 'USD' },
      };
      onFinalize(superbill);
    },
    [diagnoses, procedures, total, encounter, onFinalize],
  );

  return (
    <div className="superbill-form" data-testid="superbill-form">
      <form onSubmit={handleFinalize} aria-label="Superbill charge capture">
        <h3>Superbill</h3>
        {specialtyProfile && (
          <p className="superbill-form__specialty">
            Specialty: {specialtyProfile.displayName}
          </p>
        )}
        {encounter && (
          <p className="superbill-form__encounter">Encounter: {encounter.id}</p>
        )}

        <fieldset className="superbill-form__diagnoses">
          <legend>Diagnoses (ICD-10)</legend>
          <ul role="list">
            {diagnoses.map((d) => (
              <li key={d.index}>
                {d.code} — {d.display}
              </li>
            ))}
          </ul>
          <div className="superbill-form__add-dx">
            <input
              placeholder="ICD-10 code"
              value={newDxCode}
              onChange={(e) => setNewDxCode(e.target.value)}
              aria-label="Diagnosis code"
            />
            <input
              placeholder="Description"
              value={newDxDisplay}
              onChange={(e) => setNewDxDisplay(e.target.value)}
              aria-label="Diagnosis description"
            />
            <button type="button" onClick={addDiagnosis}>
              Add Dx
            </button>
          </div>
        </fieldset>

        <fieldset className="superbill-form__procedures">
          <legend>Procedures / Services</legend>
          <table aria-label="Superbill line items">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {procedures.map((p) => (
                <tr key={p.sequence}>
                  <td>{p.code}</td>
                  <td>{p.display}</td>
                  <td>{p.quantity}</td>
                  <td>${p.unitCharge.toFixed(2)}</td>
                  <td>${(p.quantity * p.unitCharge).toFixed(2)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeProcedure(p.sequence)}
                      aria-label={`Remove ${p.code}`}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="superbill-form__add-proc">
            <input
              placeholder="CPT/CDT code"
              value={newProcCode}
              onChange={(e) => setNewProcCode(e.target.value)}
              aria-label="Procedure code"
            />
            <input
              placeholder="Description"
              value={newProcDisplay}
              onChange={(e) => setNewProcDisplay(e.target.value)}
              aria-label="Procedure description"
            />
            <input
              type="number"
              min={1}
              value={newProcQty}
              onChange={(e) => setNewProcQty(Number(e.target.value))}
              aria-label="Quantity"
            />
            <button type="button" onClick={addProcedure}>
              Add Procedure
            </button>
          </div>
        </fieldset>

        <div className="superbill-form__total" aria-live="polite">
          <strong>Total: ${total.toFixed(2)}</strong>
        </div>

        <button type="submit" aria-label="Finalize superbill">
          {t(BrightChartStrings.Form_FinalizeSuperbill)}
        </button>
      </form>
    </div>
  );
};
