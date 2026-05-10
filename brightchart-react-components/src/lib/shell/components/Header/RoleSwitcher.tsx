/**
 * RoleSwitcher — Dropdown to switch between healthcare roles.
 *
 * When the user selects a different role, the active context is updated
 * and the browser navigates to the workspace matching the new role.
 *
 * Only visible when the user has multiple roles.
 *
 * @module shell/components/Header/RoleSwitcher
 */

import type { IHealthcareRole } from '@brightchain/brightchart-lib';
import {
  ADMIN,
  BrightChartStrings,
  getRoleCodeDisplay,
  PATIENT,
} from '@brightchain/brightchart-lib';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { Button, Menu, MenuItem, Typography } from '@mui/material';
import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrightChartTranslation } from '../../../hooks/useBrightChartTranslation';
import { useActiveContext } from '../../contexts/ActiveContext';

/** Map a role code to its workspace route prefix */
function workspaceForRole(roleCode: string): string {
  switch (roleCode) {
    case PATIENT:
      return '/brightchart/portal';
    case ADMIN:
      return '/brightchart/admin';
    default:
      return '/brightchart/clinician';
  }
}

/** Format a role for display, including org name when present */
function formatRoleLabel(role: IHealthcareRole): string {
  const translatedRole = getRoleCodeDisplay(role.roleCode);
  if (role.organization?.display) {
    return `${translatedRole} — ${role.organization.display}`;
  }
  return translatedRole;
}

export const RoleSwitcher: React.FC = () => {
  const { healthcareRoles, activeRole, switchRole } = useActiveContext();
  const { t } = useBrightChartTranslation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleSelect = useCallback(
    (role: IHealthcareRole) => {
      switchRole(role);
      handleClose();
      // Navigate to the workspace matching the new role
      navigate(workspaceForRole(role.roleCode));
    },
    [switchRole, handleClose, navigate],
  );

  if (healthcareRoles.length <= 1) {
    return (
      <Typography variant="body2" color="inherit" sx={{ mx: 1 }}>
        {formatRoleLabel(activeRole)}
      </Typography>
    );
  }

  return (
    <>
      <Button
        color="inherit"
        startIcon={<SwapHorizIcon />}
        onClick={handleOpen}
        aria-label={t(BrightChartStrings.RoleSwitcher_AriaLabel)}
        aria-haspopup="true"
        aria-expanded={Boolean(anchorEl)}
        size="small"
        sx={{ textTransform: 'none' }}
      >
        {formatRoleLabel(activeRole)}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        aria-label={t(BrightChartStrings.RoleSwitcher_MenuAriaLabel)}
      >
        {healthcareRoles.map((role, idx) => (
          <MenuItem
            key={`${role.roleCode}-${role.organization?.reference ?? idx}`}
            selected={
              role.roleCode === activeRole.roleCode &&
              role.organization?.reference ===
                activeRole.organization?.reference
            }
            onClick={() => handleSelect(role)}
          >
            {formatRoleLabel(role)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
