import { FC, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export interface GoogleAnalyticsProps {
  /** GA4 Measurement ID, e.g. "G-XXXXXXXXXX" */
  measurementId?: string;
  /** Skip injection (e.g. dev, no consent). Default: disabled when no id. */
  enabled?: boolean;
  /** Track SPA route changes via react-router. Default: true. */
  trackRouteChanges?: boolean;
  /** Extra config passed to gtag('config', id, ...) */
  config?: Record<string, unknown>;
}

const SCRIPT_ID = 'ga-gtag-script';

function injectGtag(measurementId: string, config?: Record<string, unknown>) {
  if (document.getElementById(SCRIPT_ID)) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false, // we'll send manually for SPA
    ...config,
  });

  const s = document.createElement('script');
  s.id = SCRIPT_ID;
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    measurementId,
  )}`;
  document.head.appendChild(s);
}

export const GoogleAnalytics: FC<GoogleAnalyticsProps> = ({
  measurementId,
  enabled,
  trackRouteChanges = true,
  config,
}) => {
  const isOn =
    (enabled ?? Boolean(measurementId)) && typeof window !== 'undefined';

  // If you're not using react-router, delete this hook + the effect below.
  const location = useLocation();

  useEffect(() => {
    if (!isOn || !measurementId) return;
    injectGtag(measurementId, config);
  }, [isOn, measurementId, config]);

  useEffect(() => {
    if (!isOn || !measurementId || !trackRouteChanges) return;
    window.gtag?.('event', 'page_view', {
      page_path: location.pathname + location.search,
      send_to: measurementId,
    });
  }, [
    isOn,
    measurementId,
    trackRouteChanges,
    location.pathname,
    location.search,
  ]);

  return null; // headless component
};

/** Optional helper for custom events from anywhere in the app. */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined') {
    window.gtag?.('event', name, params ?? {});
  }
}
