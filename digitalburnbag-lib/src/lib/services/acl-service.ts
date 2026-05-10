import { PlatformID } from '@digitaldefiance/ecies-lib';
import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import { PermissionFlag } from '../enumerations/permission-flag';
import {
  PermissionLevel,
  PermissionLevelFlags,
} from '../enumerations/permission-level';
import {
  IPConstraintViolationError,
  TargetNotFoundError,
  TimeWindowConstraintViolationError,
} from '../errors';
import type { IACLDocumentBase } from '../interfaces/bases/acl-document';
import type { IACLEntryBase } from '../interfaces/bases/acl-entry';
import type { IPermissionSetBase } from '../interfaces/bases/permission-set';
import type { IResolvedACLBase } from '../interfaces/bases/resolved-acl';
import type { IAccessContext } from '../interfaces/params/access-context';
import type { IAuditEntryParams } from '../interfaces/params/audit-service-params';
import type { IEffectivePermission } from '../interfaces/params/permission-results';
import type { ICreatePermissionSetParams } from '../interfaces/params/permission-set-params';
import type { IACLRepository } from '../interfaces/services/acl-repository';

/**
 * Manages access control: resolves effective permissions via ACL inheritance,
 * expands permission levels to atomic flags, and evaluates IP/time constraints.
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 12.1, 12.2, 12.3, 40.3, 40.4
 */
export class ACLService<TID extends PlatformID> {
  constructor(
    private readonly repository: IACLRepository<TID>,
    private readonly onAuditLog?: (
      entry: IAuditEntryParams<TID>,
    ) => Promise<void>,
  ) {}

  /**
   * Get the effective permission for a principal on a target.
   * Resolves explicit or inherited ACL, expands permission level to atomic
   * flags, and evaluates IP range and time window constraints.
   *
   * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 12.1, 12.2, 40.3, 40.4
   */
  async getEffectivePermission(
    targetId: TID,
    targetType: 'file' | 'folder',
    principalId: TID,
    context: IAccessContext,
  ): Promise<IEffectivePermission> {
    const resolved = await this.resolveACL(targetId, targetType);

    if (!resolved) {
      return { flags: [], source: 'explicit' };
    }

    const entry = this.findMatchingEntry(resolved.acl, principalId);
    if (!entry) {
      return {
        flags: [],
        source: resolved.inherited ? 'inherited' : 'explicit',
        sourceId: resolved.inheritedFromFolderId
          ? String(resolved.inheritedFromFolderId)
          : undefined,
      };
    }

    // Evaluate constraints — throws on violation
    this.evaluateIPConstraint(entry, context);
    this.evaluateTimeWindowConstraint(entry, context);

    // Check expiration
    if (entry.expiresAt) {
      const expiresAt =
        entry.expiresAt instanceof Date
          ? entry.expiresAt
          : new Date(entry.expiresAt);
      if (context.timestamp > expiresAt) {
        return {
          flags: [],
          source: resolved.inherited ? 'inherited' : 'explicit',
        };
      }
    }

    const flags = await this.resolveFlags(entry);

    return {
      flags,
      source: resolved.inherited ? 'inherited' : 'explicit',
      sourceId: resolved.inheritedFromFolderId
        ? String(resolved.inheritedFromFolderId)
        : undefined,
    };
  }

  /**
   * Check whether a principal has a specific atomic permission flag
   * on a target.
   *
   * Validates: Requirements 10.4, 40.3
   */
  async checkPermissionFlag(
    targetId: TID,
    targetType: 'file' | 'folder',
    principalId: TID,
    requiredFlag: PermissionFlag,
    context: IAccessContext,
  ): Promise<boolean> {
    const effective = await this.getEffectivePermission(
      targetId,
      targetType,
      principalId,
      context,
    );
    return effective.flags.includes(requiredFlag);
  }

  /**
   * Check whether a principal has all flags implied by a permission level.
   *
   * Validates: Requirements 10.4, 40.4
   */
  async checkPermission(
    targetId: TID,
    targetType: 'file' | 'folder',
    principalId: TID,
    requiredLevel: PermissionLevel,
    context: IAccessContext,
  ): Promise<boolean> {
    const effective = await this.getEffectivePermission(
      targetId,
      targetType,
      principalId,
      context,
    );
    const requiredFlags = PermissionLevelFlags[requiredLevel];
    for (const flag of requiredFlags) {
      if (!effective.flags.includes(flag)) {
        return false;
      }
    }
    return true;
  }

  // ── ACL Mutation Methods ────────────────────────────────────────────

