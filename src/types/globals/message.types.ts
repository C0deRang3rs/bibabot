import { ExtraEditMessage } from 'telegraf/typings/telegram-types';

export enum MessageContent {
  PHOTO = 'PHOTO',
}

export enum BotMessage {
  BIBA_TABLE = 'biba_table',
  STICKER_LIST = 'sticker_list',
  INCOME = 'income',
  CONFIG = 'config',
  SHOP = 'shop',
  FLIP_STAT = 'flip_stat',
}

export interface UpdateMessageResponse {
  text: string;
  extra?: ExtraEditMessage;
}
