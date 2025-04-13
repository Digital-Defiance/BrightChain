/* eslint-disable @nx/enforce-module-boundaries */
import { StringLanguage } from '@brightchain/brightchain-lib';
import { GlobalActiveContext, IActiveContext } from '@digitaldefiance/i18n-lib';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles.scss';

import App from './app/app';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

const context = GlobalActiveContext.getInstance<
  StringLanguage,
  IActiveContext<StringLanguage>
>();
context.languageContextSpace = 'user';

root.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
