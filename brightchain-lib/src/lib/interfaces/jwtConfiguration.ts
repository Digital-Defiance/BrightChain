export interface IJwtConfiguration {
  /**
   * Algorithm to use for JWT
   */
  ALGORITHM:
    | 'HS256'
    | 'HS384'
    | 'HS512'
    | 'RS256'
    | 'RS384'
    | 'RS512'
    | 'ES256'
    | 'ES384'
    | 'ES512'
    | 'PS256'
    | 'PS384'
    | 'PS512';

  /**
   * The expiration time for a JWT token in seconds
   */
  EXPIRATION_SEC: number;
}
