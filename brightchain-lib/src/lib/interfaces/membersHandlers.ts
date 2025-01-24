import { ApiRequestHandler, TypedHandlers } from '../sharedTypes';
import { MembersResponse } from './responses/members';

export interface MembersHandlers extends TypedHandlers<MembersResponse> {
  createMember: ApiRequestHandler<MembersResponse>;
  getMember: ApiRequestHandler<MembersResponse>;
  reconstituteMember: ApiRequestHandler<MembersResponse>;
}
