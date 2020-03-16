import { ContextMessageUpdate, Markup } from 'telegraf';
import {
  BibacoinAction,
  BibacoinProduct,
  ZERO_BALANCE,
  NO_BIBA_TO_BUY,
  NO_BIBA_TO_REROLL,
} from '../types/services/bibacoin.service.types';
import { BibacoinCommand } from '../types/globals/commands.types';
import BibaService from './biba.service';
import {
  getPriceByMessage,
  getProductsList,
  getProductPrice,
  getActionByProduct,
  getActivitiesList,
  getProductActionContext,
  getActivityContext,
} from '../utils/shop.helper';
import Bot from '../core/bot';
import { BotListener, BotCommandType } from '../types/core/bot.types';
import BibacoinRepository from '../repositories/bibacoin.repo';
import BibaRepository from '../repositories/biba.repo';

export default class BibacoinService {
  private static instance: BibacoinService;

  private constructor(
    private readonly bot: Bot,
    private readonly bibaService: BibaService,
    private readonly bibacoinRepo: BibacoinRepository,
    private readonly bibaRepo: BibaRepository,
  ) {
    this.initListeners();
  }

  public static getInstance(): BibacoinService {
    if (!BibacoinService.instance) {
      BibacoinService.instance = new BibacoinService(
        Bot.getInstance(),
        BibaService.getInstance(),
        new BibacoinRepository(),
        new BibaRepository(),
      );
    }

    return BibacoinService.instance;
  }

  private static async sendProductsList(ctx: ContextMessageUpdate): Promise<void> {
    const list = getProductsList();

    await ctx.reply(
      'За бибакоины можно купить:',
      Markup.inlineKeyboard(
        list.map((product) => [Markup.callbackButton(
          getProductActionContext(product),
          getActionByProduct(product),
        )]),
      ).extra(),
    );
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

  private initListeners(): void {
    const commands: BotListener[] = [
      {
        type: BotCommandType.COMMAND,
        name: BibacoinCommand.BALANCE,
        callback: (ctx): Promise<void> => this.getBalance(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: BibacoinCommand.SHOP,
        callback: (ctx): Promise<void> => BibacoinService.sendProductsList(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: BibacoinCommand.INCOME_LIST,
        callback: (ctx): Promise<void> => BibacoinService.sendIncomeList(ctx),
      },
      {
        type: BotCommandType.ACTION,
        name: BibacoinAction.BUY_CM,
        callback: (ctx): Promise<void> => this.buyOneCM(ctx),
      },
      {
        type: BotCommandType.ACTION,
        name: BibacoinAction.BUY_REROLL,
        callback: (ctx): Promise<void> => this.buyReroll(ctx),
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

  private async buyReroll(ctx: ContextMessageUpdate): Promise<void> {
    try {
      const price = getProductPrice(BibacoinProduct.BIBA_REROLL);
      const chatId = ctx.chat!.id;
      const userId = ctx.from!.id;
      await this.hasEnoughCredits(userId, chatId, price);

      const currentBiba = await this.bibaRepo.getBibaByIds(chatId, userId);
      if (!currentBiba) {
        await ctx.answerCbQuery(NO_BIBA_TO_REROLL);
        return;
      }

      await this.bibaService.bibaMetr(ctx, true);

      const balance = await this.newTransaction(userId, chatId, price);
      await ctx.answerCbQuery(`Реролл куплен! На счету осталось ${balance} коинов`);
    } catch (e) {
      await ctx.answerCbQuery(e.message);
      throw e;
    }
  }

  private async buyOneCM(ctx: ContextMessageUpdate): Promise<void> {
    try {
      const price = getProductPrice(BibacoinProduct.BIBA_CM);
      const chatId = ctx.chat!.id;
      const userId = ctx.from!.id;
      await this.hasEnoughCredits(userId, chatId, price);

      const currentBiba = await this.bibaRepo.getBibaByIds(chatId, userId);
      if (!currentBiba) {
        await ctx.answerCbQuery(NO_BIBA_TO_BUY);
        return;
      }

      await this.bibaRepo.setBiba(chatId, { ...currentBiba, size: currentBiba.size + 1 });

      const balance = await this.newTransaction(userId, chatId, price);
      await ctx.answerCbQuery(
        `Биба увеличена на один см. Теперь ${currentBiba.size}см. `
        + `На счету осталось ${balance} коинов`,
      );
    } catch (e) {
      await ctx.answerCbQuery(e.message);
      throw e;
    }
  }

  private async hasEnoughCredits(userId: number, chatId: number, value: number): Promise<boolean> {
    const currentBalance = await this.bibacoinRepo.getBibacoinBalanceByIds(chatId, userId);

    if (currentBalance >= value) {
      return true;
    }

    throw new Error(`Недостаточно бибакоинов. Требуется ${value}, у тебя ${currentBalance}`);
  }

  private async newTransaction(userId: number, chatId: number, value: number): Promise<number> {
    const currentBalance = await this.bibacoinRepo.getBibacoinBalanceByIds(chatId, userId);

    const newBalance = currentBalance - value;
    await this.bibacoinRepo.setBibacoinBalance(chatId, userId, newBalance);

    return newBalance;
  }

  private async getBalance(ctx: ContextMessageUpdate): Promise<void> {
    const balance = await this.bibacoinRepo.getBibacoinBalanceByIds(ctx.chat!.id, ctx.message!.from!.id);
    const message = balance ? `У тебя на счету ${balance} бибакоинов` : ZERO_BALANCE;
    await ctx.reply(message);
  }
}
