import { Context } from 'telegraf';
import { Message } from 'telegraf/typings/core/types/typegram';
import { BotEvent, BotListener } from '../types/core/bot.types';
import BibacoinService from './bibacoin.service';
import TrashService from './trash.service';
import BaseService from './base.service';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import DeleteResponseMessage from '../decorators/delete.response.message.decorator';
import Bot from '../core/bot';
import MemeService from './meme.service';
import TimerRepository from '../repositories/timer.repo';
import StickerService from './sticker.service';
import ChatService from './chat.service';
import PollService from './poll.service';

export default class GlobalService extends BaseService {
  private static instance: GlobalService;

  private constructor(
    private readonly chatService: ChatService,
    private readonly timerRepo: TimerRepository,
  ) {
    super();
  }

  public static getInstance(): GlobalService {
    if (!GlobalService.instance) {
      GlobalService.instance = new GlobalService(
        ChatService.getInstance(),
        new TimerRepository(),
      );
    }

    return GlobalService.instance;
  }

  @DeleteRequestMessage()
  @DeleteResponseMessage(10000)
  private async onStart(ctx: Context): Promise<Message> {
    const chatId = ctx.chat!.id;
    const chat = await this.chatService.getChat(chatId);
    const isTimerActive = await this.timerRepo.getTimerByChatId(chatId);

    if (chat || isTimerActive) {
      return ctx.reply('Этот чат уже активирован');
    }

    await this.timerRepo.setTimerByChatId(chatId, new Date());
    await this.chatService.addChat(chatId);
    return ctx.reply('Вечер в хату');
  }

  public initMessageHandler(): void {
    this.bot.app.on(
      BotEvent.MESSAGE,
      async (ctx, next) => BibacoinService.getInstance().addMessageCoins(ctx, next),
      async (ctx, next) => TrashService.trashHandler(ctx, next),
      async (ctx, next) => MemeService.getInstance().handleMeme(ctx, next),
      async (ctx, next) => StickerService.getInstance().handleStickerCreation(ctx, next),
    );

    this.bot.app.on(
      BotEvent.POLL,
      async (ctx, next) => PollService.getInstance().handlePollVote(ctx, next),
    );
  }

  protected initListeners(): BotListener[] {
    this.bot.app.start(
      Bot.logger,
      (ctx: Context) => this.onStart(ctx),
    );

    return [];
  }
}
