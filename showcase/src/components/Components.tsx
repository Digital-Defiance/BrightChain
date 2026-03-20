import {
  faComment,
  faDatabase,
  faIdBadge,
} from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { faCircleNodes } from '@awesome.me/kit-a20d532681/icons/classic/thin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { motion } from 'framer-motion';
import { JSX } from 'react';
import { FaExternalLinkAlt } from 'react-icons/fa';
import { SiNpm } from 'react-icons/si';
import { useInView } from 'react-intersection-observer';
import { useShowcaseI18n } from '../i18n/ShowcaseI18nContext';
import { ShowcaseStringKey, ShowcaseStrings } from '../i18n/showcaseStrings';
import './Components.css';

interface Feature {
  title?: string;
  logo?: JSX.Element;
  description: string;
  icon: string | JSX.Element;
  tech: string[];
  highlights: string[];
  category: 'Storage' | 'Cryptography' | 'Governance' | 'Network' | 'Identity';
  npm?: string;
  projectUrl?: string;
}

const getFeatures = (
  t: (key: ShowcaseStringKey, params?: Record<string, string>) => string,
): Feature[] => [
  {
    logo: (
      <img
        src="https://raw.githubusercontent.com/Digital-Defiance/BrightChain/main/brightchain-react/src/assets/images/brightdb.png"
        height="40"
        width="187"
      />
    ),
    icon: <FontAwesomeIcon icon={faDatabase} />,
    description: t(ShowcaseStrings.Feat_BrightDB_Desc),
    tech: [
      t(ShowcaseStrings.Feat_BrightDB_Tech1),
      t(ShowcaseStrings.Feat_BrightDB_Tech2),
      t(ShowcaseStrings.Feat_BrightDB_Tech3),
    ],
    category: t(ShowcaseStrings.Feat_BrightDB_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_BrightDB_HL1),
      t(ShowcaseStrings.Feat_BrightDB_HL2),
      t(ShowcaseStrings.Feat_BrightDB_HL3),
      t(ShowcaseStrings.Feat_BrightDB_HL4),
      t(ShowcaseStrings.Feat_BrightDB_HL5),
      t(ShowcaseStrings.Feat_BrightDB_HL6),
      t(ShowcaseStrings.Feat_BrightDB_HL7),
      t(ShowcaseStrings.Feat_BrightDB_HL8),
      t(ShowcaseStrings.Feat_BrightDB_HL9),
      t(ShowcaseStrings.Feat_BrightDB_HL10),
      t(ShowcaseStrings.Feat_BrightDB_HL11),
      t(ShowcaseStrings.Feat_BrightDB_HL12),
    ],
  },
  {
    title: t(ShowcaseStrings.Feat_OFFS_Title),
    icon: '🗄️',
    description: t(ShowcaseStrings.Feat_OFFS_Desc),
    tech: [
      t(ShowcaseStrings.Feat_OFFS_Tech1),
      t(ShowcaseStrings.Feat_OFFS_Tech2),
      t(ShowcaseStrings.Feat_OFFS_Tech3),
    ],
    category: t(ShowcaseStrings.Feat_OFFS_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_OFFS_HL1),
      t(ShowcaseStrings.Feat_OFFS_HL2),
      t(ShowcaseStrings.Feat_OFFS_HL3),
      t(ShowcaseStrings.Feat_OFFS_HL4),
      t(ShowcaseStrings.Feat_OFFS_HL5),
      t(ShowcaseStrings.Feat_OFFS_HL6),
    ],
  },
  {
    title: t(ShowcaseStrings.Feat_Messaging_Title),
    icon: '💬',
    description: t(ShowcaseStrings.Feat_Messaging_Desc),
    tech: [
      t(ShowcaseStrings.Feat_Messaging_Tech1),
      t(ShowcaseStrings.Feat_Messaging_Tech2),
      t(ShowcaseStrings.Feat_Messaging_Tech3),
      t(ShowcaseStrings.Feat_Messaging_Tech4),
    ],
    category: t(ShowcaseStrings.Feat_Messaging_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_Messaging_HL1),
      t(ShowcaseStrings.Feat_Messaging_HL2),
      t(ShowcaseStrings.Feat_Messaging_HL3),
      t(ShowcaseStrings.Feat_Messaging_HL4),
      t(ShowcaseStrings.Feat_Messaging_HL5),
      t(ShowcaseStrings.Feat_Messaging_HL6),
    ],
  },
  {
    logo: (
      <img
        src="https://raw.githubusercontent.com/Digital-Defiance/BrightChain/main/brightchain-react/src/assets/images/brightmail.png"
        height="40"
        width="187"
      />
    ),
    icon: '📧',
    description: t(ShowcaseStrings.Feat_BrightMail_Desc),
    tech: [
      t(ShowcaseStrings.Feat_BrightMail_Tech1),
      t(ShowcaseStrings.Feat_BrightMail_Tech2),
      t(ShowcaseStrings.Feat_BrightMail_Tech3),
      t(ShowcaseStrings.Feat_BrightMail_Tech4),
    ],
    category: t(ShowcaseStrings.Feat_BrightMail_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_BrightMail_HL1),
      t(ShowcaseStrings.Feat_BrightMail_HL2),
      t(ShowcaseStrings.Feat_BrightMail_HL3),
      t(ShowcaseStrings.Feat_BrightMail_HL4),
      t(ShowcaseStrings.Feat_BrightMail_HL5),
      t(ShowcaseStrings.Feat_BrightMail_HL6),
      t(ShowcaseStrings.Feat_BrightMail_HL7),
      t(ShowcaseStrings.Feat_BrightMail_HL8),
      t(ShowcaseStrings.Feat_BrightMail_HL9),
    ],
  },
  {
    logo: (
      <img
        src="https://raw.githubusercontent.com/Digital-Defiance/BrightChain/main/brightchain-react/src/assets/images/brightchat.png"
        height="40"
        width="187"
      />
    ),
    icon: <FontAwesomeIcon icon={faComment} />,
    description: t(ShowcaseStrings.Feat_BrightChat_Desc),
    tech: [
      t(ShowcaseStrings.Feat_BrightChat_Tech1),
      t(ShowcaseStrings.Feat_BrightChat_Tech2),
      t(ShowcaseStrings.Feat_BrightChat_Tech3),
      t(ShowcaseStrings.Feat_BrightChat_Tech4),
    ],
    category: t(ShowcaseStrings.Feat_BrightChat_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_BrightChat_HL1),
      t(ShowcaseStrings.Feat_BrightChat_HL2),
      t(ShowcaseStrings.Feat_BrightChat_HL3),
      t(ShowcaseStrings.Feat_BrightChat_HL4),
      t(ShowcaseStrings.Feat_BrightChat_HL5),
      t(ShowcaseStrings.Feat_BrightChat_HL6),
      t(ShowcaseStrings.Feat_BrightChat_HL7),
      t(ShowcaseStrings.Feat_BrightChat_HL8),
      t(ShowcaseStrings.Feat_BrightChat_HL9),
    ],
  },
  {
    logo: (
      <img
        src="https://raw.githubusercontent.com/Digital-Defiance/BrightChain/main/brightchain-react/src/assets/images/brightpass.png"
        height="40"
        width="187"
      />
    ),
    icon: '🔑',
    description: t(ShowcaseStrings.Feat_BrightPass_Desc),
    tech: [
      t(ShowcaseStrings.Feat_BrightPass_Tech1),
      t(ShowcaseStrings.Feat_BrightPass_Tech2),
      t(ShowcaseStrings.Feat_BrightPass_Tech3),
      t(ShowcaseStrings.Feat_BrightPass_Tech4),
    ],
    category: t(ShowcaseStrings.Feat_BrightPass_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_BrightPass_HL1),
      t(ShowcaseStrings.Feat_BrightPass_HL2),
      t(ShowcaseStrings.Feat_BrightPass_HL3),
      t(ShowcaseStrings.Feat_BrightPass_HL4),
      t(ShowcaseStrings.Feat_BrightPass_HL5),
      t(ShowcaseStrings.Feat_BrightPass_HL6),
      t(ShowcaseStrings.Feat_BrightPass_HL7),
      t(ShowcaseStrings.Feat_BrightPass_HL8),
      t(ShowcaseStrings.Feat_BrightPass_HL9),
      t(ShowcaseStrings.Feat_BrightPass_HL10),
    ],
  },
  {
    logo: (
      <img
        src="https://raw.githubusercontent.com/Digital-Defiance/BrightChain/main/brightchain-react/src/assets/images/brightvote.png"
        height="40"
        width="187"
      />
    ),
    icon: '🗳️',
    description: t(ShowcaseStrings.Feat_BrightVote_Desc),
    tech: [
      t(ShowcaseStrings.Feat_BrightVote_Tech1),
      t(ShowcaseStrings.Feat_BrightVote_Tech2),
      t(ShowcaseStrings.Feat_BrightVote_Tech3),
    ],
    category: t(ShowcaseStrings.Feat_BrightVote_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_BrightVote_HL1),
      t(ShowcaseStrings.Feat_BrightVote_HL2),
      t(ShowcaseStrings.Feat_BrightVote_HL3),
      t(ShowcaseStrings.Feat_BrightVote_HL4),
      t(ShowcaseStrings.Feat_BrightVote_HL5),
      t(ShowcaseStrings.Feat_BrightVote_HL6),
      t(ShowcaseStrings.Feat_BrightVote_HL7),
      t(ShowcaseStrings.Feat_BrightVote_HL8),
      t(ShowcaseStrings.Feat_BrightVote_HL9),
    ],
  },
  {
    logo: (
      <img
        src="https://raw.githubusercontent.com/Digital-Defiance/BrightChain/main/brightchain-react/src/assets/images/brighthub.png"
        height="40"
        width="187"
      />
    ),
    icon: <FontAwesomeIcon icon={faCircleNodes} />,
    description: t(ShowcaseStrings.Feat_BrightHub_Desc),
    tech: [
      t(ShowcaseStrings.Feat_BrightHub_Tech1),
      t(ShowcaseStrings.Feat_BrightHub_Tech2),
      t(ShowcaseStrings.Feat_BrightHub_Tech3),
    ],
    category: t(ShowcaseStrings.Feat_BrightHub_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_BrightHub_HL1),
      t(ShowcaseStrings.Feat_BrightHub_HL2),
      t(ShowcaseStrings.Feat_BrightHub_HL3),
      t(ShowcaseStrings.Feat_BrightHub_HL4),
      t(ShowcaseStrings.Feat_BrightHub_HL5),
      t(ShowcaseStrings.Feat_BrightHub_HL6),
      t(ShowcaseStrings.Feat_BrightHub_HL7),
      t(ShowcaseStrings.Feat_BrightHub_HL8),
      t(ShowcaseStrings.Feat_BrightHub_HL9),
      t(ShowcaseStrings.Feat_BrightHub_HL10),
      t(ShowcaseStrings.Feat_BrightHub_HL11),
      t(ShowcaseStrings.Feat_BrightHub_HL12),
    ],
  },
  {
    title: t(ShowcaseStrings.Feat_Anonymity_Title),
    icon: '🎭',
    description: t(ShowcaseStrings.Feat_Anonymity_Desc),
    tech: [
      t(ShowcaseStrings.Feat_Anonymity_Tech1),
      t(ShowcaseStrings.Feat_Anonymity_Tech2),
      t(ShowcaseStrings.Feat_Anonymity_Tech3),
    ],
    category: t(ShowcaseStrings.Feat_Anonymity_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_Anonymity_HL1),
      t(ShowcaseStrings.Feat_Anonymity_HL2),
      t(ShowcaseStrings.Feat_Anonymity_HL3),
      t(ShowcaseStrings.Feat_Anonymity_HL4),
      t(ShowcaseStrings.Feat_Anonymity_HL5),
      t(ShowcaseStrings.Feat_Anonymity_HL6),
    ],
  },
  {
    title: t(ShowcaseStrings.Feat_Encryption_Title),
    icon: '🔐',
    description: t(ShowcaseStrings.Feat_Encryption_Desc),
    tech: [
      t(ShowcaseStrings.Feat_Encryption_Tech1),
      t(ShowcaseStrings.Feat_Encryption_Tech2),
      t(ShowcaseStrings.Feat_Encryption_Tech3),
      t(ShowcaseStrings.Feat_Encryption_Tech4),
    ],
    category: t(ShowcaseStrings.Feat_Encryption_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_Encryption_HL1),
      t(ShowcaseStrings.Feat_Encryption_HL2),
      t(ShowcaseStrings.Feat_Encryption_HL3),
      t(ShowcaseStrings.Feat_Encryption_HL4),
      t(ShowcaseStrings.Feat_Encryption_HL5),
      t(ShowcaseStrings.Feat_Encryption_HL6),
    ],
  },
  {
    title: t(ShowcaseStrings.Feat_Storage_Title),
    icon: '🌐',
    description: t(ShowcaseStrings.Feat_Storage_Desc),
    tech: [
      t(ShowcaseStrings.Feat_Storage_Tech1),
      t(ShowcaseStrings.Feat_Storage_Tech2),
      t(ShowcaseStrings.Feat_Storage_Tech3),
    ],
    category: t(ShowcaseStrings.Feat_Storage_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_Storage_HL1),
      t(ShowcaseStrings.Feat_Storage_HL2),
      t(ShowcaseStrings.Feat_Storage_HL3),
      t(ShowcaseStrings.Feat_Storage_HL4),
      t(ShowcaseStrings.Feat_Storage_HL5),
      t(ShowcaseStrings.Feat_Storage_HL6),
    ],
  },
  {
    title: t(ShowcaseStrings.Feat_Sealing_Title),
    icon: '🔒',
    description: t(ShowcaseStrings.Feat_Sealing_Desc),
    tech: [
      t(ShowcaseStrings.Feat_Sealing_Tech1),
      t(ShowcaseStrings.Feat_Sealing_Tech2),
      t(ShowcaseStrings.Feat_Sealing_Tech3),
    ],
    category: t(ShowcaseStrings.Feat_Sealing_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_Sealing_HL1),
      t(ShowcaseStrings.Feat_Sealing_HL2),
      t(ShowcaseStrings.Feat_Sealing_HL3),
      t(ShowcaseStrings.Feat_Sealing_HL4),
      t(ShowcaseStrings.Feat_Sealing_HL5),
      t(ShowcaseStrings.Feat_Sealing_HL6),
    ],
  },
  {
    logo: (
      <img
        src="https://raw.githubusercontent.com/Digital-Defiance/BrightChain/main/brightchain-react/src/assets/images/brightid.png"
        height="40"
        width="187"
      />
    ),
    icon: <FontAwesomeIcon icon={faIdBadge} />,
    description: t(ShowcaseStrings.Feat_BrightID_Desc),
    tech: [
      t(ShowcaseStrings.Feat_BrightID_Tech1),
      t(ShowcaseStrings.Feat_BrightID_Tech2),
      t(ShowcaseStrings.Feat_BrightID_Tech3),
    ],
    category: t(ShowcaseStrings.Feat_BrightID_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_BrightID_HL1),
      t(ShowcaseStrings.Feat_BrightID_HL2),
      t(ShowcaseStrings.Feat_BrightID_HL3),
      t(ShowcaseStrings.Feat_BrightID_HL4),
      t(ShowcaseStrings.Feat_BrightID_HL5),
      t(ShowcaseStrings.Feat_BrightID_HL6),
    ],
  },
  {
    title: t(ShowcaseStrings.Feat_Reputation_Title),
    icon: '⚡',
    description: t(ShowcaseStrings.Feat_Reputation_Desc),
    tech: [
      t(ShowcaseStrings.Feat_Reputation_Tech1),
      t(ShowcaseStrings.Feat_Reputation_Tech2),
      t(ShowcaseStrings.Feat_Reputation_Tech3),
    ],
    category: t(ShowcaseStrings.Feat_Reputation_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_Reputation_HL1),
      t(ShowcaseStrings.Feat_Reputation_HL2),
      t(ShowcaseStrings.Feat_Reputation_HL3),
      t(ShowcaseStrings.Feat_Reputation_HL4),
      t(ShowcaseStrings.Feat_Reputation_HL5),
      t(ShowcaseStrings.Feat_Reputation_HL6),
    ],
  },
  {
    title: t(ShowcaseStrings.Feat_BlockTemp_Title),
    icon: '🌡️',
    description: t(ShowcaseStrings.Feat_BlockTemp_Desc),
    tech: [
      t(ShowcaseStrings.Feat_BlockTemp_Tech1),
      t(ShowcaseStrings.Feat_BlockTemp_Tech2),
      t(ShowcaseStrings.Feat_BlockTemp_Tech3),
    ],
    category: t(ShowcaseStrings.Feat_BlockTemp_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_BlockTemp_HL1),
      t(ShowcaseStrings.Feat_BlockTemp_HL2),
      t(ShowcaseStrings.Feat_BlockTemp_HL3),
      t(ShowcaseStrings.Feat_BlockTemp_HL4),
      t(ShowcaseStrings.Feat_BlockTemp_HL5),
      t(ShowcaseStrings.Feat_BlockTemp_HL6),
    ],
  },
  {
    title: t(ShowcaseStrings.Feat_ZeroMining_Title),
    icon: '♻️',
    description: t(ShowcaseStrings.Feat_ZeroMining_Desc),
    tech: [
      t(ShowcaseStrings.Feat_ZeroMining_Tech1),
      t(ShowcaseStrings.Feat_ZeroMining_Tech2),
      t(ShowcaseStrings.Feat_ZeroMining_Tech3),
    ],
    category: t(ShowcaseStrings.Feat_ZeroMining_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_ZeroMining_HL1),
      t(ShowcaseStrings.Feat_ZeroMining_HL2),
      t(ShowcaseStrings.Feat_ZeroMining_HL3),
      t(ShowcaseStrings.Feat_ZeroMining_HL4),
      t(ShowcaseStrings.Feat_ZeroMining_HL5),
      t(ShowcaseStrings.Feat_ZeroMining_HL6),
    ],
  },
  {
    title: t(ShowcaseStrings.Feat_CrossPlatform_Title),
    icon: '🔄',
    description: t(ShowcaseStrings.Feat_CrossPlatform_Desc),
    tech: [
      t(ShowcaseStrings.Feat_CrossPlatform_Tech1),
      t(ShowcaseStrings.Feat_CrossPlatform_Tech2),
      t(ShowcaseStrings.Feat_CrossPlatform_Tech3),
    ],
    category: t(ShowcaseStrings.Feat_CrossPlatform_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_CrossPlatform_HL1),
      t(ShowcaseStrings.Feat_CrossPlatform_HL2),
      t(ShowcaseStrings.Feat_CrossPlatform_HL3),
      t(ShowcaseStrings.Feat_CrossPlatform_HL4),
      t(ShowcaseStrings.Feat_CrossPlatform_HL5),
      t(ShowcaseStrings.Feat_CrossPlatform_HL6),
    ],
  },
  {
    title: t(ShowcaseStrings.Feat_Contracts_Title),
    icon: '📜',
    description: t(ShowcaseStrings.Feat_Contracts_Desc),
    tech: [
      t(ShowcaseStrings.Feat_Contracts_Tech1),
      t(ShowcaseStrings.Feat_Contracts_Tech2),
      t(ShowcaseStrings.Feat_Contracts_Tech3),
    ],
    category: t(ShowcaseStrings.Feat_Contracts_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_Contracts_HL1),
      t(ShowcaseStrings.Feat_Contracts_HL2),
      t(ShowcaseStrings.Feat_Contracts_HL3),
      t(ShowcaseStrings.Feat_Contracts_HL4),
      t(ShowcaseStrings.Feat_Contracts_HL5),
      t(ShowcaseStrings.Feat_Contracts_HL6),
    ],
  },
  {
    title: t(ShowcaseStrings.Feat_SecretsJS_Title),
    icon: '🔑',
    description: t(ShowcaseStrings.Feat_SecretsJS_Desc),
    tech: [
      t(ShowcaseStrings.Feat_SecretsJS_Tech1),
      t(ShowcaseStrings.Feat_SecretsJS_Tech2),
      t(ShowcaseStrings.Feat_SecretsJS_Tech3),
      t(ShowcaseStrings.Feat_SecretsJS_Tech4),
    ],
    category: t(ShowcaseStrings.Feat_SecretsJS_Cat) as Feature['category'],
    highlights: [
      t(ShowcaseStrings.Feat_SecretsJS_HL1),
      t(ShowcaseStrings.Feat_SecretsJS_HL2),
      t(ShowcaseStrings.Feat_SecretsJS_HL3),
      t(ShowcaseStrings.Feat_SecretsJS_HL4),
      t(ShowcaseStrings.Feat_SecretsJS_HL5),
      t(ShowcaseStrings.Feat_SecretsJS_HL6),
      t(ShowcaseStrings.Feat_SecretsJS_HL7),
      t(ShowcaseStrings.Feat_SecretsJS_HL8),
      t(ShowcaseStrings.Feat_SecretsJS_HL9),
    ],
    npm: 'https://www.npmjs.com/package/@digitaldefiance/secrets',
    projectUrl: 'https://digital-defiance.github.io/secrets-ts/',
  },
];

