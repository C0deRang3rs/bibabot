import { ContextMessageUpdate } from 'telegraf';
import { BotEvent, BotCommandType } from '../types/core/bot.types';
import Bot from '../core/bot';
import BibacoinService from './bibacoin.service';
import TrashService from './trash.service';
import { GlobalCommand } from '../types/globals/commands.types';
import ChatRepository from '../repositories/chat.repo';

export default class GlobalService {
  private static instance: GlobalService;

  private constructor(
    private readonly bot: Bot,
    private readonly chatRepo: ChatRepository,
  ) {
    this.initListeners();
  }

  public static getInstance(): GlobalService {
    if (!GlobalService.instance) {
      GlobalService.instance = new GlobalService(
        Bot.getInstance(),
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

  private initListeners(): void {
    this.bot.addListeners([
      {
        type: BotCommandType.COMMAND,
        name: GlobalCommand.START,
        callback: (ctx): Promise<void> => this.onStart(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: GlobalCommand.STOP,
        callback: (ctx): Promise<void> => this.onStop(ctx),
      },
    ]);
  }

  private async onStart(ctx: ContextMessageUpdate): Promise<void> {
    const chatId = ctx.chat!.id;
    const chat = await this.chatRepo.getChat(chatId);

    if (chat) {
      await ctx.reply('Этот чат уже активирован');
      return;
    }

    await this.chatRepo.addChat(ctx.chat!.id);
    await ctx.reply('Вечер в хату');
  }

  private async onStop(ctx: ContextMessageUpdate): Promise<void> {
    const chatId = ctx.chat!.id;
    const chat = await this.chatRepo.getChat(chatId);

    if (!chat) {
      await ctx.reply('Это чат для меня не активирован');
      return;
    }

    await this.chatRepo.removeChat(chatId);
    await ctx.reply('Мама, я не хочу умирать');
  }
}
