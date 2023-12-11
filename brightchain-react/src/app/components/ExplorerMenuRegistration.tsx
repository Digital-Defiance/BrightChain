import { faCubes } from '@awesome.me/kit-a20d532681/icons/classic/regular';
import { BrightChainStrings } from '@brightchain/brightchain-lib';
import {
  MenuTypes,
  useI18n,
  useMenu,
} from '@digitaldefiance/express-suite-react-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect } from 'react';

export interface ExplorerMenuRegistrationProps {
  indexPriority?: number;
}

export const ExplorerMenuRegistration: React.FC<
  ExplorerMenuRegistrationProps
> = ({ indexPriority = 100 }) => {
  const { registerMenuOption } = useMenu();
  const { tBranded: t } = useI18n();
  // Block Explorer — always available (public, no feature flag)

  useEffect(() => {
    const unregisterBlockExplorer = registerMenuOption({
      id: 'block-explorer',
      label: t(BrightChainStrings.Explorer_Menu_Title),
      includeOnMenus: [MenuTypes.SideMenu],
      index: indexPriority,
      icon: <FontAwesomeIcon icon={faCubes} />,
      link: '/explorer',
      requiresAuth: undefined,
    });
    return () => {
      unregisterBlockExplorer();
    };
  }, [indexPriority, registerMenuOption, t]);

  return null;
};
