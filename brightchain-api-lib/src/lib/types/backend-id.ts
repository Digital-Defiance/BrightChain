import { GuidV4Buffer } from '@digitaldefiance/node-ecies-lib';
// Default backend ID type for Node.js backend
// Buffer is part of PlatformID union and compatible with Node operations
export type DefaultBackendIdType = GuidV4Buffer;
