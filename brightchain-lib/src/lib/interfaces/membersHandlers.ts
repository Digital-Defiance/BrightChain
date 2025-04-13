import { ApiRequestHandler } from '@digitaldefiance/node-express-suite';
import { MembersResponse } from './responses/members';

// Temporary interface until TypedHandlers is available
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TypedHandlers<_T> {
  // Base interface for typed handlers
}

export interface MembersHandlers extends TypedHandlers<MembersResponse> {
  createMember: ApiRequestHandler<MembersResponse>;
  getMember: ApiRequestHandler<MembersResponse>;
  reconstituteMember: ApiRequestHandler<MembersResponse>;
}
