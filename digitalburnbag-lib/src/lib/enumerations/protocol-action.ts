/**
 * @enum ProtocolAction
 * @description List of actions that can be taken in response to a protocol enaction.
 */
export enum ProtocolAction {
  DeactivateAccount,
  DeleteAccount,
  DeleteFiles,
  DeleteFolders,
  EmailFilesAsAttachments,
  EmailFilesAsLinks,
  SendSMS,
  CallWebhook,
  ReleaseToPublic,
  ReleaseToRestricted,
  ReleaseToPassword,
  ReleaseToSelf,
  RestrictToNone,
  /**
   * Deactivate the current protocol
   */
  DeactivateProtocol,
  /**
   * Enable other protocols
   */
  EnableSecondaryProtocols,
}
