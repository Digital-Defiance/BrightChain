/**
 * ClaimBuilder Component
 *
 * Editable claim form with diagnoses (ICD-10), line items (CPT/CDT with
 * modifiers, quantity, charge), insurance selection, and totals.
 * Auto-populates from a superbill when provided.
 *
 * @module billing/ClaimBuilder
 */
import type {
  ClaimStatus,
  ClaimUse,
  IClaimResource,
  IFeeSchedule,
  ISpecialtyProfile,
  ISuperbill,
} from '@brightchain/brightchart-lib';
import { BrightChartStrings } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface ClaimBuilderProps {
  onSubmit: (claim: IClaimResource<string>) => void;
  superbill?: ISuperbill<string>;
  specialtyProfile?: ISpecialtyProfile;
  feeSchedule?: IFeeSchedule;
}

interface DiagnosisEntry {
  sequence: number;
  code: string;
  display: string;
}

interface LineItemEntry {
  sequence: number;
  code: string;
  display: string;
  modifiers: string;
  quantity: number;
  unitPrice: number;
  diagnosisPointers: number[];
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

export const ClaimBuilder: React.FC<ClaimBuilderProps> = ({
  onSubmit,
  superbill,
  specialtyProfile,
  feeSchedule: _feeSchedule,
}) => {
  const { t } = useBrightChartTranslation();

  const [diagnoses, setDiagnoses] = useState<DiagnosisEntry[]>(() => {
    if (!superbill) return [];
    return superbill.diagnoses.map((d, i) => ({
      sequence: i + 1,
      code: d.coding?.[0]?.code ?? '',
      display: d.text ?? d.coding?.[0]?.display ?? '',
    }));
  });

  const [lineItems, setLineItems] = useState<LineItemEntry[]>(() => {
    if (!superbill) return [];
    return superbill.lineItems.map((li) => ({
      sequence: li.sequence,
      code: li.procedureCode.coding?.[0]?.code ?? '',
      display:
        li.procedureCode.text ?? li.procedureCode.coding?.[0]?.display ?? '',
      modifiers: li.modifiers.map((m) => m.coding?.[0]?.code ?? '').join(', '),
      quantity: li.quantity,
      unitPrice: li.unitCharge.value,
      diagnosisPointers: li.diagnosisPointers,
    }));
  });

  const [insurerName, setInsurerName] = useState('');
  const [newDxCode, setNewDxCode] = useState('');
  const [newDxDisplay, setNewDxDisplay] = useState('');
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemDisplay, setNewItemDisplay] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);

  const total = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0),
    [lineItems],
  );

  const addDiagnosis = useCallback(() => {
    if (!newDxCode.trim()) return;
    setDiagnoses((prev) => [
      ...prev,
      {
        sequence: prev.length + 1,
        code: newDxCode.trim(),
        display: newDxDisplay.trim(),
      },
    ]);
    setNewDxCode('');
    setNewDxDisplay('');
  }, [newDxCode, newDxDisplay]);

  const removeDiagnosis = useCallback((seq: number) => {
    setDiagnoses((prev) => prev.filter((d) => d.sequence !== seq));
  }, []);

  const addLineItem = useCallback(() => {
    if (!newItemCode.trim()) return;
    setLineItems((prev) => [
      ...prev,
      {
        sequence: prev.length + 1,
        code: newItemCode.trim(),
        display: newItemDisplay.trim(),
        modifiers: '',
        quantity: newItemQty,
        unitPrice: newItemPrice,
        diagnosisPointers: [],
      },
    ]);
    setNewItemCode('');
    setNewItemDisplay('');
    setNewItemQty(1);
    setNewItemPrice(0);
  }, [newItemCode, newItemDisplay, newItemQty, newItemPrice]);

  const removeLineItem = useCallback((seq: number) => {
    setLineItems((prev) => prev.filter((li) => li.sequence !== seq));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const claim: IClaimResource<string> = {
        resourceType: 'Claim',
        status: 'draft' as ClaimStatus,
        type: { coding: [{ code: 'professional', display: 'Professional' }] },
        use: 'claim' as ClaimUse,
        patient: { reference: superbill?.patientId ?? '' },
        created: new Date().toISOString(),
        provider: { reference: superbill?.providerId ?? '' },
        priority: { coding: [{ code: 'normal' }] },
        insurance: [
          { sequence: 1, focal: true, coverage: { display: insurerName } },
        ],
        diagnosis: diagnoses.map((d) => ({
          sequence: d.sequence,
          diagnosisCodeableConcept: {
            coding: [{ code: d.code, display: d.display }],
          },
        })),
        item: lineItems.map((li) => ({
          sequence: li.sequence,
          productOrService: {
            coding: [{ code: li.code, display: li.display }],
          },
          quantity: { value: li.quantity },
          unitPrice: { value: li.unitPrice, currency: 'USD' },
          net: { value: li.quantity * li.unitPrice, currency: 'USD' },
          diagnosisSequence: li.diagnosisPointers,
        })),
        total: { value: total, currency: 'USD' },
        brightchainMetadata: undefined as never,
      };
      onSubmit(claim);
    },
    [diagnoses, lineItems, insurerName, total, superbill, onSubmit],
  );

  return (
    <div className="claim-builder" data-testid="claim-builder">
      <form onSubmit={handleSubmit} aria-label="Claim builder">
        <h3>Claim Builder</h3>
        {specialtyProfile && (
          <p className="claim-builder__specialty">
            Specialty: {specialtyProfile.displayName}
          </p>
        )}

        <fieldset className="claim-builder__insurance">
          <legend>Insurance</legend>
          <label htmlFor="cb-insurer">Insurer</label>
          <input
            id="cb-insurer"
            type="text"
            value={insurerName}
            onChange={(e) => setInsurerName(e.target.value)}
            aria-label="Insurer name"
          />
        </fieldset>

        <fieldset className="claim-builder__diagnoses">
          <legend>Diagnoses (ICD-10)</legend>
          <ul role="list">
            {diagnoses.map((d) => (
              <li key={d.sequence}>
                {d.code} — {d.display}
                <button
                  type="button"
                  onClick={() => removeDiagnosis(d.sequence)}
                  aria-label={`Remove diagnosis ${d.code}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="claim-builder__add-dx">
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

        <fieldset className="claim-builder__items">
          <legend>Line Items</legend>
          <table aria-label="Claim line items">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li) => (
                <tr key={li.sequence}>
                  <td>{li.code}</td>
                  <td>{li.display}</td>
                  <td>{li.quantity}</td>
                  <td>{formatMoney(li.unitPrice)}</td>
                  <td>{formatMoney(li.quantity * li.unitPrice)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeLineItem(li.sequence)}
                      aria-label={`Remove item ${li.code}`}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="claim-builder__add-item">
            <input
              placeholder="CPT/CDT code"
              value={newItemCode}
              onChange={(e) => setNewItemCode(e.target.value)}
              aria-label="Procedure code"
            />
            <input
              placeholder="Description"
              value={newItemDisplay}
              onChange={(e) => setNewItemDisplay(e.target.value)}
              aria-label="Procedure description"
            />
            <input
              type="number"
              min={1}
              value={newItemQty}
              onChange={(e) => setNewItemQty(Number(e.target.value))}
              aria-label="Quantity"
            />
            <input
              type="number"
              min={0}
              step={0.01}
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(Number(e.target.value))}
              aria-label="Unit price"
            />
            <button type="button" onClick={addLineItem}>
              Add Item
            </button>
          </div>
        </fieldset>

        <div className="claim-builder__total" aria-live="polite">
          <strong>Total: {formatMoney(total)}</strong>
        </div>

        <button type="submit" aria-label="Submit claim">
          {t(BrightChartStrings.Form_SubmitClaim)}
        </button>
      </form>
    </div>
  );
};
