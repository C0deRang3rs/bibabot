export interface StickerSet {
  ownerId: number;
  names: string[];
}

export enum NameColor {
  RED = '#fb6169',
  LIGHT_RED = '#f0948a',
  GREEN = '#8ad48d',
  LIGHT_GREEN = '#75d2c0',
  YELLOW = '#f3bc5c',
  PURPLE = '#795acd',
  PINK = '#ff6699',
  ORANGE = '#eb8031',
  LIGHT_BLUE = '#51a6f8',
}

export const MAX_TEXT_LENGTH = 1000;
export const STATUS_CREATOR = 'creator';
