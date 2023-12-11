# Requirements Document

## Introduction

This document specifies the requirements for implementing WCAP (Web Content Authenticity Protocol) signing in BrightChain's Digital Burnbag application. When the Digital Burnbag serves files from encrypted block storage, the HTTP response will include a WCAP-compliant `Content-Signature` header signed with the operator's secp256k1 identity key using the `dd-ecies-secp256k1-sha256` algorithm suite, and will declare the `decryption-verified` signing policy to indicate that the content was successfully decrypted from ECIES-encrypted block storage before signing.

The implementation adds server-side WCAP signing middleware to the Digital Burnbag's Express-based file-serving endpoints, a public key endpoint for verifier key retrieval, and the necessary interfaces and configuration to wire signing into the existing controller pipeline. This feature is server-side only — no client-side verifier is included in this scope.

The authoritative references are:
- **WCAP Specification** (`WCAP/Web Content Authenticity Protocol (WCAP).md`) — defines the `Content-Signature` header format, algorithm suite registry, and protocol flow.
- **DD-ECIES Specification** (`express-suite/packages/digitaldefiance-ecies-lib/docs/DD-ECIES-SPECIFICATION.md`) — defines the ECDSA-secp256k1-SHA256 signature scheme and 64-byte compact signature format.

## Glossary

- **WCAP_Signing_Middleware**: Express middleware that intercepts file-serving responses, computes the SHA-256 hash of the response body, signs the hash with the member's secp256k1 private key, and adds the `Content-Signature` header.
- **Content_Signature_Header**: The HTTP response header defined by WCAP containing the `alg`, `key_uri`, `sig`, and optionally `kid` parameters.
- **Signing_Member**: The BrightChain member whose secp256k1 identity key pair is used to sign file-serving responses. The member's key pair is derived from a BIP39 mnemonic via BIP32/BIP44.
- **Public_Key_Endpoint**: An HTTP endpoint that serves the Signing_Member's compressed secp256k1 public key in PEM format for WCAP verifier key retrieval.
- **EciesSignature_Service**: The existing `EciesSignature` class in `@digitaldefiance/ecies-lib` that provides `signMessage()` and `verifyMessage()` operations using ECDSA-secp256k1-SHA256 with 64-byte compact signatures.
- **File_Serving_Endpoint**: An endpoint in the Digital Burnbag FileController that returns file content to the client — specifically `downloadFile`, `previewFile`, and `downloadVersion`.
- **Digital_Burnbag**: The BrightChain application that stores and serves files from encrypted block storage, implemented across `digitalburnbag-lib` and `digitalburnbag-api-lib`.
- **WCAP_Config**: Configuration object specifying the signing key, algorithm suite identifier, key URI path, and optional key ID for WCAP signing.
- **Compact_Signature**: A 64-byte ECDSA signature in the format `r(32 bytes) || s(32 bytes)` with no DER encoding, as defined in the DD-ECIES specification.

## Requirements

### Requirement 1: WCAP Signing Middleware

**User Story:** As a Digital Burnbag operator, I want file-serving responses to include a WCAP `Content-Signature` header, so that clients can verify the authenticity and integrity of served files.

#### Acceptance Criteria

1. WHEN a File_Serving_Endpoint returns a successful response (HTTP 200) with a response body, THE WCAP_Signing_Middleware SHALL compute the SHA-256 hash of the exact response body bytes.
2. WHEN the SHA-256 hash has been computed, THE WCAP_Signing_Middleware SHALL sign the hash using the Signing_Member's secp256k1 private key via the EciesSignature_Service, producing a 64-byte Compact_Signature.
3. WHEN the Compact_Signature has been produced, THE WCAP_Signing_Middleware SHALL add a `Content-Signature` header to the response in the format: `alg=dd-ecies-secp256k1-sha256; key_uri=<configured key URI>; sig=<base64-encoded 64-byte compact signature>`.
4. WHEN a `kid` value is configured in the WCAP_Config, THE WCAP_Signing_Middleware SHALL append `; kid=<configured kid value>` to the Content_Signature_Header.
5. THE WCAP_Signing_Middleware SHALL only attach the Content_Signature_Header to responses from File_Serving_Endpoints (`downloadFile`, `previewFile`, `downloadVersion`), not to other API endpoints such as metadata, search, or error responses.
6. IF the Signing_Member's private key is not available (not loaded or disposed), THEN THE WCAP_Signing_Middleware SHALL skip signing and serve the response without a Content_Signature_Header, logging a warning.
7. IF an error occurs during the signing process (hash computation or signature generation), THEN THE WCAP_Signing_Middleware SHALL serve the response without a Content_Signature_Header and log the error, rather than failing the request.

### Requirement 2: WCAP Signing Middleware Integration with Express

**User Story:** As a developer, I want the WCAP signing middleware to integrate cleanly with the existing Express controller pipeline, so that signing is transparent to the file-serving handlers.

