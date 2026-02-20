import { MemberType } from '@digitaldefiance/ecies-lib';
import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { ITokenPayload } from '../interfaces/token-payload';
import {
  createInsufficientPermissionsError,
  createTokenExpiredError,
  createUnauthorizedError,
} from '../utils/errorResponse';

/**
 * Member context attached to the request after successful authentication.
 * Contains the decoded JWT payload with member information.
 * @requirements 8.3
 */
export interface IMemberContext {
  memberId: string;
  username: string;
  type: MemberType;
  roles?: string[];
  iat: number;
  exp: number;
}

/**
 * Extended request interface with member context.
 */
export interface IAuthenticatedRequest extends Request {
  memberContext?: IMemberContext;
  /** Request ID (UUID v4) set by requestIdMiddleware */
  requestId?: string;
}

/**
 * Configuration options for the JWT authentication middleware.
 */
export interface IJwtAuthConfig {
  /** JWT secret for token verification */
  jwtSecret: string;
  /** Whether to allow requests without tokens (for optional auth) */
  optional?: boolean;
}

/**
 * Configuration options for role-based access control middleware.
 */
export interface IRoleConfig {
  /** Required roles (user must have at least one) */
  requiredRoles?: string[];
  /** Required member types (user must have at least one) */
  requiredTypes?: MemberType[];
  /** Whether all roles are required (AND) vs any role (OR) */
  requireAll?: boolean;
}

/**
 * Extract the JWT token from the Authorization header.
 * Supports Bearer token format.
 *
 * @param req - Express request object
 * @returns The extracted token or null if not found
 */
export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  // Support "Bearer <token>" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Also support raw token
  return authHeader;
}

/**
 * Create a JWT authentication middleware with the given configuration.
 * This middleware validates JWT tokens and attaches member context to the request.
 *
 * @param config - JWT authentication configuration
 * @returns Express middleware function
 * @requirements 8.1, 8.2, 8.3
 */
export function createJwtAuthMiddleware(config: IJwtAuthConfig) {
  return (
    req: IAuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    const requestId = req.requestId || 'unknown';
    const token = extractToken(req);

    // Handle missing token
    if (!token) {
      if (config.optional) {
        // Optional auth - continue without member context
        return next();
      }
      const error = createUnauthorizedError(
        requestId,
        'Missing authentication token',
      );
      res.status(error.statusCode).json(error.response);
      return;
    }

    try {
      // Verify and decode the token
      const decoded = jwt.verify(token, config.jwtSecret) as ITokenPayload;

      // Attach member context to request
      req.memberContext = {
        memberId: decoded.memberId,
        username: decoded.username,
        type: decoded.type,
        iat: decoded.iat,
        exp: decoded.exp,
      };

      // Also set the legacy user property for backward compatibility
      // Using 'any' here to avoid type conflicts with the existing IRequestUserDTO interface
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).user = {
        memberId: decoded.memberId,
        username: decoded.username,
        type: decoded.type,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        // Token has expired - return 401 with expiration message
        const errorResponse = createTokenExpiredError(
          requestId,
          'Authentication token has expired. Please log in again.',
        );
        res.status(errorResponse.statusCode).json(errorResponse.response);
        return;
      }

      if (error instanceof jwt.JsonWebTokenError) {
        // Invalid token format or signature
        const errorResponse = createUnauthorizedError(
          requestId,
          'Invalid authentication token',
        );
        res.status(errorResponse.statusCode).json(errorResponse.response);
        return;
      }

      // Unknown error - treat as unauthorized
      const errorResponse = createUnauthorizedError(
        requestId,
        'Authentication failed',
      );
      res.status(errorResponse.statusCode).json(errorResponse.response);
    }
  };
}

/**
 * Create a role-based access control middleware.
 * This middleware checks if the authenticated user has the required roles or member types.
 *
 * @param config - Role configuration
 * @returns Express middleware function
 * @requirements 8.4
 */
