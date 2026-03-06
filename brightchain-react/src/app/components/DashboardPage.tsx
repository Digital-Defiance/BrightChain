import {
  BrightChainComponentId,
  BrightChainStrings,
} from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
} from '@mui/material';
import { FC, memo, useEffect, useState } from 'react';
import authenticatedApi from '../../services/authenticatedApi';

interface EnergyBalance {
  balance: number;
  earned: number;
  spent: number;
  reserved: number;
  reputation: number;
}

const DashboardPage: FC = () => {
  const [energyBalance, setEnergyBalance] = useState<EnergyBalance | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const { tBranded: t } = useI18n();

  useEffect(() => {
    const fetchEnergyBalance = async () => {
      try {
        const response = await authenticatedApi.get('/energy/balance');
        const d = response.data.data ?? response.data;
        if (d && typeof d.balance === 'number') {
          setEnergyBalance(d);
        }
      } catch (error) {
        console.error('Failed to fetch energy balance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnergyBalance();
  }, []);

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          {t(BrightChainStrings.Dashboard_Title)}
        </Typography>

        <Grid container spacing={3} mt={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t(BrightChainStrings.Dashboard_EnergyBalance)}
                </Typography>
                {loading ? (
                  <Typography>
                    {t(BrightChainStrings.Dashboard_Loading)}
                  </Typography>
                ) : energyBalance ? (
                  <>
                    <Typography variant="h3" color="primary">
                      {energyBalance.balance.toFixed(2)} J
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {t(BrightChainStrings.Dashboard_AvailableCredits)}
                    </Typography>
                  </>
                ) : (
                  <Typography color="error">
                    {t(BrightChainStrings.Dashboard_FailedToLoadBalance)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t(BrightChainStrings.Dashboard_Reputation)}
                </Typography>
                {loading ? (
                  <Typography>
                    {t(BrightChainStrings.Dashboard_Loading)}
                  </Typography>
                ) : energyBalance ? (
                  <>
                    <Typography variant="h3" color="secondary">
                      {(energyBalance.reputation * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {t(BrightChainStrings.Dashboard_ReputationScore)}
                    </Typography>
                  </>
                ) : (
                  <Typography color="error">
                    {t(BrightChainStrings.Dashboard_FailedToLoadReputation)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t(BrightChainStrings.Dashboard_EnergyEarned)}
                </Typography>
                {loading ? (
                  <Typography>
                    {t(BrightChainStrings.Dashboard_Loading)}
                  </Typography>
                ) : energyBalance ? (
                  <>
                    <Typography variant="h4">
                      {energyBalance.earned.toFixed(2)} J
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {t(BrightChainStrings.Dashboard_EarnedDescription)}
                    </Typography>
                  </>
                ) : (
                  <Typography color="error">
                    {t(BrightChainStrings.Dashboard_FailedToLoadData)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t(BrightChainStrings.Dashboard_EnergySpent)}
                </Typography>
                {loading ? (
                  <Typography>
                    {t(BrightChainStrings.Dashboard_Loading)}
                  </Typography>
                ) : energyBalance ? (
                  <>
                    <Typography variant="h4">
                      {energyBalance.spent.toFixed(2)} J
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {t(BrightChainStrings.Dashboard_SpentDescription)}
                    </Typography>
                  </>
                ) : (
                  <Typography color="error">
                    {t(BrightChainStrings.Dashboard_FailedToLoadData)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default memo(DashboardPage);
