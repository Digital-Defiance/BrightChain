import { faComment } from '@awesome.me/kit-a20d532681/icons/chisel/regular';
import {
  faEnvelope,
  faLock,
} from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { faCircleNodes } from '@awesome.me/kit-a20d532681/icons/classic/thin';
import { faCalendarDays } from '@awesome.me/kit-a20d532681/icons/sharp-duotone/solid';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useShowcaseI18n } from '../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../i18n/showcaseStrings';
import './FAQ.css';

import { faBookMedical } from '@awesome.me/kit-a20d532681/icons/classic/regular';
import { BrightChainSubLogo } from '@brightchain/brightchain-react-components';
import birdbagImg from '../assets/images/birdbag-logo-blue.png';
import burnbagImg from '../assets/images/burnbag2_tx.png';
import gildZoomImg from '../assets/images/mascots/Gild.svg';
import gildImg from '../assets/images/mascots/Gild_tx.svg';
import ohmZoomImg from '../assets/images/mascots/Ohm.svg';
import ohmImg from '../assets/images/mascots/Ohm_tx.svg';
import phixZoomImg from '../assets/images/mascots/Phix.svg';
import phixImg from '../assets/images/mascots/Phix_tx.svg';
import voltaZoomImg from '../assets/images/mascots/Volta.svg';
import voltaImg from '../assets/images/mascots/Volta_tx.svg';

type FAQMode = 'technical' | 'ecosystem';

