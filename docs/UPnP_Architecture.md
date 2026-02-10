# UPnP Architecture & Developer Guide

This document covers the UPnP port mapping subsystem in BrightChain: API reference, integration patterns, runtime flows, and security considerations.

## Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     brightchain-api (Express)                   │
│                                                                 │
│  App.start()  ──►  UpnpConfig.fromEnvironment()                │
│                         │                                       │
│                         ▼                                       │
│                    UpnpManager(config)                           │
│                         │                                       │
│  App.stop()   ──►  UpnpManager.shutdown()                       │
│                                                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │ uses
┌─────────────────────────────▼───────────────────────────────────┐
│                   brightchain-api-lib                            │
│                                                                 │
│  UpnpConfig          UpnpManager                                │
│  ├─ fromEnvironment()  ├─ initialize()                          │
│  └─ validate()         ├─ shutdown()                            │
│                        ├─ getExternalEndpoints()                │
│                        ├─ refresh()          (private, timer)   │
│                        └─ handleSignal()     (private, SIGTERM) │
│                                                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │ uses
┌─────────────────────────────▼───────────────────────────────────┐
│                     brightchain-lib                              │
│                                                                 │
│  IUpnpService (interface)    IUpnpConfig, IUpnpMapping (types)  │
│                                                                 │
│  UpnpService (implementation)                                   │
│  ├─ getExternalIp()          PortRangeError                     │
│  ├─ createPortMapping()      UpnpOperationError                 │
│  ├─ removePortMapping()      UpnpServiceClosedError             │
│  ├─ removeAllMappings()                                         │
│  ├─ getMappings()            nat-upnp (native UPnP client)      │
│  └─ close()                                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

The layering follows the project convention: shared types and core logic live in `brightchain-lib`, Node.js-specific concerns (env vars, process signals, Express lifecycle) live in `brightchain-api-lib`, and the Express application wires everything together.

---

## API Reference

### Types (`brightchain-lib`)

#### `UpnpProtocol` (enum)

| Value    | Description                              |
|----------|------------------------------------------|
| `UPNP`   | Use UPnP protocol only                  |
| `NATPMP` | Use NAT-PMP protocol only               |
| `AUTO`   | Auto-detect with UPnP → NAT-PMP fallback |

#### `PortMappingProtocol` (type)

```typescript
type PortMappingProtocol = 'tcp' | 'udp';
```

#### `IUpnpMapping` (interface)

| Property      | Type                  | Description                        |
|---------------|-----------------------|------------------------------------|
| `public`      | `number`              | External (public) port number      |
| `private`     | `number`              | Internal (private) port number     |
| `protocol`    | `PortMappingProtocol` | Transport protocol (`tcp` / `udp`) |
| `description` | `string`              | Human-readable mapping description |
| `ttl`         | `number`              | Time-to-live in seconds            |

#### `IUpnpConfig` (interface)

| Property          | Type           | Default     | Description                       |
|-------------------|----------------|-------------|-----------------------------------|
| `enabled`         | `boolean`      | `false`     | Enable/disable UPnP               |
| `httpPort`        | `number`       | `3000`      | HTTP port to map                   |
| `websocketPort`   | `number`       | `3000`      | WebSocket port to map              |
| `ttl`             | `number`       | `3600`      | Mapping TTL in seconds (1 hour)    |
| `refreshInterval` | `number`       | `1800000`   | Refresh interval in ms (30 min)    |
| `protocol`        | `UpnpProtocol` | `AUTO`      | Protocol selection                 |
| `retryAttempts`   | `number`       | `3`         | Retry attempts on failure          |
| `retryDelay`      | `number`       | `5000`      | Base retry delay in ms             |

Defaults are exported as `UPNP_CONFIG_DEFAULTS` (frozen object).


### `UpnpService` (`brightchain-lib`)

Core service wrapping `nat-upnp`. Manages port mappings with retry logic, IP caching, and lifecycle tracking.

#### Constructor

```typescript
new UpnpService(config?: Partial<IUpnpConfig>, ipCacheTtlMs?: number)
```

