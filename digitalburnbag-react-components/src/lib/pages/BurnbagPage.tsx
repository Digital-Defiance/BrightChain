/**
 * BurnbagPage — Functional page component that wires all presentational
 * components to the real BurnbagApiClient for data fetching and mutations.
 */
import { faBird } from '@awesome.me/kit-a20d532681/icons/classic/solid';
import {
  type NavItem,
  type SidebarConfig,
} from '@brightchain/brightchain-react-components';
import {
  DigitalBurnbagStrings,
  type IUploadCommitResultDTO,
} from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { formatDateWithBD } from '../utils/formatBrightDate';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BarChartIcon from '@mui/icons-material/BarChart';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import PeopleIcon from '@mui/icons-material/People';
import StarIcon from '@mui/icons-material/Star';
import TimelineIcon from '@mui/icons-material/Timeline';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { IACLEditorEntry } from '../components/ACLEditor';
import { ACLEditor } from '../components/ACLEditor';
import type { IActivityEntry } from '../components/ActivityFeed';
import { ActivityFeed } from '../components/ActivityFeed';
import { BulkOperationsToolbar } from '../components/BulkOperationsToolbar';
import type {
  ICanaryBindingDisplay,
  IDryRunReportDisplay,
  IRecipientListDisplay,
} from '../components/CanaryConfigPanel';
import { CanaryConfigPanel } from '../components/CanaryConfigPanel';
import { DomainRouter } from '../components/DomainRouter';
import { DuressProvider } from '../components/DuressProvider';
import type {
  FileBrowserSortField,
  IBreadcrumbSegment,
  IFileBrowserItem,
  SortDirection,
} from '../components/FileBrowser';
import { FileBrowser } from '../components/FileBrowser';
import { FolderExportDialog } from '../components/FolderExportDialog';
import { PowerUserProvider } from '../components/PowerUserProvider';
import type { IPresenceUser } from '../components/PresenceIndicator';
import { PresenceIndicator } from '../components/PresenceIndicator';
import { PreviewViewer } from '../components/PreviewViewer';
import type { IPrincipalOption } from '../components/PrincipalPicker';
import { SealBreakWarningDialog } from '../components/SealBreakWarningDialog';
import { ShareDialog } from '../components/ShareDialog';
import { StorageAnalytics } from '../components/StorageAnalytics';
import type { ITrashItem } from '../components/TrashBinView';
import { TrashBinView } from '../components/TrashBinView';
import { UploadNewVersionDialog } from '../components/UploadNewVersionDialog';
import type { IUploadProgress } from '../components/UploadWidget';
import { UploadWidget } from '../components/UploadWidget';
import { VaultPicker } from '../components/VaultPicker';
import { JouleUploadForm } from '../components/joule';
import { decryptAuthenticatedUserFile, encryptFileForUpload } from '../crypto';
import type {
  IApiCanaryBindingDTO,
  IApiFileDTO,
  IApiFolderDTO,
  IApiRecipientListDTO,
  IApiUploadSessionDTO,
  IApiVaultContainerSummaryDTO,
} from '../services/burnbag-api-client';
import { ApiError, BurnbagApiClient } from '../services/burnbag-api-client';
import { computeChunkChecksum } from '../utils/upload-utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ActiveSection =
  | 'my-files'
  | 'shared'
  | 'favorites'
  | 'recent'
  | 'trash'
  | 'activity'
  | 'analytics'
  | 'canary';

export interface IBurnbagPageProps {
  userId: string;
  username: string;
  apiBaseUrl: string;
  wsUrl?: string;
  /** Optional initial section to display (e.g. from URL route) */
  initialSection?: ActiveSection;
  /** Callback that returns the current auth token (JWT) for API requests. */
  getToken?: () => string | null;
  /** Called when the user switches sections (e.g. to sync the URL). */
  onSectionChange?: (section: ActiveSection) => void;
  /**
   * Virtual path segments from the URL (e.g. ["my-folder", "test"]).
   * When provided, the page resolves this path to navigate into the
   * correct folder on mount.
   */
  initialPath?: string[];
  /**
   * Called when the user navigates into a folder so the parent can
   * update the URL bar with the virtual path.
   */
  onFolderNavigate?: (breadcrumbs: IBreadcrumbSegment[]) => void;
  /**
   * Returns the user's wallet private key for client-side E2EE file
   * decryption. When provided, downloads use the encrypted endpoint
   * and decrypt in the browser. When absent, falls back to the
   * server-decrypted download.
   */
  getPrivateKey?: () => Uint8Array | null;
}

// ---------------------------------------------------------------------------
// Helpers: map API DTOs to component props
// ---------------------------------------------------------------------------

function fileToItem(f: IApiFileDTO): IFileBrowserItem {
  return {
    id: f.id,
    name: f.name,
    type: 'file',
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    modifiedAt: f.modifiedAt,
    ownerId: f.ownerId,
    // All files are AES-256-GCM encrypted; approval-governed files get a
    // distinct badge so the user knows extra approval is required.
    encryptionStatus: f.approvalGoverned ? 'quorum' : 'encrypted',
  };
}

function folderToItem(f: IApiFolderDTO): IFileBrowserItem {
  return {
    id: f.id,
    name: f.name,
    type: 'folder',
    modifiedAt: f.createdAt,
    ownerId: f.ownerId,
  };
}

function bindingToDisplay(b: IApiCanaryBindingDTO): ICanaryBindingDisplay {
  return {
    id: b.id,
    condition: b.condition,
    provider: b.provider,
    action: b.action,
    targetDescription: b.targetDescription,
  };
}

