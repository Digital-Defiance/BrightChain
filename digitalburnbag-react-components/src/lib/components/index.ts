export {
  DomainBrandContext,
  DomainRouter,
  useDomainBrand,
  useDomainBrandContext,
  useDomainConfigs,
} from './DomainRouter';
export type { DomainBrandConfig, IDomainRouterProps } from './DomainRouter';

export { FileBrowser } from './FileBrowser';
export type {
  FileBrowserSortField,
  IBreadcrumbSegment,
  IFileBrowserItem,
  IFileBrowserProps,
  SortDirection,
} from './FileBrowser';

export { EncryptionBadge } from './EncryptionBadge';
export type {
  EncryptionStatus,
  IEncryptionBadgeProps,
} from './EncryptionBadge';

export { AccessIndicator } from './AccessIndicator';
export type {
  IAccessIndicatorProps,
  IAccessPrincipal,
} from './AccessIndicator';

export { FolderExportDialog } from './FolderExportDialog';
export type { IFolderExportDialogProps } from './FolderExportDialog';

export { SidebarNavigation } from './SidebarNavigation';
export type { ISidebarNavigationProps } from './SidebarNavigation';

export { TrashBinView } from './TrashBinView';
export type { ITrashBinViewProps, ITrashItem } from './TrashBinView';

export { BulkOperationsToolbar } from './BulkOperationsToolbar';
export type {
  BulkAction,
  IBulkOperationsToolbarProps,
} from './BulkOperationsToolbar';

export { UploadWidget } from './UploadWidget';
export type { IUploadProgress, IUploadWidgetProps } from './UploadWidget';

export { UploadNewVersionDialog } from './UploadNewVersionDialog';
export type { IUploadNewVersionDialogProps } from './UploadNewVersionDialog';

export { PreviewViewer } from './PreviewViewer';
export type { IPreviewViewerProps } from './PreviewViewer';

export { ShareDialog } from './ShareDialog';
export type { IShareDialogProps, IShareLinkOptions } from './ShareDialog';

export { ACLEditor } from './ACLEditor';
export type { IACLEditorEntry, IACLEditorProps } from './ACLEditor';

export { PrincipalPicker } from './PrincipalPicker';
export type {
  IPrincipalOption,
  IPrincipalPickerProps,
} from './PrincipalPicker';

export { CanaryConfigPanel } from './CanaryConfigPanel';
export type {
  ICanaryBindingDisplay,
  ICanaryBindingInput,
  ICanaryConfigPanelProps,
  IDryRunReportDisplay,
  IRecipientListDisplay,
  IRecipientListInput,
} from './CanaryConfigPanel';

export { PresenceIndicator } from './PresenceIndicator';
export type {
  IPresenceIndicatorProps,
  IPresenceUser,
} from './PresenceIndicator';

export { ActivityFeed } from './ActivityFeed';
export type { IActivityEntry, IActivityFeedProps } from './ActivityFeed';

export { NotificationPanel } from './NotificationPanel';
export type {
  INotificationDisplay,
  INotificationPanelProps,
} from './NotificationPanel';

export { CommentsPanel } from './CommentsPanel';
export type { IComment, ICommentsPanelProps } from './CommentsPanel';

export { FavoritesBar } from './FavoritesBar';
export type { IFavoriteItem, IFavoritesBarProps } from './FavoritesBar';

export { TemplateManager } from './TemplateManager';
export type { IFolderTemplate, ITemplateManagerProps } from './TemplateManager';

export { StorageAnalytics } from './StorageAnalytics';
export type {
  ILargeItem,
  IStaleFile,
  IStorageAnalyticsProps,
  IStorageBreakdown,
} from './StorageAnalytics';

export {
  PowerUserContext,
  PowerUserProvider,
  usePowerUser,
} from './PowerUserProvider';
export type {
  IPowerUserContext,
  IPowerUserProviderProps,
} from './PowerUserProvider';

export { DuressContext, DuressProvider, useDuress } from './DuressProvider';
export type { IDuressContext, IDuressProviderProps } from './DuressProvider';

export * from './BirdbagLogo';
export * from './BirdbagLogoBlue';
export * from './BirdbagLogoGrey';

// Provider Registration Components
export { ProviderCard } from './ProviderCard';
export type { IProviderCardProps } from './ProviderCard';

export { ProviderConnectionStatus } from './ProviderConnectionStatus';
export type {
  ConnectionStatus,
  IProviderConnectionStatusProps,
} from './ProviderConnectionStatus';

export { MyConnections } from './MyConnections';
export type { IMyConnectionsProps } from './MyConnections';

export { ProviderList } from './ProviderList';
export type { IProviderListProps } from './ProviderList';