- `config` — Merged with `UPNP_CONFIG_DEFAULTS` for any omitted fields.
- `ipCacheTtlMs` — External IP cache duration (default 5 minutes).

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getExternalIp` | `() => Promise<string>` | Query router for external IP. Cached for `ipCacheTtlMs`. |
| `createPortMapping` | `(mapping: IUpnpMapping) => Promise<void>` | Create a mapping. Validates ports, retries on failure. |
| `removePortMapping` | `(publicPort: number, protocol: PortMappingProtocol) => Promise<void>` | Remove a single mapping by port + protocol. |
| `removeAllMappings` | `() => Promise<void>` | Remove all tracked mappings. Partial failures collected and thrown. |
| `getMappings` | `() => Promise<IUpnpMapping[]>` | Return in-memory list of active mappings. |
| `close` | `() => Promise<void>` | Remove all mappings, close the nat-upnp client, mark service closed. |

#### Static Helpers

| Method | Signature | Description |
|--------|-----------|-------------|
| `validatePort` | `(port: number) => void` | Throws `PortRangeError` if port is outside 1–65535. |
| `mappingKey` | `(port: number, protocol: PortMappingProtocol) => string` | Returns `"port:protocol"` key for the internal map. |
| `sleep` | `(ms: number) => Promise<void>` | Promise-based delay (used in retry backoff). |

#### Error Classes

| Class | When Thrown |
|-------|------------|
| `PortRangeError` | Port number outside 1–65535 |
| `UpnpOperationError` | Operation failed after all retry attempts |
| `UpnpServiceClosedError` | Any method called after `close()` |

#### Retry Behavior

All router operations use `withRetry()` internally:

- Attempts: `config.retryAttempts + 1` (initial + retries)
- Backoff: `retryDelay * 2^attempt` (exponential)
- On exhaustion: throws `UpnpOperationError` with the last error message

---

### `UpnpConfig` (`brightchain-api-lib`)

Loads and validates UPnP configuration from environment variables.

#### Factory

```typescript
UpnpConfig.fromEnvironment(env?: Record<string, string | undefined>): UpnpConfig
```

Reads `UPNP_*` env vars, falls back to `UPNP_CONFIG_DEFAULTS`, validates, and returns a frozen config object. Throws `UpnpConfigValidationError` on invalid values.

#### Environment Variables

| Variable                | Type    | Default   | Validation                    |
|-------------------------|---------|-----------|-------------------------------|
| `UPNP_ENABLED`          | boolean | `false`   | `"true"` / `"false"`          |
| `UPNP_HTTP_PORT`        | int     | `3000`    | 1–65535                       |
| `UPNP_WEBSOCKET_PORT`   | int     | `3000`    | 1–65535                       |
| `UPNP_TTL`              | int     | `3600`    | ≥ 60 seconds                  |
| `UPNP_REFRESH_INTERVAL` | int     | `1800000` | > 0, < TTL × 1000            |
| `UPNP_PROTOCOL`         | string  | `auto`    | `upnp` / `natpmp` / `auto`   |
| `UPNP_RETRY_ATTEMPTS`   | int     | `3`       | 1–10                          |
| `UPNP_RETRY_DELAY`      | int     | `5000`    | 1000–60000 ms                 |

#### Validation Rules

- `refreshInterval` must be strictly less than `ttl * 1000` (refresh before expiry)
- TTL minimum 60 seconds
- Retry delay between 1–60 seconds
- Non-integer or out-of-range values throw `UpnpConfigValidationError`

---

### `UpnpManager` (`brightchain-api-lib`)

Server-level orchestrator. Manages the full lifecycle of UPnP mappings within the Express application.

#### Constructor

```typescript
new UpnpManager(config: IUpnpConfig | UpnpConfig)
```

Creates an internal `UpnpService` instance and binds signal handlers (not yet registered).

#### Public Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `initialize` | `() => Promise<void>` | Discover external IP, create HTTP (+ optional WS) mapping, start refresh timer, register signal handlers. Non-fatal on failure. |
| `shutdown` | `() => Promise<void>` | Stop refresh timer, remove signal handlers, remove all mappings, close service. Idempotent. |
| `getExternalEndpoints` | `() => Promise<{ http: string; ws: string } \| null>` | Returns external `http://` and `ws://` URLs for peer advertisement. Returns `null` if not initialized. |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `isInitialized` | `boolean` | Whether `initialize()` completed successfully |
| `isShuttingDown` | `boolean` | Whether `shutdown()` is in progress or complete |

#### Refresh Behavior

- Timer fires every `config.refreshInterval` ms
- Re-creates each active mapping (effectively renewing the TTL)
- Verifies mapping count after refresh; recreates if any are missing
- On failure: exponential backoff up to `8 × retryDelay`
- Timer uses `.unref()` so it won't prevent process exit

#### Signal Handling

- Registers `SIGTERM` and `SIGINT` handlers on `initialize()`
- Handlers call `shutdown()` then are removed
- Handlers are stored as bound references for clean removal

---

## Integration Examples

### Standalone `UpnpService` Usage

```typescript
import { UpnpService } from '@brightchain/brightchain-lib/lib/services/network/upnpService';

const service = new UpnpService({
  retryAttempts: 2,
  retryDelay: 3000,
});

try {
  const externalIp = await service.getExternalIp();
  console.log(`External IP: ${externalIp}`);

  await service.createPortMapping({
    public: 8080,
    private: 8080,
    protocol: 'tcp',
    description: 'My Service',
    ttl: 3600,
  });

  const mappings = await service.getMappings();
  console.log(`Active mappings: ${mappings.length}`);
} finally {
  await service.close(); // always clean up
}
```