  /**
   * Set an explicit ACL on a file or folder. Stores the ACL document via
   * the repository, updates the target's aclId reference, and logs the
   * change to the audit callback if provided.
   *
   * Validates: Requirements 10.5, 10.6
   */
  async setACL(
    targetId: TID,
    targetType: 'file' | 'folder',
    acl: IACLDocumentBase<TID>,
    requesterId: TID,
  ): Promise<void> {
    // Verify target exists
    if (targetType === 'file') {
      const file = await this.repository.getFileById(targetId);
      if (!file) {
        throw new TargetNotFoundError(String(targetId), 'file');
      }
    } else {
      const folder = await this.repository.getFolderById(targetId);
      if (!folder) {
        throw new TargetNotFoundError(String(targetId), 'folder');
      }
    }

    // Capture previous ACL for audit metadata
    let previousAclId: TID | undefined;
    if (targetType === 'file') {
      const file = await this.repository.getFileById(targetId);
      previousAclId = file?.aclId;
    } else {
      const folder = await this.repository.getFolderById(targetId);
      previousAclId = folder?.aclId;
    }

    // Store the ACL document
    await this.repository.upsertACL(acl);

    // Update the target's aclId reference
    if (targetType === 'file') {
      await this.repository.updateFileAclId(targetId, acl.id);
    } else {
      await this.repository.updateFolderAclId(targetId, acl.id);
    }

    // Log the ACL change to audit
    if (this.onAuditLog) {
      await this.onAuditLog({
        operationType: FileAuditOperationType.ACLChanged,
        actorId: requesterId,
        targetId,
        targetType,
        metadata: {
          previousAclId: previousAclId ? String(previousAclId) : null,
          newAclId: String(acl.id),
          entryCount: acl.entries.length,
        },
      });
    }
  }

  /**
   * Get the ACL for a target (explicit or inherited) with source info.
   * Reuses the existing resolveACL method which handles inheritance.
   *
   * Validates: Requirements 10.2, 10.3
   */
  async getACL(
    targetId: TID,
    targetType: 'file' | 'folder',
  ): Promise<IResolvedACLBase<TID> | null> {
    return this.resolveACL(targetId, targetType);
  }

