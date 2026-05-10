/**
 * Parsed Content-Signature header parameters as defined by WCAP Section 6.3.
 *
 * Format: alg=<alg>; key_uri=<key_uri>; sig=<sig>[; kid=<kid>][; policy=<policy>]
 *
 * Validates: Requirements 1.3, 1.4, 7.1, 7.2, 7.5, 11.1, 11.2, 11.3, 12.5
 */
export interface IContentSignatureParams {
  /** Algorithm suite identifier (e.g. 'dd-ecies-secp256k1-sha256') */
  alg: string;
  /** Relative URI to the public key endpoint */
  key_uri: string;
  /** Base64-encoded signature */
  sig: string;
  /** Optional key ID for multi-key signers */
  kid?: string;
  /** Optional signing policy token (WCAP Section 13). e.g. 'decryption-verified' */
  policy?: string;
}

/**
 * Required fields that must be present in a valid Content-Signature header.
 */
const REQUIRED_FIELDS: ReadonlyArray<keyof IContentSignatureParams> = [
  'alg',
  'key_uri',
  'sig',
];

/**
 * Serializes Content-Signature header parameters into the WCAP header string format.
 *
 * Produces: `alg=<alg>; key_uri=<key_uri>; sig=<sig>[; kid=<kid>][; policy=<policy>]`
 *
 * @param params - The Content-Signature parameters to serialize
 * @returns The serialized header string
 */
export function serializeContentSignature(
  params: IContentSignatureParams,
): string {
  const parts: string[] = [
    `alg=${params.alg}`,
    `key_uri=${params.key_uri}`,
    `sig=${params.sig}`,
  ];

  if (params.kid !== undefined) {
    parts.push(`kid=${params.kid}`);
  }

  if (params.policy !== undefined) {
    parts.push(`policy=${params.policy}`);
  }

  return parts.join('; ');
}

/**
 * Parses a Content-Signature header string into its component parameters.
 *
 * Splits on `; ` and extracts `key=value` pairs. Returns `undefined` if the
 * header is malformed (missing required fields, empty string, etc.).
 *
 * @param header - The raw Content-Signature header string
 * @returns Parsed parameters, or `undefined` if the header is malformed
 */
export function parseContentSignature(
  header: string,
): IContentSignatureParams | undefined {
  if (!header || header.trim().length === 0) {
    return undefined;
  }

  const segments = header.split('; ');
  const params: Record<string, string> = {};

  for (const segment of segments) {
    // Find the first '=' to split key from value (value may contain '=')
    const eqIndex = segment.indexOf('=');
    if (eqIndex === -1) {
      return undefined;
    }

    const key = segment.substring(0, eqIndex);
    const value = segment.substring(eqIndex + 1);

    if (key.length === 0 || value.length === 0) {
      return undefined;
    }

    params[key] = value;
  }

  // Validate all required fields are present
  for (const field of REQUIRED_FIELDS) {
    if (!(field in params)) {
      return undefined;
    }
  }

  const result: IContentSignatureParams = {
    alg: params['alg'],
    key_uri: params['key_uri'],
    sig: params['sig'],
  };

  if ('kid' in params) {
    result.kid = params['kid'];
  }

  if ('policy' in params) {
    result.policy = params['policy'];
  }

  return result;
}
