/**
 * Barrel export for all App subsystem plugins.
 *
 * Each plugin implements IAppSubsystemPlugin and encapsulates the
 * initialization and teardown logic for a distinct subsystem.
 */
export { BrightChatSubsystemPlugin } from './brightChatSubsystemPlugin';
export { BrightHubSubsystemPlugin } from './brightHubSubsystemPlugin';
export { BrightPassSubsystemPlugin } from './brightPassSubsystemPlugin';
export { BrightTrustSubsystemPlugin } from './brightTrustSubsystemPlugin';
export { BrightNexusSubsystemPlugin } from './brightNexusSubsystemPlugin';
export { BurnbagSubsystemPlugin } from './burnbagSubsystemPlugin';
export { EmailGatewaySubsystemPlugin } from './emailGatewaySubsystemPlugin';
export { EmailSubsystemPlugin } from './emailSubsystemPlugin';
