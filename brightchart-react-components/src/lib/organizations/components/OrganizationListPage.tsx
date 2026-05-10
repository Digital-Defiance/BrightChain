/**
 * OrganizationListPage — Paginated, searchable list of organizations.
 *
 * Displays each org's name and enrollment mode as a chip ("Open" / "Invite Only").
 * Includes search with 300ms debounce, pagination controls, loading skeleton,
 * empty state, contextual click actions, and a button to create new orgs.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 *
 * @module organizations/components/OrganizationListPage
 */

import type { IOrganization } from '@brightchain/brightchart-lib';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useOrganizations } from '../hooks/useOrganizations';
import { OrganizationCreateDialog } from './OrganizationCreateDialog';

const DEBOUNCE_MS = 300;
const DEFAULT_LIMIT = 10;

export const OrganizationListPage: React.FC = () => {
  // ── Search state ────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // ── Pagination state ────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // ── Data fetching ───────────────────────────────────────────────────
  const params = useMemo(
    () => ({
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      page,
      limit,
    }),
    [debouncedSearch, page, limit],
  );

  const { data, loading, error, refetch } = useOrganizations(params);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  // ── Create dialog state ─────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);

  const handleCreated = useCallback(() => {
    refetch();
  }, [refetch]);

  // ── Context menu state ──────────────────────────────────────────────
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<IOrganization | null>(null);

  const handleOrgClick = useCallback(
    (event: React.MouseEvent<HTMLElement>, org: IOrganization) => {
      setMenuAnchor(event.currentTarget);
      setSelectedOrg(org);
    },
    [],
  );

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
    setSelectedOrg(null);
  }, []);

  const handleRegisterPatient = useCallback(() => {
    // Placeholder: navigate to patient registration for open orgs
    handleMenuClose();
  }, [handleMenuClose]);

  const handleEnterToken = useCallback(() => {
    // Placeholder: navigate to invitation redeem for invite-only orgs
    handleMenuClose();
  }, [handleMenuClose]);

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <Box data-testid="org-list-page" sx={{ p: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h5" component="h1">
          Organizations
        </Typography>
        <Button
          variant="contained"
          onClick={() => setCreateOpen(true)}
          data-testid="create-org-btn"
        >
          Create Organization
        </Button>
      </Box>

      <TextField
        placeholder="Search organizations..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        fullWidth
        size="small"
        sx={{ mb: 2 }}
        inputProps={{ 'data-testid': 'org-search-input' }}
        data-testid="org-search-field"
      />

      {error && (
        <Alert severity="error" data-testid="org-list-error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box data-testid="org-list-loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              height={56}
              sx={{ mb: 1, borderRadius: 1 }}
            />
          ))}
        </Box>
      )}

      {!loading && data && data.organizations.length === 0 && (
        <Typography
          data-testid="org-list-empty"
          color="text.secondary"
          sx={{ py: 4, textAlign: 'center' }}
        >
          No organizations found.
        </Typography>
      )}

      {!loading && data && data.organizations.length > 0 && (
        <>
          <List data-testid="org-list">
            {data.organizations.map((org) => (
              <ListItem
                key={org._id}
                disablePadding
                data-testid={`org-item-${org._id}`}
              >
                <ListItemButton onClick={(e) => handleOrgClick(e, org)}>
                  <ListItemText
                    primary={org.name}
                    secondary={
                      <Chip
                        label={
                          org.enrollmentMode === 'open' ? 'Open' : 'Invite Only'
                        }
                        size="small"
                        color={
                          org.enrollmentMode === 'open' ? 'success' : 'warning'
                        }
                        component="span"
                        data-testid={`enrollment-chip-${org._id}`}
                      />
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_e, value) => setPage(value)}
                data-testid="org-pagination"
              />
            </Box>
          )}
        </>
      )}

      {/* Context menu for org actions */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        data-testid="org-action-menu"
      >
        {selectedOrg?.enrollmentMode === 'open' && (
          <MenuItem
            onClick={handleRegisterPatient}
            data-testid="register-patient-action"
          >
            Register as Patient
          </MenuItem>
        )}
        {selectedOrg?.enrollmentMode === 'invite-only' && (
          <MenuItem onClick={handleEnterToken} data-testid="enter-token-action">
            Enter Invitation Token
          </MenuItem>
        )}
      </Menu>

      {/* Create dialog */}
      <OrganizationCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </Box>
  );
};

export default OrganizationListPage;
