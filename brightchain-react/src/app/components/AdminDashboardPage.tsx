import { faComment } from '@awesome.me/kit-a20d532681/icons/chisel/regular';
import {
  faArrowsRotate,
  faCircleCheck,
  faCircleXmark,
  faCubes,
  faDatabase,
  faEnvelope,
  faFingerprint,
  faHeartPulse,
  faLayerGroup,
  faLock,
  faMicrochip,
  faServer,
  faShieldHalved,
  faTriangleExclamation,
  faUserCheck,
  faUserClock,
  faUserLock,
  faUsers,
} from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { faCircleNodes } from '@awesome.me/kit-a20d532681/icons/classic/thin';
import {
  BrightChainStrings,
  HealthStatus,
  IAdminDashboardData,
  NodeIdSource,
  NodeStatus,
} from '@brightchain/brightchain-lib';
import { BrightChainSubLogo } from '@brightchain/brightchain-react-components';
import {
  useAuth,
  useI18n,
} from '@digitaldefiance/express-suite-react-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { FC, memo, useCallback, useEffect, useRef, useState } from 'react';
import authenticatedApi from '../../services/authenticatedApi';

const DEFAULT_POLL_INTERVAL_MS = 30_000;

/** Convert bytes to MB with 2 decimal places. */
const formatMB = (bytes: number): string =>
  (bytes / 1024 / 1024).toFixed(2) + ' MB';

const subLogoHeight = 24;
const subLogoIconHeight = 18;

/** Shared sx for uniform card height in the dashboard grid. */
const cardSx = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
} as const;
const cardContentSx = { flexGrow: 1 } as const;

/** Map NodeStatus to a status icon + color. */
const nodeStatusIcon = (status: NodeStatus) => {
  switch (status) {
    case NodeStatus.ONLINE:
      return (
        <FontAwesomeIcon icon={faCircleCheck} style={{ color: 'green' }} />
      );
    case NodeStatus.OFFLINE:
      return <FontAwesomeIcon icon={faCircleXmark} style={{ color: 'red' }} />;
    default:
      return (
        <FontAwesomeIcon
          icon={faTriangleExclamation}
          style={{ color: 'orange' }}
        />
      );
  }
};

/** Map HealthStatus to a status icon + color. */
const healthStatusIcon = (status: HealthStatus) => {
  switch (status) {
    case HealthStatus.HEALTHY:
      return (
        <FontAwesomeIcon icon={faCircleCheck} style={{ color: 'green' }} />
      );
    case HealthStatus.UNHEALTHY:
      return <FontAwesomeIcon icon={faCircleXmark} style={{ color: 'red' }} />;
    case HealthStatus.DEGRADED:
      return (
        <FontAwesomeIcon
          icon={faTriangleExclamation}
          style={{ color: 'orange' }}
        />
      );
    default:
      return (
        <FontAwesomeIcon
          icon={faTriangleExclamation}
          style={{ color: 'orange' }}
        />
      );
  }
};

/** Section header with icon and title. */
const SectionHeader: FC<{
  icon: typeof faServer;
  title: string;
}> = ({ icon, title }) => (
  <Box display="flex" alignItems="center" gap={1} mb={1}>
    <FontAwesomeIcon icon={icon} />
    <Typography variant="h6">{title}</Typography>
  </Box>
);

