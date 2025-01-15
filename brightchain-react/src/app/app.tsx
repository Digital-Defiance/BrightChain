// Uncomment this line to use CSS modules
// import styles from './app.module.css';
import { CssBaseline, ThemeProvider } from '@mui/material';

import { StringLanguages } from '@BrightChain/brightchain-lib';
import { FC, useEffect } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '../auth-provider';
import { TranslationProvider } from '../i18n-provider';
import { MenuProvider } from '../menu-context';
import { setAuthContextFunctions } from '../services/auth';
import theme from '../theme';
import { UserProvider } from '../user-context';
import { SplashPage } from './components/splashPage';
import TranslatedTitle from './components/translatedTitle';

const App: FC = () => {
  return (
    <TranslationProvider>
      <TranslatedTitle />
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <UserProvider>
            <MenuProvider>
              <InnerApp />
            </MenuProvider>
          </UserProvider>
        </AuthProvider>
      </ThemeProvider>
    </TranslationProvider>
  );
};

const InnerApp: FC = () => {
  const { setUser, setLanguage } = useAuth();

  useEffect(() => {
    setAuthContextFunctions({
      setUser,
      setLanguage: (lang: StringLanguages) => {
        setLanguage(lang);
      },
    });
  }, [setUser, setLanguage]);

  return (
    <div>
      {/* START: routes */}
      {/* These routes and navigation have been generated for you */}
      {/* Feel free to move and update them to fit your needs */}
      <br />
      <hr />
      <br />
      <div role="navigation">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
        </ul>
      </div>
      <Routes>
        <Route path="/" element={<SplashPage />} />
      </Routes>
      {/* END: routes */}
    </div>
  );
};

export default App;
