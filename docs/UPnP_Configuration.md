# UPnP Configuration Guide

BrightChain supports automatic port forwarding via UPnP (Universal Plug and Play) and NAT-PMP. When enabled, the node asks your router to forward the configured ports so it's reachable from the internet — no manual router configuration required.

> **Validates: Requirement 10.1**

---

## Quick Start

1. Copy the example environment file (if you haven't already):

   ```bash
   cp brightchain-api/src/.env.example brightchain-api/src/.env
   ```

2. Enable UPnP in your `.env`:

   ```dotenv
   UPNP_ENABLED=true
   ```

3. Start the server:

   ```bash
   npx nx serve brightchain-api
   ```

On startup you'll see log output confirming the mapping:

```
[UPnP] Initializing UPnP port mapping...
[UPnP] External IP: 203.0.113.42
[UPnP] HTTP port mapping created — external 203.0.113.42:3000 → internal :3000
[UPnP] Initialization complete
```

If UPnP isn't available on your network the server still starts normally — see [Manual Port Forwarding](#manual-port-forwarding) below.

---

## Configuration Reference

All UPnP settings are controlled through environment variables. Every variable is optional; defaults are applied when a variable is absent.

| Variable | Type | Default | Valid Range | Description |
|---|---|---|---|---|
| `UPNP_ENABLED` | boolean | `false` | `true` / `false` | Enable or disable UPnP automatic port forwarding. |
| `UPNP_HTTP_PORT` | number | `3000` | 1 – 65535 | External port to map for the HTTP/Express server. |
| `UPNP_WEBSOCKET_PORT` | number | `3000` | 1 – 65535 | External port to map for WebSocket. When set to the same value as `UPNP_HTTP_PORT`, only one mapping is created. |
| `UPNP_TTL` | number | `3600` | ≥ 60 | Port mapping time-to-live in **seconds**. The mapping expires on the router after this period unless refreshed. |
| `UPNP_REFRESH_INTERVAL` | number | `1800000` | Must be < `UPNP_TTL × 1000` | How often (in **milliseconds**) the node renews its port mappings. Default is 30 minutes. |
| `UPNP_PROTOCOL` | string | `auto` | `upnp` / `natpmp` / `auto` | Which NAT traversal protocol to use. `auto` tries UPnP first, then falls back to NAT-PMP. |
| `UPNP_RETRY_ATTEMPTS` | number | `3` | 1 – 10 | Number of times to retry a failed UPnP operation before giving up. |
| `UPNP_RETRY_DELAY` | number | `5000` | 1000 – 60000 | Delay between retries in **milliseconds**. Exponential backoff is applied on repeated failures. |

### Example `.env` snippet

```dotenv
# ─── UPnP ────────────────────────────────────────────────────────────────
UPNP_ENABLED=true
UPNP_HTTP_PORT=3000
UPNP_WEBSOCKET_PORT=3000
UPNP_TTL=3600
UPNP_REFRESH_INTERVAL=1800000
UPNP_PROTOCOL=auto
UPNP_RETRY_ATTEMPTS=3
UPNP_RETRY_DELAY=5000
```

---

## Manual Port Forwarding

If your router doesn't support UPnP (or you prefer explicit control), you can forward ports manually:

1. Open your router's admin page (typically `http://192.168.1.1`).
2. Navigate to **Port Forwarding** (sometimes called "Virtual Server" or "NAT Rules").
3. Create a rule:
   - **External Port:** your configured `UPNP_HTTP_PORT` (default `3000`)
   - **Internal IP:** your machine's LAN IP (e.g. `192.168.1.100`)
   - **Internal Port:** same as external
   - **Protocol:** TCP
   - **Description:** BrightChain Node HTTP
4. If you use a separate WebSocket port, create a second rule for that port.
5. Save and apply.
6. Set `UPNP_ENABLED=false` in your `.env` so the node skips UPnP initialization.

> **Tip:** Find your LAN IP with `ifconfig` (macOS/Linux) or `ipconfig` (Windows). Look for an address on your LAN interface (usually `192.168.x.x` or `10.x.x.x`).

---

## Troubleshooting

Below are the most common issues. For step-by-step verification with a real router (checking the router admin page, testing external connectivity, observing refresh cycles, etc.), see the [UPnP Manual Testing Guide](./UPnP_Manual_Testing.md).

### UPnP not available

The server logs manual port forwarding instructions and continues running — UPnP failure is non-fatal.

Common causes:
- UPnP is disabled on your router. Enable it in the router admin panel (look under Advanced / NAT / Firewall).
- Your router doesn't support UPnP. Try `UPNP_PROTOCOL=natpmp` for Apple AirPort or other NAT-PMP routers.
- Double NAT (ISP modem + your router). Put the ISP modem in bridge mode so UPnP reaches the right device.
- Host firewall blocking SSDP discovery (UDP port 1900). Allow outbound UDP 1900.

### Port conflict

Another device or a previous BrightChain instance already holds a mapping for the same port.

- Check your router's UPnP table and remove the conflicting entry, or
- Change `UPNP_HTTP_PORT` to a different port.

### Timeout / slow router

- Increase `UPNP_RETRY_ATTEMPTS` (up to 10) and `UPNP_RETRY_DELAY` (up to 60000 ms).
- Try a wired connection to the router.
- Update your router's firmware — some older UPnP implementations are unreliable.

### External port shows closed

- Your ISP may block the port. Try a higher port (e.g. 8080).
- Your OS firewall may be blocking incoming TCP on the configured port.
- Double NAT — see "UPnP not available" above.

### Mappings not removed on shutdown

- `kill -9` (SIGKILL) can't be caught — always use `Ctrl+C` or `kill -SIGTERM` for graceful shutdown.
- If the network was unreachable during shutdown, the mapping expires when its TTL runs out.
- You can manually delete stale mappings from your router's admin page.

---

## Security Considerations

- **Minimal exposure.** Only the ports you explicitly configure (`UPNP_HTTP_PORT`, `UPNP_WEBSOCKET_PORT`) are forwarded. No automatic port scanning or discovery is performed.
- **TTL limits.** Mappings are created with a finite TTL (default 1 hour, minimum 60 seconds). If the node stops refreshing, the mapping expires automatically on the router.
- **Cleanup on shutdown.** The node removes all port mappings during graceful shutdown (`SIGTERM` / `SIGINT`). If the process is killed forcefully (`SIGKILL`) or the network is unavailable, the mapping expires after the TTL.
- **Descriptive mapping names.** Mappings are labelled (e.g. "BrightChain Node HTTP") so they're easy to identify in your router's UPnP table.
- **Audit logging.** All UPnP operations — creation, refresh, removal, and failures — are logged with timestamps for auditability.

---

## Further Reading

- [UPnP Manual Testing Guide](./UPnP_Manual_Testing.md) — hands-on verification with a real router
