/**
 * Unit tests for OrganizationListPage component.
 *
 * Tests: renders org list, search debounce, pagination, empty state,
 * create button, click actions.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 *
 * @module organizations/__tests__/OrganizationListPage.spec
 */

import type { IOrganization } from '@brightchain/brightchart-lib';
import '@testing-library/jest-dom';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRefetch = jest.fn();
const mockRefetchRoles = jest.fn();
const mockCreateOrganization = jest.fn();

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useAuthenticatedApi: () => ({}),
}));

jest.mock('../../shell/contexts/ActiveContext', () => ({
  useActiveContext: () => ({
    refetchRoles: mockRefetchRoles,
    member: { memberId: 'member-1', username: 'test', type: 'User' },
    healthcareRoles: [],
    activeRole: { roleCode: 'ADMIN' },
    specialtyProfile: {},
    switchRole: jest.fn(),
    setActivePatient: jest.fn(),
    setActiveEncounter: jest.fn(),
  }),
}));

let mockUseOrganizationsReturn: {
  data: {
    organizations: IOrganization[];
    total: number;
    page: number;
    limit: number;
  } | null;
  loading: boolean;
  error: string | null;
  refetch: jest.Mock;
};
let capturedParams: unknown;

jest.mock('../hooks/useOrganizations', () => ({
  useOrganizations: (params: unknown) => {
    capturedParams = params;
    return mockUseOrganizationsReturn;
  },
}));

jest.mock('../hooks/useOrgApi', () => ({
  useOrgApi: () => ({
    createOrganization: mockCreateOrganization,
  }),
}));

