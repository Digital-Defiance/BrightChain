import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../auth-provider';
import { TranslationProvider } from '../i18n-provider';
import { MenuProvider } from '../menu-context';
import { UserProvider } from '../user-context';
import App from './app';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <TranslationProvider>
      <AuthProvider>
        <UserProvider>
          <MenuProvider>{children}</MenuProvider>
        </UserProvider>
      </AuthProvider>
    </TranslationProvider>
  </BrowserRouter>
);

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(
      <TestWrapper>
        <App />
      </TestWrapper>,
    );
    expect(baseElement).toBeTruthy();
  });

  it('should have a greeting as the title', () => {
    const { getByText } = render(
      <TestWrapper>
        <App />
      </TestWrapper>,
    );
    expect(getByText(/Welcome brightchain-react/gi)).toBeTruthy();
  });
});
