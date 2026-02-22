/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  EmailTokenDocument,
  RoleDocument,
  UserDocument,
  UserRoleDocument,
} from '@digitaldefiance/node-express-suite';
import {
  IEmailTokenFrontendObject,
  IRoleFrontendObject,
  IUserFrontendObject,
  IUserRoleFrontendObject,
} from '@digitaldefiance/suite-core-lib';
import { DefaultBackendIdType } from '../shared-types';

// Convert ObjectId to string recursively
function objectIdToString(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(objectIdToString);
  }
  if (obj && typeof obj === 'object') {
    if ('toString' in obj && typeof obj.toString === 'function') {
      const str = obj.toString();
      return str as DefaultBackendIdType;
    }
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = objectIdToString(value);
    }
    return result;
  }
  return obj;
}

// Convert datastore documents to frontend-compatible objects
export function userDocumentToFrontend(doc: UserDocument): IUserFrontendObject {
  const obj = (doc as any).toObject();
  return objectIdToString(obj) as IUserFrontendObject;
}

export function roleDocumentToFrontend(doc: RoleDocument): IRoleFrontendObject {
  const obj = (doc as any).toObject();
  return objectIdToString(obj) as IRoleFrontendObject;
}

export function emailTokenDocumentToFrontend(
  doc: EmailTokenDocument,
): IEmailTokenFrontendObject {
  const obj = (doc as any).toObject();
  return objectIdToString(obj) as IEmailTokenFrontendObject;
}

export function userRoleDocumentToFrontend(
  doc: UserRoleDocument,
): IUserRoleFrontendObject {
  const obj = (doc as any).toObject();
  return objectIdToString(obj) as IUserRoleFrontendObject;
}
