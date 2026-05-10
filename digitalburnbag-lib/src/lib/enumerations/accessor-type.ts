/**
 * @enum AccessorType
 * @description Classification of the entity requesting vault file access.
 *
 * - authenticated : The request has a valid authenticated session with a known user ID.
 * - anonymous     : The request has no authenticated session (public endpoint, anonymous share link, etc.).
 */
export enum AccessorType {
  Authenticated = 'authenticated',
  Anonymous = 'anonymous',
}
