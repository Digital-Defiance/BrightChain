/**
 * Document Signing Service Interface
 *
 * Defines the IDocumentSigningService interface for signing, co-signing,
 * and amending clinical notes (Composition resources). Signing transitions
 * a Composition from preliminary to final, adds a CompositionAttester entry,
 * and creates a cryptographic ECIES signature stored as a FHIR extension.
 *
 * @module documentation/signing/documentSigning
 */

import type { IReference } from '../../fhir/datatypes';
import type { ICompositionResource } from '../compositionResource';
import type { AttestationMode } from '../enumerations';

/**
 * FHIR extension URL for the ECIES cryptographic signature on a Composition.
 * Stored as a base64-encoded value in the Composition.extension array.
 */
export const COMPOSITION_ECIES_SIGNATURE_URL =
  'http://brightchart.org/fhir/StructureDefinition/composition-ecies-signature';

/**
 * Service interface for signing, co-signing, and amending clinical notes.
 *
 * @typeParam TID - Identifier type (string for frontend, Uint8Array for backend)
 */
export interface IDocumentSigningService<TID = string> {
  /**
   * Sign a composition, transitioning it from preliminary to final.
   * Adds a CompositionAttester entry and creates a cryptographic signature.
   *
   * @param compositionId - The composition to sign
   * @param mode - Attestation mode (personal, professional, legal, official)
   * @param signerRef - Reference to the signing practitioner
   * @param signerKeys - Signer's ECIES keys for cryptographic signature
   * @param memberId - BrightChain member ID of the signer
   * @returns The signed composition with status "final"
   */
  sign(
    compositionId: string,
    mode: AttestationMode,
    signerRef: IReference<TID>,
    signerKeys: Uint8Array,
    memberId: TID,
  ): Promise<ICompositionResource<TID>>;

  /**
   * Co-sign a composition, adding an additional attester entry.
   *
   * @param compositionId - The composition to co-sign
   * @param cosignerRef - Reference to the co-signing practitioner
   * @param cosignerKeys - Co-signer's ECIES keys for cryptographic signature
   * @param memberId - BrightChain member ID of the co-signer
   * @returns The co-signed composition
   */
  cosign(
    compositionId: string,
    cosignerRef: IReference<TID>,
    cosignerKeys: Uint8Array,
    memberId: TID,
  ): Promise<ICompositionResource<TID>>;

  /**
   * Amend a signed composition, transitioning it from final to amended.
   * Creates a new version linking to the previous version.
   *
   * @param compositionId - The composition to amend
   * @param amendments - Partial composition fields to update
   * @param memberId - BrightChain member ID of the amender
   * @returns The amended composition with status "amended"
   */
  amend(
    compositionId: string,
    amendments: Partial<ICompositionResource<TID>>,
    memberId: TID,
  ): Promise<ICompositionResource<TID>>;
}
