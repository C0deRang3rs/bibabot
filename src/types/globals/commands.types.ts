import { BibacoinAction } from '../services/bibacoin.service.types';
import { ConfigAction } from '../services/config.service.types';
import { MemeAction } from '../services/meme.service.types';
import { ShopAction } from '../services/shop.service.types';

export enum ChangeTitleCommandType {
  RENAME = 'rename',
}

export enum BibaCommand {
  BIBA = 'biba',
  UNRANKED_BIBA = 'unbiba',
  BIBA_TABLE = 'biba_table',
  SELL_BIBA = 'sell_biba',
  BUY_BIBA = 'buy_biba',
}

export enum BibaDebugCommand {
  REMOVE_BIBA = 'remove_biba',
  SET_BIBA = 'set_biba',
  TRIGGER_DAILY = 'trigger_daily',
}

export enum BibacoinCommand {
  INCOME_LIST = 'income_list',
  GIVE = 'give',
}

export enum BibacoinDebugCommand {
  SET_BALANCE = 'set_balance',
}

export enum TrashCommand {
  FLIP = 'flip',
  ROLL = 'roll',
  FLIP_STAT = 'flip_stat',
}

export enum ShopCommand {
  SHOP = 'shop',
}

export enum ConfigCommand {
  CONFIG = 'config',
}

export enum StickerCommand {
  REMOVE_STICKER = 'remove_sticker',
  STICKERS = 'stickers',
}

export enum JailCommand {
  VOTEBAN = 'voteban',
  MIN_VOTE_COUNT = 'min_vote_count',
}

export enum LabelCommand {
  BUY_LABEL = 'buy_label',
}

export enum HelpCommand {
  HELP = 'help',
}

export enum CommandCategory {
  SHOP = 'Магазин 🛒',
  BIBA = 'Биба 🍆',
  TRASH = 'Разное',
  OTHER = 'Другое',
  STICKERS = 'Стикеры 🙂',
  JAIL = 'Тюрьма 🚨',
  COIN = 'Бибакоины 💰',
}

export const SortedCommandCategories = [
  CommandCategory.BIBA,
  CommandCategory.COIN,
  CommandCategory.SHOP,
  CommandCategory.STICKERS,
  CommandCategory.JAIL,
  CommandCategory.TRASH,
  CommandCategory.OTHER,
];

export interface CommandInfo {
  category: CommandCategory;
  description: string;
}

export type CategorizedCommands = {
  [K in CommandCategory]: CommandInfo[];
};

export type BotCommand =
  ChangeTitleCommandType
  | BibaCommand
  | BibacoinCommand
  | BibacoinDebugCommand
  | BibaDebugCommand
  | TrashCommand
  | ShopCommand
  | ConfigCommand
  | StickerCommand
  | JailCommand
  | LabelCommand
  | HelpCommand;

export type BotAction =
  BibacoinAction
  | MemeAction
  | ConfigAction
  | ShopAction;
