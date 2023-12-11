# Requirements Document

## Introduction

This feature adds systematic audit logging for every Digital Burnbag vault file access across the BrightChain platform. Currently, file accesses through public serving endpoints, authenticated vault reads, and share links are not consistently recorded on the append-only ledger. This feature introduces Express middleware and service-layer hooks that capture request metadata (IP address, timestamp, user agent, access outcome) and write immutable audit entries to the ledger for every vault file read operation — whether the access succeeds, is denied, or fails.

The audit logging integrates with the existing `IAuditService` and `IAuditEntryBase` ledger infrastructure in `digitalburnbag-lib`, extends the `FileAuditOperationType` enumeration with access-specific operation types, and provides a configurable middleware that can be applied to any route serving vault file content.

## Glossary

- **Audit_Middleware**: Express middleware that intercepts HTTP requests to vault file endpoints, captures request metadata, and writes audit entries to the Ledger after the route handler completes.
- **Ledger**: The append-only, hash-chained blockchain audit log used by Digital Burnbag to record all file operations as signed, immutable entries.
- **Vault_Container**: The top-level organizational unit in Digital Burnbag that owns files and folders, providing container-level ACLs and non-access verification.
- **Access_Outcome**: The result of a vault file access attempt, one of: `success`, `denied`, `not_found`, or `error`.
- **Accessor_Type**: Classification of the entity requesting file access, either `authenticated` (with a known user ID) or `anonymous` (no authenticated session).
- **Audit_Entry**: A single immutable record on the Ledger conforming to `IAuditEntryBase`, recording one file access event with full request context.
- **Seal_Break**: The irreversible act of accessing a sealed vault file for the first time, which mutates the Access Seal HMAC and is recorded on the Ledger.
- **Access_Context**: Request metadata captured by the Audit_Middleware, including IP address, user agent, HTTP method, and endpoint path (extends the existing `IAccessContext` interface).
- **Audit_Configuration**: Per-route and global settings controlling whether audit logging is enabled, and whether to log all accesses or only failures.
- **Trust_Proxy_Setting**: The Express `trust proxy` configuration that determines how `req.ip` resolves the client IP address when the application runs behind a reverse proxy.
- **Rate_Limiter**: An optional mechanism that throttles Ledger write frequency for high-traffic endpoints to prevent audit log flooding.

## Requirements

### Requirement 1: Audit Entry Data Structure

**User Story:** As a security auditor, I want every vault file access to produce a structured audit entry with complete request context, so that I can trace who accessed what, when, from where, and with what outcome.

#### Acceptance Criteria

1. THE Audit_Entry SHALL include a UTC timestamp in ISO 8601 format recording when the access occurred.
2. THE Audit_Entry SHALL include the file ID and Vault_Container ID of the accessed file.
3. THE Audit_Entry SHALL include an Accessor_Type field with value `authenticated` or `anonymous`.
4. WHEN the Accessor_Type is `authenticated`, THE Audit_Entry SHALL include the authenticated user ID as the actor ID.
5. WHEN the Accessor_Type is `anonymous`, THE Audit_Entry SHALL record a platform-defined anonymous sentinel value as the actor ID.
6. THE Audit_Entry SHALL include the accessor IP address as provided by Express `req.ip`, stored as-is for both IPv4 and IPv6 addresses.
7. THE Audit_Entry SHALL include the Access_Outcome with one of the values: `success`, `denied`, `not_found`, or `error`.
8. THE Audit_Entry SHALL include the HTTP method, endpoint path, and user agent string from the request.
9. WHEN the access breaks a vault seal on a previously sealed file, THE Audit_Entry SHALL include a `sealBroken: true` flag in the entry metadata.
10. THE Audit_Entry SHALL conform to the existing `IAuditEntryBase` interface and be writable via the `IAuditService.logOperation` method.

### Requirement 2: Anonymous Access Logging

**User Story:** As a platform operator, I want unauthenticated file accesses (public endpoints, anonymous share links) to be logged with the requester's IP address, so that I can investigate abuse or unauthorized access patterns.

#### Acceptance Criteria

