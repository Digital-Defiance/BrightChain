/**
 * Indicates the origin of the local node ID reported by the dashboard.
 *
 * - `availability_service` — the full AvailabilityService is wired and
 *   provided the node ID (distributed mode).
 * - `system_identity` — the node ID was derived from the system user's
 *   SYSTEM_ID (the node's cryptographic identity).
 * - `environment` — the node ID came from the NODE_ID env var.
 * - `generated` — no NODE_ID or SYSTEM_ID was available; a random GuidV4
 *   was generated at startup (ephemeral, not persisted).
 */
export enum NodeIdSource {
  AVAILABILITY_SERVICE = 'availability_service',
  SYSTEM_IDENTITY = 'system_identity',
  ENVIRONMENT = 'environment',
  GENERATED = 'generated',
}
