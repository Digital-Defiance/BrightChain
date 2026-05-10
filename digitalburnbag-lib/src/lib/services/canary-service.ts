import { PlatformID } from '@digitaldefiance/ecies-lib';
import { CanaryCondition } from '../enumerations/canary-condition';
import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import { ProtocolAction } from '../enumerations/protocol-action';
import {
  CanaryBindingNotFoundError,
  CascadeNotFoundError,
  RecipientListNotFoundError,
} from '../errors';
import type { ICanaryBindingBase } from '../interfaces/bases/canary-binding';
import type { IRecipientListBase } from '../interfaces/bases/recipient-list';
import type { IAuditEntryParams } from '../interfaces/params/audit-service-params';
import type {
  ICanaryBindingUpdate,
  ICascadeResult,
  ICreateCanaryBindingParams,
  IDryRunReport,
  IPrepareBindingKeysResult,
  IProtocolExecutionResult,
  ITriggerContext,
} from '../interfaces/params/canary-service-params';
import type {
  ICreateRecipientListParams,
  IRecipientListUpdate,
} from '../interfaces/params/recipient-list-params';
import type { ICanaryRepository } from '../interfaces/services/canary-repository';
import type { ICanaryService } from '../interfaces/services/canary-service';

/**
 * Dependencies injected into CanaryService that come from other services.
 */
export interface ICanaryServiceDeps<TID extends PlatformID> {
  /** Destroy a file (delegates to DestructionService) */
  destroyFile: (
    fileId: TID,
    requesterId: TID,
  ) => Promise<{ destructionHash: Uint8Array }>;
  /** Decrypt and get file content for email/distribution */
  getFileContent: (
    fileId: TID,
  ) => Promise<{ content: Uint8Array; fileName: string; mimeType: string }>;
  /**
   * Create a passphrase-protected ephemeral share link for a file.
   * Used for external recipients (e.g. bob@bob.com) so that plaintext
   * never travels over email. The recipient gets a link + passphrase
   * instead of the raw file.
   */
  createEphemeralShareLink?: (
    fileId: TID,
    requesterId: TID,
  ) => Promise<{ shareUrl: string; passphrase: string }>;
  /** Send email with attachments */
  sendEmailWithAttachments: (
    recipients: Array<{ email: string; pgpPublicKey?: string }>,
    files: Array<{ content: Uint8Array; fileName: string; mimeType: string }>,
  ) => Promise<number>;
  /**
   * Send email with share links (passphrase-protected ephemeral links).
   * Each link entry includes the URL and an optional passphrase.
   */
  sendEmailWithLinks: (
    recipients: Array<{ email: string }>,
    links: string[],
  ) => Promise<number>;
  /** Submit files to public disclosure endpoints */
  releaseToPublic: (
    files: Array<{ content: Uint8Array; fileName: string; mimeType: string }>,
  ) => Promise<number>;
  /** Schedule a delayed action (returns a cancellable ID) */
  scheduleDelayedAction: (delayMs: number, action: () => Promise<void>) => TID;
  /** Cancel a scheduled delayed action */
  cancelDelayedAction: (actionId: TID) => void;
  /** Log an audit entry */
  onAuditLog?: (entry: IAuditEntryParams<TID>) => Promise<void>;
  /**
   * Read the vault symmetric key and current version ID for a file.
   * Required for pre-positioning keys at binding creation time.
   */
  readVaultSymmetricKey?: (
    fileId: TID,
  ) => Promise<{ symmetricKey: Uint8Array; currentVersionId: TID }>;
  /**
   * Wrap a symmetric key for an internal platform member.
   * Used to pre-position keys for recipients who have platform accounts.
   */
  wrapKeyForMember?: (
    fileVersionId: TID,
    symmetricKey: Uint8Array,
    recipientUserId: TID,
    requesterId: TID,
  ) => Promise<{ id: TID }>;
  /**
   * Wrap a symmetric key for an ephemeral share link.
   * Used to pre-position keys for external recipients.
   * Returns the share URL and a one-time passphrase.
   */
  wrapKeyForEphemeralShare?: (
    fileVersionId: TID,
    symmetricKey: Uint8Array,
    shareLinkId: TID,
    requesterId: TID,
  ) => Promise<{
    entry: { id: TID };
    ephemeralPrivateKey: Uint8Array;
  }>;
  /**
   * Build a passphrase-protected share URL from an ephemeral private key.
   * Returns the URL and passphrase to send to the recipient.
   */
  buildShareUrl?: (
    fileId: TID,
    shareLinkId: TID,
    ephemeralPrivateKey: Uint8Array,
  ) => Promise<{ shareUrl: string; passphrase: string }>;
}

