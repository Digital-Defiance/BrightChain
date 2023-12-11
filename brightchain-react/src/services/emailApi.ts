/**
 * Re-export EmailApiClient from @brightchain/brightmail-react-components.
 *
 * This file exists for backward compatibility. All email API logic now
 * lives in the brightmail-react-components library.
 */
export {
  createEmailApiClient,
  handleApiCall,
  type EmailApiClient,
  type ForwardParams,
  type InboxQueryParams,
  type MailboxInput,
  type ReplyParams,
  type SendEmailParams,
} from '@brightchain/brightmail-react-components';

export { useEmailApi } from '@brightchain/brightmail-react-components';