1. WHEN a vault file is accessed without an authenticated session, THE Audit_Middleware SHALL record the Accessor_Type as `anonymous`.
2. WHEN a vault file is accessed without an authenticated session, THE Audit_Middleware SHALL capture the client IP address from Express `req.ip`.
3. WHEN the application runs behind a reverse proxy, THE Trust_Proxy_Setting SHALL be configured so that `req.ip` resolves to the originating client IP from the `X-Forwarded-For` header.
4. THE Audit_Middleware SHALL store IPv6 addresses in their original format without converting them to IPv4-mapped form.

### Requirement 3: Authenticated Access Logging

**User Story:** As a compliance officer, I want authenticated file accesses to be logged with the user's identity and IP address, so that I can produce per-user access reports.

#### Acceptance Criteria

1. WHEN a vault file is accessed with an authenticated session, THE Audit_Middleware SHALL record the Accessor_Type as `authenticated`.
2. WHEN a vault file is accessed with an authenticated session, THE Audit_Middleware SHALL include the authenticated user ID as the actor ID in the Audit_Entry.
3. WHEN a vault file is accessed with an authenticated session, THE Audit_Middleware SHALL capture the client IP address from Express `req.ip`.

### Requirement 4: Failed Access Logging

**User Story:** As a security analyst, I want failed file access attempts (denied, not found, errors) to be logged with the same detail as successful accesses, so that I can detect brute-force attacks and unauthorized access attempts.

#### Acceptance Criteria

1. WHEN a vault file access is denied due to ACL restrictions (HTTP 403), THE Audit_Middleware SHALL record an Audit_Entry with Access_Outcome `denied`.
2. WHEN a vault file access targets a file that does not exist (HTTP 404), THE Audit_Middleware SHALL record an Audit_Entry with Access_Outcome `not_found`.
3. WHEN a vault file access fails due to a server error (HTTP 5xx), THE Audit_Middleware SHALL record an Audit_Entry with Access_Outcome `error`.
4. WHEN a vault file access succeeds (HTTP 2xx), THE Audit_Middleware SHALL record an Audit_Entry with Access_Outcome `success`.
5. THE Audit_Middleware SHALL record failed access Audit_Entries with the same request context fields (IP address, user agent, HTTP method, endpoint path) as successful access entries.

### Requirement 5: Middleware Integration

**User Story:** As a backend developer, I want a reusable Express middleware that I can apply to any route serving vault files, so that audit logging is consistent and easy to add to new endpoints.

#### Acceptance Criteria

1. THE Audit_Middleware SHALL be implementable as Express middleware that can be applied to individual routes or route groups.
2. THE Audit_Middleware SHALL capture request metadata (IP address, user agent, HTTP method, endpoint path) before the route handler executes.
3. THE Audit_Middleware SHALL determine the Access_Outcome from the HTTP response status code after the route handler completes.
4. THE Audit_Middleware SHALL write the Audit_Entry to the Ledger asynchronously without blocking the HTTP response to the client.
5. THE Audit_Middleware SHALL be applicable to the server icon endpoint (`GET /api/servers/:serverId/icon`).
6. THE Audit_Middleware SHALL be applicable to the staging preview endpoint (`GET /api/temp-upload/:token/preview`).
7. THE Audit_Middleware SHALL be applicable to share link access endpoints.
8. IF the Audit_Middleware fails to write an Audit_Entry to the Ledger, THEN THE Audit_Middleware SHALL log the failure to the application error log and continue serving the response without interruption.

### Requirement 6: Ledger Integration

**User Story:** As a platform architect, I want audit entries to be written to the existing Digital Burnbag append-only ledger using the established entry format, so that access audit data is tamper-proof and verifiable alongside other ledger entries.

#### Acceptance Criteria

1. THE Audit_Entry SHALL be written to the Ledger using the existing `IAuditService.logOperation` method.
2. THE Audit_Entry SHALL use a dedicated `FileAuditOperationType` value for vault file access auditing, distinct from existing operation types.
3. THE Audit_Entry SHALL be immutable once written to the Ledger (append-only semantics).
4. THE Audit_Entry SHALL include a `ledgerEntryHash` computed by the Ledger for chain verification.
5. WHEN the Audit_Entry records a share link access, THE Audit_Entry SHALL include the share link ID in the entry metadata.

