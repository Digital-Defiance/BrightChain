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
  type MailboxInput,
  type SendEmailParams,
  type InboxQueryParams,
  type ReplyParams,
  type ForwardParams,
} from '@brightchain/brightmail-react-components';

export { useEmailApi } from '@brightchain/brightmail-react-components';
