import { FixedEcies } from './fix-ecies';

// Create and run the test
const fixedEcies = new FixedEcies();
const testMessage =
  'This is a test message for ECIES encryption and decryption.';
fixedEcies.testEncryptDecrypt(testMessage);