function FAQ() {
  const { t } = useShowcaseI18n();
  const [mode, setMode] = useState<FAQMode>('technical');

  const toggleMode = () =>
    setMode((prev) => (prev === 'technical' ? 'ecosystem' : 'technical'));

  const tMode =
    mode === 'technical'
      ? t(ShowcaseStrings.FAQ_Toggle_Ecosystem)
      : t(ShowcaseStrings.FAQ_Toggle_Technical);
  const switchToModeLabel = t(ShowcaseStrings.FAQ_SwitchToModeTemplate, {
    MODE: tMode,
  });

  return (
    <div className="faq-wrapper">
      <div className="faq-container">
        <div className="faq-header">
          <h1>
            {mode === 'technical'
              ? t(ShowcaseStrings.FAQ_Title_Technical)
              : t(ShowcaseStrings.FAQ_Title_Ecosystem)}
          </h1>
          <p>
            {mode === 'technical'
              ? t(ShowcaseStrings.FAQ_Subtitle_Technical)
              : t(ShowcaseStrings.FAQ_Subtitle_Ecosystem)}
          </p>
        </div>

        {/* The Gild ↔ Phix Toggle */}
        <div
          className="faq-mode-toggle"
          role="radiogroup"
          aria-label={t(ShowcaseStrings.FAQ_ModeAriaLabel)}
        >
          <button
            className={`faq-toggle-btn faq-toggle-gild ${mode === 'technical' ? 'active' : ''}`}
            onClick={() => setMode('technical')}
            aria-pressed={mode === 'technical'}
            title={t(ShowcaseStrings.FAQ_Toggle_Technical)}
          >
            <span className="toggle-icon">
              <img
                src={gildImg}
                alt={t(ShowcaseStrings.FAQ_Gild_Character)}
                height="32"
              />
            </span>
            <span className="toggle-label">
              {t(ShowcaseStrings.FAQ_Toggle_Technical)}
            </span>
            <span className="toggle-sublabel">
              {t(ShowcaseStrings.FAQ_Toggle_Technical_Sublabel)}
            </span>
          </button>

          <button
            className="faq-toggle-switch"
            onClick={toggleMode}
            aria-label={switchToModeLabel}
          >
            <span
              className={`toggle-flame ${mode === 'ecosystem' ? 'lit' : ''}`}
            >
              {mode === 'technical' ? '→' : '←'}
            </span>
          </button>

          <button
            className={`faq-toggle-btn faq-toggle-phix ${mode === 'ecosystem' ? 'active' : ''}`}
            onClick={() => setMode('ecosystem')}
            aria-pressed={mode === 'ecosystem'}
            title={t(ShowcaseStrings.FAQ_Toggle_Ecosystem)}
          >
            <span className="toggle-icon">
              <img
                src={phixImg}
                alt={t(ShowcaseStrings.FAQ_Phix_Character)}
                height="32"
              />
            </span>
            <span className="toggle-label">
              {t(ShowcaseStrings.FAQ_Toggle_Ecosystem)}
            </span>
            <span className="toggle-sublabel">
              {t(ShowcaseStrings.FAQ_Toggle_Ecosystem_Sublabel)}
            </span>
          </button>
        </div>

        <div className="faq-content">
          {mode === 'technical' ? <TechnicalFAQ /> : <EcosystemFAQ />}
        </div>

        <div className="faq-footer">
          <Link to="/" className="back-link">
            {t(ShowcaseStrings.FAQ_BackToHome)}
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Technical FAQ ─── */
function TechnicalFAQ() {
  const { t } = useShowcaseI18n();

  return (
    <>
      <div className="faq-item">
        <h2>{t(ShowcaseStrings.FAQ_Tech_Q1_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q1_Answer)}</p>
      </div>

      <div className="faq-item">
        <h2>{t(ShowcaseStrings.FAQ_Tech_Q2_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q2_Intro)}</p>
        <ul>
          <li>
            <strong>
              {t(ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy_Label)}:
            </strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy)}
          </li>
          <li>
            <strong>
              {t(ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance_Label)}:
            </strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance)}
          </li>
          <li>
            <strong>{t(ShowcaseStrings.FAQ_Tech_Q2_Scalability_Label)}:</strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q2_Scalability)}
          </li>
          <li>
            <strong>{t(ShowcaseStrings.FAQ_Tech_Q2_Identity_Label)}:</strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q2_Identity)}
          </li>
          <li>
            <strong>
              {t(ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption_Label)}:
            </strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption)}
          </li>
        </ul>
      </div>

      <div className="faq-item">
        <h2>{t(ShowcaseStrings.FAQ_Tech_Q3_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q3_Intro)}</p>
        <ul>
          <li>
            <strong>{t(ShowcaseStrings.FAQ_Tech_Q3_XORBaseline_Label)}:</strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q3_XORBaseline)}
          </li>
          <li>
            <strong>{t(ShowcaseStrings.FAQ_Tech_Q3_Recipe_Label)}:</strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q3_Recipe)}
          </li>
          <li>
            <strong>
              {t(ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption_Label)}:
            </strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption)}
          </li>
        </ul>
      </div>

      <div className="faq-item">
        <h2>{t(ShowcaseStrings.FAQ_Tech_Q4_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q4_Intro)}</p>
        <h3>{t(ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantage)}</h3>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantageText)}</p>
        <ul>
          <li>{t(ShowcaseStrings.FAQ_Tech_Q4_LegalResult)}</li>
        </ul>
        <h3>{t(ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantage)}</h3>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantageText)}</p>
        <ul>
          <li>{t(ShowcaseStrings.FAQ_Tech_Q4_EconomicResult)}</li>
        </ul>
        <h3>{t(ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummary)}</h3>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummaryText)}</p>
      </div>

      <div className="faq-item">
        <h2>{t(ShowcaseStrings.FAQ_Tech_Q5_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q5_Answer)}</p>
      </div>

      <div className="faq-item">
        <h2>{t(ShowcaseStrings.FAQ_Tech_Q6_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q6_Intro)}</p>
        <ul>
          <li>
            <strong>{t(ShowcaseStrings.FAQ_Tech_Q6_Redundancy_Label)}:</strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q6_Redundancy)}
          </li>
          <li>
            <strong>{t(ShowcaseStrings.FAQ_Tech_Q6_Tradeoff_Label)}:</strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q6_Tradeoff)}
          </li>
        </ul>
      </div>

      <div className="faq-item">
        <h2>{t(ShowcaseStrings.FAQ_Tech_Q7_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q7_Intro)}</p>
        <ul>
          <li>
            <strong>{t(ShowcaseStrings.FAQ_Tech_Q7_CostBasis_Label)}:</strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q7_CostBasis)}
          </li>
          <li>
            <strong>
              {t(ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement_Label)}:
            </strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement)}
          </li>
        </ul>
      </div>

      <div className="faq-item">
        <h2>{t(ShowcaseStrings.FAQ_Tech_Q8_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q8_Intro)}</p>
        <ul>
          <li>
            <strong>{t(ShowcaseStrings.FAQ_Tech_Q8_Storage_Label)}:</strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q8_Storage)}
          </li>
          <li>
            <strong>{t(ShowcaseStrings.FAQ_Tech_Q8_Computation_Label)}:</strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q8_Computation)}
          </li>
        </ul>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q8_Conclusion)}</p>
      </div>

      <div className="faq-item">
        <h2>{t(ShowcaseStrings.FAQ_Tech_Q9_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q9_Intro)}</p>
        <ul>
          <li>
            <strong>{t(ShowcaseStrings.FAQ_Tech_Q9_OnChain_Label)}:</strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q9_OnChain)}
          </li>
          <li>
            <strong>{t(ShowcaseStrings.FAQ_Tech_Q9_BrightTrust_Label)}:</strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q9_BrightTrust)}
          </li>
        </ul>
      </div>

      <div className="faq-item">
        <h2>{t(ShowcaseStrings.FAQ_Tech_Q10_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q10_Intro)}</p>
        <h3>{t(ShowcaseStrings.FAQ_Tech_Q10_HowItWorks)}</h3>
        <ul>
          <li>
            <strong>
              {t(ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented_Label)}:
            </strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented)}
          </li>
          <li>
            <strong>
              {t(ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning_Label)}:
            </strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning)}
          </li>
          <li>
            <strong>
              {t(ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing_Label)}:
            </strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing)}
          </li>
          <li>
            <strong>
              {t(ShowcaseStrings.FAQ_Tech_Q10_BrightTrustBasedAccess_Label)}:
            </strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q10_BrightTrustBasedAccess)}
          </li>
        </ul>
        <h3>{t(ShowcaseStrings.FAQ_Tech_Q10_WhyItMatters)}</h3>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q10_WhyItMattersText)}</p>
      </div>

      <div className="faq-item">
        <h2>{t(ShowcaseStrings.FAQ_Tech_Q11_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q11_Intro)}</p>

        <div className="faq-sub-section">
          <BrightChainSubLogo
            subText="Chart"
            height={40}
            iconHeight={35}
            icon={faBookMedical}
            altText={t(ShowcaseStrings.FAQ_BrightChart_Logo_Alt)}
          />
          <h3>{t(ShowcaseStrings.FAQ_Tech_Q11_BrightChart_Title)}</h3>
          <p>{t(ShowcaseStrings.FAQ_Tech_Q11_BrightChart_Text)}</p>
        </div>

        <div className="faq-sub-section">
          <BrightChainSubLogo
            subText="Mail"
            altText={t(ShowcaseStrings.FAQ_BrightMail_Logo_Alt)}
            height={40}
            iconHeight={35}
            icon={faEnvelope}
          />
          <h3>{t(ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Title)}</h3>
          <p>{t(ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Text)}</p>
        </div>

        <div className="faq-sub-section">
          <BrightChainSubLogo
            subText="Cal"
            altText={t(ShowcaseStrings.FAQ_BrightCal_Logo_Alt)}
            height={40}
            iconHeight={35}
            icon={faCalendarDays}
          />
          <h3>{t(ShowcaseStrings.FAQ_Tech_Q11_BrightCal_Title)}</h3>
          <p>{t(ShowcaseStrings.FAQ_Tech_Q11_BrightCal_Text)}</p>
        </div>

        <div className="faq-sub-section">
          <BrightChainSubLogo
            subText="Hub"
            altText={t(ShowcaseStrings.FAQ_BrightHub_Logo_Alt)}
            height={40}
            iconHeight={35}
            icon={faCircleNodes}
          />
          <h3>{t(ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Title)}</h3>
          <p>
            <strong>
              {t(ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept_Label)}:
            </strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept)}
          </p>
          <p>
            <strong>
              {t(ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference_Label)}:
            </strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference)}
          </p>
          <p>
            <strong>
              {t(ShowcaseStrings.FAQ_Tech_Q11_BrightHub_BrightTrusts_Label)}:
            </strong>{' '}
            {t(ShowcaseStrings.FAQ_Tech_Q11_BrightHub_BrightTrusts)}
          </p>
        </div>

        <div className="faq-sub-section">
          <BrightChainSubLogo
            subText="Pass"
            altText={t(ShowcaseStrings.FAQ_BrightPass_Logo_Alt)}
            height={40}
            iconHeight={35}
            icon={faLock}
          />
          <h3>{t(ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Title)}</h3>
          <p>{t(ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Text)}</p>
        </div>

        <div className="faq-sub-section">
          <BrightChainSubLogo
            subText="Chat"
            altText={t(ShowcaseStrings.FAQ_BrightChat_Logo_Alt)}
            height={40}
            iconHeight={35}
            icon={faComment}
          />
          <h3>{t(ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Title)}</h3>
          <p>{t(ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Text)}</p>
        </div>

        <div className="faq-sub-section">
          <BrightChainSubLogo
            leadText="Digital"
            subText="Burnbag"
            altText={t(ShowcaseStrings.FAQ_DigitalBurnbag_Logo_Alt)}
            height={40}
            iconHeight={35}
            customIcon={<img src={birdbagImg} height={35} />}
          />
          <h3>{t(ShowcaseStrings.FAQ_Tech_Q11_DigitalBurnbag_Title)}</h3>
          <p>{t(ShowcaseStrings.FAQ_Tech_Q11_DigitalBurnbag_Text)}</p>
        </div>
      </div>

      <div className="faq-item">
        <h2>{t(ShowcaseStrings.FAQ_Tech_Q12_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q12_Answer)}</p>
      </div>

      <div className="faq-item">
        <h2>{t(ShowcaseStrings.FAQ_Tech_Q13_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q13_Answer)}</p>
        <p>
          <a href="https://github.brightchain.org/docs/papers/paillier-bridge.html">
            {t(ShowcaseStrings.FAQ_Tech_Q13_PaperLink)}
          </a>
        </p>
      </div>

      <div className="faq-item">
        <h2>{t(ShowcaseStrings.FAQ_Tech_Q14_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q14_Answer)}</p>
      </div>

      <div className="faq-item">
        <h2>{t(ShowcaseStrings.FAQ_Tech_Q15_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q15_Answer)}</p>
      </div>

      <div className="faq-item">
        <h2>{t(ShowcaseStrings.FAQ_Tech_Q16_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q16_Answer)}</p>
      </div>

      <div className="faq-item">
        <h2>{t(ShowcaseStrings.FAQ_Tech_Q17_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Tech_Q17_Answer)}</p>
      </div>
    </>
  );
}

