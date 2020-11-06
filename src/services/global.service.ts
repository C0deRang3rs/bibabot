import { TelegrafContext } from 'telegraf/typings/context';
import { Message } from 'telegraf/typings/telegram-types';
import { BotEvent } from '../types/core/bot.types';
import BibacoinService from './bibacoin.service';
import TrashService from './trash.service';
import ChatRepository from '../repositories/chat.repo';
import BaseService from './base.service';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import DeleteResponseMessage from '../decorators/delete.response.message.decorator';
import Bot from '../core/bot';
import MemeService from './meme.service';
import TimerRepository from '../repositories/timer.repo';
import StickerService from './sticker.service';

export default class GlobalService extends BaseService {
  private static instance: GlobalService;

  private constructor(
    private readonly chatRepo: ChatRepository,
    private readonly timerRepo: TimerRepository,
  ) {
    super();
  }

  public static getInstance(): GlobalService {
    if (!GlobalService.instance) {
      GlobalService.instance = new GlobalService(
        new ChatRepository(),
        new TimerRepository(),
      );
    }

    return GlobalService.instance;
  }

  @DeleteRequestMessage()
  @DeleteResponseMessage(10000)
  private async onStart(ctx: TelegrafContext): Promise<Message> {
    const chatId = ctx.chat!.id;
    const chat = await this.chatRepo.getChat(chatId);
    const isTimerActive = await this.timerRepo.getTimerByChatId(chatId);

    if (chat || isTimerActive) {
      return ctx.reply('Этот чат уже активирован');
    }

    await this.timerRepo.setTimerByChatId(chatId, new Date());
    await this.chatRepo.addChat(ctx.chat!.id);
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
  }

  protected initListeners(): void {
    this.bot.app.start(
      Bot.logger,
      (ctx: TelegrafContext) => this.onStart(ctx),
    );
  }
}