export function createRoleMiddleware(config: IRoleConfig) {
  return (
    req: IAuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    const requestId = req.requestId || 'unknown';

    // Check if user is authenticated
    if (!req.memberContext) {
      const error = createUnauthorizedError(
        requestId,
        'Authentication required',
      );
      res.status(error.statusCode).json(error.response);
      return;
    }

    const { requiredRoles, requiredTypes, requireAll } = config;

    // Check member type requirements
    if (requiredTypes && requiredTypes.length > 0) {
      const hasRequiredType = requiredTypes.includes(req.memberContext.type);
      if (!hasRequiredType) {
        const error = createInsufficientPermissionsError(
          requestId,
          requiredTypes.join(' or '),
        );
        res.status(error.statusCode).json(error.response);
        return;
      }
    }

    // Check role requirements
    if (requiredRoles && requiredRoles.length > 0) {
      const userRoles = req.memberContext.roles || [];

      let hasPermission: boolean;
      if (requireAll) {
        // User must have ALL required roles
        hasPermission = requiredRoles.every((role) => userRoles.includes(role));
      } else {
        // User must have at least ONE required role
        hasPermission = requiredRoles.some((role) => userRoles.includes(role));
      }

      if (!hasPermission) {
        const error = createInsufficientPermissionsError(
          requestId,
          requiredRoles.join(requireAll ? ' and ' : ' or '),
        );
        res.status(error.statusCode).json(error.response);
        return;
      }
    }

    next();
  };
}

/**
 * Convenience function to create a middleware that requires authentication.
 * This is a shorthand for createJwtAuthMiddleware with optional=false.
 *
 * @param jwtSecret - JWT secret for token verification
 * @returns Express middleware function
 * @requirements 8.1, 8.2, 8.3
 */
export function requireAuth(jwtSecret: string) {
  return createJwtAuthMiddleware({ jwtSecret, optional: false });
}

/**
 * Convenience function to create a middleware that optionally authenticates.
 * If a token is present, it will be validated and member context attached.
 * If no token is present, the request continues without member context.
 *
 * @param jwtSecret - JWT secret for token verification
 * @returns Express middleware function
 */
export function optionalAuth(jwtSecret: string) {
  return createJwtAuthMiddleware({ jwtSecret, optional: true });
}

/**
 * Convenience function to create a middleware that requires specific roles.
 * Must be used after authentication middleware.
 *
 * @param roles - Required roles (user must have at least one)
 * @returns Express middleware function
 * @requirements 8.4
 */
export function requireRoles(...roles: string[]) {
  return createRoleMiddleware({ requiredRoles: roles, requireAll: false });
}

/**
 * Convenience function to create a middleware that requires all specified roles.
 * Must be used after authentication middleware.
 *
 * @param roles - Required roles (user must have all)
 * @returns Express middleware function
 * @requirements 8.4
 */
export function requireAllRoles(...roles: string[]) {
  return createRoleMiddleware({ requiredRoles: roles, requireAll: true });
}

/**
 * Convenience function to create a middleware that requires specific member types.
 * Must be used after authentication middleware.
 *
 * @param types - Required member types (user must have at least one)
 * @returns Express middleware function
 * @requirements 8.4
 */
export function requireMemberTypes(...types: MemberType[]) {
  return createRoleMiddleware({ requiredTypes: types });
}

/**
 * Combined middleware that requires authentication and specific roles.
 * This is a convenience function that combines requireAuth and requireRoles.
 *
 * @param jwtSecret - JWT secret for token verification
 * @param roles - Required roles (user must have at least one)
 * @returns Array of Express middleware functions
 * @requirements 8.1, 8.2, 8.3, 8.4
 */
export function requireAuthWithRoles(jwtSecret: string, ...roles: string[]) {
  return [requireAuth(jwtSecret), requireRoles(...roles)];
}

/**
 * Combined middleware that requires authentication and specific member types.
 * This is a convenience function that combines requireAuth and requireMemberTypes.
 *
 * @param jwtSecret - JWT secret for token verification
 * @param types - Required member types (user must have at least one)
 * @returns Array of Express middleware functions
 * @requirements 8.1, 8.2, 8.3, 8.4
 */
export function requireAuthWithMemberTypes(
  jwtSecret: string,
  ...types: MemberType[]
) {
  return [requireAuth(jwtSecret), requireMemberTypes(...types)];
}
