/**
 * CanaryFileBrowserIntegration — provides the context menu integration hook
 * for attaching canary providers to vaults, files, and folders directly from
 * the file browser via right-click.
 *
 * This component manages the state for the CanaryContextMenu and wires it
 * to the BurnbagApiClient for creating/removing bindings.
 *
 * Requirements: 13.1, 14.1
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BurnbagApiClient, IApiProviderConnectionDTO } from '../services/burnbag-api-client';
import { CanaryContextMenu } from './CanaryContextMenu';
import type { ICanaryBinding, ICanaryContextMenuTarget } from './CanaryContextMenu';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ICanaryFileBrowserIntegrationProps {
  /** BurnbagApiClient instance for making API calls */
  apiClient: BurnbagApiClient;
  /** Called when user wants to navigate to the Provider Marketplace */
  onNavigateToMarketplace: () => void;
  /** Called when user wants to open the full MultiCanaryBindingPanel for a target */
  onOpenMultiCanarySetup: (target: ICanaryContextMenuTarget) => void;
}

export interface IUseCanaryContextMenuResult {
  /** Call this from the file browser's right-click handler */
  handleContextMenu: (event: React.MouseEvent<HTMLElement>, target: ICanaryContextMenuTarget) => void;
  /** The CanaryContextMenu React element to render (renders nothing when closed) */
  contextMenuElement: React.ReactElement;
}

// ---------------------------------------------------------------------------
// Hook: useCanaryContextMenu
// ---------------------------------------------------------------------------

/**
 * Hook that provides context menu integration for the file browser.
 * Returns a handler to call on right-click and the menu element to render.
 *
 * Usage:
 * ```tsx
 * const { handleContextMenu, contextMenuElement } = useCanaryContextMenu({
 *   apiClient,
 *   onNavigateToMarketplace: () => navigate('/canary/marketplace'),
 *   onOpenMultiCanarySetup: (target) => openMultiCanaryPanel(target),
 * });
 *
 * // In file browser:
 * <div onContextMenu={(e) => handleContextMenu(e, { id: file.id, name: file.name, type: 'file' })}>
 *   {file.name}
 * </div>
 *
 * // Render the menu element somewhere in the tree:
 * {contextMenuElement}
 * ```
 */
export function useCanaryContextMenu({
  apiClient,
  onNavigateToMarketplace,
  onOpenMultiCanarySetup,
}: ICanaryFileBrowserIntegrationProps): IUseCanaryContextMenuResult {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [target, setTarget] = useState<ICanaryContextMenuTarget | null>(null);
  const [connections, setConnections] = useState<IApiProviderConnectionDTO[]>([]);
  const [existingBindings, setExistingBindings] = useState<ICanaryBinding[]>([]);
  const [open, setOpen] = useState(false);

  // Fetch connections on mount
  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiClient.getMyConnections();
        setConnections(data);
      } catch {
        /* silently handle */
      }
    };
    void load();
  }, [apiClient]);

  // Fetch bindings for the target when menu opens
  const fetchBindingsForTarget = useCallback(async (targetId: string) => {
    try {
      const data = await apiClient.getMultiCanaryBindingsForTarget(targetId);
      setExistingBindings(data.map(b => ({
        id: b.id,
        providerId: b.providerConnectionIds[0] ?? '',
        providerDisplayName: b.name,
        condition: b.canaryCondition as 'ABSENCE' | 'DURESS',
        action: b.protocolAction,
        absenceThresholdHours: b.absenceThresholdHours,
      })));
    } catch {
      setExistingBindings([]);
    }
  }, [apiClient]);

  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLElement>, menuTarget: ICanaryContextMenuTarget) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setTarget(menuTarget);
    setOpen(true);
    void fetchBindingsForTarget(menuTarget.id);
  }, [fetchBindingsForTarget]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setAnchorEl(null);
  }, []);

  const handleCreateBinding = useCallback(async (params: {
    targetId: string;
    targetType: string;
    providerConnectionId: string;
    condition: 'ABSENCE' | 'DURESS';
    action: string;
    absenceThresholdHours: number;
  }) => {
    await apiClient.createMultiCanaryBinding({
      name: `${params.condition} canary`,
      providerConnectionIds: [params.providerConnectionId],
      targetIds: [params.targetId],
      redundancyPolicy: 'any_fails',
      protocolAction: params.action,
      canaryCondition: params.condition,
      absenceThresholdHours: params.absenceThresholdHours,
    });
    // Refresh bindings for the target
    if (target) {
      await fetchBindingsForTarget(target.id);
    }
  }, [apiClient, target, fetchBindingsForTarget]);

  const handleRemoveBinding = useCallback(async (bindingId: string) => {
    await apiClient.deleteMultiCanaryBinding(bindingId);
    if (target) {
      await fetchBindingsForTarget(target.id);
    }
  }, [apiClient, target, fetchBindingsForTarget]);

  const handleOpenMultiCanarySetup = useCallback((menuTarget: ICanaryContextMenuTarget) => {
    handleClose();
    onOpenMultiCanarySetup(menuTarget);
  }, [handleClose, onOpenMultiCanarySetup]);

  const handleNavigateToMarketplace = useCallback(() => {
    handleClose();
    onNavigateToMarketplace();
  }, [handleClose, onNavigateToMarketplace]);

  const contextMenuElement = useMemo(() => (
    <CanaryContextMenu
      target={target ?? { id: '', name: '', type: 'file' }}
      anchorEl={anchorEl}
      open={open}
      onClose={handleClose}
      connections={connections}
      existingBindings={existingBindings}
      onCreateBinding={handleCreateBinding}
      onRemoveBinding={handleRemoveBinding}
      onOpenMultiCanarySetup={handleOpenMultiCanarySetup}
      onNavigateToMarketplace={handleNavigateToMarketplace}
    />
  ), [
    target, anchorEl, open, handleClose, connections, existingBindings,
    handleCreateBinding, handleRemoveBinding, handleOpenMultiCanarySetup,
    handleNavigateToMarketplace,
  ]);

  return { handleContextMenu, contextMenuElement };
}

// ---------------------------------------------------------------------------
// CanaryFileBrowserIntegration (component wrapper)
// ---------------------------------------------------------------------------

export interface ICanaryFileBrowserIntegrationComponentProps extends ICanaryFileBrowserIntegrationProps {
  /** Render prop that receives the context menu handler */
  children: (contextMenu: IUseCanaryContextMenuResult) => React.ReactNode;
}

/**
 * Component wrapper around useCanaryContextMenu for class-component or
 * non-hook consumers.
 *
 * Usage:
 * ```tsx
 * <CanaryFileBrowserIntegration apiClient={client} onNavigateToMarketplace={...} onOpenMultiCanarySetup={...}>
 *   {({ handleContextMenu, contextMenuElement }) => (
 *     <>
 *       <FileBrowser onItemContextMenu={handleContextMenu} />
 *       {contextMenuElement}
 *     </>
 *   )}
 * </CanaryFileBrowserIntegration>
 * ```
 */
export function CanaryFileBrowserIntegration({
  apiClient,
  onNavigateToMarketplace,
  onOpenMultiCanarySetup,
  children,
}: ICanaryFileBrowserIntegrationComponentProps) {
  const contextMenu = useCanaryContextMenu({ apiClient, onNavigateToMarketplace, onOpenMultiCanarySetup });
  return <>{children(contextMenu)}</>;
}