import { OrganizationListPage } from '../components/OrganizationListPage';

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeOrg = (overrides: Partial<IOrganization> = {}): IOrganization => ({
  _id: 'org-1',
  name: 'Test Clinic',
  active: true,
  enrollmentMode: 'open',
  createdBy: 'member-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const orgs: IOrganization[] = [
  makeOrg({ _id: 'org-1', name: 'Alpha Clinic', enrollmentMode: 'open' }),
  makeOrg({
    _id: 'org-2',
    name: 'Beta Practice',
    enrollmentMode: 'invite-only',
  }),
];

function setMockReturn(
  overrides: Partial<typeof mockUseOrganizationsReturn> = {},
) {
  mockUseOrganizationsReturn = {
    data: { organizations: orgs, total: 2, page: 1, limit: 10 },
    loading: false,
    error: null,
    refetch: mockRefetch,
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('OrganizationListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    capturedParams = undefined;
    setMockReturn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Requirement 2.1: fetches and displays org list', () => {
    it('renders the org list page', () => {
      render(<OrganizationListPage />);
      expect(screen.getByTestId('org-list-page')).toBeTruthy();
      expect(screen.getByText('Organizations')).toBeTruthy();
    });

    it('displays organizations from the hook', () => {
      render(<OrganizationListPage />);
      expect(screen.getByText('Alpha Clinic')).toBeTruthy();
      expect(screen.getByText('Beta Practice')).toBeTruthy();
    });
  });

  describe('Requirement 2.2: displays name and enrollment mode chip', () => {
    it('shows "Open" chip for open enrollment orgs', () => {
      render(<OrganizationListPage />);
      const chip = screen.getByTestId('enrollment-chip-org-1');
      expect(chip.textContent).toBe('Open');
    });

    it('shows "Invite Only" chip for invite-only orgs', () => {
      render(<OrganizationListPage />);
      const chip = screen.getByTestId('enrollment-chip-org-2');
      expect(chip.textContent).toBe('Invite Only');
    });
  });

  describe('Requirement 2.3: search debounce', () => {
    it('debounces search input by 300ms', () => {
      render(<OrganizationListPage />);

      const searchInput = screen.getByTestId('org-search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Before debounce fires, params should not include search
      expect(capturedParams).toEqual({ page: 1, limit: 10 });

      // Advance timers past debounce
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // After debounce, params should include search
      expect(capturedParams).toEqual({ search: 'test', page: 1, limit: 10 });
    });

    it('does not send search param for empty input', () => {
      render(<OrganizationListPage />);

      const searchInput = screen.getByTestId('org-search-input');
      fireEvent.change(searchInput, { target: { value: 'abc' } });
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Now clear
      fireEvent.change(searchInput, { target: { value: '' } });
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(capturedParams).toEqual({ page: 1, limit: 10 });
    });
  });

  describe('Requirement 2.4: pagination', () => {
    it('renders pagination when total exceeds limit', () => {
      setMockReturn({
        data: { organizations: orgs, total: 25, page: 1, limit: 10 },
      });
      render(<OrganizationListPage />);
      expect(screen.getByTestId('org-pagination')).toBeTruthy();
    });

    it('does not render pagination when all results fit on one page', () => {
      setMockReturn({
        data: { organizations: orgs, total: 2, page: 1, limit: 10 },
      });
      render(<OrganizationListPage />);
      expect(screen.queryByTestId('org-pagination')).toBeNull();
    });

    it('updates page param when pagination is clicked', () => {
      setMockReturn({
        data: { organizations: orgs, total: 25, page: 1, limit: 10 },
      });
      render(<OrganizationListPage />);

      // Click page 2 button
      const page2Btn = screen.getByRole('button', { name: 'Go to page 2' });
      fireEvent.click(page2Btn);

      expect(capturedParams).toEqual({ page: 2, limit: 10 });
    });
  });

  describe('Requirement 2.5: loading skeleton', () => {
    it('shows loading skeleton while fetching', () => {
      setMockReturn({ loading: true, data: null });
      render(<OrganizationListPage />);
      expect(screen.getByTestId('org-list-loading')).toBeTruthy();
    });

    it('does not show loading skeleton when data is loaded', () => {
      render(<OrganizationListPage />);
      expect(screen.queryByTestId('org-list-loading')).toBeNull();
    });
  });

  describe('Requirement 2.6: empty state', () => {
    it('shows empty state message when no organizations found', () => {
      setMockReturn({
        data: { organizations: [], total: 0, page: 1, limit: 10 },
      });
      render(<OrganizationListPage />);
      expect(screen.getByTestId('org-list-empty')).toBeTruthy();
      expect(screen.getByText('No organizations found.')).toBeTruthy();
    });
  });

  describe('Requirement 2.7: click actions', () => {
    it('shows "Register as Patient" for open enrollment org', async () => {
      render(<OrganizationListPage />);

      // Click on the open org
      fireEvent.click(screen.getByText('Alpha Clinic'));

      await waitFor(() => {
        expect(screen.getByTestId('register-patient-action')).toBeTruthy();
      });
    });

    it('shows "Enter Invitation Token" for invite-only org', async () => {
      render(<OrganizationListPage />);

      // Click on the invite-only org
      fireEvent.click(screen.getByText('Beta Practice'));

      await waitFor(() => {
        expect(screen.getByTestId('enter-token-action')).toBeTruthy();
      });
    });
  });

  describe('Requirement 2.8: create organization button', () => {
    it('renders create organization button', () => {
      render(<OrganizationListPage />);
      expect(screen.getByTestId('create-org-btn')).toBeTruthy();
      expect(screen.getByText('Create Organization')).toBeTruthy();
    });

    it('opens create dialog when button is clicked', async () => {
      render(<OrganizationListPage />);
      fireEvent.click(screen.getByTestId('create-org-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('org-create-dialog')).toBeTruthy();
      });
    });
  });

  describe('error state', () => {
    it('displays error message when hook returns error', () => {
      setMockReturn({ error: 'Network error', data: null });
      render(<OrganizationListPage />);
      expect(screen.getByTestId('org-list-error')).toBeTruthy();
      expect(screen.getByText('Network error')).toBeTruthy();
    });
  });
});
