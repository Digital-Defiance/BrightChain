# UPnP Manual Testing Guide

This guide walks through testing BrightChain's UPnP port mapping with a real router. UPnP allows the node to automatically forward ports on your router so it's reachable from the internet without manual configuration.

> **Validates: Requirement 8.2** — Integration testing with real UPnP-enabled router.

---

## Prerequisites

Before you begin, make sure you have:

1. A **UPnP-enabled router** — most consumer routers support UPnP (check your router's admin page).
2. UPnP **enabled in your router settings** — some routers ship with UPnP disabled by default. Look for a "UPnP" or "NAT-PMP" toggle in your router's admin panel (usually under Advanced / NAT / Firewall settings).
3. The BrightChain server running on a machine **connected to the router's LAN** (wired or Wi-Fi).
4. A second device or network for external verification (e.g. a phone on mobile data, a VPS, or a friend's machine).
5. `curl` or a web browser available on the external device.

---

## 1. Enable UPnP in the Environment

Copy the example env file if you haven't already, then enable UPnP:

```bash
# From the brightchain-api project directory
cp src/.env.example src/.env
```

Edit `src/.env` and set the UPnP variables:

```dotenv
# ─── UPnP Configuration ─────────────────────────────────────────────────
# Enable UPnP automatic port forwarding
UPNP_ENABLED=true

# HTTP/Express port to map externally (default: 3000)
UPNP_HTTP_PORT=3000

# WebSocket port to map externally (default: 3000, same as HTTP)
UPNP_WEBSOCKET_PORT=3000

# Port mapping time-to-live in seconds (default: 3600 = 1 hour, min: 60)
UPNP_TTL=3600

# Mapping refresh interval in milliseconds (default: 1800000 = 30 minutes)
UPNP_REFRESH_INTERVAL=1800000

# UPnP protocol: upnp | natpmp | auto (default: auto)
UPNP_PROTOCOL=auto

# Number of retry attempts on failure (default: 3, range: 1-10)
UPNP_RETRY_ATTEMPTS=3

# Delay between retries in milliseconds (default: 5000, range: 1000-60000)
UPNP_RETRY_DELAY=5000
```

For a quick smoke test you can lower the TTL and refresh interval:

```dotenv
UPNP_TTL=120
UPNP_REFRESH_INTERVAL=60000
```

This makes the mapping expire in 2 minutes and refresh every 1 minute, so you can observe the refresh cycle faster.

---

## 2. Start the Server and Verify UPnP Initialization

Start the API server:

```bash
npx nx serve brightchain-api
```

Watch the console output for UPnP log messages. A successful initialization looks like:

```
[UPnP] Initializing UPnP port mapping...
[UPnP] External IP: 203.0.113.42
[UPnP] HTTP port mapping created — external 203.0.113.42:3000 → internal :3000
[UPnP] WebSocket using same port as HTTP (3000), no additional mapping needed
[UPnP] Refresh timer started (interval: 1800000ms)
[UPnP] Initialization complete
```

Key things to confirm:

- **External IP** is logged — this is your public IP as reported by the router.
- **HTTP port mapping created** — the router accepted the port forward.
- **Refresh timer started** — periodic renewal is active.
- If HTTP and WebSocket use different ports, you'll see a second mapping line for WebSocket.

If initialization fails, you'll see:

```
[UPnP] Initialization failed: <error message>
[UPnP] UPnP not available. Manual port forwarding required:
  Forward external port 3000 to internal port 3000
  Protocol: TCP
  Description: BrightChain Node HTTP
```

The server continues running — UPnP failure is non-fatal. See the [Troubleshooting](#7-troubleshooting) section below.

---

## 3. Verify the Port Mapping on Your Router

Open your router's admin page (typically `http://192.168.1.1` or `http://192.168.0.1`) and navigate to the UPnP or port forwarding section. You should see an entry similar to:

| External Port | Internal IP     | Internal Port | Protocol | Description            |
|---------------|-----------------|---------------|----------|------------------------|
| 3000          | 192.168.1.x     | 3000          | TCP      | BrightChain Node HTTP  |

If you configured a separate WebSocket port, you'll see a second entry for "BrightChain Node WebSocket".

---

## 4. Verify External Accessibility

### Option A: curl from an external network

From a machine **outside your LAN** (VPS, phone hotspot, etc.), run:

```bash
curl -v http://<your-external-ip>:3000/
```

Replace `<your-external-ip>` with the IP logged during initialization. You should get a response from the BrightChain API server (the exact response depends on your routes — a connection refusal or timeout means the mapping isn't working).

### Option B: Online port checker

Use an online port checking tool such as:

- [https://www.yougetsignal.com/tools/open-ports/](https://www.yougetsignal.com/tools/open-ports/)
- [https://canyouseeme.org/](https://canyouseeme.org/)

Enter your external IP and port 3000. The tool should report the port as **open**.

### Option C: WebSocket connectivity

If testing WebSocket accessibility, use a WebSocket client (e.g. `wscat`):

```bash
npx wscat -c ws://<your-external-ip>:3000
```

A successful connection confirms the WebSocket port mapping is working.

---

## 5. Verify the Refresh Cycle

If you lowered the TTL and refresh interval (see step 1), wait for the refresh interval to elapse and watch the logs:

```
[UPnP] Refresh complete (1 mapping(s) active)
```

This confirms the mapping was renewed before the TTL expired. If refresh fails, you'll see:

```
[UPnP] Refresh failed (attempt 1): <error message>
[UPnP] Scheduling backoff refresh in 5000ms (failure #1)
```

The manager uses exponential backoff on repeated failures (up to 8x the retry delay).

---

## 6. Test Graceful Shutdown

Graceful shutdown should remove all port mappings from the router before the process exits.

### Send SIGTERM

In a separate terminal:

```bash
kill -SIGTERM <pid>
```

Or press `Ctrl+C` in the terminal running the server (sends SIGINT).

### Expected log output

```
[UPnP] Received SIGTERM, shutting down UPnP...
[UPnP] Shutting down...
[UPnP] Refresh timer stopped
[UPnP] All mappings removed and service closed
```

### Verify mapping removal

Go back to your router's admin page and confirm the UPnP port mapping entry for BrightChain is **gone**. Also re-run the external port check from step 4 — the port should now be **closed**.

---

## 7. Troubleshooting

### UPnP not available

**Symptom:** `[UPnP] Initialization failed: ...` followed by manual port forwarding instructions.

**Possible causes:**
- UPnP is disabled on your router. Log into the router admin page and enable it.
- Your router doesn't support UPnP. Try setting `UPNP_PROTOCOL=natpmp` if you have an Apple AirPort or other NAT-PMP-capable router.
- You're behind a double NAT (e.g. ISP modem + your router). UPnP only works on the directly connected router. You may need to put the ISP modem in bridge mode.
- A firewall on the host machine is blocking UPnP discovery (SSDP uses UDP port 1900). Ensure your OS firewall allows outbound UDP 1900.

### Port conflicts

**Symptom:** Mapping creation fails with a conflict error.

**Possible causes:**
- Another device or application already has a UPnP mapping for the same port. Check your router's UPnP table and remove the conflicting entry, or change `UPNP_HTTP_PORT` to a different port.
- A previous BrightChain instance didn't shut down cleanly and left a stale mapping. Restart the router's UPnP service or wait for the old mapping's TTL to expire.

### Timeout / slow router

**Symptom:** `[UPnP] Initialization failed: ... timeout` or repeated retry messages.

**Possible causes:**
- The router is slow to respond. Increase `UPNP_RETRY_ATTEMPTS` (up to 10) and `UPNP_RETRY_DELAY` (up to 60000ms).
- Network congestion between the host and router. Try a wired connection.
- The router's UPnP implementation is buggy. Some older routers have unreliable UPnP. Try a firmware update or fall back to manual port forwarding.

### External port check shows closed

**Possible causes:**
- Your ISP blocks incoming connections on the port. Try a higher port (e.g. 8080, 8443). Some ISPs block ports below 1024 or common ports like 80/443.
- The mapping was created but your OS firewall is blocking incoming traffic. Allow TCP traffic on the configured port.
- Double NAT — see "UPnP not available" above.

### Mappings not removed on shutdown

**Possible causes:**
- The process was killed with `SIGKILL` (`kill -9`) which cannot be caught. Always use `SIGTERM` or `Ctrl+C` for graceful shutdown.
- The router was unreachable during shutdown (network disconnected). The mapping will expire when its TTL runs out.
- To manually clean up stale mappings, use your router's admin page to delete them.

---

## 8. Fallback: Manual Port Forwarding

If UPnP doesn't work in your environment, you can manually configure port forwarding on your router:

1. Open your router's admin page.
2. Navigate to **Port Forwarding** (sometimes called "Virtual Server" or "NAT Rules").
3. Create a new rule:
   - **External Port:** 3000 (or your configured `UPNP_HTTP_PORT`)
   - **Internal IP:** Your machine's LAN IP (e.g. `192.168.1.100`)
   - **Internal Port:** 3000 (same as external)
   - **Protocol:** TCP
   - **Description:** BrightChain Node HTTP
4. If using a separate WebSocket port, create a second rule for that port.
5. Save and apply the changes.
6. Set `UPNP_ENABLED=false` in your `.env` to skip UPnP initialization.
7. Verify external accessibility using the methods in [step 4](#4-verify-external-accessibility).

> **Tip:** To find your machine's LAN IP, run `ifconfig` (macOS/Linux) or `ipconfig` (Windows) and look for the address on your LAN interface (usually `192.168.x.x` or `10.x.x.x`).
