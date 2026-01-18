import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock ecies-lib to prevent i18n-lib initialization issues
jest.mock('@digitaldefiance/ecies-lib', () => ({
  IECIESConfig: {},
  Member: {
    newMember: jest.fn(),
  },
  EmailString: jest.fn(),
}));

// Mock BrightChainSoupDemo to avoid module-level code execution
jest.mock('./components/BrightChainSoupDemo', () => ({
  BrightChainSoupDemo: () => <div data-testid="soup-demo">BrightChainSoupDemo Mock</div>,
}));

// Mock brightchain-lib to prevent i18n initialization
jest.mock('@brightchain/brightchain-lib', () => ({
  constants: { CONSTANTS: {} },
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
  uint8ArrayToHex: jest.fn((arr) => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')),
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
  TopMenu: ({ Logo }: { Logo: React.ReactNode }) => (
    <div data-testid="top-menu">{Logo}</div>
  ),
  TranslatedTitle: () => <title>BrightChain</title>,
  UnAuthRoute: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  UserSettingsFormWrapper: () => <div>UserSettingsFormWrapper</div>,
  VerifyEmailPageWrapper: () => <div>VerifyEmailPageWrapper</div>,
}));

jest.mock('@digitaldefiance/i18n-lib', () => ({
  LanguageRegistry: { getCodeLabelMap: () => ({ en: 'English' }) },
}));

jest.mock('../i18n', () => ({
  default: {
    changeLanguage: async () => undefined,
  },
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
