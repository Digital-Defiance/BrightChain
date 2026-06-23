import {
  buildBslpSignablePayload,
  canonicalBslpSignPayloadBytes,
  type IBrightNexusLocationPublishRequest,
} from '@brightchain/brightnexus-lib';
import {
  ECIESService,
  EmailString,
  Member,
  MemberType,
  SecureString,
} from '@digitaldefiance/ecies-lib';

/**
 * Sign a BSLP publish body with a member mnemonic (registration recovery phrase).
 * Used by clients, e2e tests, and CLI tooling.
 */
export function signBslpPublishBody(
  mnemonic: string,
  username: string,
  email: string,
  memberIdHex: string,
  body: Omit<IBrightNexusLocationPublishRequest, 'signature'>,
): IBrightNexusLocationPublishRequest {
  const ecies = new ECIESService();
  const { member } = Member.newMember(
    ecies,
    MemberType.User,
    username,
    new EmailString(email),
    new SecureString(mnemonic),
  );
  if (!member.privateKey) {
    throw new Error('Member private key unavailable for BSLP signing');
  }
  const payload = buildBslpSignablePayload(memberIdHex, body);
  const bytes = canonicalBslpSignPayloadBytes(payload);
  const signature = member.sign(bytes);
  return {
    ...body,
    signature: Buffer.from(signature).toString('hex'),
  };
}