### Requirement 7: Audit Configuration

**User Story:** As a platform operator, I want to configure audit logging granularity per-route and globally, so that I can balance security visibility with performance on high-traffic endpoints.

#### Acceptance Criteria

1. THE Audit_Configuration SHALL support enabling or disabling audit logging globally.
2. THE Audit_Configuration SHALL support enabling or disabling audit logging per-route when the Audit_Middleware is applied.
3. THE Audit_Configuration SHALL support a `failures-only` mode that logs only access attempts with Access_Outcome values of `denied`, `not_found`, or `error`.
4. WHEN audit logging is disabled globally, THE Audit_Middleware SHALL skip Audit_Entry creation for all routes regardless of per-route settings.
5. WHEN audit logging is disabled for a specific route, THE Audit_Middleware SHALL skip Audit_Entry creation for that route only.

### Requirement 8: Trust Proxy Configuration

**User Story:** As a DevOps engineer, I want the Express application to correctly resolve client IP addresses when running behind load balancers or reverse proxies, so that audit entries contain the true client IP rather than the proxy IP.

#### Acceptance Criteria

1. THE Trust_Proxy_Setting SHALL be configured on the Express application so that `req.ip` resolves the originating client IP from the `X-Forwarded-For` header.
2. WHEN the `X-Forwarded-For` header contains multiple IP addresses, THE Trust_Proxy_Setting SHALL cause `req.ip` to resolve to the leftmost (client-originating) IP address that is not a trusted proxy.
3. IF the `X-Forwarded-For` header is absent, THEN THE Trust_Proxy_Setting SHALL cause `req.ip` to fall back to the TCP connection remote address.

### Requirement 9: Performance and Non-Blocking Writes

**User Story:** As a platform operator, I want audit logging to have minimal impact on file serving latency, so that users experience fast file downloads even with full audit logging enabled.

#### Acceptance Criteria

1. THE Audit_Middleware SHALL write Audit_Entries to the Ledger asynchronously after the HTTP response has been sent to the client.
2. THE Audit_Middleware SHALL add no more than 5 milliseconds of synchronous overhead to the request-response cycle for metadata capture.
3. IF a Ledger write fails, THEN THE Audit_Middleware SHALL not retry the write synchronously and SHALL log the failure for later reconciliation.

### Requirement 10: Rate Limiting for High-Traffic Endpoints

**User Story:** As a platform operator, I want to optionally throttle audit log writes on high-traffic public endpoints (such as icon serving with CDN cache misses), so that the Ledger is not overwhelmed by repetitive access entries.

#### Acceptance Criteria

1. THE Audit_Configuration SHALL support an optional rate limit setting per-route, expressed as a maximum number of Audit_Entries per time window.
2. WHEN the rate limit is exceeded for a route, THE Audit_Middleware SHALL skip Audit_Entry creation for subsequent accesses until the time window resets.
3. WHEN the rate limit is exceeded, THE Audit_Middleware SHALL increment a counter in the entry metadata of the next written Audit_Entry to record the number of skipped entries.
4. WHEN no rate limit is configured for a route, THE Audit_Middleware SHALL write an Audit_Entry for every access.

### Requirement 11: Shared Interface Placement

**User Story:** As a library maintainer, I want audit logging interfaces and types to be defined in the correct workspace packages, so that shared types live in `brightchain-lib` or `digitalburnbag-lib` and Node.js-specific middleware lives in `brightchain-api-lib`.

#### Acceptance Criteria

1. THE Audit_Entry interface extensions and new `FileAuditOperationType` values SHALL be defined in `digitalburnbag-lib` alongside the existing audit interfaces.
2. THE Audit_Configuration interface SHALL be defined in `digitalburnbag-lib` so that configuration shapes are available to all consumers.
3. THE Audit_Middleware implementation SHALL be defined in `brightchain-api-lib` since it depends on Express and Node.js types.
4. THE Accessor_Type enumeration SHALL be defined in `digitalburnbag-lib` alongside existing enumerations.
