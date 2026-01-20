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

  useEffect(() => {
    const fetchEnergyBalance = async () => {
      try {
        const response = await authenticatedApi.get('/energy/balance');
        if (response.data.data) {
          setEnergyBalance(response.data.data);
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
          Your Dashboard
        </Typography>

        <Grid container spacing={3} mt={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Energy Balance
                </Typography>
                {loading ? (
                  <Typography>Loading...</Typography>
                ) : energyBalance ? (
                  <>
                    <Typography variant="h3" color="primary">
                      {energyBalance.balance.toFixed(2)} J
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Available energy credits
                    </Typography>
                  </>
                ) : (
                  <Typography color="error">Failed to load balance</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Reputation
                </Typography>
                {loading ? (
                  <Typography>Loading...</Typography>
                ) : energyBalance ? (
                  <>
                    <Typography variant="h3" color="secondary">
                      {(energyBalance.reputation * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Network reputation score
                    </Typography>
                  </>
                ) : (
                  <Typography color="error">
                    Failed to load reputation
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Energy Earned
                </Typography>
                {loading ? (
                  <Typography>Loading...</Typography>
                ) : energyBalance ? (
                  <>
                    <Typography variant="h4">
                      {energyBalance.earned.toFixed(2)} J
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Total earned from providing resources
                    </Typography>
                  </>
                ) : (
                  <Typography color="error">Failed to load data</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Energy Spent
                </Typography>
                {loading ? (
                  <Typography>Loading...</Typography>
                ) : energyBalance ? (
                  <>
                    <Typography variant="h4">
                      {energyBalance.spent.toFixed(2)} J
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Total spent on operations
                    </Typography>
                  </>
                ) : (
                  <Typography color="error">Failed to load data</Typography>
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
