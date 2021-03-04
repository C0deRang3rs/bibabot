import { Telegraf } from 'telegraf';
import { Context } from 'telegraf/typings/context';
import { MessageSubType } from 'telegraf/typings/telegram-types';
import { BotListener, BotEvent } from '../types/core/bot.types';
import { CommandCategory, CommandInfo } from '../types/globals/commands.types';
import { getUsernameFromContext } from '../utils/data.utils';

export default class Bot {
  private static instance: Bot;

  public descMap = new Map<string, CommandInfo>();

  public app!: Telegraf;

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

  public static handleError(err: unknown): void {
    console.error(err);
  }

  public static logger(ctx: Context, next: Function, commandName?: string): void {
    if (!ctx.chat) {
      return;
    }

    const { chat } = ctx;
    const username = getUsernameFromContext(ctx);
    const messageText = ctx.message && 'text' in ctx.message
      ? ctx.message.text
      : 'callback_query' in ctx.update
        ? 'data' in ctx.update.callback_query
          ? ctx.update.callback_query.data
          : '' : '';

    if (commandName !== BotEvent.MESSAGE) {
      console.log(`[${chat.id}] ${'title' in chat ? chat.title : 'Personal message'} from user ${username} - ${messageText}`);
    }

    next!();
  }

  public addListeners(list: Array<BotListener>): void {
    this.listeners = [...this.listeners, ...list];
  }

  public applyListeners(): void {
    this.listeners.forEach((listener) => {
      if (listener.description) {
        this.descMap.set(listener.name, {
          description: listener.description,
          category: listener.category || CommandCategory.OTHER,
        });
      }

      this.app[listener.type](
        listener.name as MessageSubType,
        (ctx: Context, next: Function) => Bot.logger(ctx, next, listener.name),
        listener.callback,
      );
    });
  }

  private initMain(): void {
    this.app = new Telegraf(process.env.BOT_TOKEN as string);
  }

  private async startPooling(): Promise<void> {
    await this.app.launch();
    console.log('Bot is up');
  }

  private initHandlers(): void {
    this.app.catch(Bot.handleError);
  }
}
