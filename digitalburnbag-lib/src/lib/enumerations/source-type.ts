/**
 * @enum SourceType
 * @description An activity that caused a canary chirp
 */
export enum SourceType {
  /**
   * User logged in to CanaryProtocol.io/DigitalBurnbag.com
   */
  BirdBagLogin = 'birdbag-login',
  /**
   * User attempted to log in to CanaryProtocol.io/DigitalBurnbag.com with a duress signal
   */
  BirdBagDuress = 'birdbag-duress',
  /**
   * User failed to log in to CanaryProtocol.io/DigitalBurnbag.com within timeframe
   */
  BirdBagLoginAbsence = 'birdbag-login-absence',
  /**
   * User manually triggered a canary chirp on CanaryProtocol.io/DigitalBurnbag.com
   */
  BirdBagManual = 'birdbag-manual',
  /**
   * Email received on CanaryProtocol.io/DigitalBurnbag.com canary-{canaryId}@{canaryprotocol.io/digitalburnbag.com}
   */
  BirdBagEmailReceived = 'birdbag-email-received',
  /**
   * A URL was checked and found to be online
   */
  BirdBagUrlOnline = 'birdbag-url-online',
  /**
   * A URL was checked and found to be offline
   */
  BirdBagUrlOffline = 'birdbag-url-offline',
  /**
   * Webhook succeeded from CanaryProtocol.io/DigitalBurnbag.com
   */
  BirdBagWebHook = 'birdbag-webhook',
  /**
   * Webhook failed from CanaryProtocol.io/DigitalBurnbag.com
   */
  BirdBagWebHookFailure = 'birdbag-webhook-failure',
  /**
   * User took steps on Fitbit
   */
  FitbitSteps = 'fitbit-steps',
  /**
   * User's heart rate was recorded on Fitbit
   */
  FitbitHeartRate = 'fitbit-heart-rate',
}

export type SourceTypesType =
  | 'birdbag-login'
  | 'birdbag-duress'
  | 'birdbag-login-absence'
  | 'birdbag-manual'
  | 'birdbag-email-received'
  | 'birdbag-url-online'
  | 'birdbag-url-offline'
  | 'birdbag-webhook'
  | 'birdbag-webhook-failure'
  | 'fitbit-steps'
  | 'fitbit-heart-rate';
