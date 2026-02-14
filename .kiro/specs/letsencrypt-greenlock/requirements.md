# Requirements Document

## Introduction

This feature adds automated Let's Encrypt TLS certificate provisioning to the BrightChain API server using `greenlock-express`. The goal is to enable production HTTPS on port 443 with automatic certificate management (including renewal), support for multiple hostnames and wildcard domains, and an HTTP-to-HTTPS redirect server on port 80. The existing dev HTTPS path (local certificates) remains unchanged; greenlock activates only in production or when explicitly configured.

## Glossary

- **Greenlock**: The `greenlock-express` npm package that integrates Let's Encrypt ACME certificate provisioning with Express applications.
- **ACME**: Automatic Certificate Management Environment — the protocol used by Let's Encrypt to issue and renew certificates.
- **App**: The `App<TID>` application class in `brightchain-api-lib` that manages the Express server lifecycle.
- **Environment**: The `Environment<TID>` class in `brightchain-api-lib` that reads and exposes configuration from environment variables.
- **IEnvironment**: The TypeScript interface in `brightchain-api-lib/src/lib/interfaces/environment.ts` describing the environment shape.
- **ILetsEncryptConfig**: A new interface describing Let's Encrypt / greenlock configuration options.
- **Redirect_Server**: An HTTP server listening on port 80 whose sole purpose is to redirect all requests to HTTPS.
- **Certificate_Store**: The directory on disk where greenlock persists issued certificates and ACME account keys.

## Requirements

### Requirement 1: Let's Encrypt Configuration Interface

**User Story:** As a system administrator, I want to configure Let's Encrypt options through environment variables, so that I can control certificate provisioning without code changes.

#### Acceptance Criteria

1. THE ILetsEncryptConfig interface SHALL define the following fields: `enabled` (boolean), `hostnames` (array of strings supporting wildcards), `maintainerEmail` (string), `staging` (boolean), and `certificateStorePath` (string).
2. WHEN the `LETSENCRYPT_ENABLED` environment variable is set to a truthy value, THE Environment SHALL populate the `letsEncrypt` property with a valid ILetsEncryptConfig object.
3. WHEN the `LETSENCRYPT_ENABLED` environment variable is absent or falsy, THE Environment SHALL set the `letsEncrypt.enabled` field to `false`.
4. WHEN the `LETSENCRYPT_HOSTNAMES` environment variable is provided, THE Environment SHALL parse it as a comma-separated list of hostnames into the `hostnames` array.
5. WHEN the `LETSENCRYPT_HOSTNAMES` environment variable is absent and Let's Encrypt is enabled, THE Environment SHALL fall back to a single-element array containing the server `host` value.
6. WHEN the `LETSENCRYPT_STAGING` environment variable is set to a truthy value, THE Environment SHALL set `staging` to `true` so that the ACME staging directory is used.
7. WHEN the `LETSENCRYPT_STORE_PATH` environment variable is absent, THE Environment SHALL default `certificateStorePath` to `~/.config/greenlock/`.

### Requirement 2: Greenlock Express Integration

**User Story:** As a system administrator, I want the API server to automatically obtain and renew TLS certificates from Let's Encrypt, so that HTTPS is available in production without manual certificate management.

#### Acceptance Criteria

1. WHEN `letsEncrypt.enabled` is `true`, THE App SHALL initialize greenlock-express with the configured hostnames, maintainer email, and staging flag.
2. WHEN greenlock-express is initialized, THE App SHALL serve the Express application over HTTPS on port 443.
3. WHEN greenlock-express is initialized, THE App SHALL continue to serve the Express application over HTTP on the configured `port` (default 3000) for internal or health-check traffic.
4. WHEN `letsEncrypt.enabled` is `false`, THE App SHALL skip greenlock initialization entirely and use the existing HTTP and dev-HTTPS startup paths.
5. WHEN greenlock-express manages the HTTPS server, THE App SHALL attach the WebSocket server to the HTTPS server instance instead of the HTTP server.
6. IF greenlock-express fails to initialize or obtain a certificate, THEN THE App SHALL log the error and continue serving over HTTP only without crashing.

### Requirement 3: HTTP to HTTPS Redirect Server

**User Story:** As a system administrator, I want all HTTP traffic on port 80 to be redirected to HTTPS, so that users are always served over a secure connection.

#### Acceptance Criteria

1. WHEN `letsEncrypt.enabled` is `true`, THE Redirect_Server SHALL listen on port 80.
2. WHEN the Redirect_Server receives any HTTP request, THE Redirect_Server SHALL respond with a 301 redirect to the equivalent HTTPS URL on port 443.
3. WHEN the Redirect_Server receives an ACME HTTP-01 challenge request, THE Redirect_Server SHALL allow greenlock to handle the challenge before redirecting.
4. WHEN the App is stopped, THE Redirect_Server SHALL close gracefully alongside the other servers.
5. IF port 80 is unavailable, THEN THE App SHALL log a warning and continue without the redirect server.

### Requirement 4: Graceful Lifecycle Management

**User Story:** As a developer, I want the greenlock servers to integrate with the existing application lifecycle, so that startup and shutdown remain predictable and clean.

#### Acceptance Criteria

1. WHEN the App starts with Let's Encrypt enabled, THE App SHALL start the HTTP server, the HTTPS server, and the Redirect_Server, and wait for all three to be ready before marking the application as ready.
2. WHEN the App stops, THE App SHALL close the HTTPS server and the Redirect_Server in addition to the existing HTTP and WebSocket shutdown sequence.
3. WHEN the App starts with both `httpsDevCertRoot` and `letsEncrypt.enabled` set, THE App SHALL prefer Let's Encrypt and skip the dev HTTPS server, logging a warning about the conflicting configuration.

### Requirement 5: Configuration Serialization

**User Story:** As a developer, I want the Let's Encrypt configuration to be serializable to and from a plain object, so that it can be persisted or transmitted if needed.

#### Acceptance Criteria

1. THE ILetsEncryptConfig interface SHALL be serializable to JSON.
2. FOR ALL valid ILetsEncryptConfig objects, serializing to JSON and then deserializing SHALL produce an equivalent object (round-trip property).
