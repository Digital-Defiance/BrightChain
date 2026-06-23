import type {
  IBrightNexusLocationLookupResponse,
  IBrightNexusLocationPublishRequest,
  IBrightNexusLocationRecord,
} from '@brightchain/brightnexus-lib';
import type { AxiosInstance } from 'axios';

const LOCATION_BASE = '/brightnexus/location';

export interface ILocationPublishResult {
  message: string;
  record: IBrightNexusLocationRecord;
  dnsTxt: string;
  wellKnown: Record<string, unknown>;
}

export async function publishLocation(
  api: AxiosInstance,
  body: IBrightNexusLocationPublishRequest,
): Promise<ILocationPublishResult> {
  const { data } = await api.post<ILocationPublishResult>(LOCATION_BASE, body);
  return data;
}

export async function listMyLocations(
  api: AxiosInstance,
): Promise<IBrightNexusLocationRecord[]> {
  const { data } = await api.get<{ records: IBrightNexusLocationRecord[] }>(
    `${LOCATION_BASE}/mine`,
  );
  return data.records ?? [];
}

export async function revokeLocation(
  api: AxiosInstance,
  ipAddress: string,
): Promise<void> {
  await api.delete(`${LOCATION_BASE}/${encodeURIComponent(ipAddress)}`);
}

export async function lookupLocation(
  api: AxiosInstance,
  ipAddress: string,
): Promise<IBrightNexusLocationLookupResponse> {
  const { data } = await api.get<IBrightNexusLocationLookupResponse>(
    `${LOCATION_BASE}/lookup/${encodeURIComponent(ipAddress)}`,
  );
  return data;
}
