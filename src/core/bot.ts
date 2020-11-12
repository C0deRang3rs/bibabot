import Telegraf from 'telegraf';
import { TelegrafContext } from 'telegraf/typings/context';
import { MessageSubTypes } from 'telegraf/typings/telegram-types';
import { BotListener, BotEvent, TelegrafFull } from '../types/core/bot.types';
import { getUsernameFromContext } from '../utils/data.utils';

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

  public static logger(ctx: TelegrafContext, next?: Function, commandName?: string): void {
    const chat = ctx.chat!;

    const username = getUsernameFromContext(ctx);
    const message = (ctx.message && ctx.message!.text) || ctx.match;

    if (commandName !== BotEvent.MESSAGE) {
      console.log(`[${chat.id}] ${chat.title || 'Personal message'} from user ${username} - ${message}`);
    }

    next!();
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
    this.app = new Telegraf(process.env.BOT_TOKEN as string) as unknown as TelegrafFull;
  }

  private async startPooling(): Promise<void> {
    await this.app.launch();
    console.log('Bot is up');
  }

  private initHandlers(): void {
    this.app.catch(Bot.handleError);
  }
}
