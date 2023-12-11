import { Box, Container, Link, Typography } from '@mui/material';
import { FC } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useShowcaseI18n } from '../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../i18n/showcaseStrings';

export const PrivacyPolicyPage: FC = () => {
  const { t } = useShowcaseI18n();

  const sectionSx = { mb: 4 };
  const headingSx = { mt: 4, mb: 1 };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>
        {t(ShowcaseStrings.PP_Title)}
      </Typography>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {t(ShowcaseStrings.PP_LastUpdated)}
      </Typography>

      {/* ── 1. Introduction ─────────────────────────────────────── */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S1_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S1_P1)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S1_P2)}
        </Typography>
      </Box>

      {/* ── 2. How BrightChain Works — Architectural Context ──── */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S2_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S2_P1)}
        </Typography>
        <Box component="ul" sx={{ pl: 3 }}>
          <li>
            <Typography variant="body1">
              {t(ShowcaseStrings.PP_S2_Li1)}
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              {t(ShowcaseStrings.PP_S2_Li2)}
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              {t(ShowcaseStrings.PP_S2_Li3)}
            </Typography>
          </li>
        </Box>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S2_P2)}
        </Typography>
      </Box>

      {/* ── 3. Information We Collect ─────────────────────────── */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S3_Title)}
        </Typography>

        <Typography variant="h6" sx={{ mt: 2 }}>
          {t(ShowcaseStrings.PP_S3_1_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S3_1_P1)}
        </Typography>

        <Typography variant="h6" sx={{ mt: 2 }}>
          {t(ShowcaseStrings.PP_S3_2_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S3_2_P1)}
        </Typography>

        <Typography variant="h6" sx={{ mt: 2 }}>
          {t(ShowcaseStrings.PP_S3_3_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S3_3_P1)}
        </Typography>

        <Typography variant="h6" sx={{ mt: 2 }}>
          {t(ShowcaseStrings.PP_S3_4_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S3_4_P1)}
        </Typography>
      </Box>

      {/* ── 4. How We Use Information ─────────────────────────── */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S4_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S4_P1)}
        </Typography>
        <Box component="ul" sx={{ pl: 3 }}>
          <li>
            <Typography variant="body1">
              {t(ShowcaseStrings.PP_S4_Li1)}
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              {t(ShowcaseStrings.PP_S4_Li2)}
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              {t(ShowcaseStrings.PP_S4_Li3)}
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              {t(ShowcaseStrings.PP_S4_Li4)}
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              {t(ShowcaseStrings.PP_S4_Li5)}
            </Typography>
          </li>
        </Box>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S4_P2)}
        </Typography>
      </Box>

      {/* ── 5. Data Storage and Security ──────────────────────── */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S5_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S5_P1)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S5_P2)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S5_P3)}
        </Typography>
      </Box>

      {/* ── 6. Cryptographic Protections and Limitations ──────── */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S6_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S6_P1)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S6_P2)}
        </Typography>
      </Box>

      {/* ── 7. Law Enforcement and Legal Requests ─────────────── */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S7_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S7_P1)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S7_P2)}
        </Typography>
        <Box component="ul" sx={{ pl: 3 }}>
          <li>
            <Typography variant="body1">
              {t(ShowcaseStrings.PP_S7_Li1)}
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              {t(ShowcaseStrings.PP_S7_Li2)}
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              {t(ShowcaseStrings.PP_S7_Li3)}
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              {t(ShowcaseStrings.PP_S7_Li4)}
            </Typography>
          </li>
        </Box>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S7_P3)}
        </Typography>
      </Box>

      {/* ── 8. Brokered Anonymity ─────────────────────────────── */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S8_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S8_P1)}
        </Typography>
      </Box>

      {/* ── 9. Third-Party Services ───────────────────────────── */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S9_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S9_P1)}
        </Typography>
      </Box>

      {/* ── 10. Children's Privacy ────────────────────────────── */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S10_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S10_P1)}
        </Typography>
      </Box>

      {/* ── 11. International Users ───────────────────────────── */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S11_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S11_P1)}
        </Typography>

        <Typography variant="h6" sx={{ mt: 2 }}>
          {t(ShowcaseStrings.PP_S11_1_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S11_1_P1)}
        </Typography>
      </Box>

      {/* ── 12. Data Retention ────────────────────────────────── */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S12_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S12_P1)}
        </Typography>
      </Box>

      {/* ── 13. Disclaimer of Warranties and Limitation of Liability */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S13_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S13_P1)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S13_P2)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S13_P3)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S13_P4)}
        </Typography>
      </Box>

      {/* ── 14. Indemnification ───────────────────────────────── */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S14_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S14_P1)}
        </Typography>
      </Box>

      {/* ── 15. Governing Law and Dispute Resolution ──────────── */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S15_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S15_P1)}
        </Typography>
      </Box>

      {/* ── 16. Open Source ────────────────────────────────────── */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S16_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S16_P1_Before)}
          <Link
            href="https://github.com/Digital-Defiance/BrightChain"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t(ShowcaseStrings.PP_S16_P1_LinkText)}
          </Link>
          {t(ShowcaseStrings.PP_S16_P1_After)}
        </Typography>
      </Box>

      {/* ── 17. Changes to This Policy ────────────────────────── */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S17_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S17_P1)}
        </Typography>
      </Box>

      {/* ── 18. Contact Us ────────────────────────────────────── */}
      <Box sx={sectionSx}>
        <Typography variant="h5" sx={headingSx}>
          {t(ShowcaseStrings.PP_S18_Title)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t(ShowcaseStrings.PP_S18_P1)}
        </Typography>
        <Typography variant="body1" component="div" sx={{ pl: 2 }}>
          {t(ShowcaseStrings.PP_S18_OrgName)}
          <br />
          {t(ShowcaseStrings.PP_S18_EmailLabel)}{' '}
          <Link href="mailto:privacy@digitaldefiance.org">
            privacy@digitaldefiance.org
          </Link>
          <br />
          {t(ShowcaseStrings.PP_S18_WebLabel)}{' '}
          <Link
            href="https://digitaldefiance.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            digitaldefiance.org
          </Link>
        </Typography>
      </Box>

      {/* Back link */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Link component={RouterLink} to="/" variant="body2">
          {t(ShowcaseStrings.PP_BackToHome)}
        </Link>
      </Box>
    </Container>
  );
};