const Components = () => {
  const { t } = useShowcaseI18n();
  const features = getFeatures(t);
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="components section" id="components" ref={ref}>
      <motion.div
        className="components-container"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
      >
        <h2 className="section-title">
          {t(ShowcaseStrings.Comp_Title_Revolutionary)}{' '}
          <span className="gradient-text">
            {t(ShowcaseStrings.Comp_Title_Features)}
          </span>{' '}
          {t(ShowcaseStrings.Comp_Title_Capabilities)}
        </h2>
        <p className="components-subtitle">
          {t(ShowcaseStrings.Comp_Subtitle)}
        </p>

        <motion.div
          className="suite-intro"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3>{t(ShowcaseStrings.Comp_Intro_Heading)}</h3>
          <p>{t(ShowcaseStrings.Comp_Intro_P1)}</p>
          <div className="problem-solution">
            <div className="problem">
              <h4>{t(ShowcaseStrings.Comp_Problem_Title)}</h4>
              <ul>
                <li>{t(ShowcaseStrings.Comp_Problem_1)}</li>
                <li>{t(ShowcaseStrings.Comp_Problem_2)}</li>
                <li>{t(ShowcaseStrings.Comp_Problem_3)}</li>
                <li>{t(ShowcaseStrings.Comp_Problem_4)}</li>
                <li>{t(ShowcaseStrings.Comp_Problem_5)}</li>
                <li>{t(ShowcaseStrings.Comp_Problem_6)}</li>
              </ul>
              <p>
                <strong>Result:</strong>{' '}
                {t(ShowcaseStrings.Comp_Problem_Result)}
              </p>
            </div>
            <div className="solution">
              <h4>{t(ShowcaseStrings.Comp_Solution_Title)}</h4>
              <p>{t(ShowcaseStrings.Comp_Solution_P1)}</p>
              <p>{t(ShowcaseStrings.Comp_Solution_P2)}</p>
            </div>
          </div>
          <div className="value-props">
            <div className="value-prop">
              <strong>{t(ShowcaseStrings.Comp_VP_OwnerFree_Title)}</strong>
              <p>{t(ShowcaseStrings.Comp_VP_OwnerFree_Desc)}</p>
            </div>
            <div className="value-prop">
              <strong>
                {t(ShowcaseStrings.Comp_VP_EnergyEfficient_Title)}
              </strong>
              <p>{t(ShowcaseStrings.Comp_VP_EnergyEfficient_Desc)}</p>
            </div>
            <div className="value-prop">
              <strong>{t(ShowcaseStrings.Comp_VP_Decentralized_Title)}</strong>
              <p>{t(ShowcaseStrings.Comp_VP_Decentralized_Desc)}</p>
            </div>
            <div className="value-prop">
              <strong>{t(ShowcaseStrings.Comp_VP_Anonymous_Title)}</strong>
              <p>{t(ShowcaseStrings.Comp_VP_Anonymous_Desc)}</p>
            </div>
            <div className="value-prop">
              <strong>{t(ShowcaseStrings.Comp_VP_Voting_Title)}</strong>
              <p>{t(ShowcaseStrings.Comp_VP_Voting_Desc)}</p>
            </div>
            <div className="value-prop">
              <strong>{t(ShowcaseStrings.Comp_VP_Quorum_Title)}</strong>
              <p>{t(ShowcaseStrings.Comp_VP_Quorum_Desc)}</p>
            </div>
            <div className="value-prop">
              <strong>{t(ShowcaseStrings.Comp_VP_BrightStack_Title)}</strong>
              <p>{t(ShowcaseStrings.Comp_VP_BrightStack_Desc)}</p>
            </div>
          </div>
        </motion.div>

        <div className="components-grid">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title ?? `feature-${index}`}
              className="component-card card"
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1, duration: 0.6 }}
            >
              <div className="component-header">
                {feature.title && (
                  <>
                    <div className="component-icon">{feature.icon}</div>
                    <h3>{feature.title}</h3>
                  </>
                )}
                {feature.logo && feature.logo}
                <span
                  className={`component-badge ${feature.category.toLowerCase()}`}
                >
                  {feature.category}
                </span>
              </div>

              <p className="component-description">{feature.description}</p>

              <ul className="component-highlights">
                {feature.highlights.map((highlight, i) => (
                  <li key={i}>{highlight}</li>
                ))}
              </ul>

              <div className="component-tech">
                {feature.tech.map((tech) => (
                  <span key={tech} className="tech-badge">
                    {tech}
                  </span>
                ))}
              </div>

              {feature.npm && (
                <a
                  href={feature.npm}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="component-link"
                >
                  <SiNpm />
                  NPM
                </a>
              )}
              {feature.projectUrl && (
                <a
                  href={feature.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="component-link"
                >
                  <FaExternalLinkAlt />
                  {t(ShowcaseStrings.Comp_ProjectPage)}
                </a>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default Components;
