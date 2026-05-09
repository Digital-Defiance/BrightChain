// Thin shim: only exports what the showcase app actually uses.
// Avoids pulling in the full library index (which includes showcase demos,
// identity wizards, and layout shells with Node.js-incompatible dependencies).
export { BrightChainLogoI18N } from '../../../brightchain-react-components/src/lib/BrightChainLogoI18N';
export type { BrightChainLogoI18NProps } from '../../../brightchain-react-components/src/lib/BrightChainLogoI18N';
export { BrightChainSubLogo } from '../../../brightchain-react-components/src/lib/BrightChainSubLogo';
export type { BrightChainSubLogoProps } from '../../../brightchain-react-components/src/lib/BrightChainSubLogo';
