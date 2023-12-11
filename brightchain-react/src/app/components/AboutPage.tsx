import {
  faInfoCircle,
  faLock,
} from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { BrightChainStrings } from '@brightchain/brightchain-lib';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { FC, useMemo } from 'react';

/** Build-time injected package versions (see vite.config.mts). */
// eslint-disable-next-line no-undef
const versions: Record<string, string> = __PACKAGE_VERSIONS__;

const AboutPage: FC = () => {
  const { admin } = useAuth();
  const { tBranded: t } = useI18n();

  const { masterVersion, brightchainPkgs, digitalDefiancePkgs } =
    useMemo(() => {
      const bc: [string, string][] = [];
      const dd: [string, string][] = [];
      let master = '';

      for (const [name, version] of Object.entries(versions)) {
        if (name === 'brightchain') {
          master = version;
        } else if (name.startsWith('@brightchain/')) {
          bc.push([name, version]);
        } else if (name.startsWith('@digitaldefiance/')) {
          dd.push([name, version]);
        }
      }

      bc.sort((a, b) => a[0].localeCompare(b[0]));
      dd.sort((a, b) => a[0].localeCompare(b[0]));

      return {
        masterVersion: master,
        brightchainPkgs: bc,
        digitalDefiancePkgs: dd,
      };
    }, []);

  if (!admin) {
    return (
      <Container maxWidth="sm">
        <Box my={8} textAlign="center">
          <FontAwesomeIcon icon={faLock} size="3x" color="gray" />
          <Typography variant="h5" mt={2}>
            {t(BrightChainStrings.About_AccessDenied)}
          </Typography>
          <Typography color="text.secondary" mt={1}>
            {t(BrightChainStrings.About_AccessDeniedDescription)}
          </Typography>
        </Box>
      </Container>
    );
  }

  const renderTable = (rows: [string, string][]) => (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t(BrightChainStrings.About_PackageName)}</TableCell>
            <TableCell>{t(BrightChainStrings.About_Version)}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(([name, version]) => (
            <TableRow key={name}>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {name}
              </TableCell>
              <TableCell>
                <Chip label={version} size="small" variant="outlined" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Box display="flex" alignItems="center" gap={1} mb={3}>
          <FontAwesomeIcon icon={faInfoCircle} size="lg" />
          <Typography variant="h4">
            {t(BrightChainStrings.About_Title)}
          </Typography>
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t(BrightChainStrings.About_MasterVersion)}
            </Typography>
            <Chip
              label={masterVersion}
              color="primary"
              sx={{ fontSize: '1.1rem', py: 2, px: 1 }}
            />
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t(BrightChainStrings.About_BrightChainPackages)}
            </Typography>
            {renderTable(brightchainPkgs)}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t(BrightChainStrings.About_DigitalDefiancePackages)}
            </Typography>
            {renderTable(digitalDefiancePkgs)}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default AboutPage;
