import {
  faGameBoard,
  faGameBoardSimple,
} from '@awesome.me/kit-a20d532681/icons/classic/regular';
import { CONSTANTS } from '@brightchain/brightchain-lib';
import { SubspaceLatticeLogoI18N } from '@brightchain/brightchain-react-components';
import {
  createMenuType,
  IMenuConfig,
  MenuTypes,
} from '@digitaldefiance/express-suite-react-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IncludeOnMenu } from '../../enumerations/includeOnMenu';

export const useGamesMenuRegistration = (indexPriority: number = 100) => {
  const gamesMenu = createMenuType(String(IncludeOnMenu.GamesMenu));
  const gamesMenuConfig: IMenuConfig = {
    menuType: gamesMenu,
    menuIcon: <FontAwesomeIcon icon={faGameBoard} />,
    priority: indexPriority,
    options: [
      {
        id: 'subspace-lattice',
        label: <SubspaceLatticeLogoI18N height={24} />,
        includeOnMenus: [gamesMenu, MenuTypes.SideMenu],
        index: indexPriority,
        icon: (
          <FontAwesomeIcon
            icon={faGameBoardSimple}
            style={{ color: CONSTANTS.THEME_COLORS.CHAIN_BLUE_DARK }}
          />
        ),
        link: '/game/subspace-lattice',
        requiresAuth: true,
        additionalSx: {
          '& > svg': {
            marginRight: '3px',
          },
        },
      },
    ],
  };
  indexPriority += 100;

  return { indexPriority, gamesMenu, gamesMenuConfig };
};
