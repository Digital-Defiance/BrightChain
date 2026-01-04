import {
  IEmailTokenFrontendObject,
  IRoleFrontendObject,
  IUserFrontendObject,
  IUserRoleFrontendObject,
} from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';
import { IEmailTokenDocument } from '../documents/email-token';
import { IRoleDocument } from '../documents/role';
import { IUserDocument } from '../documents/user';
import { IUserRoleDocument } from '../documents/user-role';

// Convert ObjectId to string recursively
function objectIdToString(obj: any): any {
  if (obj instanceof Types.ObjectId) {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(objectIdToString);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = objectIdToString(value);
    }
    return result;
  }
  return obj;
}

// Convert mongoose documents to frontend-compatible objects
export function userDocumentToFrontend(
  doc: IUserDocument,
): IUserFrontendObject {
  const obj = (doc as any).toObject();
  return objectIdToString(obj) as IUserFrontendObject;
}

export function roleDocumentToFrontend(
  doc: IRoleDocument,
): IRoleFrontendObject {
  const obj = (doc as any).toObject();
  return objectIdToString(obj) as IRoleFrontendObject;
}

export function emailTokenDocumentToFrontend(
  doc: IEmailTokenDocument,
): IEmailTokenFrontendObject {
  const obj = (doc as any).toObject();
  return objectIdToString(obj) as IEmailTokenFrontendObject;
}

export function userRoleDocumentToFrontend(
  doc: IUserRoleDocument,
): IUserRoleFrontendObject {
  const obj = (doc as any).toObject();
  return objectIdToString(obj) as IUserRoleFrontendObject;
}
