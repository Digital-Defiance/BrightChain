/**
 * @fileoverview TOTP 2FA components for BrightChain.
 *
 * Re-exports the TOTP setup and verification form components from the
 * upstream express-suite-react-components package so BrightChain consumers
 * can import them from @brightchain/brightchain-react-components without
 * depending on the upstream package directly.
 *
 * @module identity/TotpComponents
 */

export {
  TotpSetupForm,
  TotpVerificationForm,
} from '@digitaldefiance/express-suite-react-components';

export type {
  TotpSetupFormProps,
  TotpSetupFormValues,
  TotpVerificationFormProps,
  TotpVerificationFormValues,
} from '@digitaldefiance/express-suite-react-components';
