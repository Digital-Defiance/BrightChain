import {
  BSLP_DEFAULT_EPOCH,
  BslpPrivacyMode,
  type IBrightNexusLocationRecord,
} from '@brightchain/brightnexus-lib';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  useAuth,
  useAuthenticatedApi,
} from '@digitaldefiance/express-suite-react-components';
import React, { useCallback, useEffect, useState } from 'react';
import { BrightNexusStrings } from '../enumerations/brightNexusStrings';
import { brightNexusEnglishUs as t } from '../i18n/strings/englishUs';
import { signBslpPublishBody } from '@brightchain/brightnexus-api-lib';
import {
  listMyLocations,
  publishLocation,
  revokeLocation,
} from '../services/locationRegistryApi';

export const BrightNexusLocationPage: React.FC = () => {
  const api = useAuthenticatedApi();
  const { userData } = useAuth();
  const [ipAddress, setIpAddress] = useState('');
  const [lat, setLat] = useState('47.1996');
  const [lon, setLon] = useState('-122.2531');
  const [alt, setAlt] = useState('140');
  const [epoch, setEpoch] = useState(BSLP_DEFAULT_EPOCH);
  const [heisenberg, setHeisenberg] = useState(true);
  const [injectedDelayMd, setInjectedDelayMd] = useState('0.005');
  const [fuzzRadiusKm, setFuzzRadiusKm] = useState('50');
  const [records, setRecords] = useState<IBrightNexusLocationRecord[]>([]);
  const [dnsTxt, setDnsTxt] = useState<string | null>(null);
  const [signingMnemonic, setSigningMnemonic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await listMyLocations(api);
      setRecords(list);
    } catch {
      setRecords([]);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handlePublish = async () => {
    setError(null);
    setLoading(true);
    try {
      const privacy = heisenberg
        ? {
            mode: BslpPrivacyMode.Heisenberg,
            injectedDelayMd: Number(injectedDelayMd),
            fuzzRadiusKm: Number(fuzzRadiusKm),
          }
        : {
            mode: BslpPrivacyMode.Exact,
            injectedDelayMd: 0,
            fuzzRadiusKm: 0,
          };

      const payload = {
        ipAddress: ipAddress.trim(),
        vector: {
          lat: Number(lat),
          lon: Number(lon),
          alt: Number(alt),
          epoch: epoch.trim() || BSLP_DEFAULT_EPOCH,
        },
        privacy,
      };

      const mnemonic = signingMnemonic.trim();
      if (!mnemonic) {
        setError(
          'Enter your 24-word recovery mnemonic to sign this BSLP announcement.',
        );
        return;
      }

      const memberIdHex = userData?.id;
      const username = userData?.username ?? 'member';
      const email = userData?.email ?? 'member@local';

      if (!memberIdHex) {
        setError('Could not resolve member id for signing.');
        return;
      }

      const signed = signBslpPublishBody(
        mnemonic,
        username,
        email,
        memberIdHex,
        payload,
      );

      const result = await publishLocation(api, signed);
      setDnsTxt(result.dnsTxt);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t[BrightNexusStrings.Error_PublishFailed],
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (ip: string) => {
    setLoading(true);
    try {
      await revokeLocation(api, ip);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Revoke failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        {t[BrightNexusStrings.Page_Title]}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t[BrightNexusStrings.Page_Subtitle]}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              label={t[BrightNexusStrings.Form_IpAddress]}
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="203.0.113.10"
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t[BrightNexusStrings.Form_Latitude]}
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                fullWidth
              />
              <TextField
                label={t[BrightNexusStrings.Form_Longitude]}
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t[BrightNexusStrings.Form_Altitude]}
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                fullWidth
              />
              <TextField
                label={t[BrightNexusStrings.Form_Epoch]}
                value={epoch}
                onChange={(e) => setEpoch(e.target.value)}
                fullWidth
              />
            </Stack>
            <FormControlLabel
              control={
                <Switch
                  checked={heisenberg}
                  onChange={(e) => setHeisenberg(e.target.checked)}
                />
              }
              label={t[BrightNexusStrings.Form_HeisenbergMode]}
            />
            {heisenberg && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t[BrightNexusStrings.Form_InjectedDelayMd]}
                  value={injectedDelayMd}
                  onChange={(e) => setInjectedDelayMd(e.target.value)}
                  fullWidth
                />
                <TextField
                  label={t[BrightNexusStrings.Form_FuzzRadiusKm]}
                  value={fuzzRadiusKm}
                  onChange={(e) => setFuzzRadiusKm(e.target.value)}
                  fullWidth
                />
              </Stack>
            )}
            <TextField
              label="Recovery mnemonic (signs publish, not stored)"
              value={signingMnemonic}
              onChange={(e) => setSigningMnemonic(e.target.value)}
              type="password"
              autoComplete="off"
              multiline
              minRows={2}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={() => void handlePublish()}
              disabled={
                loading || !ipAddress.trim() || !signingMnemonic.trim()
              }
            >
              {t[BrightNexusStrings.Form_Publish]}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {dnsTxt && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            {t[BrightNexusStrings.DnsTxt_Label]}
          </Typography>
          <Typography component="code" sx={{ wordBreak: 'break-all' }}>
            {dnsTxt}
          </Typography>
        </Alert>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">My announcements</Typography>
        <Button size="small" onClick={() => void refresh()} disabled={loading}>
          {t[BrightNexusStrings.Form_Refresh]}
        </Button>
      </Stack>

      {records.length === 0 ? (
        <Typography color="text.secondary">{t[BrightNexusStrings.List_Empty]}</Typography>
      ) : (
        <Stack spacing={1}>
          {records.map((r) => (
            <Card key={r.id} variant="outlined">
              <CardContent
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography variant="subtitle1">{r.ipAddress}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {r.vector.lat}, {r.vector.lon} · {r.vector.alt}m ·{' '}
                    {r.privacy.mode}
                    {r.privacy.fuzzRadiusKm > 0
                      ? ` · fuzz ${r.privacy.fuzzRadiusKm}km`
                      : ''}
                  </Typography>
                </Box>
                <Button
                  color="error"
                  size="small"
                  onClick={() => void handleRevoke(r.ipAddress)}
                  disabled={loading}
                >
                  {t[BrightNexusStrings.List_Revoke]}
                </Button>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};
