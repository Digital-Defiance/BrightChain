/**
 * @fileoverview Component to display browser compatibility warnings
 */

import { useState } from 'react';
import { useShowcaseI18n } from '../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../i18n/showcaseStrings';
import './CompatibilityWarning.css';
import { useBrowserCompatibility } from './useBrowserCompatibility';

export function CompatibilityWarning() {
  const { report, isFullyCompatible, browserInfo } = useBrowserCompatibility();
  const { t } = useShowcaseI18n();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if fully compatible or dismissed
  if (isFullyCompatible || dismissed) {
    return null;
  }

  // Don't show if only warnings (no errors)
  if (report.errors.length === 0) {
    return null;
  }

  return (
    <div className="compatibility-warning">
      <div className="compatibility-warning-content">
        <div className="compatibility-warning-header">
          <h3>{t(ShowcaseStrings.Compat_Title)}</h3>
          <button
            className="compatibility-warning-close"
            onClick={() => setDismissed(true)}
            aria-label={t(ShowcaseStrings.Compat_DismissAriaLabel)}
          >
            ×
          </button>
        </div>

        <div className="compatibility-warning-body">
          <p>
            {t(ShowcaseStrings.Compat_BrowserNotice, {
              BROWSER: browserInfo.name,
              VERSION: browserInfo.version,
            })}
          </p>

          {report.errors.length > 0 && (
            <div className="compatibility-errors">
              <h4>{t(ShowcaseStrings.Compat_CriticalIssues)}</h4>
              <ul>
                {report.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {report.warnings.length > 0 && (
            <div className="compatibility-warnings">
              <h4>{t(ShowcaseStrings.Compat_Warnings)}</h4>
              <ul>
                {report.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {report.recommendedFallbacks.length > 0 && (
            <div className="compatibility-fallbacks">
              <h4>{t(ShowcaseStrings.Compat_RecommendedActions)}</h4>
              <ul>
                {report.recommendedFallbacks.map((fallback, index) => (
                  <li key={index}>{fallback}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="compatibility-recommendation">
            {t(ShowcaseStrings.Compat_Recommendation)}
          </p>
        </div>
      </div>
    </div>
  );
}
