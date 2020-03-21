import { ContextMessageUpdate } from 'telegraf';
import { Message } from 'telegraf/typings/telegram-types';
import { BotEvent, BotCommandType } from '../types/core/bot.types';
import BibacoinService from './bibacoin.service';
import TrashService from './trash.service';
import { GlobalCommand } from '../types/globals/commands.types';
import ChatRepository from '../repositories/chat.repo';
import BaseService from './base.service';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import DeleteResponseMessage from '../decorators/delete.response.message.decorator';

export default class GlobalService extends BaseService {
  private static instance: GlobalService;

  private constructor(
    private readonly chatRepo: ChatRepository,
  ) {
    super();
  }

  public static getInstance(): GlobalService {
    if (!GlobalService.instance) {
      GlobalService.instance = new GlobalService(
        new ChatRepository(),
      );
    }

    return GlobalService.instance;
  }

  public initMessageHandler(): void {
    this.bot.app.on(
      BotEvent.MESSAGE,
      BibacoinService.getInstance().addMessageCoins,
      TrashService.trashHandler,
    );
  }

  protected initListeners(): void {
    this.bot.addListeners([
      {
        type: BotCommandType.COMMAND,
        name: GlobalCommand.START,
        callback: (ctx): Promise<Message> => this.onStart(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: GlobalCommand.STOP,
        callback: (ctx): Promise<Message> => this.onStop(ctx),
      },
    ]);
  }

  @DeleteRequestMessage()
  @DeleteResponseMessage(10000)
  private async onStart(ctx: ContextMessageUpdate): Promise<Message> {
    const chatId = ctx.chat!.id;
    const chat = await this.chatRepo.getChat(chatId);

    if (chat) {
      return ctx.reply('Этот чат уже активирован');
    }

    await this.chatRepo.addChat(ctx.chat!.id);
    return ctx.reply('Вечер в хату');
  }

  @DeleteRequestMessage()
  @DeleteResponseMessage(10000)
  private async onStop(ctx: ContextMessageUpdate): Promise<Message> {
    const chatId = ctx.chat!.id;
    const chat = await this.chatRepo.getChat(chatId);

    if (!chat) {
      return ctx.reply('Это чат для меня не активирован');
    }

    await this.chatRepo.removeChat(chatId);
    return ctx.reply('Мама, я не хочу умирать');
  }
}
