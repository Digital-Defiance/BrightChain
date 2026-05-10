/**
 * BillingWorkspace Component
 *
 * Workspace root with sub-routing for superbills, claims, claim tracking,
 * EOBs, payments, ledger, fee schedules. Dashboard with counts.
 *
 * @module shell/workspaces/billing/BillingWorkspace
 */
import { BrightChartStrings } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';

const ClaimTrackingView = lazy(() =>
  import('./ClaimTrackingView').then((m) => ({ default: m.ClaimTrackingView })),
);
const PaymentPostingView = lazy(() =>
  import('./PaymentPostingView').then((m) => ({
    default: m.PaymentPostingView,
  })),
);

const Loading: React.FC = () => {
  const { t } = useBrightChartTranslation();
  return (
    <div className="workspace-loading">
      {t(BrightChartStrings.Shell_Loading)}
    </div>
  );
};

const BillingDashboard: React.FC = () => {
  const { t } = useBrightChartTranslation();
  return (
    <div className="billing-dashboard">
      <h2>{t(BrightChartStrings.BillingWS_Title)}</h2>
      <div className="billing-dashboard__cards">
        <div className="billing-dashboard__card">
          <h3>{t(BrightChartStrings.BillingWS_UnbilledEncounters)}</h3>
          <p>0</p>
        </div>
        <div className="billing-dashboard__card">
          <h3>{t(BrightChartStrings.BillingWS_PendingClaims)}</h3>
          <p>0</p>
        </div>
        <div className="billing-dashboard__card">
          <h3>{t(BrightChartStrings.BillingWS_DeniedClaims)}</h3>
          <p>0</p>
        </div>
        <div className="billing-dashboard__card">
          <h3>{t(BrightChartStrings.BillingWS_TodaysPayments)}</h3>
          <p>$0.00</p>
        </div>
      </div>
    </div>
  );
};

export const BillingWorkspace: React.FC = () => {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route index element={<BillingDashboard />} />
        <Route path="tracking" element={<ClaimTrackingView />} />
        <Route path="payments" element={<PaymentPostingView />} />
      </Routes>
    </Suspense>
  );
};
