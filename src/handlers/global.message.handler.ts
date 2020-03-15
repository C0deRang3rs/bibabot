import BibacoinService from '../services/bibacoin.service';
import TrashService from '../services/trash.service';
import { BotEvent } from '../types/core/bot.types';
import Bot from '../core/bot';

export default class GlobalMessageHandler {
  private static instance: GlobalMessageHandler;

  private constructor(
    private readonly bot: Bot,
  ) {
    this.initListeners();
  }

  public static getInstance(): GlobalMessageHandler {
    if (!GlobalMessageHandler.instance) GlobalMessageHandler.instance = new GlobalMessageHandler(Bot.getInstance());

    return GlobalMessageHandler.instance;
  }

  public initListeners(): void {
    this.bot.app.on(
      BotEvent.MESSAGE,
      BibacoinService.getInstance().addMessageCoins,
      TrashService.trashHandler,
    );
  }
}
