/**
 * Sidebar Component
 *
 * Desktop/tablet sidebar rendering INavigationItem[] with permission-based
 * visibility, active route highlighting, collapsible sub-items, and badge support.
 *
 * @module shell/components/Navigation/Sidebar
 */
import type {
  BrightChartStringKey,
  INavigationItem,
} from '@brightchain/brightchart-lib';
import { BrightChartStrings } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { usePermissionContext } from '../../contexts/PermissionContext';

export interface SidebarProps {
  items: INavigationItem[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  collapsed = false,
  onToggleCollapse,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasAllPermissions } = usePermissionContext();
  const { t } = useBrightChartTranslation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const visibleItems = items.filter(
    (item) =>
      item.requiredPermissions.length === 0 ||
      hasAllPermissions(item.requiredPermissions),
  );

  const renderItem = (item: INavigationItem, depth = 0) => {
    const isActive = location.pathname.startsWith(item.route);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    return (
      <li key={item.id} className="sidebar__item" role="none">
        <button
          type="button"
          className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
          style={{ paddingLeft: `${16 + depth * 16}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.id);
            } else {
              navigate(item.route);
            }
          }}
          aria-current={isActive ? 'page' : undefined}
          aria-expanded={hasChildren ? isExpanded : undefined}
        >
          <span className="sidebar__icon" aria-hidden="true">
            {item.icon}
          </span>
          {!collapsed && (
            <>
              <span className="sidebar__label">
                {t(item.label as BrightChartStringKey)}
              </span>
              {item.badge && (
                <span className="sidebar__badge">{item.badge}</span>
              )}
              {hasChildren && (
                <span className="sidebar__expand" aria-hidden="true">
                  {isExpanded ? '▾' : '▸'}
                </span>
              )}
            </>
          )}
        </button>
        {hasChildren && isExpanded && !collapsed && (
          <ul className="sidebar__children" role="list">
            {item
              .children!.filter(
                (c) =>
                  c.requiredPermissions.length === 0 ||
                  hasAllPermissions(c.requiredPermissions),
              )
              .map((child) => renderItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <nav
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
      role="navigation"
      aria-label={t(BrightChartStrings.Sidebar_NavAriaLabel)}
    >
      {onToggleCollapse && (
        <button
          type="button"
          className="sidebar__collapse-toggle"
          onClick={onToggleCollapse}
          aria-label={
            collapsed
              ? t(BrightChartStrings.Sidebar_ExpandAriaLabel)
              : t(BrightChartStrings.Sidebar_CollapseAriaLabel)
          }
        >
          {collapsed ? '▸' : '◂'}
        </button>
      )}
      <ul className="sidebar__list" role="list">
        {visibleItems.map((item) => renderItem(item))}
      </ul>
    </nav>
  );
};