/**
 * Manages canary protocol bindings, recipient lists, protocol execution,
 * cascading triggers, duress handling, and dry-run simulation.
 *
 * Delegates persistence to an `ICanaryRepository`, which is implemented in
 * `digitalburnbag-api-lib` backed by BrightDB. Destruction, file content,
 * email, and scheduling operations are injected as dependencies so the
 * service stays environment-agnostic.
 */
export class CanaryService<TID extends PlatformID>
  implements ICanaryService<TID>
{
  constructor(
    private readonly repository: ICanaryRepository<TID>,
    private readonly deps: ICanaryServiceDeps<TID>,
    private readonly generateId: () => TID,
  ) {}

  /**
   * Create a new canary binding from params.
   * Stores via repository and logs CanaryBindingCreated to audit.
   */
  async createBinding(
    params: ICreateCanaryBindingParams<TID>,
    requesterId: TID,
  ): Promise<ICanaryBindingBase<TID>> {
    const now = new Date().toISOString();
    const binding: ICanaryBindingBase<TID> = {
      id: this.generateId(),
      protocolId: params.protocolId,
      vaultContainerIds: params.vaultContainerIds ?? [],
      fileIds: params.fileIds ?? [],
      folderIds: params.folderIds ?? [],
      protocolAction: params.protocolAction,
      canaryCondition: params.canaryCondition,
      canaryProvider: params.canaryProvider,
      customProviderId: params.customProviderId,
      absenceConfig: params.absenceConfig,
      duressConfig: params.duressConfig,
      providerCredentialsId: params.providerCredentialsId,
      checkIntervalMs: params.checkIntervalMs,
      isActive: true,
      consecutiveAbsenceCount: 0,
      warningsSent: false,
      recipientListId: params.recipientListId,
      prePositionedKeyWrappingEntryIds: params.prePositionedKeyWrappingEntryIds,
      cascadeBindingIds: params.cascadeBindingIds,
      cascadeDelayMs: params.cascadeDelayMs,
      createdBy: requesterId,
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.createBinding(binding);

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.CanaryBindingCreated,
        actorId: requesterId,
        targetId: binding.id,
        targetType: 'file',
        metadata: {
          protocolAction: params.protocolAction,
          canaryCondition: params.canaryCondition,
          fileCount: (params.fileIds ?? []).length,
          folderCount: (params.folderIds ?? []).length,
        },
      });
    }

    return binding;
  }

  /**
   * Update an existing canary binding.
   * Applies partial updates, stores via repository, and logs
   * CanaryBindingModified to audit.
   */
  async updateBinding(
    bindingId: TID,
    updates: Partial<ICanaryBindingUpdate<TID>>,
    requesterId: TID,
  ): Promise<ICanaryBindingBase<TID>> {
    const existing = await this.repository.getBinding(bindingId);
    if (!existing) {
      throw new CanaryBindingNotFoundError(String(bindingId));
    }

    const now = new Date().toISOString();
    const merged: Partial<ICanaryBindingBase<TID>> = {
      ...updates,
      updatedAt: now,
    };

    await this.repository.updateBinding(bindingId, merged);

    const updated: ICanaryBindingBase<TID> = {
      ...existing,
      ...merged,
    } as ICanaryBindingBase<TID>;

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.CanaryBindingModified,
        actorId: requesterId,
        targetId: bindingId,
        targetType: 'file',
        metadata: {
          updatedFields: Object.keys(updates),
        },
      });
    }

    return updated;
  }

  /**
   * Delete a canary binding.
   * Removes via repository and logs CanaryBindingDeleted to audit.
   */
  async deleteBinding(bindingId: TID, requesterId: TID): Promise<void> {
    const existing = await this.repository.getBinding(bindingId);
    if (!existing) {
      throw new CanaryBindingNotFoundError(String(bindingId));
    }

    await this.repository.deleteBinding(bindingId);

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.CanaryBindingDeleted,
        actorId: requesterId,
        targetId: bindingId,
        targetType: 'file',
        metadata: {
          protocolAction: existing.protocolAction,
          canaryCondition: existing.canaryCondition,
        },
      });
    }
  }

  /**
   * Resolve all affected file IDs from a binding's direct fileIds
   * and files within bound folders.
   */
  private async resolveAffectedFiles(
    binding: ICanaryBindingBase<TID>,
  ): Promise<TID[]> {
    const directFiles = [...binding.fileIds];
    if (binding.folderIds.length > 0) {
      const folderFiles = await this.repository.getFilesInFolders(
        binding.folderIds,
      );
      directFiles.push(...folderFiles);
    }
    return directFiles;
  }

  /**
   * Execute the protocol action for a binding.
   * Resolves all affected files, dispatches based on protocolAction,
   * and logs CanaryTriggered to audit.
   */
  async executeProtocolAction(
    bindingId: TID,
    triggerContext: ITriggerContext,
  ): Promise<IProtocolExecutionResult<TID>> {
    const binding = await this.repository.getBinding(bindingId);
    if (!binding) {
      throw new CanaryBindingNotFoundError(String(bindingId));
    }

    const allFileIds = await this.resolveAffectedFiles(binding);
    const errors: string[] = [];
    let filesAffected = 0;
    let recipientsContacted = 0;

    switch (binding.protocolAction) {
      case ProtocolAction.DeleteFiles:
      case ProtocolAction.DeleteFolders: {
        for (const fileId of allFileIds) {
          try {
            await this.deps.destroyFile(fileId, binding.createdBy);
            filesAffected++;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            errors.push(`Failed to destroy file ${String(fileId)}: ${message}`);
          }
        }
        break;
      }

      case ProtocolAction.EmailFilesAsAttachments: {
        if (!binding.recipientListId) {
          errors.push(
            'No recipient list configured for email attachment action',
          );
          break;
        }
        const recipientList = await this.repository.getRecipientList(
          binding.recipientListId,
        );
        if (!recipientList) {
          errors.push(
            `Recipient list not found: ${String(binding.recipientListId)}`,
          );
          break;
        }

        const hasPrePositionedKeys =
          binding.prePositionedKeyWrappingEntryIds &&
          binding.prePositionedKeyWrappingEntryIds.length > 0;

        if (hasPrePositionedKeys && this.deps.createEphemeralShareLink) {
          // Pre-positioned keys exist — send share links instead of
          // decrypting server-side. Each recipient already has a wrapped
          // copy of the symmetric key, so they can decrypt client-side.
          const links: string[] = [];
          for (const fileId of allFileIds) {
            try {
              const { shareUrl } = await this.deps.createEphemeralShareLink(
                fileId,
                binding.createdBy,
              );
              links.push(shareUrl);
              filesAffected++;
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              errors.push(
                `Failed to create share link for file ${String(fileId)}: ${message}`,
              );
            }
          }

          if (links.length > 0) {
            try {
              recipientsContacted = await this.deps.sendEmailWithLinks(
                recipientList.recipients.map((r) => ({ email: r.email })),
                links,
              );
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              errors.push(`Failed to send email links: ${message}`);
            }
          }
        } else {
          // Fallback: custodial decrypt → email plaintext (PGP-encrypted
          // if the recipient provided a PGP key).
          const files: Array<{
            content: Uint8Array;
            fileName: string;
            mimeType: string;
          }> = [];
          for (const fileId of allFileIds) {
            try {
              const fileContent = await this.deps.getFileContent(fileId);
              files.push(fileContent);
              filesAffected++;
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              errors.push(
                `Failed to get content for file ${String(fileId)}: ${message}`,
              );
            }
          }

          if (files.length > 0) {
            try {
              recipientsContacted = await this.deps.sendEmailWithAttachments(
                recipientList.recipients.map((r) => ({
                  email: r.email,
                  pgpPublicKey: r.pgpPublicKey,
                })),
                files,
              );
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              errors.push(`Failed to send emails: ${message}`);
            }
          }
        }
        break;
      }

      case ProtocolAction.EmailFilesAsLinks: {
        if (!binding.recipientListId) {
          errors.push('No recipient list configured for email links action');
          break;
        }
        const recipientList = await this.repository.getRecipientList(
          binding.recipientListId,
        );
        if (!recipientList) {
          errors.push(
            `Recipient list not found: ${String(binding.recipientListId)}`,
          );
          break;
        }

        // Prefer ephemeral share links so plaintext never travels over email.
        // Falls back to raw file ID strings if createEphemeralShareLink is
        // not wired up.
        const links: string[] = [];
        if (this.deps.createEphemeralShareLink) {
          for (const fileId of allFileIds) {
            try {
              const { shareUrl } = await this.deps.createEphemeralShareLink(
                fileId,
                binding.createdBy,
              );
              links.push(shareUrl);
              filesAffected++;
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              errors.push(
                `Failed to create share link for file ${String(fileId)}: ${message}`,
              );
            }
          }
        } else {
          // Legacy fallback: send raw file ID references
          links.push(...allFileIds.map((id) => String(id)));
          filesAffected = allFileIds.length;
        }

        if (links.length > 0) {
          try {
            recipientsContacted = await this.deps.sendEmailWithLinks(
              recipientList.recipients.map((r) => ({ email: r.email })),
              links,
            );
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            errors.push(`Failed to send email links: ${message}`);
          }
        }
        break;
      }

      case ProtocolAction.ReleaseToPublic: {
        const files: Array<{
          content: Uint8Array;
          fileName: string;
          mimeType: string;
        }> = [];
        for (const fileId of allFileIds) {
          try {
            const fileContent = await this.deps.getFileContent(fileId);
            files.push(fileContent);
            filesAffected++;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            errors.push(
              `Failed to get content for file ${String(fileId)}: ${message}`,
            );
          }
        }

        if (files.length > 0) {
          try {
            recipientsContacted = await this.deps.releaseToPublic(files);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            errors.push(`Failed to release to public: ${message}`);
          }
        }
        break;
      }

      default:
        errors.push(`Unsupported action: ${String(binding.protocolAction)}`);
        break;
    }

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.CanaryTriggered,
        actorId: binding.createdBy,
        targetId: bindingId,
        targetType: 'file',
        metadata: {
          protocolAction: binding.protocolAction,
          filesAffected,
          recipientsContacted,
          errorCount: errors.length,
          isDuress: triggerContext.isDuress ?? false,
          triggeredBy: triggerContext.triggeredBy,
        },
      });
    }

    return {
      bindingId,
      action: binding.protocolAction,
      filesAffected,
      recipientsContacted,
      errors,
    };
  }

  /**
   * Create a new recipient list.
   * Stores via repository.
   */
  async createRecipientList(
    params: ICreateRecipientListParams<TID>,
    requesterId: TID,
  ): Promise<IRecipientListBase<TID>> {
    const now = new Date().toISOString();
    const list: IRecipientListBase<TID> = {
      id: this.generateId(),
      name: params.name,
      ownerId: requesterId,
      recipients: params.recipients,
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.createRecipientList(list);
    return list;
  }

  /**
   * Update an existing recipient list.
   * Applies add/remove recipient updates and stores via repository.
   */
  async updateRecipientList(
    listId: TID,
    updates: Partial<IRecipientListUpdate<TID>>,
    _requesterId: TID,
  ): Promise<IRecipientListBase<TID>> {
    const existing = await this.repository.getRecipientList(listId);
    if (!existing) {
      throw new RecipientListNotFoundError(String(listId));
    }

    let recipients = [...existing.recipients];

    if (updates.recipientsToRemove && updates.recipientsToRemove.length > 0) {
      const removeSet = new Set(updates.recipientsToRemove);
      recipients = recipients.filter((r) => !removeSet.has(r.email));
    }

    if (updates.recipientsToAdd && updates.recipientsToAdd.length > 0) {
      recipients.push(...updates.recipientsToAdd);
    }

    const now = new Date().toISOString();
    const updatedFields: Partial<IRecipientListBase<TID>> = {
      recipients,
      updatedAt: now,
    };
    if (updates.name !== undefined) {
      updatedFields.name = updates.name;
    }

    await this.repository.updateRecipientList(listId, updatedFields);

    return {
      ...existing,
      ...updatedFields,
    } as IRecipientListBase<TID>;
  }

  /**
   * Handle a duress trigger for a user.
   * Queries all bindings with DURESS condition and executes each.
   * Logs DuressTriggered to audit.
   */
  async handleDuressTrigger(userId: TID): Promise<void> {
    const duressBindings = await this.repository.getBindingsByCondition(
      CanaryCondition.DURESS,
    );

    const triggerContext: ITriggerContext = {
      triggeredAt: new Date(),
      triggeredBy: String(userId),
      isDuress: true,
    };

    for (const binding of duressBindings) {
      await this.executeProtocolAction(binding.id, triggerContext);
    }

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.DuressTriggered,
        actorId: userId,
        targetId: userId,
        targetType: 'file',
        metadata: {
          bindingsExecuted: duressBindings.length,
        },
        isDuress: true,
      });
    }
  }

  /**
   * Execute a cascading protocol: primary binding immediately,
   * then schedule delayed secondary bindings.
   * Returns the primary result and scheduled secondary IDs.
   */
  async executeCascade(
    primaryBindingId: TID,
    triggerContext: ITriggerContext,
  ): Promise<ICascadeResult<TID>> {
    const binding = await this.repository.getBinding(primaryBindingId);
    if (!binding) {
      throw new CanaryBindingNotFoundError(String(primaryBindingId));
    }

    const primaryResult = await this.executeProtocolAction(
      primaryBindingId,
      triggerContext,
    );

    const scheduledSecondaryIds: TID[] = [];

    const cascadeBindingIds = binding.cascadeBindingIds ?? [];
    const cascadeDelayMs = binding.cascadeDelayMs ?? [];

    if (cascadeBindingIds.length > 0 && cascadeDelayMs.length > 0) {
      const count = Math.min(cascadeBindingIds.length, cascadeDelayMs.length);

      for (let i = 0; i < count; i++) {
        const secondaryBindingId = cascadeBindingIds[i];
        const delayMs = cascadeDelayMs[i];

        const scheduledId = this.deps.scheduleDelayedAction(
          delayMs,
          async () => {
            await this.executeProtocolAction(
              secondaryBindingId,
              triggerContext,
            );
          },
        );
        scheduledSecondaryIds.push(scheduledId);
      }
    }

    return {
      primaryResult,
      scheduledSecondaryIds,
    };
  }

  /**
   * Cancel a scheduled cascade action.
   * Delegates to deps.cancelDelayedAction and logs cancellation to audit.
   */
  async cancelCascade(cascadeId: TID, requesterId: TID): Promise<void> {
    try {
      this.deps.cancelDelayedAction(cascadeId);
    } catch {
      throw new CascadeNotFoundError(String(cascadeId));
    }

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.DestructionCancelled,
        actorId: requesterId,
        targetId: cascadeId,
        targetType: 'file',
        metadata: {
          cascadeCancelled: true,
        },
      });
    }
  }

  /**
   * Simulate a protocol execution without performing any actions.
   * Resolves all affected files/folders, gets recipient list if applicable,
   * and returns a dry-run report. Logs DryRunExecuted to audit.
   */
  async dryRun(bindingId: TID, requesterId: TID): Promise<IDryRunReport<TID>> {
    const binding = await this.repository.getBinding(bindingId);
    if (!binding) {
      throw new CanaryBindingNotFoundError(String(bindingId));
    }

    const allFileIds = await this.resolveAffectedFiles(binding);

    let recipientsToContact: string[] = [];
    if (binding.recipientListId) {
      const recipientList = await this.repository.getRecipientList(
        binding.recipientListId,
      );
      if (recipientList) {
        recipientsToContact = recipientList.recipients.map((r) => r.email);
      }
    }

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.DryRunExecuted,
        actorId: requesterId,
        targetId: bindingId,
        targetType: 'file',
        metadata: {
          protocolAction: binding.protocolAction,
          filesAffected: allFileIds.length,
          foldersAffected: binding.folderIds.length,
          recipientsToContact: recipientsToContact.length,
        },
      });
    }

    return {
      bindingId,
      action: binding.protocolAction,
      vaultContainersAffected: [...binding.vaultContainerIds],
      filesAffected: allFileIds,
      foldersAffected: [...binding.folderIds],
      recipientsToContact,
    };
  }

  async getBindings(requesterId: TID): Promise<ICanaryBindingBase<TID>[]> {
    return this.repository.getBindingsByUser(requesterId);
  }

  async getRecipientLists(
    requesterId: TID,
  ): Promise<IRecipientListBase<TID>[]> {
    return this.repository.getRecipientListsByUser(requesterId);
  }

  /**
   * Pre-position decryption keys for a binding's files and recipients.
   *
   * For each file × recipient combination:
   * - Platform users (with `platformUserId`): wraps the symmetric key under
   *   their ECIES public key so they can decrypt without the custodian.
   * - External recipients: creates an ephemeral share link with a
   *   passphrase-protected URL.
   *
   * After calling this, use `updateBinding` to store the returned
   * `keyWrappingEntryIds` on the binding's `prePositionedKeyWrappingEntryIds`.
   */
  async prepareBindingKeys(
    bindingId: TID,
    requesterId: TID,
  ): Promise<IPrepareBindingKeysResult<TID>> {
    const binding = await this.repository.getBinding(bindingId);
    if (!binding) {
      throw new CanaryBindingNotFoundError(String(bindingId));
    }

    if (!binding.recipientListId) {
      return { keyWrappingEntryIds: [], ephemeralShares: [] };
    }

    const recipientList = await this.repository.getRecipientList(
      binding.recipientListId,
    );
    if (!recipientList) {
      return { keyWrappingEntryIds: [], ephemeralShares: [] };
    }

    if (
      !this.deps.readVaultSymmetricKey ||
      !this.deps.wrapKeyForMember ||
      !this.deps.wrapKeyForEphemeralShare ||
      !this.deps.buildShareUrl
    ) {
      throw new Error(
        'Key wrapping dependencies are not configured. ' +
          'readVaultSymmetricKey, wrapKeyForMember, wrapKeyForEphemeralShare, ' +
          'and buildShareUrl must all be provided to use prepareBindingKeys.',
      );
    }

    const allFileIds = await this.resolveAffectedFiles(binding);
    const keyWrappingEntryIds: TID[] = [];
    const ephemeralShares: IPrepareBindingKeysResult<TID>['ephemeralShares'] =
      [];

    for (const fileId of allFileIds) {
      const { symmetricKey, currentVersionId } =
        await this.deps.readVaultSymmetricKey(fileId);

      for (const recipient of recipientList.recipients) {
        if (recipient.platformUserId) {
          // Platform user — wrap key under their ECIES public key
          const parsedUserId = recipient.platformUserId as unknown as TID;
          const entry = await this.deps.wrapKeyForMember(
            currentVersionId,
            symmetricKey,
            parsedUserId,
            requesterId,
          );
          keyWrappingEntryIds.push(entry.id);
        } else {
          // External recipient — create ephemeral share
          const shareLinkId = this.generateId();
          const { entry, ephemeralPrivateKey } =
            await this.deps.wrapKeyForEphemeralShare(
              currentVersionId,
              symmetricKey,
              shareLinkId,
              requesterId,
            );
          keyWrappingEntryIds.push(entry.id);

          const { shareUrl, passphrase } = await this.deps.buildShareUrl(
            fileId,
            shareLinkId,
            ephemeralPrivateKey,
          );

          ephemeralShares.push({
            fileId,
            recipientEmail: recipient.email,
            shareUrl,
            passphrase,
          });
        }
      }
    }

    // Auto-update the binding with the new key wrapping entry IDs
    await this.updateBinding(
      bindingId,
      { prePositionedKeyWrappingEntryIds: keyWrappingEntryIds },
      requesterId,
    );

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.ShareCreated,
        actorId: requesterId,
        targetId: bindingId,
        targetType: 'file',
        metadata: {
          operation: 'prepareBindingKeys',
          keyWrappingEntriesCreated: keyWrappingEntryIds.length,
          ephemeralSharesCreated: ephemeralShares.length,
          filesProcessed: allFileIds.length,
          recipientsProcessed: recipientList.recipients.length,
        },
      });
    }

    return { keyWrappingEntryIds, ephemeralShares };
  }
}
