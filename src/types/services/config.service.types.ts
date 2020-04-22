export type Config = Record<ConfigProperty, boolean>;

export enum ConfigProperty {
  MEME_STAT = 'meme_stat'
}

export enum ConfigAction {
  TURN_ON = 'turn_on',
  TURN_OFF = 'turn_off',
}

export const DEFAULT_CONFIG: Config = {
  meme_stat: false,
};