export { ProviderRegistrationWizard } from './ProviderRegistrationWizard';
export type { IProviderRegistrationWizardProps } from './ProviderRegistrationWizard';

export { ProviderDashboard } from './ProviderDashboard';
export type { IProviderDashboardProps } from './ProviderDashboard';

export { ProviderDetailView } from './ProviderDetailView';
export type {
  IAnalyticsCallbacks,
  IProviderDetailViewProps,
  IStatusHistoryEntryDTO,
} from './ProviderDetailView';

export { BindingAssistant } from './BindingAssistant';
export type {
  IBindingAssistantProps,
  IBindingTarget,
} from './BindingAssistant';

export { CustomProviderForm } from './CustomProviderForm';
export type {
  ICustomProviderFormData,
  ICustomProviderFormProps,
} from './CustomProviderForm';

// Analytics Components
export { DateRangeSelector } from './DateRangeSelector';
export type { IDateRangeSelectorProps } from './DateRangeSelector';

export { ChartView } from './ChartView';
export type { IChartViewProps } from './ChartView';

export { AlertThresholdOverlay } from './AlertThresholdOverlay';
export type { IAlertThresholdOverlayProps } from './AlertThresholdOverlay';

export { DrillDownPanel } from './DrillDownPanel';
export type { IDrillDownPanelProps } from './DrillDownPanel';

export { HistoryLedger } from './HistoryLedger';
export type { IHistoryLedgerProps } from './HistoryLedger';

export { HeatmapView } from './HeatmapView';
export type { IHeatmapViewProps } from './HeatmapView';

export { DashboardWidgets } from './DashboardWidgets';
export type { IDashboardWidgetsProps } from './DashboardWidgets';

export { ComparisonView } from './ComparisonView';
export type { IComparisonViewProps } from './ComparisonView';

export { default as FriendsSuggestionSection } from './FriendsSuggestionSection';
export type { FriendsSuggestionSectionProps } from './FriendsSuggestionSection';

// Joule storage economy components
export * from './joule';

export { SealBreakWarningDialog } from './SealBreakWarningDialog';
export type { ISealBreakWarningDialogProps } from './SealBreakWarningDialog';

// Canary Provider Expansion Components
export { ProviderMarketplace } from './ProviderMarketplace';
export type { IProviderMarketplaceProps } from './ProviderMarketplace';

export { ProviderHealthGrid, computeHealthPercentages, sortConnections } from './ProviderHealthGrid';
export type {
  IHealthPercentages,
  IProviderConnectionExtendedForGrid,
  IProviderHealthGridProps,
  SortCriterion,
  ViewMode,
} from './ProviderHealthGrid';

export { CanaryContextMenu } from './CanaryContextMenu';
export type { ICanaryBinding, ICanaryContextMenuProps, ICanaryContextMenuTarget } from './CanaryContextMenu';

export { CanaryLeftMenu, classifySystemHealth, computeSystemHealth, getAttentionNeededCount } from './CanaryLeftMenu';
export type { CanarySystemHealth, ICanaryLeftMenuProps, IMultiCanaryBindingSummary, IWebhookEndpointSummary } from './CanaryLeftMenu';

export { MultiCanaryBindingPanel, getBindingDisplayInfo } from './MultiCanaryBindingPanel';
export type { IBindingDisplayInfo, IMultiCanaryBinding, IMultiCanaryBindingPanelProps, IMultiCanaryTarget, RedundancyPolicy } from './MultiCanaryBindingPanel';

export { WebhookEndpointPanel } from './WebhookEndpointPanel';
export type { IDeliveryDataPoint, IWebhookDeliveryStats, IWebhookEndpointDisplay, IWebhookEndpointPanelProps } from './WebhookEndpointPanel';

export { ActivationFlow } from './ActivationFlow';
export type { IActivationFlowProps, IActivationFlowProvider } from './ActivationFlow';

export { ProviderLifecycleActions, shouldShowDisconnectWarning, shouldShowBelowMinimumWarning } from './ProviderLifecycleActions';
export type { IDisconnectImpactReport, IProviderLifecycleActionsProps, IProviderLifecycleBinding, IProviderLifecycleConnection } from './ProviderLifecycleActions';

export { CanaryProviderPage } from './CanaryProviderPage';
export type { CanaryPageSection, ICanaryProviderPageProps } from './CanaryProviderPage';

export { CanaryFileBrowserIntegration, useCanaryContextMenu } from './CanaryFileBrowserIntegration';
export type { ICanaryFileBrowserIntegrationProps, ICanaryFileBrowserIntegrationComponentProps, IUseCanaryContextMenuResult } from './CanaryFileBrowserIntegration';

