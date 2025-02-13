import { BlockServices } from '../blocks/services';
import { FecService } from '../services/fec.service';
import { Pbkdf2Service } from '../services/pbkdf2.service';
import { SealingService } from '../services/sealing.service';
import { ServiceInitializer } from '../services/service.initializer';
import { ServiceProvider } from '../services/service.provider';
import { SymmetricService } from '../services/symmetric.service';
import { VotingService } from '../services/voting.service';

/**
 * Helper function to initialize services for tests
 */
export function initializeTestServices(): void {
  const checksumService = ServiceProvider.getChecksumService();
  const eciesService = ServiceProvider.getECIESService();
  const tupleService = ServiceProvider.getTupleService();
  const votingService = new VotingService();
  const sealingService = new SealingService();
  const symmetricService = new SymmetricService();
  const pbkdf2Service = new Pbkdf2Service();
  const fecService = new FecService();

  // Initialize ServiceInitializer
  ServiceInitializer.setChecksumService(checksumService);
  ServiceInitializer.setECIESService(eciesService);

  // Initialize BlockServices
  BlockServices.setChecksumService(checksumService);
  BlockServices.setECIESService(eciesService);
  BlockServices.setTupleService(tupleService);
  BlockServices.setVotingService(votingService);
  BlockServices.setSealingService(sealingService);
  BlockServices.setSymmetricService(symmetricService);
  BlockServices.setPbkdf2Service(pbkdf2Service);
  BlockServices.setFecService(fecService);
}
