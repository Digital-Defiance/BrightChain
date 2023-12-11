/// <reference types="vite/client" />

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '@brightchain/digitalburnbag-react-components' {
  import { FC } from 'react';
  export interface BirdbagLogoProps {
    width?: number | string;
    height?: number | string;
  }
  export const BirdbagLogo: FC<BirdbagLogoProps>;
}
