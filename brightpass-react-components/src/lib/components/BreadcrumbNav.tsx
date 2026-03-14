/**
 * BreadcrumbNav — Hierarchical breadcrumb navigation for BrightPass routes.
 *
 * Parses the current route to render a sequence of breadcrumb links.
 * The last segment is rendered as non-clickable text (current page).
 * All labels use i18n via `useBrightPassTranslation()`.
 *
 * Supported routes:
 *   /brightpass                          → "BrightPass"
 *   /brightpass/vault/:vaultId           → "BrightPass" > "Vault: {name}"
 *   /brightpass/vault/:vaultId/audit     → "BrightPass" > "Vault: {name}" > "Audit Log"
 *   /brightpass/tools/generator          → "BrightPass" > "Password Generator"
 *
 * Requirements: 14.3
 */

import type { BrightPassStringKey } from '@brightchain/brightpass-lib';
import { BrightPassStrings } from '@brightchain/brightpass-lib';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useBrightPass } from '../context/BrightPassProvider';
import { useBrightPassTranslation } from '../hooks/useBrightPassTranslation';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

/**
 * Build the breadcrumb items array from the current pathname.
 * Exported for testability.
 */
export function buildBreadcrumbs(
  pathname: string,
  t: (key: BrightPassStringKey, vars?: Record<string, string>) => string,
  vaultName?: string,
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [];

  // Normalize: strip trailing slash, ensure starts with /brightpass
  const normalized = pathname.replace(/\/+$/, '');
  if (!normalized.startsWith('/brightpass')) {
    return items;
  }

  // Segments after /brightpass
  const rest = normalized.slice('/brightpass'.length);
  const segments = rest.split('/').filter(Boolean);

  // Root: "BrightPass" is always the first crumb
  items.push({
    label: t(BrightPassStrings.Breadcrumb_BrightPass),
    to: '/brightpass',
  });

  if (segments.length === 0) {
    // At /brightpass — root is the current page (non-clickable)
    delete items[items.length - 1].to;
    return items;
  }

  if (segments[0] === 'vault' && segments.length >= 2) {
    const vaultId = segments[1];

    items.push({
      label: t(BrightPassStrings.Breadcrumb_VaultTemplate, {
        NAME: vaultName || vaultId,
      }),
      to: `/brightpass/vault/${vaultId}`,
    });

    if (segments[2] === 'audit') {
      items.push({
        label: t(BrightPassStrings.Breadcrumb_AuditLog),
      });
    }
  } else if (segments[0] === 'tools' && segments[1] === 'generator') {
    items.push({
      label: t(BrightPassStrings.Breadcrumb_PasswordGenerator),
    });
  }

  // The last item should have no `to` (non-clickable)
  if (items.length > 0) {
    delete items[items.length - 1].to;
  }

  return items;
}

const BreadcrumbNav: React.FC = () => {
  const { pathname } = useLocation();
  const { t } = useBrightPassTranslation();
  const { vault } = useBrightPass();

  const vaultName = vault?.metadata?.name;
  const items = buildBreadcrumbs(pathname, t, vaultName);

  if (items.length <= 1) {
    // Don't render breadcrumbs when there's only the root item
    return null;
  }

  return (
    <Breadcrumbs
      separator={<NavigateNextIcon fontSize="small" />}
      aria-label="breadcrumb"
      sx={{ mb: 2 }}
    >
      {items.map((item, index) =>
        item.to ? (
          <Link
            key={item.to}
            component={RouterLink}
            to={item.to}
            underline="hover"
            color="inherit"
          >
            {item.label}
          </Link>
        ) : (
          <Typography key={`crumb-${index}`} color="text.primary">
            {item.label}
          </Typography>
        ),
      )}
    </Breadcrumbs>
  );
};

export default BreadcrumbNav;