### Express Integration via `UpnpManager`

This is how `App` (in `brightchain-api-lib`) integrates UPnP:

```typescript
import { UpnpConfig } from '../config/upnpConfig';
import { UpnpManager } from '../server/upnpManager';

// During App.start(), after HTTP server is listening:
const upnpConfig = UpnpConfig.fromEnvironment();
if (upnpConfig.enabled) {
  const manager = new UpnpManager(upnpConfig);
  await manager.initialize();
  // manager is now refreshing mappings on a timer
  // and listening for SIGTERM/SIGINT
}

// During App.stop():
if (manager) {
  await manager.shutdown();
  // mappings removed, timer stopped, signals unregistered
}
```

### Peer Advertisement

```typescript
// After UPnP is initialized, get external endpoints for gossip protocol:
const endpoints = await manager.getExternalEndpoints();
if (endpoints) {
  // endpoints.http  → "http://203.0.113.42:3000"
  // endpoints.ws    → "ws://203.0.113.42:3000"
  advertiseToNetwork(endpoints);
}
```

---

## Flow Diagrams

### Startup Flow

```
App.start()
    │
    ├─ Start HTTP server (listen on port)
    ├─ Start WebSocket server (attach to HTTP)
    │
    ├─ UpnpConfig.fromEnvironment()
    │   ├─ Read UPNP_* env vars
    │   ├─ Merge with UPNP_CONFIG_DEFAULTS
    │   └─ Validate all values
    │
    ├─ if config.enabled:
    │   │
    │   ├─ new UpnpManager(config)
    │   │   └─ new UpnpService(config)
    │   │       └─ natUpnp.createClient()
    │   │
    │   └─ manager.initialize()
    │       ├─ Register SIGTERM/SIGINT handlers
    │       ├─ service.getExternalIp()
    │       │   └─ nat-upnp → router SSDP query
    │       │       └─ Cache result (5 min TTL)
    │       │
    │       ├─ service.createPortMapping(HTTP)
    │       │   └─ nat-upnp → router AddPortMapping
    │       │       └─ Track in activeMappings map
    │       │
    │       ├─ if websocketPort ≠ httpPort:
    │       │   └─ service.createPortMapping(WS)
    │       │
    │       └─ Start refresh timer (setInterval)
    │
    └─ if !config.enabled:
        └─ Log "UPnP disabled"

    On initialize() failure:
        ├─ Log warning with error details
        ├─ Log manual port forwarding instructions
        └─ Continue startup (non-fatal)
```

### Shutdown Flow

```
App.stop()  ─or─  SIGTERM/SIGINT received
    │
    └─ manager.shutdown()
        │
        ├─ Set shuttingDown = true (idempotent guard)
        │
        ├─ Stop refresh timer (clearInterval)
        │
        ├─ Remove SIGTERM/SIGINT handlers
        │
        └─ service.close()
            │
            ├─ service.removeAllMappings()
            │   ├─ For each tracked mapping:
            │   │   └─ nat-upnp → router DeletePortMapping
            │   │       └─ Remove from activeMappings map
            │   └─ Clear activeMappings (even on partial failure)
            │
            ├─ client.close()  (nat-upnp client)
            │
            └─ Set closed = true, clear IP cache
```

### Refresh Cycle

```
setInterval (every refreshInterval ms)
    │
    └─ manager.refresh()
        │
        ├─ if shuttingDown → return
        │
        ├─ service.getMappings()
        │   │
        │   ├─ if empty:
        │   │   ├─ Log warning "no active mappings"
        │   │   ├─ Recreate HTTP mapping
        │   │   ├─ Recreate WS mapping (if needed)
        │   │   └─ Reset failure counter
        │   │
        │   └─ if mappings exist:
        │       ├─ For each mapping:
        │       │   └─ service.createPortMapping(mapping)
        │       │       (re-create = renew TTL on router)
        │       │
        │       ├─ Verify mapping count after refresh
        │       │   └─ if count decreased → recreate missing
        │       │
        │       └─ Reset failure counter
        │
        └─ On failure:
            ├─ Increment consecutiveRefreshFailures
            ├─ Calculate backoff: retryDelay × min(2^(failures-1), 8)
            └─ Schedule one-shot retry via setTimeout
                └─ timer.unref() (won't block exit)
```

### Error Handling & Retry Flow

