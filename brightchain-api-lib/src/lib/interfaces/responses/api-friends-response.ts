import type {
  IBaseFriendship,
  IBaseFriendRequest,
} from '@brightchain/brightchain-lib';
import type { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

export interface ApiFriendshipResponse extends IApiMessageResponse {
  friendship: IBaseFriendship<string>;
}

export interface ApiFriendRequestResponse extends IApiMessageResponse {
  friendRequest: IBaseFriendRequest<string>;
}

export interface ApiFriendsListResponse extends IApiMessageResponse {
  items: IBaseFriendship<string>[];
  cursor?: string;
  hasMore: boolean;
  totalCount: number;
}

export interface ApiFriendRequestsListResponse extends IApiMessageResponse {
  items: IBaseFriendRequest<string>[];
  cursor?: string;
  hasMore: boolean;
}

export interface ApiFriendshipStatusResponse extends IApiMessageResponse {
  status: string;
}

export interface ApiMutualFriendsResponse extends IApiMessageResponse {
  items: IBaseFriendship<string>[];
  cursor?: string;
  hasMore: boolean;
  totalCount: number;
}
