import { IMessageMetadata } from '@brightchain/brightchain-lib';

export interface IApiMessageMetadata extends IMessageMetadata {
    [key: string]: any;
}