#### Acceptance Criteria

1. THE WCAP_Signing_Middleware SHALL be implemented as a standard Express middleware function with the signature `(req: Request, res: Response, next: NextFunction) => void`.
2. THE WCAP_Signing_Middleware SHALL intercept the response body by wrapping the `res.end()` method, computing the signature over the buffered body before sending the response to the client.
3. THE WCAP_Signing_Middleware SHALL preserve all existing response headers, status codes, and body content set by the File_Serving_Endpoint handlers.
4. THE WCAP_Signing_Middleware SHALL be applied selectively to file-serving routes only, using the existing route configuration pattern in `FileController.initRouteDefinitions()`.

### Requirement 3: Public Key Endpoint

**User Story:** As a WCAP verifier, I want to retrieve the signing member's public key from a well-known URI, so that I can verify the `Content-Signature` header on file-serving responses.

#### Acceptance Criteria

1. THE Digital_Burnbag SHALL serve the Signing_Member's compressed secp256k1 public key at the path `/.well-known/wcap-public-key-secp256k1.pem`.
2. THE Public_Key_Endpoint SHALL return the 33-byte compressed secp256k1 public key (0x02 or 0x03 prefix byte) encoded in PEM format with Content-Type `application/x-pem-file`.
3. THE Public_Key_Endpoint SHALL be accessible without authentication, as WCAP verifiers need to fetch the key independently.
4. THE Public_Key_Endpoint SHALL return HTTP 503 (Service Unavailable) with a descriptive error message when the Signing_Member's public key is not available (member not loaded or key not configured).
5. THE Public_Key_Endpoint SHALL set appropriate cache headers (`Cache-Control: public, max-age=86400`) to allow verifiers to cache the key for performance, as recommended by the WCAP specification.

### Requirement 4: WCAP Configuration Interface

**User Story:** As a developer, I want a typed configuration interface for WCAP signing, so that the signing key source, algorithm suite, and key URI are explicitly defined and validated at startup.

#### Acceptance Criteria

1. THE WCAP_Config interface SHALL be defined in `digitalburnbag-lib` (shared library) and SHALL include the following fields: `algorithmSuite` (string, defaulting to `dd-ecies-secp256k1-sha256`), `keyUriPath` (string, defaulting to `/.well-known/wcap-public-key-secp256k1.pem`), `kid` (optional string), and `enabled` (boolean, defaulting to `true`).
2. WHEN the WCAP_Config `enabled` field is `false`, THE WCAP_Signing_Middleware SHALL be a no-op pass-through that calls `next()` immediately.
3. THE WCAP_Config SHALL be validated at application startup, and IF the `algorithmSuite` value is not `dd-ecies-secp256k1-sha256`, THEN THE application SHALL log a warning indicating an unsupported algorithm suite.

### Requirement 5: Key Source from Operator Identity

**User Story:** As a Digital Burnbag operator, I want WCAP signing to use the system/operator secp256k1 key pair, so that no per-user key management is required and signing is always available regardless of which user is downloading a file.

#### Acceptance Criteria

1. THE WCAP_Signing_Middleware SHALL obtain the signing private key from the operator's loaded system `Member` instance, not from the authenticated end user's session.
2. THE WCAP_Signing_Middleware SHALL obtain the operator's compressed public key from the system member's `publicKey` accessor (33-byte compressed secp256k1 format), which is served at the `key_uri` endpoint.
3. THE WCAP_Signing_Middleware SHALL delegate all signing operations to the existing `EciesSignature.signMessage()` method, passing the operator private key and the SHA-256 hash of the response body.
4. THE WCAP_Signing_Middleware SHALL use the operator's existing key pair without generating, importing, or deriving any new keys.
5. THE `Content-Signature` header SHALL attest that the Digital Burnbag operator served these exact bytes — it does not attest to the identity of the end user who requested the file.

### Requirement 6: Scope Limitation to File-Serving Endpoints

**User Story:** As a developer, I want WCAP signing to apply only to file content responses, so that API metadata, error responses, and non-file endpoints are not signed.

#### Acceptance Criteria

1. THE WCAP_Signing_Middleware SHALL only sign responses from the following FileController handler routes: `GET /:id` (downloadFile), `GET /:id/preview` (previewFile), and `GET /:id/versions/:versionId/download` (downloadVersion).
2. THE WCAP_Signing_Middleware SHALL NOT sign responses with non-200 status codes (error responses, 401, 403, 404, 500).
3. THE WCAP_Signing_Middleware SHALL NOT sign responses from non-file endpoints such as `GET /search`, `GET /:id/metadata`, `PATCH /:id`, or `DELETE /:id`.

### Requirement 7: Content-Signature Header Format Compliance

**User Story:** As a protocol implementer, I want the `Content-Signature` header to comply exactly with the WCAP specification, so that any conforming WCAP verifier can validate the signature.