/* ─── Mascot Zoom Dialog ─── */
function MascotZoomDialog({
  isOpen,
  name,
  src,
  onClose,
}: {
  isOpen: boolean;
  name: string;
  src: string;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="mascot-zoom-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={name}
    >
      <div className="mascot-zoom-dialog" onClick={(e) => e.stopPropagation()}>
        <button
          className="mascot-zoom-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        <h2 className="mascot-zoom-name">{name}</h2>
        <img src={src} alt={name} className="mascot-zoom-img" />
      </div>
    </div>
  );
}

/* ─── Ecosystem FAQ ─── */
function EcosystemFAQ() {
  const { t } = useShowcaseI18n();
  const [zoomMascot, setZoomMascot] = useState<{
    name: string;
    src: string;
  } | null>(null);

  return (
    <>
      <MascotZoomDialog
        isOpen={zoomMascot !== null}
        name={zoomMascot?.name ?? ''}
        src={zoomMascot?.src ?? ''}
        onClose={() => setZoomMascot(null)}
      />
      {/* ── Section: The Mission ── */}
      <div className="faq-item ecosystem-item">
        <h2>{t(ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Answer)}</p>
      </div>

      <div className="faq-item ecosystem-item">
        <h2>
          <img
            src={burnbagImg}
            alt={t(ShowcaseStrings.FAQ_DigitalBurnbag_Logo_Alt)}
            height={48}
          />{' '}
          {t(ShowcaseStrings.FAQ_Eco_DigitalBurnbag_Title)}
        </h2>
        <p>{t(ShowcaseStrings.FAQ_Eco_DigitalBurnbag_Answer)}</p>
      </div>

      <div className="faq-item ecosystem-item">
        <h2>
          <img
            src={birdbagImg}
            alt={t(ShowcaseStrings.FAQ_CanaryProtocol_Logo_Alt)}
            height={48}
          />{' '}
          {t(ShowcaseStrings.FAQ_Eco_CanaryProtocol_Title)}
        </h2>
        <p>{t(ShowcaseStrings.FAQ_Eco_CanaryProtocol_Answer)}</p>
      </div>

      {/* ── Section: The Mascots ── */}
      <div className="faq-section-divider">
        <span className="divider-icon">⚡</span>
        <span className="divider-text">
          {t(ShowcaseStrings.FAQ_Eco_MeetTheCast)}
        </span>
        <span className="divider-icon">🔥</span>
      </div>

      <div className="faq-item ecosystem-item mascot-card">
        <div className="mascot-card-header">
          <button
            className="mascot-avatar-btn"
            onClick={() =>
              setZoomMascot({
                name: t(ShowcaseStrings.FAQ_Eco_Volta_Title),
                src: voltaZoomImg,
              })
            }
            aria-label={`View ${t(ShowcaseStrings.FAQ_Eco_Volta_Title)}`}
          >
            <img
              src={voltaImg}
              alt={t(ShowcaseStrings.FAQ_Eco_Volta_Alt)}
              className="mascot-avatar"
            />
          </button>
          <div>
            <h2>{t(ShowcaseStrings.FAQ_Eco_Volta_Title)}</h2>
            <p className="mascot-tagline">
              {t(ShowcaseStrings.FAQ_Eco_Volta_Tagline)}
            </p>
          </div>
        </div>
        <p>{t(ShowcaseStrings.FAQ_Eco_Volta_Description)}</p>
      </div>

      <div className="faq-item ecosystem-item mascot-card">
        <div className="mascot-card-header">
          <button
            className="mascot-avatar-btn"
            onClick={() =>
              setZoomMascot({
                name: t(ShowcaseStrings.FAQ_Eco_Ohm_Title),
                src: ohmZoomImg,
              })
            }
            aria-label={`View ${t(ShowcaseStrings.FAQ_Eco_Ohm_Title)}`}
          >
            <img
              src={ohmImg}
              alt={t(ShowcaseStrings.FAQ_Eco_Ohm_Alt)}
              className="mascot-avatar"
            />
          </button>
          <div>
            <h2>{t(ShowcaseStrings.FAQ_Eco_Ohm_Title)}</h2>
            <p className="mascot-tagline">
              {t(ShowcaseStrings.FAQ_Eco_Ohm_Tagline)}
            </p>
          </div>
        </div>
        <p>{t(ShowcaseStrings.FAQ_Eco_Ohm_Description)}</p>
      </div>

      <div className="faq-item ecosystem-item mascot-card">
        <div className="mascot-card-header">
          <button
            className="mascot-avatar-btn"
            onClick={() =>
              setZoomMascot({
                name: t(ShowcaseStrings.FAQ_Eco_Gild_Title),
                src: gildZoomImg,
              })
            }
            aria-label={`View ${t(ShowcaseStrings.FAQ_Eco_Gild_Title)}`}
          >
            <img
              src={gildImg}
              alt={t(ShowcaseStrings.FAQ_Eco_Gild_Alt)}
              className="mascot-avatar"
            />
          </button>
          <div>
            <h2>{t(ShowcaseStrings.FAQ_Eco_Gild_Title)}</h2>
            <p className="mascot-tagline">
              {t(ShowcaseStrings.FAQ_Eco_Gild_Tagline)}
            </p>
          </div>
        </div>
        <p>{t(ShowcaseStrings.FAQ_Eco_Gild_Description)}</p>
      </div>

      <div className="faq-item ecosystem-item mascot-card">
        <div className="mascot-card-header">
          <button
            className="mascot-avatar-btn"
            onClick={() =>
              setZoomMascot({
                name: t(ShowcaseStrings.FAQ_Eco_Phix_Title),
                src: phixZoomImg,
              })
            }
            aria-label={`View ${t(ShowcaseStrings.FAQ_Eco_Phix_Title)}`}
          >
            <img
              src={phixImg}
              alt={t(ShowcaseStrings.FAQ_Eco_Phix_Alt)}
              className="mascot-avatar"
            />
          </button>
          <div>
            <h2>{t(ShowcaseStrings.FAQ_Eco_Phix_Title)}</h2>
            <p className="mascot-tagline">
              {t(ShowcaseStrings.FAQ_Eco_Phix_Tagline)}
            </p>
          </div>
        </div>
        <p>{t(ShowcaseStrings.FAQ_Eco_Phix_Description)}</p>
      </div>

      {/* ── Section: The Currencies ── */}
      <div className="faq-section-divider">
        <span className="divider-icon">⚡</span>
        <span className="divider-text">
          {t(ShowcaseStrings.FAQ_Eco_TheEconomy)}
        </span>
        <span className="divider-icon">💨</span>
      </div>

      <div className="faq-item ecosystem-item">
        <h2>{t(ShowcaseStrings.FAQ_Eco_Joules_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Eco_Joules_Answer)}</p>
      </div>

      <div className="faq-item ecosystem-item">
        <h2>{t(ShowcaseStrings.FAQ_Eco_Soot_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Eco_Soot_Answer)}</p>
      </div>

      {/* ── Section: How It All Comes Together ── */}
      <div className="faq-section-divider">
        <span className="divider-icon">🔗</span>
        <span className="divider-text">
          {t(ShowcaseStrings.FAQ_Eco_BigPicture)}
        </span>
        <span className="divider-icon">🔗</span>
      </div>

      <div className="faq-item ecosystem-item">
        <h2>{t(ShowcaseStrings.FAQ_Eco_HowFitsTogether_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Eco_HowFitsTogether_Answer)}</p>
      </div>

      <div className="faq-item ecosystem-item">
        <h2>{t(ShowcaseStrings.FAQ_Eco_Beliefs_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Eco_Beliefs_Answer)}</p>
      </div>

      <div className="faq-item ecosystem-item">
        <h2>{t(ShowcaseStrings.FAQ_Eco_MascotsInAction_Title)}</h2>
        <p>{t(ShowcaseStrings.FAQ_Eco_MascotsInAction_Answer)}</p>
      </div>
    </>
  );
}

export default FAQ;
