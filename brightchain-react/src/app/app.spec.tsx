import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// Mock ecies-lib to prevent heavy crypto/i18n initialization at module load time
jest.mock('@digitaldefiance/ecies-lib', () => ({
  IECIESConfig: {},
  Member: { newMember: jest.fn() },
  EmailString: jest.fn(),
}));

// Mock suite-core-lib — its module-level code instantiates ObjectIdProvider
// and calls createI18nStringKeysFromEnum, both of which fail without full
// ecies-lib and i18n-lib runtimes. We only need the three named exports
// that app.tsx actually uses.
jest.mock('@digitaldefiance/suite-core-lib', () => ({
  SuiteCoreComponentId: 'suite-core',
  SuiteCoreStringKey: new Proxy(
    {},
    { get: (_target, prop) => `suite-core:${String(prop)}` },
  ),
  SuiteCoreStringKeyValue: {},
}));

// Mock BrightChainSoupDemo to avoid module-level code execution
jest.mock('./components/BrightChainSoupDemo', () => ({
  BrightChainSoupDemo: () => (
    <div data-testid="soup-demo">BrightChainSoupDemo Mock</div>
  ),
}));

// Mock brightchain-lib to prevent i18n initialization
jest.mock('@brightchain/brightchain-lib', () => ({
  constants: { CONSTANTS: {} },
  CoreConstants: { Site: 'BrightChain' },
  CONSTANTS: {
    THEME_COLORS: {
      CHAIN_BLUE: '#1976d2',
      CHAIN_BLUE_LIGHT: '#42a5f5',
      CHAIN_BLUE_DARK: '#1565c0',
      BRIGHT_CYAN: '#00bcd4',
      BRIGHT_CYAN_LIGHT: '#4dd0e1',
      BRIGHT_CYAN_DARK: '#0097a7',
      ERROR_RED: '#d32f2f',
      ALERT_ORANGE: '#ed6c02',
      SECURE_GREEN: '#2e7d32',
    },
  },
  i18nEngine: {
    translate: jest.fn((key: string) => key),
    setLanguage: jest.fn(),
    getLanguage: jest.fn(() => 'en'),
  },
  ChecksumService: jest.fn().mockImplementation(() => ({
    calculateChecksum: jest.fn(),
    checksumBufferLength: 64,
  })),
  ServiceLocator: {
    setServiceProvider: jest.fn(),
  },
  MemoryBlockStore: jest.fn().mockImplementation(() => ({
    put: jest.fn(),
    getData: jest.fn(),
    getRandomBlocks: jest.fn(),
  })),
  BlockService: jest.fn().mockImplementation(() => ({
    ingestFile: jest.fn(),
  })),
  Member: jest.fn().mockImplementation(() => ({})),
  RawDataBlock: jest.fn().mockImplementation(() => ({
    idChecksum: new Uint8Array(64),
  })),
  BlockSize: {
    Small: 1024,
  },
  uint8ArrayToHex: jest.fn((arr) =>
    Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(''),
  ),
}));

// Must come after mocking brightchain-lib
import App from './app';

// Mock all suite components and i18n to avoid dependency on real backend/auth.
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  AppThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-theme-provider">{children}</div>
  ),
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
  SuiteConfigProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="suite-config-provider">{children}</div>
  ),
  MenuProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="menu-provider">{children}</div>
  ),
  I18nProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="i18n-provider">{children}</div>
  ),
  ApiAccess: () => <div>ApiAccess</div>,
  BackupCodeLoginWrapper: () => <div>BackupCodeLoginWrapper</div>,
  BackupCodesWrapper: () => <div>BackupCodesWrapper</div>,
  ChangePasswordFormWrapper: () => <div>ChangePasswordFormWrapper</div>,
  LoginFormWrapper: () => <div>LoginFormWrapper</div>,
  LogoutPageWrapper: () => <div>LogoutPageWrapper</div>,
  PrivateRoute: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  RegisterFormWrapper: () => <div>RegisterFormWrapper</div>,
  TDivBranded: (_props: Record<string, unknown>) => (
    <div data-testid="branded-div">BrightChain</div>
  ),
  TopMenu: ({ Logo }: { Logo: React.ReactNode }) => (
    <div data-testid="top-menu">{Logo}</div>
  ),
  TranslatedTitle: () => <title>BrightChain</title>,
  UnAuthRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserSettingsFormWrapper: () => <div>UserSettingsFormWrapper</div>,
  VerifyEmailPageWrapper: () => <div>VerifyEmailPageWrapper</div>,
}));

jest.mock('@digitaldefiance/i18n-lib', () => ({
  LanguageRegistry: { getCodeLabelMap: () => ({ en: 'English' }) },
}));

describe('App', () => {
  it('renders without crashing', () => {
    const { baseElement } = render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(baseElement).toBeTruthy();
  });

  it('shows the splash welcome text', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    const element = screen.getByText(/Welcome to BrightChain/i);
    expect(element).toBeTruthy();
  });
});
