import type { ICertificateOfDestruction } from '../bases/certificate-of-destruction';

/**
 * Repository interface abstracting persistence for Certificates of Destruction.
 * The API layer (digitalburnbag-api-lib) provides the concrete implementation
 * backed by a BrightDB collection (`burnbag_destruction_certificates`).
 */
export interface ICertificateRepository {
  /**
   * Persist a Certificate of Destruction, indexed by containerId.
   */
  storeCertificate(certificate: ICertificateOfDestruction): Promise<void>;

  /**
   * Retrieve a stored certificate by container ID.
   */
  getCertificateByContainerId(
    containerId: string,
  ): Promise<ICertificateOfDestruction | null>;
}
