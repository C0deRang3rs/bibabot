import { Context } from 'telegraf';
import { MessageSubType } from 'telegraf/typings/telegram-types';
import { BotAction, BotCommand, CommandCategory } from '../globals/commands.types';

export enum BotEvent {
  MESSAGE = 'message',
  POLL = 'poll',
}

export enum BotCommandType {
  ON = 'on',
  COMMAND = 'command',
  ACTION = 'action',
}

export interface BotListener {
  type: BotCommandType;
  name: MessageSubType | BotCommand | BotAction;
  description?: string;
  category?: CommandCategory;
  callback(ctx: Context): Promise<void | object>;
}

export enum TelegramError {
  STICKERS_TOO_MUCH = 'Bad Request: STICKERS_TOO_MUCH',
  STICKERSET_INVALID = 'Bad Request: STICKERSET_INVALID',
  USER_IS_BOT = 'Bad Request: USER_IS_BOT',
  PEER_ID_INVALID = 'Bad Request: PEER_ID_INVALID',
  CANT_REMOVE_CHAT_OWNER = 'Bad Request: can\'t remove chat owner',
  CHAT_ADMIN_REQUIRED = 'Bad Request: CHAT_ADMIN_REQUIRED',
}

export enum CommandType {
  USER_MENTION = 'USER_MENTION',
  NUMBER = 'NUMBER',
  ANY_CHARS = 'ANY_CHARS',
  COMMAND = 'COMMAND',
  RANGE = 'RANGE',
}

export type CommandArguments = { 0: CommandType.COMMAND } & Array<CommandType>;

export enum CommandRegex {
  NUMBER = '^[0-9]+',
  ANY_CHARS = '.+',
  USER_MENTION = '^\\@[\\d\\w]+',
  RANGE = '^\\d+-\\d+$',
  COMMAND = '',
}

export enum CommandExample {
  USER_MENTION = '@user_mention',
  NUMBER = '123',
  STRING = 'строка',
  ANY_CHARS = 'текст',
  RANGE = 'min-max',
  COMMAND = '/command',
}

export const getRegexByCommandType = (type: CommandType): string => CommandRegex[type];
export const getExampleByCommandType = (type: CommandType, command?: string): string => {
  if (type === CommandType.COMMAND) return command || CommandExample.COMMAND;

  const isOptional = type.includes('?');
  const trueType = type.replace('?', '') as CommandType;

  return isOptional ? `[${CommandExample[trueType]}]` : CommandExample[trueType];
};
