import { ContextMessageUpdate, Markup } from 'telegraf';
import { Message } from 'telegraf/typings/telegram-types';
import { BotCommandType } from '../types/core/bot.types';
import {
  NO_BIBA_TO_REROLL, NO_BIBA_TO_BUY, BibacoinAction,
} from '../types/services/bibacoin.service.types';
import {
  getProductPrice, getProductsList, getProductActionContext, getActionByProduct,
} from '../utils/shop.helper';
import BibacoinService from './bibacoin.service';
import BibaService from './biba.service';
import BibaRepository from '../repositories/biba.repo';
import { ShopAction, Product } from '../types/services/shop.service.types';
import { ShopCommand } from '../types/globals/commands.types';
import BaseService from './base.service';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import DeleteLastMessage from '../decorators/delete.last.message.decorator';
import UpdateBibaTable from '../decorators/update.biba.table.decorator';

export default class ShopService extends BaseService {
  private static instance: ShopService;

  private constructor(
    private readonly bibacoinService: BibacoinService,
    private readonly bibaService: BibaService,
    private readonly bibaRepo: BibaRepository,
  ) {
    super();
  }

  public static getInstance(): ShopService {
    if (!ShopService.instance) {
      ShopService.instance = new ShopService(
        BibacoinService.getInstance(),
        BibaService.getInstance(),
        new BibaRepository(),
      );
    }

    return ShopService.instance;
  }

  @DeleteRequestMessage()
  @DeleteLastMessage('shop')
  private static async sendProductsList(ctx: ContextMessageUpdate): Promise<Message> {
    const list = getProductsList();

    return ctx.reply(
      'За бибакоины можно купить:',
      Markup.inlineKeyboard([
        ...list.map((product) => [Markup.callbackButton(
          getProductActionContext(product),
          getActionByProduct(product),
        )]),
        [Markup.callbackButton('Проверить баланс', BibacoinAction.BALANCE)],
      ]).extra(),
    );
  }

  protected initListeners(): void {
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
        callback: (ctx): Promise<Message> => ShopService.sendProductsList(ctx),
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

      await this.bibacoinService.withdrawCoins(userId, chatId, price);
      await ctx.answerCbQuery('Реролл куплен!');
    } catch (e) {
      await ctx.answerCbQuery(e.message, true);
      throw e;
    }
  }

  @UpdateBibaTable()
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

      await this.bibacoinService.withdrawCoins(userId, chatId, price);
      await ctx.answerCbQuery(`Теперь твоя биба ${currentBiba.size + 1} см`);
    } catch (e) {
      await ctx.answerCbQuery(e.message, true);
      throw e;
    }
  }
}
