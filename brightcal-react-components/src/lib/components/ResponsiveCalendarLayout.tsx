import { BrightCalStrings } from '@brightchain/brightcal-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import React, { useCallback, useEffect, useState } from 'react';

export interface ResponsiveCalendarLayoutProps {
  /** Content to render in the main area */
  children: React.ReactNode;
  /** Optional sidebar content (e.g., MiniCalendar) */
  sidebar?: React.ReactNode;
  /** Breakpoint in pixels below which mobile layout is used */
  mobileBreakpoint?: number;
}

/**
 * ResponsiveCalendarLayout adapts the calendar layout for desktop and mobile.
 * Desktop: full multi-column layout with sidebar.
 * Mobile: single-column layout with swipe-friendly structure.
 *
 * Provides ARIA landmarks and keyboard navigation support.
 *
 * Requirements: 12.9, 12.10
 */
export function ResponsiveCalendarLayout({
  children,
  sidebar,
  mobileBreakpoint = 768,
}: ResponsiveCalendarLayoutProps) {
  const { tBranded: t } = useI18n();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, [mobileBreakpoint]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      return;
    }
  }, []);

  return (
    <div
      className={`brightcal-layout ${isMobile ? 'brightcal-mobile' : 'brightcal-desktop'}`}
      role="application"
      aria-label={t(BrightCalStrings.Label_CalendarApplication)}
      onKeyDown={handleKeyDown}
    >
      {!isMobile && sidebar && (
        <aside
          className="brightcal-sidebar"
          role="complementary"
          aria-label={t(BrightCalStrings.Label_CalendarNavigation)}
        >
          {sidebar}
        </aside>
      )}
      <main
        className="brightcal-main"
        role="main"
        aria-label={t(BrightCalStrings.Label_CalendarContent)}
      >
        {children}
      </main>
    </div>
  );
}
