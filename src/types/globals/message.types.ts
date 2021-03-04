import { ExtraEditMessageText } from 'telegraf/typings/telegram-types';

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
  HELP = 'help',
}

export interface UpdateMessageResponse {
  text: string;
  extra?: ExtraEditMessageText;
}
