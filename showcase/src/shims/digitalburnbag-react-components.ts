// Thin shim: only exports what the showcase app actually uses.
// Avoids pulling in lib/crypto and lib/services which have Node.js dependencies.
export { BirdbagLogo } from '../../../digitalburnbag-react-components/src/lib/components/BirdbagLogo';
export type { BirdbagLogoProps } from '../../../digitalburnbag-react-components/src/lib/components/BirdbagLogo';
