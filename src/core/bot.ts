import Telegraf, { ContextMessageUpdate } from 'telegraf';
import { MessageSubTypes } from 'telegraf/typings/telegram-types';
import { TelegrafFull, BotListener, BotEvent } from '../types/core/bot.types';
import getUsernameFromContext from '../utils/global.helper';

export default class Bot {
  private static instance: Bot;
  public app!: TelegrafFull;
  private listeners: Array<BotListener> = [];

  private constructor() {
    this.initMain();
    this.initHandlers();
    this.startPooling();
  }

  public static getInstance(): Bot {
    if (!Bot.instance) {
      Bot.instance = new Bot();
    }

    return Bot.instance;
  }

  public static handleError(err: Error): void {
    console.error(err);
  }

  private static logger(ctx: ContextMessageUpdate, next: Function, commandName: string): Function {
    const chat = ctx.chat!;
    const username = getUsernameFromContext(ctx);
    const message = (ctx.message && ctx.message!.text) || ctx.match;

    if (commandName !== BotEvent.MESSAGE) {
      console.log(`[${chat.id}] ${chat.title} from user ${username} - ${message}`);
    }

    return next();
  }

  public addListeners(list: Array<BotListener>): void {
    this.listeners = [...this.listeners, ...list];
  }

  public applyListeners(): void {
    this.listeners.forEach((listener) => this.app[listener.type](
      listener.name as MessageSubTypes,
      (ctx, next) => Bot.logger(ctx, next as Function, listener.name),
      listener.callback,
    ));
  }

  private initMain(): void {
    this.app = new Telegraf(process.env.BOT_TOKEN as string) as TelegrafFull;
  }

  private async startPooling(): Promise<void> {
    await this.app.launch();
    console.log('Bot is up');
  }

  private initHandlers(): void {
    this.app.catch((err: Error) => Bot.handleError(err));
  }
}