  /**
   * Create a custom named Permission_Set from atomic flags.
   * Delegates to the repository for storage.
   *
   * Validates: Requirements 40.2, 40.5
   */
  async createPermissionSet(
    params: ICreatePermissionSetParams<TID>,
    creatorId: TID,
  ): Promise<IPermissionSetBase<TID>> {
    const now = new Date().toISOString();
    const ps: IPermissionSetBase<TID> = {
      id: `ps-${Date.now()}` as unknown as TID,
      name: params.name,
      flags: params.flags,
      organizationId: params.organizationId,
      createdBy: creatorId,
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.createPermissionSet(ps);

    // Log permission set creation to audit
    if (this.onAuditLog) {
      await this.onAuditLog({
        operationType: FileAuditOperationType.ACLChanged,
        actorId: creatorId,
        targetId: ps.id,
        targetType: 'file', // permission set is not a file/folder, but we use the closest type
        metadata: {
          action: 'permission_set_created',
          name: params.name,
          flags: params.flags,
          organizationId: params.organizationId
            ? String(params.organizationId)
            : undefined,
        },
      });
    }

    return ps;
  }

  /**
   * List custom Permission_Sets for an organization.
   * Delegates to the repository.
   *
   * Validates: Requirements 40.6
   */
  async listPermissionSets(
    organizationId?: TID,
  ): Promise<IPermissionSetBase<TID>[]> {
    return this.repository.listPermissionSets(organizationId);
  }

  // ── ACL Resolution (inheritance) ──────────────────────────────────

  /**
   * Resolve the ACL for a target by walking up the folder hierarchy.
   * - If the target has an explicit aclId, use it.
   * - Otherwise walk up parent folders until one with an aclId is found.
   *
   * Validates: Requirements 10.2, 10.3
   */
  async resolveACL(
    targetId: TID,
    targetType: 'file' | 'folder',
  ): Promise<IResolvedACLBase<TID> | null> {
    let folderId: TID | undefined;

    if (targetType === 'file') {
      const file = await this.repository.getFileById(targetId);
      if (!file) {
        throw new TargetNotFoundError(String(targetId), 'file');
      }
      if (file.aclId) {
        const acl = await this.repository.getACLById(file.aclId);
        if (acl) {
          return { acl, inherited: false };
        }
      }
      // Walk up from the file's parent folder
      folderId = file.folderId;
    } else {
      const folder = await this.repository.getFolderById(targetId);
      if (!folder) {
        throw new TargetNotFoundError(String(targetId), 'folder');
      }
      if (folder.aclId) {
        const acl = await this.repository.getACLById(folder.aclId);
        if (acl) {
          return { acl, inherited: false };
        }
      }
      // Walk up from the folder's parent
      folderId = folder.parentFolderId;
    }

    // Walk up the folder hierarchy looking for an inherited ACL
    while (folderId !== undefined) {
      const parentFolder = await this.repository.getFolderById(folderId);
      if (!parentFolder) {
        break;
      }
      if (parentFolder.aclId) {
        const acl = await this.repository.getACLById(parentFolder.aclId);
        if (acl) {
          return {
            acl,
            inherited: true,
            inheritedFromFolderId: folderId,
          };
        }
      }
      folderId = parentFolder.parentFolderId;
    }

    return null;
  }

  // ── Entry matching ──────────────────────────────────────────────

  /**
   * Find the first ACL entry matching the given principal.
   */
  private findMatchingEntry(
    acl: IACLDocumentBase<TID>,
    principalId: TID,
  ): IACLEntryBase<TID> | undefined {
    return acl.entries.find(
      (e) => String(e.principalId) === String(principalId),
    );
  }

  // ── Flag resolution ─────────────────────────────────────────────

  /**
   * Expand an ACL entry's permission level (or custom set) to atomic flags.
   *
   * Validates: Requirements 40.3, 40.4
   */
  private async resolveFlags(
    entry: IACLEntryBase<TID>,
  ): Promise<PermissionFlag[]> {
    const level = entry.permissionLevel as string;

    // Check if it's a built-in level
    const builtInLevel = Object.values(PermissionLevel).find(
      (v) => v === level,
    );
    if (builtInLevel) {
      return [...PermissionLevelFlags[builtInLevel]];
    }

    // Custom permission set
    if (level === 'custom' && entry.customPermissionSetId) {
      const ps = await this.repository.getPermissionSetById(
        entry.customPermissionSetId,
      );
      if (ps) {
        return [...ps.flags];
      }
    }

    return [];
  }

  // ── Constraint evaluation ─────────────────────────────────────────

  /**
   * Evaluate IP range constraint (CIDR matching).
   * Throws IPConstraintViolationError if the request IP is outside the range.
   *
   * Validates: Requirement 12.1
   */
  private evaluateIPConstraint(
    entry: IACLEntryBase<TID>,
    context: IAccessContext,
  ): void {
    if (!entry.ipRange) {
      return;
    }
    if (!isIPInCIDR(context.ipAddress, entry.ipRange)) {
      throw new IPConstraintViolationError(context.ipAddress, entry.ipRange);
    }
  }

  /**
   * Evaluate time window constraint in the owner's configured timezone.
   * Throws TimeWindowConstraintViolationError if the request is outside
   * the allowed window.
   *
   * Validates: Requirement 12.2
   */
  private evaluateTimeWindowConstraint(
    entry: IACLEntryBase<TID>,
    context: IAccessContext,
  ): void {
    if (!entry.timeWindowStart || !entry.timeWindowEnd) {
      return;
    }

    const timezone = entry.timeWindowTimezone ?? 'UTC';
    const currentMinutes = getMinutesInTimezone(context.timestamp, timezone);
    const startMinutes = parseHHMM(entry.timeWindowStart);
    const endMinutes = parseHHMM(entry.timeWindowEnd);

    let inWindow: boolean;
    if (startMinutes <= endMinutes) {
      // Normal window: e.g. 09:00–17:00
      inWindow = currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight window: e.g. 22:00–06:00
      inWindow = currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    if (!inWindow) {
      const currentHHMM = formatMinutesAsHHMM(currentMinutes);
      throw new TimeWindowConstraintViolationError(
        currentHHMM,
        entry.timeWindowStart,
        entry.timeWindowEnd,
        timezone,
      );
    }
  }
}

// ── CIDR Matching Utility ───────────────────────────────────────────

/**
 * Check if an IPv4 address is within a CIDR range.
 * Supports plain IPv4 addresses and CIDR notation (e.g. "10.0.0.0/8").
 */
export function isIPInCIDR(ip: string, cidr: string): boolean {
  const [rangeIP, maskStr] = cidr.split('/');
  const mask = maskStr !== undefined ? parseInt(maskStr, 10) : 32;

  if (mask < 0 || mask > 32) {
    return false;
  }

  const ipNum = ipv4ToNumber(ip);
  const rangeNum = ipv4ToNumber(rangeIP);

  if (ipNum === null || rangeNum === null) {
    return false;
  }

  if (mask === 0) {
    return true;
  }

  // Create bitmask: e.g. mask=24 → 0xFFFFFF00
  const bitmask = (~0 << (32 - mask)) >>> 0;
  return (ipNum & bitmask) >>> 0 === (rangeNum & bitmask) >>> 0;
}

/**
 * Convert an IPv4 dotted-decimal string to a 32-bit unsigned integer.
 * Returns null if the string is not a valid IPv4 address.
 */
function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return null;
  }
  let num = 0;
  for (const part of parts) {
    const octet = parseInt(part, 10);
    if (isNaN(octet) || octet < 0 || octet > 255) {
      return null;
    }
    num = ((num << 8) | octet) >>> 0;
  }
  return num;
}

// ── Time Window Utilities ───────────────────────────────────────────

/**
 * Parse an "HH:mm" string to total minutes since midnight.
 */
function parseHHMM(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  return h * 60 + m;
}

/**
 * Format total minutes since midnight as "HH:mm".
 */
function formatMinutesAsHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Get the current time-of-day in minutes for a given timezone.
 * Uses standard Intl.DateTimeFormat for timezone conversion.
 */
function getMinutesInTimezone(timestamp: Date, timezone: string): number {
  // Use Intl to get the hour and minute in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(timestamp);
  let hour = 0;
  let minute = 0;
  for (const part of parts) {
    if (part.type === 'hour') {
      hour = parseInt(part.value, 10);
    } else if (part.type === 'minute') {
      minute = parseInt(part.value, 10);
    }
  }
  // Intl hour12:false can return 24 for midnight in some locales
  if (hour === 24) {
    hour = 0;
  }
  return hour * 60 + minute;
}
