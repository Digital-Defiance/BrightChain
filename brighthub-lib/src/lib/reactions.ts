import { IconName } from '@fortawesome/fontawesome-common-types';
import { DefaultReactionsEmoji } from './enumerations/default-reactions-emoji';
import { DefaultReactionsIcons } from './enumerations/default-reactions-icons';
import { DefaultReactionsTypeEnum } from './enumerations/default-reactions-type';
import { IDefaultReactions } from './interfaces/default-reactions';

export const DefaultReactions: IDefaultReactions = {
  Angry: {
    reaction: DefaultReactionsTypeEnum.Angry,
    icon: DefaultReactionsIcons.Angry,
    emoji: DefaultReactionsEmoji.Angry,
  },
  Care: {
    reaction: DefaultReactionsTypeEnum.Care,
    icon: DefaultReactionsIcons.Care,
    emoji: DefaultReactionsEmoji.Care,
  },
  Celebrate: {
    reaction: DefaultReactionsTypeEnum.Celebrate,
    icon: DefaultReactionsIcons.Celebrate,
    emoji: DefaultReactionsEmoji.Celebrate,
  },
  Hug: {
    reaction: DefaultReactionsTypeEnum.Hug,
    icon: DefaultReactionsIcons.Hug,
    emoji: DefaultReactionsEmoji.Hug,
  },
  'Huh?': {
    reaction: DefaultReactionsTypeEnum['Huh?'],
    icon: DefaultReactionsIcons['Huh?'],
    emoji: DefaultReactionsEmoji['Huh?'],
  },
  Laugh: {
    reaction: DefaultReactionsTypeEnum.Laugh,
    icon: DefaultReactionsIcons.Laugh,
    emoji: DefaultReactionsEmoji.Laugh,
  },
  Like: {
    reaction: DefaultReactionsTypeEnum.Like,
    icon: DefaultReactionsIcons.Like,
    emoji: DefaultReactionsEmoji.Like,
  },
  Love: {
    reaction: DefaultReactionsTypeEnum.Love,
    icon: DefaultReactionsIcons.Love,
    emoji: DefaultReactionsEmoji.Love,
  },
  Sad: {
    reaction: DefaultReactionsTypeEnum.Sad,
    icon: DefaultReactionsIcons.Sad,
    emoji: DefaultReactionsEmoji.Sad,
  },
  Wow: {
    reaction: DefaultReactionsTypeEnum.Wow,
    icon: DefaultReactionsIcons.Wow,
    emoji: DefaultReactionsEmoji.Wow,
  },
  Yuck: {
    reaction: DefaultReactionsTypeEnum.Yuck,
    icon: DefaultReactionsIcons.Yuck,
    emoji: DefaultReactionsEmoji.Yuck,
  },
};

export type DefaultReactionsType = keyof typeof DefaultReactions;

export const DefaultReactionsIconMap: Map<DefaultReactionsTypeEnum, IconName> =
  new Map([
    [DefaultReactionsTypeEnum.Angry, DefaultReactionsIcons.Angry],
    [DefaultReactionsTypeEnum.Celebrate, DefaultReactionsIcons.Celebrate],
    [DefaultReactionsTypeEnum.Hug, DefaultReactionsIcons.Hug],
    [DefaultReactionsTypeEnum['Huh?'], DefaultReactionsIcons['Huh?']],
    [DefaultReactionsTypeEnum.Laugh, DefaultReactionsIcons.Laugh],
    [DefaultReactionsTypeEnum.Like, DefaultReactionsIcons.Like],
    [DefaultReactionsTypeEnum.Love, DefaultReactionsIcons.Love],
    [DefaultReactionsTypeEnum.Sad, DefaultReactionsIcons.Sad],
    [DefaultReactionsTypeEnum.Wow, DefaultReactionsIcons.Wow],
  ]);

export const DefaultReactionsEmojiMap: Map<DefaultReactionsTypeEnum, string> =
  new Map([
    [DefaultReactionsTypeEnum.Angry, DefaultReactionsEmoji.Angry],
    [DefaultReactionsTypeEnum.Celebrate, DefaultReactionsEmoji.Celebrate],
    [DefaultReactionsTypeEnum.Hug, DefaultReactionsEmoji.Hug],
    [DefaultReactionsTypeEnum['Huh?'], DefaultReactionsEmoji['Huh?']],
    [DefaultReactionsTypeEnum.Laugh, DefaultReactionsEmoji.Laugh],
    [DefaultReactionsTypeEnum.Like, DefaultReactionsEmoji.Like],
    [DefaultReactionsTypeEnum.Love, DefaultReactionsEmoji.Love],
    [DefaultReactionsTypeEnum.Sad, DefaultReactionsEmoji.Sad],
    [DefaultReactionsTypeEnum.Wow, DefaultReactionsEmoji.Wow],
  ]);

export function findIconByIconName(
  iconName: IconName,
): DefaultReactionsTypeEnum {
  for (const [key, value] of DefaultReactionsIconMap.entries()) {
    if (value === iconName) {
      return key;
    }
  }
  throw new Error(`Unknown icon name: ${iconName}`);
}

export function findEmojiByIconName(iconName: IconName): string {
  for (const [key, value] of DefaultReactionsEmojiMap.entries()) {
    if (value === iconName) {
      return key;
    }
  }
  throw new Error(`Unknown icon name: ${iconName}`);
}
