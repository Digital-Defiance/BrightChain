import { Pbkdf2ProfileEnum } from './enumerations/pbkdf2Profile';
import { IPbkdf2Config } from './interfaces/pbkdf2Config';

export type Pbkdf2Profiles = {
  [key in Pbkdf2ProfileEnum]: IPbkdf2Config;
};
