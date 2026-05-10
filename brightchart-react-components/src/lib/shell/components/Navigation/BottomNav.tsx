/**
 * BottomNav Component
 *
 * Mobile bottom tab navigation with top-level workspace items.
 *
 * @module shell/components/Navigation/BottomNav
 */
import type {
  BrightChartStringKey,
  INavigationItem,
} from '@brightchain/brightchart-lib';
import { BrightChartStrings } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { usePermissionContext } from '../../contexts/PermissionContext';

export interface BottomNavProps {
  items: INavigationItem[];
}

export const BottomNav: React.FC<BottomNavProps> = ({ items }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasAllPermissions } = usePermissionContext();
  const { t } = useBrightChartTranslation();

  const visibleItems = items.filter(
    (item) =>
      item.requiredPermissions.length === 0 ||
      hasAllPermissions(item.requiredPermissions),
  );

  return (
    <nav
      className="bottom-nav"
      role="navigation"
      aria-label={t(BrightChartStrings.BottomNav_AriaLabel)}
    >
      {visibleItems.map((item) => {
        const isActive = location.pathname.startsWith(item.route);
        return (
          <button
            key={item.id}
            type="button"
            className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
            onClick={() => navigate(item.route)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={t(item.label as BrightChartStringKey)}
          >
            <span className="bottom-nav__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="bottom-nav__label">
              {t(item.label as BrightChartStringKey)}
            </span>
            {item.badge && (
              <span className="bottom-nav__badge">{item.badge}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
