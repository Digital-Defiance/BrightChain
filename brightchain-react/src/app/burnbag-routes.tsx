/**
 * BurnbagRoutes — Route definitions for the Digital Burnbag file platform.
 *
 * All routes are relative (rendered inside a parent `<Route path="/burnbag/*">`).
 * Wrapped in PrivateRoute for auth enforcement.
 *
 * Routes:
 *   /burnbag                        → redirects to /burnbag/files
 *   /burnbag/files                  → BurnbagPage (my-files root)
 *   /burnbag/files/folder/sub/file  → virtual path navigation / file download
 *   /burnbag/shared                 → BurnbagPage with shared panel active
 *   /burnbag/favorites              → BurnbagPage with favorites panel active
 *   /burnbag/recent                 → BurnbagPage with recent panel active
 *   /burnbag/trash                  → BurnbagPage with trash panel active
 *   /burnbag/activity               → BurnbagPage with activity feed
 *   /burnbag/analytics              → BurnbagPage with storage analytics
 *   /burnbag/canary                 → BurnbagPage with canary config panel
 */

import {
  BurnbagPage,
  type ActiveSection,
} from '@brightchain/digitalburnbag-react-components';
import type { IBreadcrumbSegment } from '@brightchain/digitalburnbag-react-components';
import {
  PrivateRoute,
  useAuth,
} from '@digitaldefiance/express-suite-react-components';
import { Box, CircularProgress } from '@mui/material';
import React, { Suspense, useCallback, useMemo } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';

/** Sections that are NOT "files" — used to distinguish section routes from virtual paths. */
const NON_FILE_SECTIONS = new Set<string>([
  'shared',
  'favorites',
  'recent',
  'trash',
  'activity',
  'analytics',
  'canary',
]);

/** Map internal section IDs to URL-friendly slugs. */
function sectionToSlug(section: ActiveSection): string {
  return section === 'my-files' ? 'files' : section;
}

const LoadingFallback: React.FC = () => (
  <Box display="flex" justifyContent="center" alignItems="center" mt={4}>
    <CircularProgress />
  </Box>
);

/** Resolve the API base URL from runtime config or fall back to relative /api. */
function getApiBaseUrl(): string {
  return (
    (window as { APP_CONFIG?: { apiUrl?: string } }).APP_CONFIG?.apiUrl ||
    '/api'
  );
}

// ---------------------------------------------------------------------------
// Files route — supports virtual paths: /burnbag/files/my-folder/test/blah
// ---------------------------------------------------------------------------

const BurnbagFilesRoute: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { '*': splat } = useParams();
  const apiBaseUrl = getApiBaseUrl();

  const getToken = useCallback(() => token, [token]);

  // Parse virtual path segments from the URL splat
  const initialPath = useMemo(
    () =>
      splat
        ? splat.split('/').filter((s) => s.length > 0)
        : [],
    [splat],
  );

  const handleSectionChange = useCallback(
    (newSection: ActiveSection) => {
      const slug = sectionToSlug(newSection);
      navigate(`/burnbag/${slug}`, { replace: true });
    },
    [navigate],
  );

  const handleFolderNavigate = useCallback(
    (breadcrumbs: IBreadcrumbSegment[]) => {
      // Skip the root breadcrumb (index 0) — it's always "My Files" / "Root"
      if (breadcrumbs.length <= 1) {
        navigate('/burnbag/files', { replace: true });
        return;
      }
      const pathSegments = breadcrumbs
        .slice(1)
        .map((b) => encodeURIComponent(b.name));
      navigate(`/burnbag/files/${pathSegments.join('/')}`, { replace: true });
    },
    [navigate],
  );

  return (
    <BurnbagPage
      userId={typeof user?.id === 'string' ? user.id : String(user?.id ?? '')}
      username={user?.name ?? ''}
      apiBaseUrl={`${apiBaseUrl}/burnbag`}
      initialSection="my-files"
      initialPath={initialPath.length > 0 ? initialPath : undefined}
      getToken={getToken}
      onSectionChange={handleSectionChange}
      onFolderNavigate={handleFolderNavigate}
    />
  );
};

// ---------------------------------------------------------------------------
// Non-file section routes (shared, trash, canary, etc.)
// ---------------------------------------------------------------------------

const BurnbagSectionRoute: React.FC = () => {
  const { section } = useParams<{ section: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const apiBaseUrl = getApiBaseUrl();

  const getToken = useCallback(() => token, [token]);

  const resolved: ActiveSection =
    section && NON_FILE_SECTIONS.has(section)
      ? (section as ActiveSection)
      : 'my-files';

  const handleSectionChange = useCallback(
    (newSection: ActiveSection) => {
      const slug = sectionToSlug(newSection);
      navigate(`/burnbag/${slug}`, { replace: true });
    },
    [navigate],
  );

  return (
    <BurnbagPage
      userId={typeof user?.id === 'string' ? user.id : String(user?.id ?? '')}
      username={user?.name ?? ''}
      apiBaseUrl={`${apiBaseUrl}/burnbag`}
      initialSection={resolved}
      getToken={getToken}
      onSectionChange={handleSectionChange}
    />
  );
};

// ---------------------------------------------------------------------------
// Top-level route tree
// ---------------------------------------------------------------------------

export const BurnbagRoutes: React.FC = () => {
  return (
    <PrivateRoute>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route index element={<Navigate to="files" replace />} />
          <Route path="files/*" element={<BurnbagFilesRoute />} />
          <Route path=":section" element={<BurnbagSectionRoute />} />
        </Routes>
      </Suspense>
    </PrivateRoute>
  );
};

export default BurnbagRoutes;
