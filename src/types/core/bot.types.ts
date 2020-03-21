import { MessageSubTypes } from 'telegraf/typings/telegram-types';
import Telegraf, { ContextMessageUpdate, Telegram } from 'telegraf';

export enum BotEvent {
  MESSAGE = 'message'
}

export enum BotCommandType {
  ON = 'on',
  COMMAND = 'command',
  ACTION = 'action'
}

export interface BotListener {
  type: BotCommandType;
  name: MessageSubTypes | string;
  callback(ctx: ContextMessageUpdate): Promise<void | object>;
}

export interface TelegramFull extends Telegram {
  setChatTitle(id: number, name: string): Promise<void>;
}

export interface TelegrafFull extends Telegraf<ContextMessageUpdate> {
  telegram: TelegramFull;
}