```
Any UpnpService operation (getExternalIp, createPortMapping, etc.)
    │
    └─ withRetry(operationName, operation)
        │
        ├─ Attempt 0: execute operation
        │   ├─ Success → return result
        │   └─ Failure → save error, sleep(retryDelay × 2^0)
        │
        ├─ Attempt 1: execute operation
        │   ├─ Success → return result
        │   └─ Failure → save error, sleep(retryDelay × 2^1)
        │
        ├─ Attempt 2: execute operation
        │   ├─ Success → return result
        │   └─ Failure → save error, sleep(retryDelay × 2^2)
        │
        └─ Attempt N (= retryAttempts): execute operation
            ├─ Success → return result
            └─ Failure → throw UpnpOperationError(operationName, lastError)
```

---

## Security Considerations

### Minimal Exposure

- Only ports explicitly configured via `UPNP_HTTP_PORT` and `UPNP_WEBSOCKET_PORT` are mapped. No port scanning or auto-discovery.
- Each mapping carries a descriptive label (`"BrightChain Node HTTP"`, `"BrightChain Node WebSocket"`) so router admin UIs show clear ownership.
- UPnP is opt-in (`UPNP_ENABLED=false` by default). No ports are exposed unless the operator explicitly enables it.

### TTL Limits

- Minimum TTL enforced at 60 seconds (via `UpnpConfig.validate()`).
- Maximum practical TTL is bounded by the refresh interval constraint: `refreshInterval < ttl * 1000`.
- Default TTL of 1 hour with 30-minute refresh means mappings are renewed well before expiry.
- If the process crashes without cleanup, mappings auto-expire on the router after the TTL period.

### Cleanup Guarantees

- `App.stop()` calls `UpnpManager.shutdown()` before closing the HTTP server, ensuring mappings are removed during graceful shutdown.
- `SIGTERM` and `SIGINT` signal handlers trigger `shutdown()` automatically.
- `UpnpService.close()` performs best-effort removal of all tracked mappings before closing the nat-upnp client.
- `removeAllMappings()` continues removing remaining mappings even if individual removals fail, then clears the in-memory tracking map.
- If the process is killed with `SIGKILL` (untrappable), mappings expire naturally after the configured TTL.

### Audit Logging

All UPnP operations are logged with the `[UPnP]` prefix for easy filtering:

| Event | Log Level | Example |
|-------|-----------|---------|
| Initialization start | `log` | `[UPnP] Initializing UPnP port mapping...` |
| External IP discovered | `log` | `[UPnP] External IP: 203.0.113.42` |
| Mapping created | `log` | `[UPnP] HTTP port mapping created — external 203.0.113.42:3000 → internal :3000` |
| Refresh success | `log` | `[UPnP] Refresh complete (2 mapping(s) active)` |
| Refresh failure | `error` | `[UPnP] Refresh failed (attempt 2): timeout` |
| Mapping recreation | `warn` | `[UPnP] No active mappings found during refresh, recreating...` |
| Shutdown | `log` | `[UPnP] All mappings removed and service closed` |
| UPnP unavailable | `warn` | `[UPnP] UPnP not available. Manual port forwarding required:...` |

### Network Safety

- The `UpnpService` validates all port numbers before sending them to the router (1–65535 range check).
- The `UpnpConfig` validates that the refresh interval is shorter than the TTL to prevent mapping gaps.
- All nat-upnp operations are wrapped in retry logic, preventing transient router issues from causing permanent failures.
- The service tracks a `closed` state and throws `UpnpServiceClosedError` if any operation is attempted after shutdown, preventing use-after-close bugs.

---

## Testing

See also: [`docs/UPnP_Manual_Testing.md`](./UPnP_Manual_Testing.md) for real-router testing instructions.

### Unit Tests

Located at `brightchain-lib/src/lib/services/network/upnpService.spec.ts`:
- Mock `nat-upnp` client to test all service methods in isolation
- Port validation, retry logic, error class behavior, close semantics

### Integration Tests

Located at `brightchain-api-lib/src/lib/server/upnpManager.spec.ts`:
- Mock `UpnpService` to test `UpnpManager` lifecycle
- Startup, shutdown, refresh timer, signal handling

### Failure Scenario Tests

Located at `brightchain-api-lib/src/lib/server/upnpManager.failure.spec.ts`:
- UPnP unavailable, router timeout, port conflict, network disconnection

### Running Tests

```bash
# Core service tests
NX_TUI=false npx nx test brightchain-lib --testFile=upnpService.spec.ts --outputStyle=stream

# Manager tests
NX_TUI=false npx nx test brightchain-api-lib --testFile=upnpManager.spec.ts --outputStyle=stream

# Failure scenario tests
NX_TUI=false npx nx test brightchain-api-lib --testFile=upnpManager.failure.spec.ts --outputStyle=stream
```
