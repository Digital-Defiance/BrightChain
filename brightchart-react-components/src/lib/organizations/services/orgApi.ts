/**
 * OrgApiClient — typed service wrapping all Organization, Healthcare Role,
 * and Invitation endpoints.
 *
 * Accepts an AxiosInstance (provided via useAuthenticatedApi from
 * @digitaldefiance/express-suite-react-components) so the component library
 * has no hardcoded API configuration.
 *
 * Follows the createEmailApiClient pattern from brightmail-react-components.
 *
 * Requirements: 9.4, 9.5
 */

import type { IApiEnvelope } from '@brightchain/brightchain-lib';
import type {
  IAssignStaffRequest,
  ICreateInvitationRequest,
  ICreateOrganizationRequest,
  IHealthcareRoleDocument,
  IInvitation,
  IOrganization,
  IRedeemInvitationRequest,
  IRegisterPatientRequest,
  IUpdateOrganizationRequest,
} from '@brightchain/brightchart-lib';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { isAxiosError } from 'axios';

// ─── Response param interfaces ──────────────────────────────────────────────

export interface OrgListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface OrgListResponse {
  organizations: IOrganization[];
  total: number;
  page: number;
  limit: number;
}

export interface OrgMembersResponse {
  members: Record<string, IHealthcareRoleDocument[]>;
}

// ─── Error envelope extraction ──────────────────────────────────────────────

/**
 * Wraps an Axios call that returns an IApiEnvelope<T>, extracts the data
 * payload on success, and propagates the server-provided error message on
 * failure.
 */
export async function handleApiCall<T>(
  call: () => Promise<AxiosResponse<IApiEnvelope<T>>>,
): Promise<T> {
  try {
    const response = await call();
    if (response.data.status === 'error') {
      throw new Error(response.data.error?.message ?? 'Unknown error');
    }
    return response.data.data as T;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error?.message) {
      throw new Error(error.response.data.error.message);
    }
    throw error;
  }
}

// ─── OrgApiClient factory ───────────────────────────────────────────────────

export function createOrgApiClient(api: AxiosInstance) {
  return {
    // Organization CRUD
    listOrganizations: (params?: OrgListParams) =>
      handleApiCall<OrgListResponse>(() =>
        api.get<IApiEnvelope<OrgListResponse>>('/brightchart/organizations', {
          params,
        }),
      ),

    getOrganization: (id: string) =>
      handleApiCall<IOrganization>(() =>
        api.get<IApiEnvelope<IOrganization>>(
          `/brightchart/organizations/${encodeURIComponent(id)}`,
        ),
      ),

    createOrganization: (data: ICreateOrganizationRequest) =>
      handleApiCall<IOrganization>(() =>
        api.post<IApiEnvelope<IOrganization>>(
          '/brightchart/organizations',
          data,
        ),
      ),

    updateOrganization: (id: string, data: IUpdateOrganizationRequest) =>
      handleApiCall<IOrganization>(() =>
        api.put<IApiEnvelope<IOrganization>>(
          `/brightchart/organizations/${encodeURIComponent(id)}`,
          data,
        ),
      ),

    getOrgMembers: (id: string) =>
      handleApiCall<OrgMembersResponse>(() =>
        api.get<IApiEnvelope<OrgMembersResponse>>(
          `/brightchart/organizations/${encodeURIComponent(id)}/members`,
        ),
      ),

    // Healthcare Role mutations
    assignStaff: (data: IAssignStaffRequest) =>
      handleApiCall<IHealthcareRoleDocument>(() =>
        api.post<IApiEnvelope<IHealthcareRoleDocument>>(
          '/brightchart/healthcare-roles/staff',
          data,
        ),
      ),

    registerPatient: (data: IRegisterPatientRequest) =>
      handleApiCall<IHealthcareRoleDocument>(() =>
        api.post<IApiEnvelope<IHealthcareRoleDocument>>(
          '/brightchart/healthcare-roles/patient',
          data,
        ),
      ),

    removeRole: (roleId: string) =>
      handleApiCall<void>(() =>
        api.delete<IApiEnvelope<void>>(
          `/brightchart/healthcare-roles/${encodeURIComponent(roleId)}`,
        ),
      ),

    // Invitation management
    createInvitation: (data: ICreateInvitationRequest) =>
      handleApiCall<IInvitation>(() =>
        api.post<IApiEnvelope<IInvitation>>('/brightchart/invitations', data),
      ),

    redeemInvitation: (data: IRedeemInvitationRequest) =>
      handleApiCall<{
        role: IHealthcareRoleDocument;
        organizationName: string;
      }>(() =>
        api.post<
          IApiEnvelope<{
            role: IHealthcareRoleDocument;
            organizationName: string;
          }>
        >('/brightchart/invitations/redeem', data),
      ),
  };
}

export type OrgApiClient = ReturnType<typeof createOrgApiClient>;
