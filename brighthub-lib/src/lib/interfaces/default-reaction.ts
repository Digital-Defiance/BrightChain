import { IconName } from '@fortawesome/fontawesome-common-types';
import { DefaultReactionsTypeEnum } from '../enumerations/default-reactions-type';

export interface IDefaultReaction {
  reaction: DefaultReactionsTypeEnum;
  icon: IconName;
  emoji: string;
}
