import { ContextMessageUpdate } from 'telegraf';
import {
  ZERO_BALANCE,
} from '../types/services/bibacoin.service.types';
import { BibacoinCommand } from '../types/globals/commands.types';
import {
  getPriceByMessage,
  getActivitiesList,
  getActivityContext,
} from '../utils/shop.helper';
import Bot from '../core/bot';
import { BotListener, BotCommandType } from '../types/core/bot.types';
import BibacoinRepository from '../repositories/bibacoin.repo';

export default class BibacoinService {
  private static instance: BibacoinService;

  private constructor(
    private readonly bot: Bot,
    private readonly bibacoinRepo: BibacoinRepository,
  ) {
    this.initListeners();
  }

  public static getInstance(): BibacoinService {
    if (!BibacoinService.instance) {
      BibacoinService.instance = new BibacoinService(
        Bot.getInstance(),
        new BibacoinRepository(),
      );
    }

    return BibacoinService.instance;
  }

  private static async sendIncomeList(ctx: ContextMessageUpdate): Promise<void> {
    const list = getActivitiesList();

    await ctx.reply(list.map((activity) => `${getActivityContext(activity)}`).join('\n'));
  }

  public addMessageCoins = async (ctx: ContextMessageUpdate, next: Function | undefined): Promise<Function> => {
    if (!ctx.message) return next!();

    const chatId = ctx.chat!.id;
    const userId = ctx.message.from!.id;

    const currentBalance = await this.bibacoinRepo.getBibacoinBalanceByIds(chatId, userId);
    const messagePrice = getPriceByMessage(ctx.message);
    const newBalance = currentBalance + messagePrice;

    await this.bibacoinRepo.setBibacoinBalance(chatId, userId, newBalance);

    return next!();
  };

  public async hasEnoughCredits(userId: number, chatId: number, value: number): Promise<boolean> {
    const currentBalance = await this.bibacoinRepo.getBibacoinBalanceByIds(chatId, userId);

    if (currentBalance >= value) {
      return true;
    }

    throw new Error(`Недостаточно бибакоинов. Требуется ${value}, у тебя ${currentBalance}`);
  }

  public async newTransaction(userId: number, chatId: number, value: number): Promise<number> {
    const currentBalance = await this.bibacoinRepo.getBibacoinBalanceByIds(chatId, userId);

    const newBalance = currentBalance - value;
    await this.bibacoinRepo.setBibacoinBalance(chatId, userId, newBalance);

    return newBalance;
  }

  private initListeners(): void {
    const commands: BotListener[] = [
      {
        type: BotCommandType.COMMAND,
        name: BibacoinCommand.BALANCE,
        callback: (ctx): Promise<void> => this.getBalance(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: BibacoinCommand.INCOME_LIST,
        callback: (ctx): Promise<void> => BibacoinService.sendIncomeList(ctx),
      },
    ];

    if (process.env.PRODUCTION === 'false') {
      commands.push(
        { type: BotCommandType.COMMAND, name: BibacoinCommand.SET_BALANCE, callback: (ctx) => this.setBalance(ctx) },
      );
    }

    this.bot.addListeners(commands);
  }

  private async setBalance(ctx: ContextMessageUpdate): Promise<void> {
    const balance = ctx.message!.text!.split(BibacoinCommand.SET_BALANCE)[1].trim();

    if (!balance) {
      await ctx.reply('Укажи сколько надо');
      return;
    }

    await this.bibacoinRepo.setBibacoinBalance(ctx.chat!.id, ctx.message!.from!.id, balance);
    await ctx.reply('Done');
  }

  private async getBalance(ctx: ContextMessageUpdate): Promise<void> {
    const balance = await this.bibacoinRepo.getBibacoinBalanceByIds(ctx.chat!.id, ctx.message!.from!.id);
    const message = balance ? `У тебя на счету ${balance} бибакоинов` : ZERO_BALANCE;
    await ctx.reply(message);
  }
}
