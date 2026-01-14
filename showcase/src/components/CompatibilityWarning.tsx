/**
 * @fileoverview Component to display browser compatibility warnings
 */

import { useState } from 'react';
import { useBrowserCompatibility } from './useBrowserCompatibility';
import './CompatibilityWarning.css';

export function CompatibilityWarning() {
  const { report, isFullyCompatible, browserInfo } = useBrowserCompatibility();
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
          <h3>⚠️ Browser Compatibility Notice</h3>
          <button
            className="compatibility-warning-close"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss warning"
          >
            ×
          </button>
        </div>

        <div className="compatibility-warning-body">
          <p>
            Your browser ({browserInfo.name} {browserInfo.version}) may not support all features
            of this demo.
          </p>

          {report.errors.length > 0 && (
            <div className="compatibility-errors">
              <h4>Critical Issues:</h4>
              <ul>
                {report.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {report.warnings.length > 0 && (
            <div className="compatibility-warnings">
              <h4>Warnings:</h4>
              <ul>
                {report.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {report.recommendedFallbacks.length > 0 && (
            <div className="compatibility-fallbacks">
              <h4>Recommended Actions:</h4>
              <ul>
                {report.recommendedFallbacks.map((fallback, index) => (
                  <li key={index}>{fallback}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="compatibility-recommendation">
            For the best experience, please use the latest version of Chrome, Firefox, Safari, or
            Edge.
          </p>
        </div>
      </div>
    </div>
  );
}
