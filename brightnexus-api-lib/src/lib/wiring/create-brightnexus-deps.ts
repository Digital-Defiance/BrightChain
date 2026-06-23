import type { BrightDb } from '@brightchain/db';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IAllBrightNexusControllerDeps } from '../controllers/register-routes';
import { BslpSignatureVerifier } from '../services/bslp-signature-verifier';
import {
  LocationRegistryService,
  type ILocationRegistryIdSerializer,
} from '../services/location-registry-service';

export interface IBrightNexusExternalDeps<TID extends PlatformID> {
  generateId: () => TID;
  idToString: (id: TID) => string;
  parseId: (idString: string) => TID;
  parseSafeId?: (idString: string) => TID | undefined;
  getMemberPublicKeyHex: (memberId: TID) => Promise<string | null>;
  getMemberPublicKeyHexByIdString?: (memberIdHex: string) => Promise<string | null>;
  signatureVerifier?: BslpSignatureVerifier;
}

export function createBrightNexusDeps<TID extends PlatformID>(
  db: BrightDb,
  external: IBrightNexusExternalDeps<TID>,
): IAllBrightNexusControllerDeps<TID> {
  const ids: ILocationRegistryIdSerializer<TID> = {
    generateId: external.generateId,
    idToString: external.idToString,
    parseId: external.parseId,
  };

  const locationRegistryService = new LocationRegistryService(db, ids);
  const signatureVerifier =
    external.signatureVerifier ?? new BslpSignatureVerifier();

  const getMemberPublicKeyHexByIdString =
    external.getMemberPublicKeyHexByIdString ??
    (async (memberIdHex: string) => {
      try {
        const memberId = external.parseId(memberIdHex);
        return external.getMemberPublicKeyHex(memberId);
      } catch {
        return null;
      }
    });

  return {
    locationRegistryService,
    signatureVerifier,
    getMemberPublicKeyHex: external.getMemberPublicKeyHex,
    getMemberPublicKeyHexByIdString,
    idToString: external.idToString,
    parseId: external.parseId,
    parseSafeId: external.parseSafeId,
  };
}
