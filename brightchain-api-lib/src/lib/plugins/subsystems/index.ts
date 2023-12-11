/**
 * Barrel export for all App subsystem plugins.
 *
 * Each plugin implements IAppSubsystemPlugin and encapsulates the
 * initialization and teardown logic for a distinct subsystem.
 */
export { EmailSubsystemPlugin } from './emailSubsystemPlugin';
export { BrightHubSubsystemPlugin } from './brightHubSubsystemPlugin';
export { BrightChatSubsystemPlugin } from './brightChatSubsystemPlugin';
export { BrightPassSubsystemPlugin } from './brightPassSubsystemPlugin';
export { BurnbagSubsystemPlugin } from './burnbagSubsystemPlugin';
export { BrightTrustSubsystemPlugin } from './brightTrustSubsystemPlugin';
