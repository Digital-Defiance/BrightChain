import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { GroupParticipantRole } from '../enumerations/group-participant-role';

export type GroupParticipantRoleLanguageTranslation =
  EnumLanguageTranslation<GroupParticipantRole>;

export const GroupParticipantRoleTranslations: GroupParticipantRoleLanguageTranslation =
  i18nEngine.registerEnum(
    GroupParticipantRole,
    {
      [LanguageCodes.DE]: {
        [GroupParticipantRole.Admin]: 'Administrator',
        [GroupParticipantRole.Participant]: 'Teilnehmer',
      },
      [LanguageCodes.EN_GB]: {
        [GroupParticipantRole.Admin]: 'Admin',
        [GroupParticipantRole.Participant]: 'Participant',
      },
      [LanguageCodes.EN_US]: {
        [GroupParticipantRole.Admin]: 'Admin',
        [GroupParticipantRole.Participant]: 'Participant',
      },
      [LanguageCodes.ES]: {
        [GroupParticipantRole.Admin]: 'Administrador',
        [GroupParticipantRole.Participant]: 'Participante',
      },
      [LanguageCodes.FR]: {
        [GroupParticipantRole.Admin]: 'Administrateur',
        [GroupParticipantRole.Participant]: 'Participant',
      },
      [LanguageCodes.JA]: {
        [GroupParticipantRole.Admin]: '管理者',
        [GroupParticipantRole.Participant]: '参加者',
      },
      [LanguageCodes.UK]: {
        [GroupParticipantRole.Admin]: 'Адміністратор',
        [GroupParticipantRole.Participant]: 'Учасник',
      },
      [LanguageCodes.ZH_CN]: {
        [GroupParticipantRole.Admin]: '管理员',
        [GroupParticipantRole.Participant]: '参与者',
      },
    },
    'GroupParticipantRole',
  );
