// src/context/UserContext.tsx

import {
  GlobalLanguageContext,
  IRequestUser,
  LanguageCodes,
  StringLanguages,
} from '@brightchain/brightchain-lib';
import {
  FC,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import i18n from './i18n';

interface UserContextType {
  user: IRequestUser | null;
  setUser: (user: IRequestUser | null) => void;
  language: StringLanguages;
  setLanguage: (lang: StringLanguages) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IRequestUser | null>(null);
  const [language, setLanguage] = useState<StringLanguages>(() => {
    // Initialize language from localStorage or default to English
    return (
      (localStorage.getItem('language') as StringLanguages) ??
      StringLanguages.EnglishUS
    );
  });

  useEffect(() => {
    // Update language when user changes
    if (user && user.siteLanguage) {
      setLanguage(user.siteLanguage);
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      // Update i18n and localStorage when language changes
      await i18n.changeLanguage(LanguageCodes[language]);
      localStorage.setItem('language', language);
      localStorage.setItem('languageCode', LanguageCodes[language]);
      GlobalLanguageContext.language = language;
    })();
  }, [language]);

  const setUserAndLanguage = (newUser: IRequestUser | null) => {
    setUser(newUser);
    if (newUser && newUser.siteLanguage) {
      setLanguage(newUser.siteLanguage);
    }
  };

  const setLanguageAndUpdateUser = (newLanguage: StringLanguages) => {
    setLanguage(newLanguage);
    GlobalLanguageContext.language = newLanguage;
    if (user) {
      setUser({ ...user, siteLanguage: newLanguage });
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser: setUserAndLanguage,
        language,
        setLanguage: setLanguageAndUpdateUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
