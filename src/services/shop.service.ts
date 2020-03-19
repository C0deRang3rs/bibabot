import { ContextMessageUpdate, Markup } from 'telegraf';
import Bot from '../core/bot';
import { BotCommandType } from '../types/core/bot.types';
import {
  NO_BIBA_TO_REROLL, NO_BIBA_TO_BUY,
} from '../types/services/bibacoin.service.types';
import {
  getProductPrice, getProductsList, getProductActionContext, getActionByProduct,
} from '../utils/shop.helper';
import BibacoinService from './bibacoin.service';
import BibaService from './biba.service';
import BibaRepository from '../repositories/biba.repo';
import { ShopAction, Product } from '../types/services/shop.service.types';
import { ShopCommand } from '../types/globals/commands.types';

export default class ShopService {
  private static instance: ShopService;

  private constructor(
    private readonly bot: Bot,
    private readonly bibacoinService: BibacoinService,
    private readonly bibaService: BibaService,
    private readonly bibaRepo: BibaRepository,
  ) {
    this.initListeners();
  }

  public static getInstance(): ShopService {
    if (!ShopService.instance) {
      ShopService.instance = new ShopService(
        Bot.getInstance(),
        BibacoinService.getInstance(),
        BibaService.getInstance(),
        new BibaRepository(),
      );
    }

    return ShopService.instance;
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

  private initListeners(): void {
    this.bot.addListeners([
      {
        type: BotCommandType.ACTION,
        name: ShopAction.BUY_CM,
        callback: (ctx): Promise<void> => this.buyOneCM(ctx),
      },
      {
        type: BotCommandType.ACTION,
        name: ShopAction.BUY_REROLL,
        callback: (ctx): Promise<void> => this.buyReroll(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: ShopCommand.SHOP,
        callback: (ctx): Promise<void> => ShopService.sendProductsList(ctx),
      },
    ]);
  }

  private async buyReroll(ctx: ContextMessageUpdate): Promise<void> {
    try {
      const price = getProductPrice(Product.BIBA_REROLL);
      const chatId = ctx.chat!.id;
      const userId = ctx.from!.id;
      await this.bibacoinService.hasEnoughCredits(userId, chatId, price);

      const currentBiba = await this.bibaRepo.getBibaByIds(chatId, userId);
      if (!currentBiba) {
        await ctx.answerCbQuery(NO_BIBA_TO_REROLL);
        return;
      }

      await this.bibaService.bibaMetr(ctx, true);

      const balance = await this.bibacoinService.newTransaction(userId, chatId, price);
      await ctx.answerCbQuery(`Реролл куплен! На счету осталось ${balance} коинов`);
    } catch (e) {
      await ctx.answerCbQuery(e.message);
      throw e;
    }
  }

  private async buyOneCM(ctx: ContextMessageUpdate): Promise<void> {
    try {
      const price = getProductPrice(Product.BIBA_CM);
      const chatId = ctx.chat!.id;
      const userId = ctx.from!.id;
      await this.bibacoinService.hasEnoughCredits(userId, chatId, price);

      const currentBiba = await this.bibaRepo.getBibaByIds(chatId, userId);
      if (!currentBiba) {
        await ctx.answerCbQuery(NO_BIBA_TO_BUY);
        return;
      }

      await this.bibaRepo.setBiba(chatId, { ...currentBiba, size: currentBiba.size + 1 });

      const balance = await this.bibacoinService.newTransaction(userId, chatId, price);
      await ctx.answerCbQuery(
        `Биба увеличена на один см. Теперь ${currentBiba.size + 1} см. `
        + `На счету осталось ${balance} коинов`,
      );
    } catch (e) {
      await ctx.answerCbQuery(e.message);
      throw e;
    }
  }
}