const AdminDashboardPage: FC = () => {
  const { admin } = useAuth();
  const { tBranded: t } = useI18n();
  const [data, setData] = useState<IAdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessTime, setLastSuccessTime] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await authenticatedApi.get('/admin/dashboard');
      const d: IAdminDashboardData = response.data.data ?? response.data;
      setData(d);
      setError(null);
      setLastSuccessTime(new Date().toLocaleTimeString());
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!admin) return;
    fetchData();
    intervalRef.current = setInterval(fetchData, DEFAULT_POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [admin, fetchData]);

  if (!admin) {
    return (
      <Container maxWidth="sm">
        <Box my={8} textAlign="center">
          <FontAwesomeIcon icon={faLock} size="3x" color="gray" />
          <Typography variant="h5" mt={2}>
            {t(BrightChainStrings.Admin_Dashboard_AccessDenied)}
          </Typography>
          <Typography color="text.secondary" mt={1}>
            {t(BrightChainStrings.Admin_Dashboard_AccessDeniedDescription)}
          </Typography>
        </Box>
      </Container>
    );
  }

  if (loading && !data) {
    return (
      <Container maxWidth="lg">
        <Box my={4} textAlign="center">
          <Typography>
            {t(BrightChainStrings.Admin_Dashboard_Loading)}
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h4">
            {t(BrightChainStrings.Admin_Dashboard_Title)}
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            {error && (
              <Chip
                label={t(
                  BrightChainStrings.Admin_Dashboard_ErrorLastSuccessTemplate,
                  {
                    TIME:
                      lastSuccessTime ??
                      t(
                        BrightChainStrings.Admin_Dashboard_ErrorLastSuccessNever,
                      ),
                  },
                )}
                color="error"
                size="small"
              />
            )}
            <Tooltip title={t(BrightChainStrings.Admin_Dashboard_RefreshNow)}>
              <IconButton onClick={fetchData} aria-label="refresh dashboard">
                <FontAwesomeIcon icon={faArrowsRotate} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {!data ? (
          <Typography color="error">
            {t(BrightChainStrings.Admin_Dashboard_NoData)}
          </Typography>
        ) : (
          <Grid container spacing={3} alignItems="stretch">
            {/* Server Identity */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <CardContent sx={cardContentSx}>
                  <SectionHeader
                    icon={faFingerprint}
                    title={t(BrightChainStrings.Admin_Dashboard_ServerIdentity)}
                  />
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_Hostname)}:{' '}
                    {data.hostname}
                  </Typography>
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_LocalNodeId)}:{' '}
                    {data.localNodeId ??
                      t(BrightChainStrings.Admin_Dashboard_NA)}
                  </Typography>
                  <Chip
                    label={
                      data.nodeIdSource === NodeIdSource.AVAILABILITY_SERVICE
                        ? 'Availability Service'
                        : 'Environment'
                    }
                    color={
                      data.nodeIdSource === NodeIdSource.AVAILABILITY_SERVICE
                        ? 'success'
                        : 'warning'
                    }
                    size="small"
                    sx={{ mt: 0.5, mb: 0.5 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {t(BrightChainStrings.Admin_Dashboard_Timestamp)}:{' '}
                    {data.timestamp}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Nodes */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <CardContent sx={cardContentSx}>
                  <SectionHeader
                    icon={faServer}
                    title={t(BrightChainStrings.Admin_Dashboard_Nodes)}
                  />
                  {data.nodes.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {t(BrightChainStrings.Admin_Dashboard_NoNodesRegistered)}
                    </Typography>
                  ) : (
                    data.nodes.map((node) => (
                      <Box
                        key={node.nodeId}
                        display="flex"
                        alignItems="center"
                        gap={1}
                        mb={0.5}
                      >
                        {nodeStatusIcon(node.status)}
                        <Typography variant="body2">
                          {node.nodeId} — {node.status}
                        </Typography>
                      </Box>
                    ))
                  )}
                  {data.disconnectedPeers.length > 0 && (
                    <Typography variant="body2" color="error" mt={1}>
                      {t(BrightChainStrings.Admin_Dashboard_DisconnectedPeers)}:{' '}
                      {data.disconnectedPeers.join(', ')}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Lumen Clients */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <CardContent sx={cardContentSx}>
                  <SectionHeader
                    icon={faUsers}
                    title={t(BrightChainStrings.Admin_Dashboard_LumenClients)}
                  />
                  <Typography variant="h4" color="primary">
                    {data.lumenClientCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    {t(BrightChainStrings.Admin_Dashboard_ConnectedClients)}
                  </Typography>
                  {data.lumenClientSessions.map((s) => (
                    <Typography key={s.memberId} variant="body2">
                      {s.username} ({s.memberType}) —{' '}
                      {t(BrightChainStrings.Admin_Dashboard_RoomsTemplate, {
                        COUNT: String(s.rooms.length),
                      })}
                    </Typography>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* Node Connections */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <CardContent sx={cardContentSx}>
                  <SectionHeader
                    icon={faCircleNodes}
                    title={t(
                      BrightChainStrings.Admin_Dashboard_NodeConnections,
                    )}
                  />
                  <Typography variant="h4" color="primary">
                    {data.nodeConnectionCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    {t(
                      BrightChainStrings.Admin_Dashboard_NodeToNodeConnections,
                    )}
                  </Typography>
                  {data.connectedNodeIds.map((id) => (
                    <Typography key={id} variant="body2">
                      {id}
                    </Typography>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* System Metrics */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <CardContent sx={cardContentSx}>
                  <SectionHeader
                    icon={faMicrochip}
                    title={t(BrightChainStrings.Admin_Dashboard_SystemMetrics)}
                  />
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_HeapUsed)}:{' '}
                    {formatMB(data.system.heapUsedBytes)}
                  </Typography>
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_HeapTotal)}:{' '}
                    {formatMB(data.system.heapTotalBytes)}
                  </Typography>
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_RSS)}:{' '}
                    {formatMB(data.system.rssBytes)}
                  </Typography>
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_External)}:{' '}
                    {formatMB(data.system.externalBytes)}
                  </Typography>
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_UptimeTemplate, {
                      SECONDS: String(Math.floor(data.system.uptimeSeconds)),
                    })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(BrightChainStrings.Admin_Dashboard_NodeVersionTemplate, {
                      NODE_VERSION: data.system.nodeVersion,
                      APP_VERSION: data.system.appVersion,
                    })}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Dependencies */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <CardContent sx={cardContentSx}>
                  <SectionHeader
                    icon={faHeartPulse}
                    title={t(BrightChainStrings.Admin_Dashboard_Dependencies)}
                  />
                  {(
                    [
                      ['blockStore', data.dependencies.blockStore],
                      ['messageService', data.dependencies.messageService],
                      ['webSocketServer', data.dependencies.webSocketServer],
                    ] as const
                  ).map(([name, dep]) => (
                    <Box
                      key={name}
                      display="flex"
                      alignItems="center"
                      gap={1}
                      mb={0.5}
                    >
                      {healthStatusIcon(dep.status)}
                      <Typography variant="body2">
                        {dep.name} — {dep.status}
                        {dep.latencyMs != null ? ` (${dep.latencyMs}ms)` : ''}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* DB Stats */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <CardContent sx={cardContentSx}>
                  <BrightChainSubLogo
                    subText="DB"
                    icon={faDatabase}
                    iconHeight={subLogoIconHeight}
                    height={subLogoHeight}
                  />
                  {data.db.error ? (
                    <Typography variant="body2" color="error">
                      {data.db.error}
                    </Typography>
                  ) : (
                    <>
                      <Typography variant="body2">
                        {t(BrightChainStrings.Admin_Dashboard_Users)}:{' '}
                        {data.db.users ??
                          t(BrightChainStrings.Admin_Dashboard_NA)}
                      </Typography>
                      <Typography variant="body2">
                        {t(BrightChainStrings.Admin_Dashboard_Roles)}:{' '}
                        {data.db.roles ??
                          t(BrightChainStrings.Admin_Dashboard_NA)}
                      </Typography>
                    </>
                  )}
                  {data.db.usersByStatus && (
                    <Box mt={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <FontAwesomeIcon
                          icon={faUserCheck}
                          style={{ color: 'green' }}
                        />
                        <Typography variant="body2">
                          {t(BrightChainStrings.Admin_Dashboard_Active)}:{' '}
                          {data.db.usersByStatus.active}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <FontAwesomeIcon
                          icon={faUserLock}
                          style={{ color: 'red' }}
                        />
                        <Typography variant="body2">
                          {t(BrightChainStrings.Admin_Dashboard_Locked)}:{' '}
                          {data.db.usersByStatus.locked}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <FontAwesomeIcon
                          icon={faUserClock}
                          style={{ color: 'orange' }}
                        />
                        <Typography variant="body2">
                          {t(BrightChainStrings.Admin_Dashboard_Pending)}:{' '}
                          {data.db.usersByStatus.pendingEmailVerification}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Pools */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <CardContent sx={cardContentSx}>
                  <BrightChainSubLogo
                    subText="DB"
                    icon={faLayerGroup}
                    iconHeight={subLogoIconHeight}
                    height={subLogoHeight}
                    additionalText={t(BrightChainStrings.Admin_Dashboard_Pools)}
                    additionalColor={'#000000'}
                  />
                  {data.pools.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {t(BrightChainStrings.Admin_Dashboard_NoPools)}
                    </Typography>
                  ) : (
                    data.pools.map((p) => (
                      <Typography key={p.poolId} variant="body2">
                        {p.poolId}
                      </Typography>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* BrightTrust */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <CardContent sx={cardContentSx}>
                  <BrightChainSubLogo
                    subText="Trust"
                    icon={faShieldHalved}
                    iconHeight={subLogoIconHeight}
                    height={subLogoHeight}
                  />
                  <Chip
                    label={
                      data.brightTrust.active
                        ? t(BrightChainStrings.Admin_Dashboard_Active)
                        : 'Inactive'
                    }
                    color={data.brightTrust.active ? 'success' : 'default'}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_Members)}:{' '}
                    {data.brightTrust.memberCount} —{' '}
                    {t(BrightChainStrings.Admin_Dashboard_Threshold)}:{' '}
                    {data.brightTrust.threshold}
                  </Typography>
                  {data.brightTrust.members.map((m) => (
                    <Typography key={m.name} variant="body2">
                      {m.name}
                      {m.role ? ` (${m.role})` : ''}
                    </Typography>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* Block Store */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <CardContent sx={cardContentSx}>
                  <BrightChainSubLogo
                    subText="Store"
                    icon={faCubes}
                    iconHeight={subLogoIconHeight}
                    height={subLogoHeight}
                  />
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_TotalBlocks)}:{' '}
                    {data.blockStore.totalBlocks}
                  </Typography>
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_TotalSize)}:{' '}
                    {formatMB(data.blockStore.totalSizeBytes)}
                  </Typography>
                  {Object.entries(data.blockStore.countByDurability).map(
                    ([level, count]) => (
                      <Typography key={level} variant="body2">
                        {level}: {count}
                      </Typography>
                    ),
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* BrightHub */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <CardContent sx={cardContentSx}>
                  <BrightChainSubLogo
                    subText="Hub"
                    icon={faCircleNodes}
                    iconHeight={subLogoIconHeight}
                    height={subLogoHeight}
                  />
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_TotalPosts)}:{' '}
                    {data.hub.totalPosts}
                  </Typography>
                  <Typography variant="body2">
                    {t(
                      BrightChainStrings.Admin_Dashboard_ActiveUsersLast30Days,
                    )}
                    : {data.hub.activeUsersLast30Days}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* BrightChat */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <CardContent sx={cardContentSx}>
                  <BrightChainSubLogo
                    subText="Chat"
                    icon={faComment}
                    iconHeight={subLogoIconHeight}
                    height={subLogoHeight}
                  />
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_Conversations)}:{' '}
                    {data.chat.totalConversations}
                  </Typography>
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_Messages)}:{' '}
                    {data.chat.totalMessages}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* BrightPass */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <CardContent sx={cardContentSx}>
                  <BrightChainSubLogo
                    subText="Pass"
                    icon={faLock}
                    iconHeight={subLogoIconHeight}
                    height={subLogoHeight}
                  />
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_TotalVaults)}:{' '}
                    {data.pass.totalVaults}
                  </Typography>
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_SharedVaults)}:{' '}
                    {data.pass.sharedVaults}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* BrightMail */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={cardSx}>
                <CardContent sx={cardContentSx}>
                  <BrightChainSubLogo
                    subText="Mail"
                    icon={faEnvelope}
                    iconHeight={subLogoIconHeight}
                    height={subLogoHeight}
                  />
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_TotalEmails)}:{' '}
                    {data.mail.totalEmails}
                  </Typography>
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_DeliveryFailures)}:{' '}
                    {data.mail.deliveryFailures}
                  </Typography>
                  <Typography variant="body2">
                    {t(BrightChainStrings.Admin_Dashboard_Last24Hours)}:{' '}
                    {data.mail.emailsLast24Hours}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default memo(AdminDashboardPage);
