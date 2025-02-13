import { ChecksumService } from '../services/checksum.service';
import { ECIESService } from '../services/ecies.service';
import { FecService } from '../services/fec.service';
import { Pbkdf2Service } from '../services/pbkdf2.service';
import { SealingService } from '../services/sealing.service';
import { SymmetricService } from '../services/symmetric.service';
import { TupleService } from '../services/tuple.service';
import { VotingService } from '../services/voting.service';

/**
 * Service access for blocks to avoid circular dependencies
 */
export class BlockServices {
  private static _eciesService: ECIESService | undefined;
  private static _checksumService: ChecksumService | undefined;
  private static _tupleService: TupleService | undefined;
  private static _votingService: VotingService | undefined;
  private static _sealingService: SealingService | undefined;
  private static _symmetricService: SymmetricService | undefined;
  private static _pbkdf2Service: Pbkdf2Service | undefined;
  private static _fecService: FecService | undefined;

  public static setECIESService(service: ECIESService | undefined) {
    this._eciesService = service;
  }

  public static getECIESService(): ECIESService {
    if (!this._eciesService) {
      this._eciesService = new ECIESService();
    }
    return this._eciesService;
  }

  public static setChecksumService(service: ChecksumService | undefined) {
    this._checksumService = service;
    // Since TupleService depends on ChecksumService, we need to recreate it
    this._tupleService = undefined;
  }

  public static getChecksumService(): ChecksumService {
    if (!this._checksumService) {
      this._checksumService = new ChecksumService();
    }
    return this._checksumService;
  }

  public static setTupleService(service: TupleService | undefined) {
    this._tupleService = service;
  }

  public static getTupleService(): TupleService {
    if (!this._tupleService) {
      this._tupleService = new TupleService(this.getChecksumService());
    }
    return this._tupleService;
  }

  public static setVotingService(service: VotingService | undefined) {
    this._votingService = service;
  }

  public static getVotingService(): VotingService {
    if (!this._votingService) {
      this._votingService = new VotingService();
    }
    return this._votingService;
  }

  public static setSealingService(service: SealingService | undefined) {
    this._sealingService = service;
  }

  public static getSealingService(): SealingService {
    if (!this._sealingService) {
      this._sealingService = new SealingService();
    }
    return this._sealingService;
  }

  public static setSymmetricService(service: SymmetricService | undefined) {
    this._symmetricService = service;
  }

  public static getSymmetricService(): SymmetricService {
    if (!this._symmetricService) {
      this._symmetricService = new SymmetricService();
    }
    return this._symmetricService;
  }

  public static setPbkdf2Service(service: Pbkdf2Service | undefined) {
    this._pbkdf2Service = service;
  }

  public static getPbkdf2Service(): Pbkdf2Service {
    if (!this._pbkdf2Service) {
      this._pbkdf2Service = new Pbkdf2Service();
    }
    return this._pbkdf2Service;
  }

  public static setFecService(service: FecService | undefined) {
    this._fecService = service;
  }

  public static getFecService(): FecService {
    if (!this._fecService) {
      this._fecService = new FecService();
    }
    return this._fecService;
  }
}
