import { IRequestUser } from '@BrightChain/brightchain-lib';

export class RequestUserService {
  /**
   * Given a user document and an array of role documents, create the IRequestUser
   * @param userDoc
   * @returns
   */
  public static makeRequestUser(userDoc: IUserDocument): IRequestUser {
    if (!userDoc._id) {
      throw new Error('User document is missing _id');
    }
    return {
      id: userDoc._id.toString(),
      email: userDoc.email,
      username: userDoc.username,
      timezone: userDoc.timezone,
      lastLogin: userDoc.lastLogin,
      emailVerified: userDoc.emailVerified,
      siteLanguage: userDoc.siteLanguage,
    };
  }
}
