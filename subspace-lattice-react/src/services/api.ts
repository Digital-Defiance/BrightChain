import { AxiosInstance, AxiosResponse, isAxiosError } from 'axios';
import { IGameRoom, IMovePieceEventPayload, IChatMessageSentEventPayload } from 'subspace-lattice';

// Note: IApiEnvelope is defined in brightchain-lib, we mimic the pattern here or assume standard JSON
// In BrightChain, responses are often wrapped in { status: string, data?: T, error?: any }
interface IApiEnvelope<T> {
  status: 'success' | 'error';
  data?: T;
  error?: { message: string };
}

export async function handleApiCall<T>(
  call: () => Promise<AxiosResponse<T | IApiEnvelope<T>>>,
): Promise<T> {
  try {
    const response = await call();
    const data = response.data as any;
    
    // Handle standard BrightChain envelope if present
    if (data && typeof data === 'object' && 'status' in data) {
        if (data.status === 'error') {
            throw new Error(data.error?.message ?? 'Unknown error');
        }
        return data.data as T;
    }
    
    // Otherwise return raw data
    return data as T;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data as any;
        if(errorData.error?.message) {
            throw new Error(errorData.error.message);
        }
    }
    throw error;
  }
}

export function createSubspaceLatticeApiClient(api: AxiosInstance) {
  return {
    createRoom: (name: string, password?: string) =>
      handleApiCall<IGameRoom>(() =>
        api.post('/game/subspace-lattice/room', { name, password })
      ),

    getRoomByCode: (roomCode: string) =>
      handleApiCall<IGameRoom>(() =>
        api.get(
          `/game/subspace-lattice/room/code/${encodeURIComponent(roomCode)}`,
        ),
      ),

    joinRoomByCode: (
      roomCode: string,
      payload: { password?: string; asObserver?: boolean } = {},
    ) =>
      handleApiCall<IGameRoom>(() =>
        api.post(
          `/game/subspace-lattice/room/code/${encodeURIComponent(roomCode)}/join`,
          payload,
        ),
      ),
      
    movePiece: (roomId: string, payload: IMovePieceEventPayload<string>) =>
      handleApiCall<void>(() =>
        api.post(`/game/subspace-lattice/room/${encodeURIComponent(roomId)}/move`, payload)
      ),

    sendChat: (roomId: string, payload: IChatMessageSentEventPayload<string>) =>
        handleApiCall<void>(() =>
            api.post(`/game/subspace-lattice/room/${encodeURIComponent(roomId)}/chat`, payload)
        )
  };
}

export type SubspaceLatticeApiClient = ReturnType<typeof createSubspaceLatticeApiClient>;