#### Acceptance Criteria

1. THE Content_Signature_Header SHALL use the exact parameter format defined in WCAP Section 6.3: `alg=dd-ecies-secp256k1-sha256; key_uri=<uri>; sig=<base64 signature>`.
2. THE `sig` parameter SHALL contain a standard base64-encoded (RFC 4648 Section 4) representation of the 64-byte Compact_Signature.
3. THE `key_uri` parameter SHALL contain the relative URI path to the Public_Key_Endpoint (e.g., `/.well-known/wcap-public-key-secp256k1.pem`).
4. THE `alg` parameter SHALL contain the exact string `dd-ecies-secp256k1-sha256` as registered in the WCAP Algorithm Suite Registry (Section 12.3.2).
5. WHEN the `kid` parameter is present, THE Content_Signature_Header SHALL append it after the `sig` parameter, separated by `; `.

### Requirement 8: Public Key PEM Encoding

**User Story:** As a WCAP verifier developer, I want the public key served in standard PEM format, so that I can parse it with standard cryptographic libraries.

#### Acceptance Criteria

1. THE Public_Key_Endpoint SHALL encode the 33-byte compressed secp256k1 public key as a DER-encoded SubjectPublicKeyInfo structure wrapped in PEM armor (`-----BEGIN PUBLIC KEY-----` / `-----END PUBLIC KEY-----`).
2. THE PEM output SHALL use base64 encoding with 64-character line wrapping as specified in RFC 7468.
3. THE PEM-encoded public key SHALL be parseable by standard libraries (e.g., OpenSSL `openssl ec -pubin -in key.pem -text`) without errors.

### Requirement 9: Signing Performance

**User Story:** As a Digital Burnbag operator, I want WCAP signing to add minimal latency to file-serving responses, so that the user experience is not degraded.

#### Acceptance Criteria

1. THE WCAP_Signing_Middleware SHALL compute the SHA-256 hash and ECDSA signature synchronously in a single pass over the response body buffer, without requiring additional I/O operations.
2. WHEN the response body exceeds 10 MB, THE WCAP_Signing_Middleware SHALL still sign the response, as the SHA-256 hash computation and ECDSA signing operate on the hash (32 bytes) regardless of body size.

### Requirement 10: Shared Interface Placement

**User Story:** As a developer, I want WCAP-related interfaces in the correct library layers, so that the codebase follows the established architectural conventions.

#### Acceptance Criteria

1. THE WCAP_Config interface and any WCAP-related type definitions that are not Node.js-specific SHALL be defined in `digitalburnbag-lib`.
2. THE WCAP_Signing_Middleware implementation and the Public_Key_Endpoint handler, which depend on Express and Node.js APIs, SHALL be defined in `digitalburnbag-api-lib`.
3. THE WCAP_Signing_Middleware SHALL import the `EciesSignature` service from `@digitaldefiance/ecies-lib` for signing operations.

### Requirement 11: Content-Signature Header Serialization and Parsing Round-Trip

**User Story:** As a specification author, I want the Content-Signature header to be fully parseable and re-serializable, so that implementations can validate round-trip correctness.

#### Acceptance Criteria

1. THE WCAP_Signing_Middleware SHALL produce Content_Signature_Header values that, when parsed by splitting on `; ` and extracting `key=value` pairs, yield the original `alg`, `key_uri`, `sig`, and optionally `kid` and `policy` parameter values without loss or corruption.
2. FOR ALL valid Content_Signature_Header values produced by the WCAP_Signing_Middleware, parsing the header string into its component parameters and re-serializing those parameters SHALL produce a string identical to the original header value (round-trip property).
3. THE `sig` parameter value SHALL survive a base64 decode followed by base64 encode without alteration (the 64-byte signature round-trips through base64 encoding).

### Requirement 12: Signing Policy Declaration

**User Story:** As a WCAP verifier, I want the Digital Burnbag's `Content-Signature` header to declare what the server verified before signing, so that I can distinguish a transport-integrity-only signature from one backed by cryptographic content verification.

#### Acceptance Criteria

1. THE WCAP_Config interface SHALL include an optional `policy` field (string) for specifying a WCAP Signing Policy token (WCAP Specification Section 13).
2. WHEN `config.policy` is set, THE WCAP_Signing_Middleware SHALL append `; policy=<token>` to the `Content-Signature` header after the `sig` (and `kid`, if present) parameter.
3. WHEN `config.policy` is not set, THE WCAP_Signing_Middleware SHALL omit the `policy` parameter from the header.
4. THE Digital Burnbag's default WCAP configuration SHALL set `policy` to `'decryption-verified'`, reflecting that the response body was successfully decrypted from ECIES-encrypted block storage before signing.
5. THE `IContentSignatureParams` interface SHALL include an optional `policy` field so that the `serializeContentSignature` and `parseContentSignature` utilities handle the parameter correctly in round-trip operations.
