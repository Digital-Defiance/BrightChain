/* eslint-disable @typescript-eslint/no-explicit-any */
import { IRequestUser } from '@brightchain/brightchain-lib';

// Temporary interface
interface IUserDocument {
  _id: any;
  email: string;
  username: string;
  timezone?: string;
  lastLogin?: Date;
  emailVerified?: boolean;
  siteLanguage?: string;
}

/**
 * Service for creating request user objects
 */
export class RequestUserService {
  public static makeRequestUser(userDoc: IUserDocument): IRequestUser {
    return {
      id: userDoc._id?.toString() || 'placeholder-id',
      email: userDoc.email,
      username: userDoc.username,
      timezone: userDoc.timezone || 'UTC',
      lastLogin: userDoc.lastLogin,
      emailVerified: userDoc.emailVerified || false,
      siteLanguage: userDoc.siteLanguage || 'en-US',
      roles: [], // Placeholder
    };
  }
}
