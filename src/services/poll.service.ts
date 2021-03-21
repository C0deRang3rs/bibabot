import { Context } from 'telegraf/typings/context';
import { Message } from 'telegraf/typings/core/types/typegram';
import PollRepository from '../repositories/poll.repo';
import { BotListener } from '../types/core/bot.types';
import {
  BasePoll, PollType, VoteHandler,
} from '../types/services/poll.service.types';
import BaseService from './base.service';

export default class PollService extends BaseService {
  private static instance: PollService;

  private handlersMap: Map<PollType, VoteHandler<BasePoll>> = new Map();

  private constructor(
    private readonly pollRepo: PollRepository,
  ) {
    super();
  }

  public static getInstance(): PollService {
    if (!PollService.instance) {
      PollService.instance = new PollService(
        new PollRepository(),
      );
    }

    return PollService.instance;
  }

  public async createPoll<T extends BasePoll>(
    data: T,
  ): Promise<Message.PollMessage> {
    const result = await this.bot.app.telegram.sendPoll(data.chatId, data.title, data.options, data.extra);
    await this.pollRepo.addPoll<T>(data.chatId, { ...data, pollId: parseInt(result.poll.id, 10), messageId: result.message_id });

    return result;
  }

  public async getPoll<T extends BasePoll>(chatId: number, pollId: number): Promise<void> {
    await this.pollRepo.getPoll<T>(chatId, pollId);
  }

  public async getPollById<T extends BasePoll>(pollId: number): Promise<T | null> {
    return this.pollRepo.getPollById<T>(pollId);
  }

  public async updatePoll<T extends BasePoll>(pollId: number, chatId: number, data: T): Promise<void> {
    await this.pollRepo.updatePollInfo<T>(pollId, chatId, data);
  }

  public async removePoll(pollId: number, chatId: number): Promise<void> {
    await this.pollRepo.removePoll(pollId, chatId);
  }

  public async handlePollVote(ctx: Context, next: Function | undefined): Promise<void> {
    const pollId = parseInt(ctx.poll!.id, 10);
    const poll = await this.getPollById(pollId);

    if (!poll) {
      next!();
      return;
    }

    const { pollType } = poll;

    const handler = this.handlersMap.get(pollType);

    if (!handler) throw new Error(`No handler for poll type ${pollType}`);

    await handler(ctx, poll);

    next!();
  }

  public async stopPoll(pollId: number, chatId: number, messageId: number): Promise<void> {
    await this.removePoll(pollId, chatId);
    await this.bot.app.telegram.stopPoll(chatId, messageId, {});
  }

  public setHandler<T extends BasePoll>(pollType: PollType, handler: VoteHandler<T>): void {
    this.handlersMap.set(pollType, handler as VoteHandler<BasePoll>);
  }

  // eslint-disable-next-line class-methods-use-this
  protected initListeners(): BotListener[] {
    return [];
  }
}
