export type Config = Record<ConfigProperty, boolean>;

export enum ConfigProperty {
  MEME_STAT = 'MEME_STAT',
  RENAME = 'RENAME',
  DAILY = 'DAILY',
  TRASH_REPLY = 'TRASH_REPLY',
  JAIL = 'JAIL',
}

export enum IndividualConfigProperty {
  JAIL_MIN_VOTE_COUNT = 'jailMinVoteCount',
}

export enum ConfigAction {
  TURN_ON = 'TURN_ON',
  TURN_OFF = 'TURN_OFF',
}

export const DEFAULT_CONFIG: Config = {
  MEME_STAT: false,
  RENAME: false,
  DAILY: true,
  TRASH_REPLY: true,
  JAIL: true,
};

export enum ConfigPropertyDescription {
  MEME_STAT = 'Оценка мемов',
  RENAME = 'Автопереименование конфы',
  DAILY = 'Ежедневная биба',
  TRASH_REPLY = 'Интересные конкурсы',
  JAIL = 'Бан пользователей',
}

// eslint-disable-next-line max-len
export const getPropertyDescription = (property: ConfigProperty): ConfigPropertyDescription => ConfigPropertyDescription[property] || 'Описания пока нет';

