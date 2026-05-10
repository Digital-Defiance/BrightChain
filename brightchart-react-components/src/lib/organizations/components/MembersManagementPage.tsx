/**
 * MembersManagementPage — Admin page for viewing and managing organization members.
 *
 * Fetches members via useOrgMembers, displays them grouped by role code with
 * section headers. Supports role removal with confirmation dialog, handles
 * LAST_ADMIN errors, 403 access denied, and provides buttons to open
 * StaffAssignmentForm and InvitationManagementPanel.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 *
 * @module organizations/components/MembersManagementPage
 */

import type { IHealthcareRoleDocument } from '@brightchain/brightchart-lib';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import React, { useCallback, useState } from 'react';
import { useOrgApi } from '../hooks/useOrgApi';
import { useOrgMembers } from '../hooks/useOrgMembers';

export interface MembersManagementPageProps {
  organizationId: string;
}

export const MembersManagementPage: React.FC<MembersManagementPageProps> = ({
  organizationId,
}) => {
  const orgApi = useOrgApi();
  const { data, loading, error, refetch } = useOrgMembers(organizationId);

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [roleToRemove, setRoleToRemove] =
    useState<IHealthcareRoleDocument | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [lastAdminError, setLastAdminError] = useState(false);

  // Panel visibility state (placeholders for future components)
  const [staffFormOpen, setStaffFormOpen] = useState(false);
  const [invitationPanelOpen, setInvitationPanelOpen] = useState(false);

  const handleRemoveClick = useCallback((role: IHealthcareRoleDocument) => {
    setRoleToRemove(role);
    setRemoveError(null);
    setLastAdminError(false);
    setConfirmOpen(true);
  }, []);

  const handleConfirmRemove = useCallback(async () => {
    if (!roleToRemove) return;

    setRemoving(true);
    setRemoveError(null);
    setLastAdminError(false);

    try {
      await orgApi.removeRole(roleToRemove._id as string);
      setConfirmOpen(false);
      setRoleToRemove(null);
      refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to remove role';
      if (
        message.toLowerCase().includes('must retain at least one administrator')
      ) {
        setLastAdminError(true);
      }
      setRemoveError(message);
    } finally {
      setRemoving(false);
    }
  }, [roleToRemove, orgApi, refetch]);

  const handleCancelRemove = useCallback(() => {
    setConfirmOpen(false);
    setRoleToRemove(null);
    setRemoveError(null);
    setLastAdminError(false);
  }, []);

  // 403 access denied
  if (error && error.toLowerCase().includes('forbidden')) {
    return (
      <Box data-testid="members-access-denied" sx={{ p: 2 }}>
        <Alert severity="error">
          Access denied. You do not have permission to manage members for this
          organization.
        </Alert>
      </Box>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Box
        data-testid="members-loading"
        sx={{ p: 2, display: 'flex', justifyContent: 'center' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Fetch error (non-403)
  if (error) {
    return (
      <Box data-testid="members-fetch-error" sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const members = data?.members ?? {};

  return (
    <Box data-testid="members-page" sx={{ p: 2 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
        Members Management
      </Typography>

      {/* Action buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          data-testid="assign-staff-btn"
          onClick={() => setStaffFormOpen(true)}
        >
          Assign Staff
        </Button>
        <Button
          variant="outlined"
          data-testid="manage-invitations-btn"
          onClick={() => setInvitationPanelOpen(true)}
        >
          Manage Invitations
        </Button>
      </Box>

      {/* Members grouped by role code */}
      {Object.entries(members).map(([roleCode, roleMembers]) => {
        const displayName =
          roleMembers.length > 0 ? roleMembers[0].roleDisplay : roleCode;
        return (
          <Box
            key={roleCode}
            data-testid={`role-group-${roleCode}`}
            sx={{ mb: 3 }}
          >
            <Typography
              variant="h6"
              component="h2"
              data-testid={`role-header-${roleCode}`}
              sx={{ mb: 1 }}
            >
              {displayName}
            </Typography>
            <List>
              {roleMembers.map((member) => (
                <ListItem
                  key={member._id as string}
                  data-testid={`member-item-${member._id}`}
                  secondaryAction={
                    <Button
                      size="small"
                      color="error"
                      data-testid={`remove-role-btn-${member._id}`}
                      onClick={() => handleRemoveClick(member)}
                    >
                      Remove Role
                    </Button>
                  }
                >
                  <ListItemText
                    primary={member.memberId}
                    secondary={member.roleDisplay}
                    data-testid={`member-text-${member._id}`}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        );
      })}

      {/* Confirmation dialog */}
      <Dialog
        open={confirmOpen}
        onClose={handleCancelRemove}
        data-testid="remove-confirm-dialog"
      >
        <DialogTitle>Confirm Role Removal</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove the{' '}
            <strong>{roleToRemove?.roleDisplay}</strong> role from member{' '}
            <strong>{roleToRemove?.memberId}</strong>?
          </Typography>
          {lastAdminError && (
            <Alert
              severity="error"
              data-testid="last-admin-error"
              sx={{ mt: 2 }}
            >
              Organization must retain at least one administrator.
            </Alert>
          )}
          {removeError && !lastAdminError && (
            <Alert severity="error" data-testid="remove-error" sx={{ mt: 2 }}>
              {removeError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCancelRemove}
            data-testid="remove-cancel-btn"
            disabled={removing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRemove}
            color="error"
            variant="contained"
            data-testid="remove-confirm-btn"
            disabled={removing}
          >
            {removing ? (
              <CircularProgress size={24} data-testid="remove-loading" />
            ) : (
              'Remove'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Placeholder indicators for open panels (future components) */}
      {staffFormOpen && (
        <Box data-testid="staff-form-placeholder">
          <Typography>Staff Assignment Form (placeholder)</Typography>
          <Button onClick={() => setStaffFormOpen(false)}>Close</Button>
        </Box>
      )}
      {invitationPanelOpen && (
        <Box data-testid="invitation-panel-placeholder">
          <Typography>Invitation Management Panel (placeholder)</Typography>
          <Button onClick={() => setInvitationPanelOpen(false)}>Close</Button>
        </Box>
      )}
    </Box>
  );
};

export default MembersManagementPage;
