import { Context } from 'telegraf';
import { ExtraPoll } from 'telegraf/typings/telegram-types';

export enum PollType {
  VOTE_BAN = 'VOTE_BAN',
}

export enum PollAnswer {
  YES = 'Да',
  NO = 'Нет',
}

export interface BasePoll {
  title: string;
  options: { 0: string; 1: string } & Array<string>;
  pollId: number;
  chatId: number;
  extra: ExtraPoll;
  pollType: PollType;
  messageId: number;
}

export interface JailPoll extends BasePoll {
  minVoteCount: number;
  userId: number;
  date?: Date;
}

export interface VoteHandler<T extends BasePoll> {
  (ctx: Context, poll: T): Promise<void>;
}
