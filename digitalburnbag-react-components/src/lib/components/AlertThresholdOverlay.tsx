import { Fragment } from 'react';
import { ReferenceArea, ReferenceLine } from 'recharts';

export interface IAlertThresholdOverlayProps {
  /** Failure count threshold — renders red dashed line */
  failureThreshold?: number;
  /** Absence duration threshold — renders amber dashed line */
  absenceThreshold?: number;
  /** Label for the failure policy action */
  failurePolicyLabel?: string;
  /** Maximum Y value in the chart data, used to cap the ReferenceArea */
  yAxisMax?: number;
}

/**
 * Renders recharts ReferenceLine and ReferenceArea components
 * for configured alert thresholds. Must be rendered as a child
 * inside a recharts chart component (LineChart, AreaChart, BarChart).
 */
export function AlertThresholdOverlay({
  failureThreshold,
  absenceThreshold,
  failurePolicyLabel,
  yAxisMax,
}: IAlertThresholdOverlayProps) {
  const upperBound = yAxisMax ?? 999999;

  return (
    <Fragment>
      {failureThreshold != null && (
        <>
          <ReferenceLine
            y={failureThreshold}
            stroke="#d32f2f"
            strokeDasharray="6 4"
            label={{
              value: failurePolicyLabel ?? 'Failure Threshold',
              position: 'insideTopRight',
              fill: '#d32f2f',
              fontSize: 12,
            }}
          />
          <ReferenceArea
            y1={failureThreshold}
            y2={upperBound}
            fill="#d32f2f"
            fillOpacity={0.08}
          />
        </>
      )}
      {absenceThreshold != null && (
        <>
          <ReferenceLine
            y={absenceThreshold}
            stroke="#ed6c02"
            strokeDasharray="6 4"
            label={{
              value: 'Absence Threshold',
              position: 'insideTopRight',
              fill: '#ed6c02',
              fontSize: 12,
            }}
          />
          <ReferenceArea
            y1={absenceThreshold}
            y2={upperBound}
            fill="#ed6c02"
            fillOpacity={0.06}
          />
        </>
      )}
    </Fragment>
  );
}