function recipientListToDisplay(
  r: IApiRecipientListDTO,
): IRecipientListDisplay {
  return { id: r.id, name: r.name, recipientCount: r.recipientCount };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const BurnbagPage: React.FC<IBurnbagPageProps> = ({
  userId: _userId,
  username: _username,
  apiBaseUrl,
  initialSection,
  getToken,
  onSectionChange,
  initialPath,
  onFolderNavigate,
  getPrivateKey,
}) => {
  const { tBranded: t } = useI18n();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const clientRef = useRef(
    new BurnbagApiClient(apiBaseUrl, () => getTokenRef.current?.() ?? null),
  );
  const api = clientRef.current;

  // -- Navigation state ------------------------------------------------------
  const [activeSection, setActiveSection] = useState<ActiveSection>(
    initialSection ?? 'my-files',
  );
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // -- Vault container state -------------------------------------------------
  const [vaults, setVaults] = useState<IApiVaultContainerSummaryDTO[]>([]);
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [vaultsLoading, setVaultsLoading] = useState(false);

  // Sync activeSection when the route-driven initialSection prop changes
  useEffect(() => {
    if (initialSection && initialSection !== activeSection) {
      setActiveSection(initialSection);
    }
    // Only react to prop changes, not internal state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSection]);

  // -- File browser state ----------------------------------------------------
  const [items, setItems] = useState<IFileBrowserItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<IBreadcrumbSegment[]>([
    { id: 'root', name: 'My Files' },
  ]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<FileBrowserSortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loading, setLoading] = useState(false);

  // -- Trash state -----------------------------------------------------------
  const [trashItems, setTrashItems] = useState<ITrashItem[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashMessage, setTrashMessage] = useState('');

  // -- Shared state ----------------------------------------------------------
  const [sharedItems, setSharedItems] = useState<IFileBrowserItem[]>([]);

  // -- Upload state ----------------------------------------------------------
  const [uploadProgress, setUploadProgress] = useState<IUploadProgress[]>([]);
  // Files queued for Joule-billed upload (processed one at a time)
  const [jouleUploadQueue, setJouleUploadQueue] = useState<File[]>([]);

  // -- Dialog state ----------------------------------------------------------
  const [previewFile, setPreviewFile] = useState<IFileBrowserItem | null>(null);
  const [shareFile, setShareFile] = useState<IFileBrowserItem | null>(null);
  const [aclTarget, setAclTarget] = useState<{
    type: string;
    id: string;
    /** For multi-item ACL editing, the list of { type, id } targets. */
    targets?: Array<{ type: string; id: string }>;
    entries: IACLEditorEntry[];
  } | null>(null);
  const [exportFolderId, setExportFolderId] = useState<string | null>(null);
  const [uploadVersionTarget, setUploadVersionTarget] =
    useState<IFileBrowserItem | null>(null);
  const [storageContractFile, setStorageContractFile] =
    useState<IFileBrowserItem | null>(null);
  /** When set, the next Joule upload is a new version of this fileId. */
  const [newVersionFileId, setNewVersionFileId] = useState<string | null>(null);
  /** Pending action that requires seal-break confirmation. */
  const [sealBreakPending, setSealBreakPending] = useState<{
    context: 'vault' | 'file';
    action: string;
    itemId: string;
    item: IFileBrowserItem;
    sealedAt?: string;
  } | null>(null);
  useState<IFileBrowserItem | null>(null);
  const [storageContractData, setStorageContractData] = useState<{
    contractId: string;
    fileId: string;
    createdAt: string;
    expiresAt: string;
    committedDays: number;
    bytes: string;
    tier: string;
    rsK: number;
    rsM: number;
    upfrontMicroJoules: string;
    dailyMicroJoules: string;
    remainingCreditMicroJoules: string;
    autoRenew: boolean;
    status: string;
    lastSettledAt: string;
  } | null>(null);

  // -- Clipboard state (cut/copy → paste) ------------------------------------
  const [clipboard, setClipboard] = useState<{
    items: IFileBrowserItem[];
    mode: 'move' | 'copy';
    sourceFolderId: string | null;
  } | null>(null);

  // -- Canary state ----------------------------------------------------------
  const [canaryBindings, setCanaryBindings] = useState<ICanaryBindingDisplay[]>(
    [],
  );
  const [recipientLists, setRecipientLists] = useState<IRecipientListDisplay[]>(
    [],
  );
  const [canaryMessage, setCanaryMessage] = useState('');

  // -- Activity state --------------------------------------------------------
  const [activityEntries, setActivityEntries] = useState<IActivityEntry[]>([]);

  // -- Presence state --------------------------------------------------------
  const [viewers, _setViewers] = useState<IPresenceUser[]>([]);

  // -- Analytics state -------------------------------------------------------
  const [storageUsage, setStorageUsage] = useState<{
    usedBytes: number;
    quotaBytes: number;
    breakdown: { category: string; bytes: number }[];
  } | null>(null);

  // -- Snackbar --------------------------------------------------------------
  const [snack, setSnack] = useState<{
    message: string;
    severity: 'success' | 'error' | 'info';
  } | null>(null);

  // -- Delete confirmation ---------------------------------------------------
  const [deleteConfirm, setDeleteConfirm] = useState<{
    itemIds: string[];
    source: 'context' | 'bulk';
  } | null>(null);

  const showSnack = useCallback(
    (message: string, severity: 'success' | 'error' | 'info' = 'info') => {
      setSnack({ message, severity });
    },
    [],
  );

  const handleError = useCallback(
    (err: unknown, fallback = t(DigitalBurnbagStrings.Page_ErrorOccurred)) => {
      const msg = err instanceof ApiError ? err.message : fallback;
      showSnack(msg, 'error');
    },
    [showSnack, t],
  );

  // -- Data fetching ---------------------------------------------------------

  const loadVaults = useCallback(async () => {
    setVaultsLoading(true);
    try {
      const list = await api.listVaultContainers();
      setVaults(list);
      // Auto-select first vault if none currently selected.
      // Use functional update to read current selectedVaultId without
      // adding it to the dependency array (avoids stale closure issues).
      setSelectedVaultId((current) => {
        if (list.length > 0 && !current) return list[0].id;
        return current;
      });
    } catch (err) {
      handleError(err, t(DigitalBurnbagStrings.Vault_LoadFailed));
    } finally {
      setVaultsLoading(false);
    }
  }, [api, handleError, t]);

  const handleCreateVault = useCallback(
    async (name: string, description?: string, visibility?: string) => {
      try {
        const created = await api.createVaultContainer({
          name,
          description,
          visibility,
        });
        showSnack(t(DigitalBurnbagStrings.Vault_Created), 'success');
        // Reload vaults and select the new one
        const list = await api.listVaultContainers();
        setVaults(list);
        setSelectedVaultId(created.id);
      } catch (err) {
        handleError(err, t(DigitalBurnbagStrings.Vault_CreateFailed));
      }
    },
    [api, handleError, showSnack, t],
  );

  const handleSelectVault = useCallback(
    (vaultId: string) => {
      const vault = vaults.find((v) => v.id === vaultId);
      if (vault?.state === 'sealed') {
        // Warn before entering a sealed vault — browsing exposes content and breaks the seal
        setSealBreakPending({
          context: 'vault',
          action: 'selectVault',
          itemId: vaultId,
          item: { id: vaultId, name: vault.name, type: 'folder' },
          sealedAt: vault.sealedAt,
        });
        return;
      }
      setSelectedVaultId(vaultId);
      // Reset folder state when switching vaults
      setCurrentFolderId(null);
      setItems([]);
      setBreadcrumbs([{ id: 'root', name: 'My Files' }]);
    },
    [vaults],
  );

  const handleSealVault = useCallback(
    async (vaultId: string) => {
      try {
        await api.sealVaultContainer(vaultId);
        showSnack('Vault sealed — pristine guarantee is now active', 'success');
        await loadVaults();
      } catch (err) {
        handleError(err, 'Failed to seal vault');
      }
    },
    [api, loadVaults, showSnack, handleError],
  );

  // Load vaults on mount
  useEffect(() => {
    loadVaults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFolderContents = useCallback(
    async (folderId: string | null) => {
      setLoading(true);
      try {
        const data = folderId
          ? await api.getFolderContents(folderId, {
              field: sortField,
              direction: sortDirection,
            })
          : await api.getRootFolder(selectedVaultId ?? undefined);

        const folderItems = data.subfolders.map(folderToItem);
        const fileItems = data.files.map(fileToItem);
        setItems([...folderItems, ...fileItems]);
        setCurrentFolderId(data.folder.id);

        // Load breadcrumbs
        const path = await api.getFolderPath(data.folder.id);
        const crumbs =
          path.length > 0
            ? path.map((p) => ({ id: p.id, name: p.name }))
            : [{ id: data.folder.id, name: 'My Files' }];
        setBreadcrumbs(crumbs);
        onFolderNavigate?.(crumbs);
      } catch (err) {
        handleError(err, t(DigitalBurnbagStrings.Page_LoadFolderFailed));
      } finally {
        setLoading(false);
      }
    },
    [
      api,
      sortField,
      sortDirection,
      handleError,
      t,
      onFolderNavigate,
      selectedVaultId,
    ],
  );

  /** Delete a single item, choosing the right API call based on type. */
  const deleteItemById = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (item?.type === 'folder') {
        await api.softDeleteFolder(id);
      } else {
        await api.softDeleteFile(id);
      }
    },
    [api, items],
  );

  /** Execute confirmed deletion of items. */
  const executeDelete = useCallback(
    async (itemIds: string[]) => {
      try {
        for (const id of itemIds) {
          await deleteItemById(id);
        }
        showSnack(
          t(DigitalBurnbagStrings.Page_ItemsMovedToTrash, {
            count: itemIds.length,
          }),
          'success',
        );
        loadFolderContents(currentFolderId);
        loadVaults();
      } catch (err) {
        handleError(err, t(DigitalBurnbagStrings.Page_DeleteFailed));
      }
      setSelectedIds(new Set());
    },
    [
      deleteItemById,
      showSnack,
      t,
      loadFolderContents,
      loadVaults,
      currentFolderId,
      handleError,
    ],
  );

  /** Paste clipboard items into the current folder via move. */
  const handlePaste = useCallback(async () => {
    if (!clipboard || !currentFolderId) return;
    const { items: clipItems, mode } = clipboard;
    let successes = 0;
    let failures = 0;
    for (const ci of clipItems) {
      try {
        await api.moveItem(ci.id, ci.type, currentFolderId);
        successes++;
      } catch {
        failures++;
      }
    }
    setClipboard(null);
    setSelectedIds(new Set());
    loadFolderContents(currentFolderId);
    loadVaults();
    if (failures > 0) {
      showSnack(
        `${mode === 'copy' ? 'Copy' : 'Move'}: ${successes} succeeded, ${failures} failed`,
        'error',
      );
    } else {
      showSnack(t(DigitalBurnbagStrings.Page_ItemMoved), 'success');
    }
  }, [
    clipboard,
    currentFolderId,
    api,
    loadFolderContents,
    loadVaults,
    showSnack,
    t,
  ]);

  const loadTrash = useCallback(async () => {
    setTrashLoading(true);
    try {
      const data = await api.getTrashItems();
      setTrashItems(data);
    } catch (err) {
      handleError(err, t(DigitalBurnbagStrings.Page_LoadTrashFailed));
    } finally {
      setTrashLoading(false);
    }
  }, [api, handleError, t]);

  const loadShared = useCallback(async () => {
    try {
      const data = await api.getSharedWithMe();
      setSharedItems(
        data.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          modifiedAt: s.sharedAt,
        })),
      );
    } catch (err) {
      handleError(err, t(DigitalBurnbagStrings.Page_LoadSharedFailed));
    }
  }, [api, handleError, t]);

  const loadCanary = useCallback(async () => {
    try {
      const [bindings, lists] = await Promise.all([
        api.getCanaryBindings(),
        api.getRecipientLists(),
      ]);
      setCanaryBindings(bindings.map(bindingToDisplay));
      setRecipientLists(lists.map(recipientListToDisplay));
    } catch (err) {
      handleError(err, t(DigitalBurnbagStrings.Page_LoadCanaryFailed));
    }
  }, [api, handleError, t]);

  const loadActivity = useCallback(async () => {
    try {
      const data = await api.queryAuditLog();
      setActivityEntries(
        data.map((e) => ({
          id: e.id,
          operationType: e.operationType,
          actorName: e.actorId,
          targetName: e.targetId,
          targetId: e.targetId,
          targetType: 'file' as const,
          timestamp: e.timestamp,
        })),
      );
    } catch (err) {
      handleError(err, t(DigitalBurnbagStrings.Page_LoadActivityFailed));
    }
  }, [api, handleError, t]);

  const loadAnalytics = useCallback(async () => {
    try {
      const data = await api.getStorageUsage();
      setStorageUsage(data);
    } catch (err) {
      handleError(err, t(DigitalBurnbagStrings.Page_LoadAnalyticsFailed));
    }
  }, [api, handleError, t]);

  // -- Initial load & section changes ----------------------------------------

  // Track whether we've already resolved the initial path
  const initialPathResolved = useRef(false);

  // Track whether the initial load for the current section has been performed.
  // This prevents the effect from resetting to root when its callback deps
  // change (e.g. onFolderNavigate reference changes).
  const sectionLoadedRef = useRef<string | null>(null);

  // Capture initialPath at mount time so URL-driven prop changes don't
  // re-trigger the effect (the URL is updated by onFolderNavigate as the
  // user navigates, but we only want to resolve the path once on mount).
  const initialPathRef = useRef(initialPath);

  useEffect(() => {
    // If we have an initial path and haven't resolved it yet, do that instead
    // of loading the root folder.
    const pathToResolve = initialPathRef.current;
    let cancelled = false;

    if (process.env.NODE_ENV !== 'production') {
      console.debug(
        '[BurnbagPage] section effect: activeSection=%s, pathToResolve=%o, resolved=%s, sectionLoaded=%s',
        activeSection,
        pathToResolve,
        initialPathResolved.current,
        sectionLoadedRef.current,
      );
    }

    if (
      pathToResolve &&
      pathToResolve.length > 0 &&
      !initialPathResolved.current &&
      activeSection === 'my-files'
    ) {
      // Mark section as loaded so the switch/case below doesn't also fire,
      // but don't mark path as resolved until the async work completes
      // (StrictMode may cancel this effect and re-run it).
      sectionLoadedRef.current = activeSection;
      (async () => {
        setLoading(true);
        try {
          const resolved = await api.resolvePath(pathToResolve);
          if (cancelled) return;
          initialPathResolved.current = true;
          if (resolved.file) {
            // Last segment was a file — navigate to its parent folder and
            // trigger a download/preview of the file.
            const parentFolder = resolved.folders[resolved.folders.length - 1];
            if (!cancelled) await loadFolderContents(parentFolder.id);
            // Auto-open the file preview
            if (!cancelled) setPreviewFile(fileToItem(resolved.file));
          } else {
            // Last segment was a folder — navigate into it
            const targetFolder = resolved.folders[resolved.folders.length - 1];
            if (!cancelled) await loadFolderContents(targetFolder.id);
          }
        } catch (err) {
          if (cancelled) return;
          // Path resolution failed — show a user-visible error and fall
          // back to root so the page isn't stuck in a loading state.
          initialPathResolved.current = true;
          const is404 = err instanceof ApiError && err.status === 404;
          console.warn(
            '[BurnbagPage] resolvePath failed for',
            pathToResolve,
            err,
          );
          showSnack(
            is404
              ? t(DigitalBurnbagStrings.Page_PathNotFound)
              : t(DigitalBurnbagStrings.Page_LoadFolderFailed),
            'error',
          );
          // Navigate URL back to root immediately so the bad path doesn't
          // persist in the address bar even if loadFolderContents fails.
          onFolderNavigate?.([{ id: 'root', name: 'My Files' }]);
          await loadFolderContents(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
        // Reset so StrictMode's second mount can retry
        sectionLoadedRef.current = null;
      };
    }

    // If we've already loaded data for this section, don't reload when
    // callback references change (e.g. onFolderNavigate).  Only reload
    // when the user actually switches sections.
    if (sectionLoadedRef.current === activeSection) {
      return;
    }
    sectionLoadedRef.current = activeSection;

    switch (activeSection) {
      case 'my-files':
      case 'favorites':
      case 'recent':
        // Don't load folder contents until a vault is selected.
        // The vault-change effect will trigger loadFolderContents once
        // loadVaults() completes and sets selectedVaultId.
        if (selectedVaultId) {
          loadFolderContents(null);
        }
        break;
      case 'trash':
        loadTrash();
        break;
      case 'shared':
        loadShared();
        break;
      case 'canary':
        loadCanary();
        break;
      case 'activity':
        loadActivity();
        break;
      case 'analytics':
        loadAnalytics();
        break;
    }
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeSection,
    loadFolderContents,
    loadTrash,
    loadShared,
    loadCanary,
    loadActivity,
    loadAnalytics,
  ]);

  // -- File browser handlers -------------------------------------------------

  // Reload folder contents when the selected vault changes
  useEffect(() => {
    if (!selectedVaultId) return;
    if (
      activeSection === 'my-files' ||
      activeSection === 'favorites' ||
      activeSection === 'recent'
    ) {
      sectionLoadedRef.current = null; // force reload
      loadFolderContents(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVaultId]);

  const handleNavigate = useCallback(
    (folderId: string) => {
      loadFolderContents(folderId);
    },
    [loadFolderContents],
  );

  const handleBreadcrumbClick = useCallback(
    (folderId: string) => {
      loadFolderContents(folderId);
    },
    [loadFolderContents],
  );

  const handleSortChange = useCallback(
    (field: FileBrowserSortField, direction: SortDirection) => {
      setSortField(field);
      setSortDirection(direction);
      if (currentFolderId) {
        loadFolderContents(currentFolderId);
      }
    },
    [currentFolderId, loadFolderContents],
  );

  const handleDrop = useCallback(
    async (itemId: string, targetFolderId: string) => {
      try {
        const item = items.find((i) => i.id === itemId);
        await api.moveItem(
          itemId,
          item?.type === 'folder' ? 'folder' : 'file',
          targetFolderId,
        );
        showSnack(t(DigitalBurnbagStrings.Page_ItemMoved), 'success');
        loadFolderContents(currentFolderId);
      } catch (err) {
        handleError(err, t(DigitalBurnbagStrings.Page_MoveFailed));
      }
    },
    [
      api,
      items,
      currentFolderId,
      loadFolderContents,
      showSnack,
      handleError,
      t,
    ],
  );

  const handleCreateFolder = useCallback(
    async (name: string) => {
      try {
        const parentId =
          currentFolderId ??
          (await api.getRootFolder(selectedVaultId ?? undefined)).folder.id;
        await api.createFolder(name, parentId, selectedVaultId ?? undefined);
        showSnack(`Folder "${name}" created`, 'success');
        loadFolderContents(currentFolderId);
        loadVaults();
      } catch (err) {
        handleError(err, 'Failed to create folder');
      }
    },
    [
      api,
      currentFolderId,
      selectedVaultId,
      loadFolderContents,
      loadVaults,
      showSnack,
      handleError,
    ],
  );

  const handleContextAction = useCallback(
    async (action: string, itemIds: string[]) => {
      const firstId = itemIds[0];
      if (!firstId) return;
      const item = items.find((i) => i.id === firstId);

      switch (action) {
        case 'open':
        case 'preview': {
          // Warn if the vault is sealed — reading will break the seal
          const vault = vaults.find((v) => v.id === selectedVaultId);
          if (vault?.state === 'sealed' && item) {
            setSealBreakPending({
              context: 'file',
              action: 'preview',
              itemId: firstId,
              item,
              sealedAt: vault.sealedAt,
            });
            return;
          }
          if (item) setPreviewFile(item);
          break;
        }
        case 'share':
          if (item) setShareFile(item);
          break;
        case 'permissions':
          try {
            const acl = await api.getACL(
              item?.type === 'folder' ? 'folder' : 'file',
              firstId,
            );
            setAclTarget({
              type: item?.type === 'folder' ? 'folder' : 'file',
              id: firstId,
              entries: acl.entries.map((e, idx) => ({
                id: `acl-${idx}`,
                principalId: e.principalId,
                principalName: e.principalId,
                principalType: e.principalType,
                level: e.permissionLevel,
              })),
            });
          } catch (err) {
            handleError(
              err,
              t(DigitalBurnbagStrings.Page_LoadPermissionsFailed),
            );
          }
          break;
        case 'delete':
          setDeleteConfirm({ itemIds, source: 'context' });
          break;
        case 'rename': {
          const newName = window.prompt(
            t(DigitalBurnbagStrings.Page_RenamePrompt),
            item?.name,
          );
          if (newName && newName !== item?.name) {
            try {
              await api.updateFileMetadata(firstId, { name: newName });
              showSnack(t(DigitalBurnbagStrings.Page_Renamed), 'success');
              loadFolderContents(currentFolderId);
            } catch (err) {
              handleError(err, t(DigitalBurnbagStrings.Page_RenameFailed));
            }
          }
          break;
        }
        case 'download': {
          // Warn if the vault is sealed
          const vault = vaults.find((v) => v.id === selectedVaultId);
          if (vault?.state === 'sealed' && item) {
            setSealBreakPending({
              context: 'file',
              action: 'download',
              itemId: firstId,
              item,
              sealedAt: vault.sealedAt,
            });
            return;
          }
          const privateKey = getPrivateKey?.();
          if (privateKey) {
            try {
              const enc = await api.getEncryptedFileContent(firstId);
              if (enc.encryptedSymmetricKey) {
                const plaintext = await decryptAuthenticatedUserFile(
                  enc.encryptedSymmetricKey,
                  enc.encryptedContent,
                  enc.iv,
                  enc.authTag,
                  privateKey,
                );
                const blob = new Blob([plaintext.buffer as ArrayBuffer], {
                  type: enc.mimeType,
                });
                const encUrl = URL.createObjectURL(blob);
                const encA = document.createElement('a');
                encA.href = encUrl;
                encA.download = enc.fileName;
                encA.click();
                URL.revokeObjectURL(encUrl);
                break;
              }
            } catch {
              // Fall through to unencrypted download on decryption failure
            }
          }
          const downloadUrl = await api.getDownloadBlobUrl(firstId);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = item?.name ?? 'download';
          a.click();
          URL.revokeObjectURL(downloadUrl);
          break;
        }
        case 'export':
          if (item?.type === 'folder') setExportFolderId(firstId);
          break;
        case 'move':
        case 'copy': {
          const clipItems = itemIds
            .map((id) => items.find((i) => i.id === id))
            .filter((i): i is IFileBrowserItem => i !== undefined);
          if (clipItems.length > 0) {
            setClipboard({
              items: clipItems,
              mode: action as 'move' | 'copy',
              sourceFolderId: currentFolderId,
            });
            showSnack(
              `${clipItems.length} item(s) ${action === 'copy' ? 'copied' : 'cut'} — navigate to a folder and paste`,
              'info',
            );
          }
          break;
        }
        case 'paste':
          handlePaste();
          break;
        case 'uploadNewVersion':
          if (item?.type === 'file') setUploadVersionTarget(item);
          break;
        case 'storageContract':
          if (item?.type === 'file') {
            setStorageContractFile(item);
            setStorageContractData(null);
            api
              .getStorageContractForFile(firstId)
              .then((contract) =>
                setStorageContractData(contract as typeof storageContractData),
              )
              .catch(() => setStorageContractData(null));
          }
          break;
        case 'copyPathLink':
          if (item && selectedVaultId) {
            // Build path from current breadcrumbs + item name
            // breadcrumbs[0] is always the root — skip it
            const pathSegments = [
              ...breadcrumbs.slice(1).map((b) => encodeURIComponent(b.name)),
              encodeURIComponent(item.name),
            ];
            const apiBase =
              (window as { APP_CONFIG?: { apiUrl?: string } }).APP_CONFIG
                ?.apiUrl ?? '/api';
            const pathUrl = `${window.location.origin}${apiBase}/burnbag/path/${selectedVaultId}/${pathSegments.join('/')}`;
            navigator.clipboard
              .writeText(pathUrl)
              .then(() => showSnack('Path link copied to clipboard', 'success'))
              .catch(() => showSnack('Failed to copy link', 'error'));
          }
          break;
        default:
          break;
      }
    },
    [
      api,
      items,
      currentFolderId,
      loadFolderContents,
      showSnack,
      handleError,
      handlePaste,
      t,
    ],
  );

  // -- Upload handlers -------------------------------------------------------

  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const progressEntry: IUploadProgress = {
          fileName: file.name,
          progress: 0,
          status: 'uploading',
        };
        setUploadProgress((prev) => [...prev, progressEntry]);

        try {
          if (!currentFolderId) {
            throw new Error(t(DigitalBurnbagStrings.Page_LoadFolderFailed));
          }

          const privateKey = getPrivateKey?.();

          let session;
          let uploadSource: Uint8Array | null = null;
          let chunkSize: number;
          let totalChunks: number;
          let sessionId: string;

          if (privateKey) {
            // ── E2EE path: encrypt the whole file client-side first ──
            const fileBuffer = await file.arrayBuffer();
            const { ciphertext, ivB64, authTagB64, wrappedKeyB64 } =
              await encryptFileForUpload(
                new Uint8Array(fileBuffer),
                privateKey,
              );

            uploadSource = ciphertext;

            session = await api.initUpload(
              file.name,
              file.type || 'application/octet-stream',
              ciphertext.length,
              currentFolderId,
              selectedVaultId ?? undefined,
              undefined,
              undefined,
              { wrappedKeyB64, ivB64, authTagB64 },
            );

            chunkSize = session.chunkSize;
            totalChunks = session.totalChunks;
            sessionId = session.sessionId;

            for (let i = 0; i < totalChunks; i++) {
              const start = i * chunkSize;
              const end = Math.min(start + chunkSize, uploadSource.length);
              const chunk = uploadSource.slice(start, end)
                .buffer as ArrayBuffer;
              const checksum = computeChunkChecksum(chunk);

              const result = await api.uploadChunk(
                sessionId,
                i,
                chunk,
                checksum,
              );

              setUploadProgress((prev) =>
                prev.map((p) =>
                  p.fileName === file.name
                    ? { ...p, progress: Math.round(result.progress * 100) }
                    : p,
                ),
              );
            }
          } else {
            // ── Plaintext path: stream file chunks directly ──
            session = await api.initUpload(
              file.name,
              file.type || 'application/octet-stream',
              file.size,
              currentFolderId,
              selectedVaultId ?? undefined,
            );

            chunkSize = session.chunkSize;
            totalChunks = session.totalChunks;
            sessionId = session.sessionId;

            for (let i = 0; i < totalChunks; i++) {
              const start = i * chunkSize;
              const end = Math.min(start + chunkSize, file.size);
              const chunk = await file.slice(start, end).arrayBuffer();
              const checksum = computeChunkChecksum(chunk);

              const result = await api.uploadChunk(
                sessionId,
                i,
                chunk,
                checksum,
              );

              setUploadProgress((prev) =>
                prev.map((p) =>
                  p.fileName === file.name
                    ? { ...p, progress: Math.round(result.progress * 100) }
                    : p,
                ),
              );
            }
          }

          await api.finalizeUpload(sessionId);

          setUploadProgress((prev) =>
            prev.map((p) =>
              p.fileName === file.name
                ? { ...p, progress: 100, status: 'complete' as const }
                : p,
            ),
          );
        } catch (err) {
          setUploadProgress((prev) =>
            prev.map((p) =>
              p.fileName === file.name
                ? {
                    ...p,
                    status: 'error' as const,
                    error:
                      err instanceof ApiError
                        ? err.message
                        : t(DigitalBurnbagStrings.Page_UploadFailed),
                  }
                : p,
            ),
          );
        }
      }

      // Refresh folder after all uploads
      loadFolderContents(currentFolderId);
      loadVaults();

      // Clear completed uploads after a delay
      setTimeout(() => {
        setUploadProgress((prev) =>
          prev.filter((p) => p.status === 'uploading'),
        );
      }, 3000);
    },
    [
      api,
      currentFolderId,
      getPrivateKey,
      selectedVaultId,
      loadFolderContents,
      loadVaults,
      t,
    ],
  );

  const handleUploadNewVersion = useCallback(
    async (fileId: string, file: File) => {
      const privateKey = getPrivateKey?.();

      if (privateKey) {
        // ── E2EE path ──
        const fileBuffer = await file.arrayBuffer();
        const { ciphertext, ivB64, authTagB64, wrappedKeyB64 } =
          await encryptFileForUpload(new Uint8Array(fileBuffer), privateKey);

        const session = await api.initUploadNewVersion(
          fileId,
          file.type || 'application/octet-stream',
          ciphertext.length,
          file.name,
          { wrappedKeyB64, ivB64, authTagB64 },
        );

        const { chunkSize, totalChunks, sessionId } = session;

        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, ciphertext.length);
          const chunk = ciphertext.slice(start, end).buffer as ArrayBuffer;
          const checksum = computeChunkChecksum(chunk);
          await api.uploadChunk(sessionId, i, chunk, checksum);
        }
        await api.finalizeUpload(sessionId);
      } else {
        // ── Plaintext path ──
        const session = await api.initUploadNewVersion(
          fileId,
          file.type || 'application/octet-stream',
          file.size,
          file.name,
        );
        const { chunkSize, totalChunks, sessionId } = session;
        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunk = await file.slice(start, end).arrayBuffer();
          const checksum = computeChunkChecksum(chunk);
          await api.uploadChunk(sessionId, i, chunk, checksum);
        }
        await api.finalizeUpload(sessionId);
      }

      showSnack(t(DigitalBurnbagStrings.Upload_NewVersionSuccess), 'success');
      loadFolderContents(currentFolderId);
    },
    [api, currentFolderId, getPrivateKey, loadFolderContents, showSnack, t],
  );

  // -- Joule upload handlers -------------------------------------------------

  /**
   * Called by JouleUploadForm after commitUpload succeeds.
   * Chunks were already uploaded and the file is now in the block store;
   * this handler only needs to update UI state.
   */
  const handleJouleCommit = useCallback(
    (_result: IUploadCommitResultDTO, _session: IApiUploadSessionDTO) => {
      const file = jouleUploadQueue[0];
      if (file) {
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.fileName === file.name
              ? { ...p, progress: 100, status: 'complete' as const }
              : p,
          ),
        );
      }
      setJouleUploadQueue((q) => q.slice(1));
      loadFolderContents(currentFolderId);
      loadVaults();
      setTimeout(() => {
        setUploadProgress((prev) =>
          prev.filter((p) => p.status === 'uploading'),
        );
      }, 3000);
    },
    [jouleUploadQueue, loadFolderContents, loadVaults, currentFolderId],
  );

  /** Called when the user discards/cancels the Joule upload form. */
  const handleJouleDiscard = useCallback(() => {
    setJouleUploadQueue((q) => q.slice(1));
  }, []);

  // -- Trash handlers --------------------------------------------------------

  const handleTrashRestore = useCallback(
    async (itemId: string) => {
      try {
        await api.restoreFile(itemId);
        const item = trashItems.find((ti) => ti.id === itemId);
        setTrashItems((prev) => prev.filter((ti) => ti.id !== itemId));
        setTrashMessage(
          t(DigitalBurnbagStrings.Page_Restored).replace(
            '{name}',
            item?.name ?? 'item',
          ),
        );
        showSnack(
          t(DigitalBurnbagStrings.Page_Restored).replace(
            '{name}',
            item?.name ?? 'item',
          ),
          'success',
        );
      } catch (err) {
        handleError(err, t(DigitalBurnbagStrings.Page_RestoreFailed));
      }
    },
    [api, trashItems, showSnack, handleError, t],
  );

  const handleTrashPermanentDelete = useCallback(
    async (itemId: string) => {
      try {
        await api.destroyFile(itemId);
        const item = trashItems.find((ti) => ti.id === itemId);
        setTrashItems((prev) => prev.filter((ti) => ti.id !== itemId));
        setTrashMessage(
          t(DigitalBurnbagStrings.Page_PermanentlyDeleted).replace(
            '{name}',
            item?.name ?? 'item',
          ),
        );
        showSnack(
          t(DigitalBurnbagStrings.Page_PermanentlyDeleted).replace(
            '{name}',
            item?.name ?? 'item',
          ),
          'success',
        );
      } catch (err) {
        handleError(err, t(DigitalBurnbagStrings.Page_PermanentDeleteFailed));
      }
    },
    [api, trashItems, showSnack, handleError, t],
  );

  // -- Share handlers --------------------------------------------------------

  const handleShareInternal = useCallback(
    async (email: string, permission: string) => {
      if (!shareFile) return;
      try {
        await api.shareInternal(shareFile.id, email, permission);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          throw new Error(t(DigitalBurnbagStrings.Page_UserNotFound));
        }
        throw err;
      }
    },
    [api, shareFile, t],
  );

  const handleCreateShareLink = useCallback(
    async (options: {
      encryptionMode: string;
      scope: string;
      password?: string;
      expiresAt?: string;
      maxAccessCount?: number;
      blockDownload?: boolean;
    }) => {
      if (!shareFile)
        throw new Error(t(DigitalBurnbagStrings.Page_NoFileSelected));
      const link = await api.createShareLink(shareFile.id, options);
      return { token: link.token, url: link.url };
    },
    [api, shareFile, t],
  );

  const handleGetMagnetUrl = useCallback(async () => {
    if (!shareFile)
      throw new Error(t(DigitalBurnbagStrings.Page_NoFileSelected));
    const result = await api.getMagnetUrl(shareFile.id);
    return { magnetUrl: result.magnetUrl };
  }, [api, shareFile, t]);

  // -- Canary handlers -------------------------------------------------------

  const handleCreateCanaryBinding = useCallback(
    async (binding: {
      condition: string;
      provider: string;
      action: string;
      targetIds: string[];
      recipientListId?: string;
      cascadeDelay?: number;
    }) => {
      await api.createCanaryBinding(binding);
      loadCanary();
      showSnack(t(DigitalBurnbagStrings.Page_BindingCreated), 'success');
    },
    [api, loadCanary, showSnack, t],
  );

  const handleDeleteCanaryBinding = useCallback(
    async (id: string) => {
      await api.deleteCanaryBinding(id);
      loadCanary();
      showSnack(t(DigitalBurnbagStrings.Page_BindingDeleted), 'success');
    },
    [api, loadCanary, showSnack, t],
  );

  const handleDryRun = useCallback(
    async (bindingId: string): Promise<IDryRunReportDisplay> => {
      const report = await api.dryRunCanary(bindingId);
      setCanaryMessage(
        `Dry run: ${report.affectedFileCount} files, ${report.recipientCount} recipients`,
      );
      return report;
    },
    [api],
  );

  const handleCreateRecipientList = useCallback(
    async (list: {
      name: string;
      recipients: { email: string; label?: string; pgpKey?: string }[];
    }) => {
      await api.createRecipientList(list);
      loadCanary();
      showSnack(t(DigitalBurnbagStrings.Page_RecipientListCreated), 'success');
    },
    [api, loadCanary, showSnack, t],
  );

  // -- Principal search for ACL editor ----------------------------------------

  const searchPrincipals = useCallback(
    async (query: string): Promise<IPrincipalOption[]> => {
      const users = await api.searchUsers(query);
      return users.map((u) => ({
        id: u.id,
        name: u.displayName || u.username,
        type: 'user' as const,
        avatarUrl: u.profilePictureUrl,
        secondary: u.username,
      }));
    },
    [api],
  );

  // -- Bulk operations handler -----------------------------------------------

  const handleBulkAction = useCallback(
    async (action: string) => {
      const ids = Array.from(selectedIds);

      if (action === 'delete') {
        setDeleteConfirm({ itemIds: ids, source: 'bulk' });
        return { successes: 0, failures: 0 };
      }

      if (action === 'move' || action === 'copy') {
        const clipItems = ids
          .map((id) => items.find((i) => i.id === id))
          .filter((i): i is IFileBrowserItem => i !== undefined);
        if (clipItems.length > 0) {
          setClipboard({
            items: clipItems,
            mode: action as 'move' | 'copy',
            sourceFolderId: currentFolderId,
          });
          showSnack(
            `${clipItems.length} item(s) ${action === 'copy' ? 'copied' : 'cut'} — navigate to a folder and paste`,
            'info',
          );
        }
        return { successes: 0, failures: 0 };
      }

      if (action === 'share') {
        // Share the first selected item via the share dialog
        const firstItem = items.find((i) => i.id === ids[0]);
        if (firstItem) setShareFile(firstItem);
        return { successes: 0, failures: 0 };
      }

      if (action === 'permissions') {
        // Fetch ACLs for all selected items and merge with indeterminate tracking
        const targets: Array<{ type: string; id: string }> = ids.map((id) => {
          const item = items.find((i) => i.id === id);
          return { type: item?.type === 'folder' ? 'folder' : 'file', id };
        });
        try {
          const aclResults = await Promise.all(
            targets.map((tgt) => api.getACL(tgt.type, tgt.id)),
          );
          // Build a merged entry list keyed by principalId
          const principalMap = new Map<
            string,
            {
              levels: Set<string>;
              types: Set<string>;
              names: Set<string>;
              count: number;
            }
          >();
          for (const result of aclResults) {
            for (const e of result.entries) {
              const existing = principalMap.get(e.principalId);
              if (existing) {
                existing.levels.add(e.permissionLevel);
                existing.types.add(e.principalType);
                existing.count++;
              } else {
                principalMap.set(e.principalId, {
                  levels: new Set([e.permissionLevel]),
                  types: new Set([e.principalType]),
                  names: new Set([e.principalId]),
                  count: 1,
                });
              }
            }
          }
          const totalItems = aclResults.length;
          const mergedEntries: IACLEditorEntry[] = [];
          for (const [principalId, info] of principalMap) {
            const levels = Array.from(info.levels);
            const indeterminate = levels.length > 1 || info.count < totalItems;
            mergedEntries.push({
              id: `merged-${principalId}`,
              principalId,
              principalName: principalId,
              principalType: Array.from(info.types)[0] as
                | 'user'
                | 'group'
                | 'share_link',
              level: levels.length === 1 ? levels[0] : levels[0],
              indeterminate,
            });
          }
          setAclTarget({
            type: 'multi',
            id: ids.join(','),
            targets,
            entries: mergedEntries,
          });
        } catch (err) {
          handleError(err, t(DigitalBurnbagStrings.Page_LoadPermissionsFailed));
        }
        return { successes: 0, failures: 0 };
      }

      let successes = 0;
      let failures = 0;

      for (const id of ids) {
        try {
          switch (action) {
            case 'destroy':
              await api.destroyFile(id);
              break;
            default:
              break;
          }
          successes++;
        } catch {
          failures++;
        }
      }

      loadFolderContents(currentFolderId);
      setSelectedIds(new Set());
      showSnack(
        `${action}: ${successes} succeeded, ${failures} failed`,
        failures > 0 ? 'error' : 'success',
      );
      return { successes, failures };
    },
    [
      api,
      selectedIds,
      items,
      currentFolderId,
      loadFolderContents,
      showSnack,
      handleError,
      t,
    ],
  );

  // -- Section change handler ------------------------------------------------

  const handleSectionChange = useCallback(
    (section: string) => {
      const s = section as ActiveSection;
      setActiveSection(s);
      onSectionChange?.(s);
    },
    [onSectionChange],
  );

  // -- Sidebar config for LayoutShell ----------------------------------------

  const navItems: NavItem[] = useMemo(
    () => [
      {
        route: '#my-files',
        label: t(DigitalBurnbagStrings.Nav_MyFiles),
        icon: <FolderIcon />,
      },
      {
        route: '#shared',
        label: t(DigitalBurnbagStrings.Nav_SharedWithMe),
        icon: <PeopleIcon />,
        badgeCount: sharedItems.length || undefined,
      },
      {
        route: '#favorites',
        label: t(DigitalBurnbagStrings.Nav_Favorites),
        icon: <StarIcon />,
      },
      {
        route: '#recent',
        label: t(DigitalBurnbagStrings.Nav_Recent),
        icon: <AccessTimeIcon />,
      },
      {
        route: '#activity',
        label: t(DigitalBurnbagStrings.Nav_Activity),
        icon: <TimelineIcon />,
        dividerBefore: true,
      },
      {
        route: '#analytics',
        label: t(DigitalBurnbagStrings.Nav_Analytics),
        icon: <BarChartIcon />,
      },
      {
        route: '#canary',
        label: t(DigitalBurnbagStrings.Nav_Canary),
        icon: <FontAwesomeIcon icon={faBird} />,
      },
      {
        route: '#trash',
        label: t(DigitalBurnbagStrings.Nav_Trash),
        icon: <DeleteIcon />,
        badgeCount: trashItems.length || undefined,
        dividerBefore: true,
      },
    ],
    [t, sharedItems.length, trashItems.length],
  );

  const handleSidebarNavigate = useCallback(
    (route: string) => {
      // Strip the '#' prefix to get the section ID
      handleSectionChange(route.replace('#', ''));
    },
    [handleSectionChange],
  );

  const sidebarConfig: SidebarConfig = useMemo(
    () => ({
      items: navItems,
      ariaLabel: t(DigitalBurnbagStrings.Nav_FileSections),
      onNavigate: handleSidebarNavigate,
      activeRoute: `#${activeSection}`,
    }),
    [navItems, handleSidebarNavigate, t, activeSection],
  );

  // -- Render ----------------------------------------------------------------

  const renderMainContent = () => {
    switch (activeSection) {
      case 'trash':
        return (
          <Box>
            {trashMessage && (
              <Alert
                data-testid="trash-message"
                severity="info"
                sx={{ mb: 1 }}
                onClose={() => setTrashMessage('')}
              >
                {trashMessage}
              </Alert>
            )}
            <TrashBinView
              items={trashItems}
              onRestore={handleTrashRestore}
              onPermanentDelete={handleTrashPermanentDelete}
              loading={trashLoading}
            />
          </Box>
        );

      case 'shared':
        return (
          <FileBrowser
            items={sharedItems}
            breadcrumbs={[{ id: 'shared', name: 'Shared with me' }]}
            selectedIds={selectedIds}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            onSelectionChange={setSelectedIds}
            onNavigate={handleNavigate}
            onBreadcrumbClick={handleBreadcrumbClick}
            onContextAction={handleContextAction}
            loading={loading}
          />
        );

      case 'canary':
        return (
          <Box>
            {canaryMessage && (
              <Alert
                data-testid="canary-message"
                severity="info"
                sx={{ mb: 1 }}
                onClose={() => setCanaryMessage('')}
              >
                {canaryMessage}
              </Alert>
            )}
            <CanaryConfigPanel
              bindings={canaryBindings}
              recipientLists={recipientLists}
              onCreateBinding={handleCreateCanaryBinding}
              onUpdateBinding={() => {}}
              onDeleteBinding={handleDeleteCanaryBinding}
              onDryRun={handleDryRun}
              onCreateRecipientList={handleCreateRecipientList}
              onUpdateRecipientList={() => {}}
            />
          </Box>
        );

      case 'activity':
        return (
          <ActivityFeed
            entries={activityEntries}
            onNavigateToTarget={(id) => {
              handleNavigate(id);
            }}
          />
        );

      case 'analytics':
        return storageUsage ? (
          <StorageAnalytics
            totalUsedBytes={storageUsage.usedBytes}
            quotaBytes={storageUsage.quotaBytes}
            breakdown={(storageUsage.breakdown ?? []).map((b) => ({
              category: b.category,
              sizeBytes: b.bytes,
              fileCount: 0,
            }))}
            largestItems={[]}
            staleFiles={[]}
            onMoveToTrash={async (id) => {
              await api.softDeleteFile(id);
              loadAnalytics();
            }}
            onScheduleDestruction={async (id) => {
              await api.scheduleDestruction(
                id,
                new Date(Date.now() + 7 * 86400000).toISOString(),
              );
              loadAnalytics();
            }}
          />
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            py={4}
          >
            Loading storage analytics…
          </Typography>
        );

      case 'my-files':
      case 'favorites':
      case 'recent':
      default:
        return (
          <Box>
            {/* Vault picker */}
            <VaultPicker
              vaults={vaults}
              selectedVaultId={selectedVaultId}
              onSelectVault={handleSelectVault}
              onCreateVault={handleCreateVault}
              onSealVault={handleSealVault}
              loading={vaultsLoading}
            />

            {!selectedVaultId /* No vault selected — nothing else to show */ ? null : (
              <>
                {/* Upload zone — files are queued for Joule billing */}
                <UploadWidget
                  onUploadFiles={(files) =>
                    setJouleUploadQueue((q) => [...q, ...files])
                  }
                  uploadProgress={uploadProgress}
                />

                {/* Bulk operations toolbar */}
                {selectedIds.size > 0 && (
                  <BulkOperationsToolbar
                    selectedCount={selectedIds.size}
                    onBulkAction={handleBulkAction}
                    onClearSelection={() => setSelectedIds(new Set())}
                  />
                )}

                {/* Clipboard paste banner */}
                {clipboard && (
                  <Alert
                    severity="info"
                    sx={{ mb: 1 }}
                    action={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<ContentPasteIcon />}
                          onClick={handlePaste}
                          disabled={
                            clipboard.sourceFolderId === currentFolderId
                          }
                        >
                          Paste here
                        </Button>
                        <Button size="small" onClick={() => setClipboard(null)}>
                          Cancel
                        </Button>
                      </Box>
                    }
                  >
                    {clipboard.items.length} item(s) ready to{' '}
                    {clipboard.mode === 'copy' ? 'copy' : 'move'}
                    {clipboard.sourceFolderId === currentFolderId &&
                      ' — navigate to a different folder first'}
                  </Alert>
                )}

                {/* File browser */}
                <FileBrowser
                  items={items}
                  breadcrumbs={breadcrumbs}
                  selectedIds={selectedIds}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSortChange={handleSortChange}
                  onSelectionChange={setSelectedIds}
                  onNavigate={handleNavigate}
                  onBreadcrumbClick={handleBreadcrumbClick}
                  onContextAction={handleContextAction}
                  onDrop={handleDrop}
                  onCreateFolder={handleCreateFolder}
                  showPaste={clipboard !== null}
                  loading={loading}
                  vaultName={vaults.find((v) => v.id === selectedVaultId)?.name}
                />
              </>
            )}
          </Box>
        );
    }
  };

  // -- AppBar breadcrumb path ------------------------------------------------

  const appBarBreadcrumb = useMemo(() => {
    if (activeSection !== 'my-files' || breadcrumbs.length === 0) return null;
    const selectedVault = vaults.find((v) => v.id === selectedVaultId);
    return (
      <Typography
        variant="body2"
        component="nav"
        aria-label="Folder path"
        sx={{
          color: 'inherit',
          opacity: 0.9,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          /* RTL direction puts the ellipsis on the left so the deepest
             (most relevant) folder stays visible on the right. */
          direction: 'rtl',
          textAlign: 'left',
        }}
      >
        {/* Wrap content in a bdi so the actual text renders LTR */}
        <bdi>
          {selectedVault && (
            <>
              <Box component="span" sx={{ fontWeight: 600 }}>
                {selectedVault.name}
              </Box>
              <Box
                component="span"
                sx={{ mx: 0.5, opacity: 0.7, verticalAlign: 'middle' }}
                aria-hidden
              >
                ›
              </Box>
            </>
          )}
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.id}>
              {i > 0 && (
                <Box
                  component="span"
                  sx={{ mx: 0.5, opacity: 0.7, verticalAlign: 'middle' }}
                  aria-hidden
                >
                  ›
                </Box>
              )}
              <span>{crumb.name}</span>
            </React.Fragment>
          ))}
        </bdi>
      </Typography>
    );
  }, [activeSection, breadcrumbs, vaults, selectedVaultId]);

  return (
    <DuressProvider>
      <PowerUserProvider>
        <DomainRouter
          sidebar={sidebarConfig}
          titleContent={appBarBreadcrumb}
          subBar={
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 2,
                p: 1,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <PresenceIndicator viewers={viewers} />
            </Box>
          }
        >
          <Box sx={{ p: 2, overflow: 'auto', flex: 1 }}>
            {renderMainContent()}
          </Box>

          {/* Preview dialog */}
          {previewFile && (
            <PreviewViewer
              fileId={previewFile.id}
              fileName={previewFile.name}
              mimeType={previewFile.mimeType ?? 'application/octet-stream'}
              fetchContentUrl={() => api.getPreviewBlobUrl(previewFile.id)}
              onClose={() => setPreviewFile(null)}
              onDownload={async () => {
                const previewPrivateKey = getPrivateKey?.();
                if (previewPrivateKey) {
                  try {
                    const enc = await api.getEncryptedFileContent(
                      previewFile.id,
                    );
                    if (enc.encryptedSymmetricKey) {
                      const plaintext = await decryptAuthenticatedUserFile(
                        enc.encryptedSymmetricKey,
                        enc.encryptedContent,
                        enc.iv,
                        enc.authTag,
                        previewPrivateKey,
                      );
                      const blob = new Blob([plaintext.buffer as ArrayBuffer], {
                        type: enc.mimeType,
                      });
                      const encUrl = URL.createObjectURL(blob);
                      const encA = document.createElement('a');
                      encA.href = encUrl;
                      encA.download = enc.fileName;
                      encA.click();
                      URL.revokeObjectURL(encUrl);
                      return;
                    }
                  } catch {
                    // Fall through to unencrypted download on decryption failure
                  }
                }
                const url = await api.getDownloadBlobUrl(previewFile.id);
                const a = document.createElement('a');
                a.href = url;
                a.download = previewFile.name;
                a.click();
                URL.revokeObjectURL(url);
              }}
            />
          )}

          {/* Share dialog */}
          {shareFile && (
            <ShareDialog
              open
              fileId={shareFile.id}
              fileName={shareFile.name}
              onClose={() => setShareFile(null)}
              onShareInternal={handleShareInternal}
              onCreateShareLink={handleCreateShareLink}
              onGetMagnetUrl={handleGetMagnetUrl}
            />
          )}

          {/* ACL editor dialog */}
          {aclTarget && (
            <Dialog
              open
              onClose={() => setAclTarget(null)}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>
                {aclTarget.targets
                  ? t(DigitalBurnbagStrings.ACL_MultiItemTitle).replace(
                      '{count}',
                      String(aclTarget.targets.length),
                    )
                  : 'Permissions'}
              </DialogTitle>
              <DialogContent>
                {aclTarget.targets && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 1, display: 'block' }}
                  >
                    {t(DigitalBurnbagStrings.ACL_ApplyToAll)}
                  </Typography>
                )}
                <ACLEditor
                  entries={aclTarget.entries}
                  searchPrincipals={searchPrincipals}
                  onUpdateEntry={(entryId, level) => {
                    setAclTarget((prev) =>
                      prev
                        ? {
                            ...prev,
                            entries: prev.entries.map((e) =>
                              e.id === entryId
                                ? { ...e, level, indeterminate: false }
                                : e,
                            ),
                          }
                        : null,
                    );
                  }}
                  onRemoveEntry={(entryId) => {
                    setAclTarget((prev) =>
                      prev
                        ? {
                            ...prev,
                            entries: prev.entries.filter(
                              (e) => e.id !== entryId,
                            ),
                          }
                        : null,
                    );
                  }}
                  onAddEntry={async (principalId, level) => {
                    if (!aclTarget) return;
                    setAclTarget((prev) =>
                      prev
                        ? {
                            ...prev,
                            entries: [
                              ...prev.entries,
                              {
                                id: crypto.randomUUID(),
                                principalId,
                                principalName: principalId,
                                principalType: 'user' as const,
                                level,
                              },
                            ],
                          }
                        : null,
                    );
                  }}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setAclTarget(null)}>Cancel</Button>
                <Button
                  variant="contained"
                  onClick={async () => {
                    if (!aclTarget) return;
                    const entriesToSave = aclTarget.entries
                      .filter((e) => !e.indeterminate)
                      .map((e) => ({
                        principalId: e.principalId,
                        principalType: e.principalType,
                        permissionLevel: e.level,
                        flags: [] as string[],
                      }));
                    try {
                      if (aclTarget.targets) {
                        // Multi-item: apply to every selected target
                        await Promise.all(
                          aclTarget.targets.map((tgt) =>
                            api.setACL(tgt.type, tgt.id, entriesToSave),
                          ),
                        );
                      } else {
                        // Single-item
                        await api.setACL(
                          aclTarget.type,
                          aclTarget.id,
                          entriesToSave,
                        );
                      }
                      showSnack(t(DigitalBurnbagStrings.ACL_Saved), 'success');
                    } catch (err) {
                      handleError(err, t(DigitalBurnbagStrings.ACL_SaveFailed));
                    }
                    setAclTarget(null);
                  }}
                >
                  Save
                </Button>
              </DialogActions>
            </Dialog>
          )}

          {/* Folder export dialog */}
          {exportFolderId && (
            <FolderExportDialog
              open
              folderId={exportFolderId}
              folderName="Export"
              onClose={() => setExportFolderId(null)}
              onExport={async (folderId, options) => {
                const result = await api.exportFolderToTCBL(folderId, options);
                return {
                  ...result,
                  recipe: result.tcblHandle,
                  manifestSummary: {
                    entryCount: result.entryCount,
                    totalSizeBytes: result.totalSizeBytes,
                  },
                } as never;
              }}
            />
          )}

          {/* Upload new version dialog — collects file, then routes through Joule billing */}
          {uploadVersionTarget && (
            <UploadNewVersionDialog
              open
              fileId={uploadVersionTarget.id}
              fileName={uploadVersionTarget.name}
              expectedMimeType={uploadVersionTarget.mimeType ?? ''}
              onClose={() => setUploadVersionTarget(null)}
              onUpload={async (fileId, file) => {
                setUploadVersionTarget(null);
                // Queue through Joule billing with the new-version fileId
                setNewVersionFileId(fileId);
                setJouleUploadQueue((q) => [...q, file]);
              }}
            />
          )}

          {/* Seal-break warning dialog */}
          {sealBreakPending && (
            <SealBreakWarningDialog
              open
              context={sealBreakPending.context}
              targetName={sealBreakPending.item.name}
              sealedAt={sealBreakPending.sealedAt}
              onCancel={() => setSealBreakPending(null)}
              onConfirm={() => {
                const pending = sealBreakPending;
                setSealBreakPending(null);
                if (pending.action === 'selectVault') {
                  setSelectedVaultId(pending.itemId);
                  setCurrentFolderId(null);
                  setItems([]);
                  setBreadcrumbs([{ id: 'root', name: 'My Files' }]);
                } else if (pending.action === 'preview') {
                  setPreviewFile(pending.item);
                } else if (pending.action === 'download') {
                  void (async () => {
                    const pendingPrivateKey = getPrivateKey?.();
                    if (pendingPrivateKey) {
                      try {
                        const enc = await api.getEncryptedFileContent(
                          pending.itemId,
                        );
                        if (enc.encryptedSymmetricKey) {
                          const plaintext = await decryptAuthenticatedUserFile(
                            enc.encryptedSymmetricKey,
                            enc.encryptedContent,
                            enc.iv,
                            enc.authTag,
                            pendingPrivateKey,
                          );
                          const blob = new Blob(
                            [plaintext.buffer as ArrayBuffer],
                            { type: enc.mimeType },
                          );
                          const encUrl = URL.createObjectURL(blob);
                          const encA = document.createElement('a');
                          encA.href = encUrl;
                          encA.download = enc.fileName;
                          encA.click();
                          URL.revokeObjectURL(encUrl);
                          return;
                        }
                      } catch {
                        // Fall through to unencrypted download on decryption failure
                      }
                    }
                    const url = await api.getDownloadBlobUrl(pending.itemId);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = pending.item.name;
                    a.click();
                    URL.revokeObjectURL(url);
                  })();
                }
              }}
            />
          )}

          {/* Storage contract dialog */}
          {storageContractFile && (
            <Dialog
              open
              onClose={() => {
                setStorageContractFile(null);
                setStorageContractData(null);
              }}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>
                Storage Contract — {storageContractFile.name}
              </DialogTitle>
              <DialogContent>
                {storageContractData === null ? (
                  <Box display="flex" justifyContent="center" py={3}>
                    <CircularProgress size={24} />
                  </Box>
                ) : storageContractData === undefined ? (
                  <Typography color="text.secondary">
                    No storage contract found for this file.
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 1.5,
                      pt: 1,
                    }}
                  >
                    {[
                      ['Contract ID', storageContractData.contractId],
                      ['Status', storageContractData.status],
                      ['Tier', storageContractData.tier],
                      [
                        'Size',
                        `${(Number(storageContractData.bytes) / 1024).toFixed(1)} KB`,
                      ],
                      [
                        'RS Params',
                        `RS(${storageContractData.rsK},${storageContractData.rsM})`,
                      ],
                      ['Duration', `${storageContractData.committedDays} days`],
                      [
                        'Created',
                        formatDateWithBD(storageContractData.createdAt),
                      ],
                      [
                        'Expires',
                        formatDateWithBD(storageContractData.expiresAt),
                      ],
                      [
                        'Last Settled',
                        formatDateWithBD(storageContractData.lastSettledAt),
                      ],
                      [
                        'Upfront Cost',
                        `${storageContractData.upfrontMicroJoules} µJ`,
                      ],
                      [
                        'Daily Cost',
                        `${storageContractData.dailyMicroJoules} µJ/day`,
                      ],
                      [
                        'Remaining Credit',
                        `${storageContractData.remainingCreditMicroJoules} µJ`,
                      ],
                      [
                        'Auto-Renew',
                        storageContractData.autoRenew ? 'Yes' : 'No',
                      ],
                    ].map(([label, value]) => (
                      <Box key={label as string}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          {label}
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => {
                    setStorageContractFile(null);
                    setStorageContractData(null);
                  }}
                >
                  Close
                </Button>
              </DialogActions>
            </Dialog>
          )}

          {/* Joule upload billing dialog — shown for each queued file */}
          {jouleUploadQueue.length > 0 &&
            jouleUploadQueue[0] !== undefined &&
            currentFolderId &&
            selectedVaultId && (
              <Dialog open maxWidth="sm" fullWidth>
                <DialogTitle>
                  {newVersionFileId
                    ? 'Upload New Version'
                    : t(DigitalBurnbagStrings.Joule_FormAriaLabel)}
                </DialogTitle>
                <DialogContent>
                  <JouleUploadForm
                    file={jouleUploadQueue[0]}
                    folderId={currentFolderId}
                    vaultContainerId={selectedVaultId}
                    apiClient={api}
                    onCommit={(result, session) => {
                      setNewVersionFileId(null);
                      void handleJouleCommit(result, session);
                    }}
                    onDiscard={() => {
                      setNewVersionFileId(null);
                      handleJouleDiscard();
                    }}
                    initSession={
                      newVersionFileId
                        ? async (_tier, _durationDays) => {
                            const file = jouleUploadQueue[0]!;
                            return api.initUploadNewVersion(
                              newVersionFileId,
                              file.type || 'application/octet-stream',
                              file.size,
                              file.name,
                            );
                          }
                        : undefined
                    }
                  />
                </DialogContent>
              </Dialog>
            )}

          {/* Delete confirmation dialog */}
          <Dialog
            open={deleteConfirm !== null}
            onClose={() => setDeleteConfirm(null)}
          >
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {deleteConfirm && deleteConfirm.itemIds.length === 1
                  ? `Are you sure you want to delete "${items.find((i) => i.id === deleteConfirm.itemIds[0])?.name ?? 'this item'}"?`
                  : `Are you sure you want to delete ${deleteConfirm?.itemIds.length ?? 0} items?`}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button
                color="error"
                variant="contained"
                onClick={() => {
                  if (deleteConfirm) {
                    executeDelete(deleteConfirm.itemIds);
                  }
                  setDeleteConfirm(null);
                }}
              >
                Delete
              </Button>
            </DialogActions>
          </Dialog>

          {/* Snackbar */}
          <Snackbar
            open={snack !== null}
            autoHideDuration={4000}
            onClose={() => setSnack(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            {snack ? (
              <Alert
                severity={snack.severity}
                onClose={() => setSnack(null)}
                variant="filled"
              >
                {snack.message}
              </Alert>
            ) : undefined}
          </Snackbar>
        </DomainRouter>
      </PowerUserProvider>
    </DuressProvider>
  );
};

export default BurnbagPage;
