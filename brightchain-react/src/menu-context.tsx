// src/app/menuContext.tsx
import { StringNames } from '@BrightChain/brightchain-lib';
import {
  Dashboard as DashboardIcon,
  LockOpen as LockOpenIcon,
  Login as LoginIcon,
  ExitToApp as LogoutIcon,
  PersonAdd as PersonAddIcon,
  VpnKey as VpnKeyIcon,
} from '@mui/icons-material';
import {
  FC,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './auth-provider';
import { IncludeOnMenu } from './enumerations/includeOnMenu';
import { useAppTranslation } from './i18n-provider';
import { IMenuOption } from './interfaces/menuOption';

interface MenuProviderProps {
  children: ReactNode;
}

interface MenuContextType {
  menuOptions: IMenuOption[];
  getMenuOptions: (
    menuType: IncludeOnMenu,
    includeDividers: boolean,
  ) => IMenuOption[];
  registerMenuOption: (option: IMenuOption) => () => void;
  registerMenuOptions: (options: IMenuOption[]) => () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider: FC<MenuProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const registeredMenuOptions = useRef(new Set<() => void>());
  const [registeredOptions, setRegisteredOptions] = useState<
    Map<string, IMenuOption>
  >(new Map<string, IMenuOption>());
  const { t } = useAppTranslation();

  const registerMenuOption = useCallback((option: IMenuOption) => {
    const unregister = () => {
      setRegisteredOptions((prev) => {
        const newMap = new Map(prev);
        newMap.delete(option.id);
        return newMap;
      });
      registeredMenuOptions.current.delete(unregister);
    };

    setRegisteredOptions((prev) => {
      const newMap = new Map(prev);
      newMap.set(option.id, option);
      return newMap;
    });
    registeredMenuOptions.current.add(unregister);

    return unregister;
  }, []);

  const registerMenuOptions = useCallback(
    (options: IMenuOption[]) => {
      const unregisterFunctions = options.map(registerMenuOption);
      return () => unregisterFunctions.forEach((f) => f());
    },
    [registerMenuOption],
  );

  const menuOptions = useMemo(() => {
    const baseOptions: IMenuOption[] = [
      {
        id: 'dashboard',
        label: t(StringNames.Common_Dashboard),
        icon: <DashboardIcon />,
        link: '/dashboard',
        requiresAuth: true,
        includeOnMenus: [IncludeOnMenu.SideMenu],
        index: 0,
      },
      {
        id: 'user-divider',
        label: '',
        divider: true,
        includeOnMenus: [IncludeOnMenu.SideMenu],
        index: 1,
        requiresAuth: false,
      },
      {
        id: 'change-password',
        label: t(StringNames.Common_ChangePassword),
        icon: <VpnKeyIcon />,
        link: '/change-password',
        requiresAuth: true,
        includeOnMenus: [IncludeOnMenu.UserMenu, IncludeOnMenu.SideMenu],
        index: 2,
      },
      {
        id: 'logout',
        label: t(StringNames.LogoutButton),
        icon: <LogoutIcon />,
        link: '/logout',
        requiresAuth: true,
        includeOnMenus: [IncludeOnMenu.UserMenu, IncludeOnMenu.SideMenu],
        index: 3,
      },
      {
        id: 'login',
        label: t(StringNames.Login_LoginButton),
        icon: <LoginIcon />,
        link: '/login',
        requiresAuth: false,
        includeOnMenus: [IncludeOnMenu.UserMenu, IncludeOnMenu.SideMenu],
        index: 4,
      },
      {
        id: 'register',
        label: t(StringNames.Register_Button),
        icon: <PersonAddIcon />,
        link: '/register',
        requiresAuth: false,
        includeOnMenus: [IncludeOnMenu.UserMenu, IncludeOnMenu.SideMenu],
        index: 5,
      },
      {
        id: 'forgot-password',
        label: t(StringNames.ForgotPassword_Title),
        icon: <LockOpenIcon />,
        link: '/forgot-password',
        requiresAuth: false,
        includeOnMenus: [IncludeOnMenu.UserMenu, IncludeOnMenu.SideMenu],
        index: 6,
      },
      {
        id: 'brightchain-divider',
        label: '',
        divider: true,
        includeOnMenus: [IncludeOnMenu.SideMenu],
        index: 7,
        requiresAuth: false,
      },
    ];

    const allOptions = [...baseOptions, ...registeredOptions.values()];
    return allOptions.sort((a, b) => a.index - b.index);
  }, [t, registeredOptions]);

  const getMenuOptions = useCallback(
    (menuType: IncludeOnMenu, includeDividers: boolean) => {
      const MenuFilter = (o: IMenuOption) => {
        // Apply the custom filter first
        let customFilterPasses = true;
        if (o.filter !== undefined) {
          customFilterPasses = o.filter(o);
        }
        if (!customFilterPasses) return false;

        if (o.divider === true && !includeDividers) return false;

        return (
          o.includeOnMenus.includes(menuType) &&
          (o.requiresAuth === undefined || o.requiresAuth === isAuthenticated)
        );
      };

      return menuOptions.filter(MenuFilter);
    },
    [isAuthenticated, menuOptions],
  );

  const contextValue = useMemo(() => {
    return {
      menuOptions: menuOptions,
      getMenuOptions: getMenuOptions,
      registerMenuOption: registerMenuOption,
      registerMenuOptions: registerMenuOptions,
    };
  }, [menuOptions, getMenuOptions, registerMenuOption, registerMenuOptions]);

  const memoizedChildren = useMemo(() => children, [children]);
  return (
    <MenuContext.Provider value={contextValue}>
      {memoizedChildren}
    </MenuContext.Provider>
  );
};

export const useMenu = (): MenuContextType => {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
};
