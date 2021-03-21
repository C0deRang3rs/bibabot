import { Markup } from 'telegraf';
import { Context } from 'telegraf/typings/context';
import { Message } from 'telegraf/typings/core/types/typegram';
import { BotCommandType, BotListener } from '../types/core/bot.types';
import {
  NO_BIBA_TO_REROLL, NO_BIBA_TO_BUY, BibacoinAction,
} from '../types/services/bibacoin.service.types';
import BibacoinService from './bibacoin.service';
import BibaService from './biba.service';
import BibaRepository from '../repositories/biba.repo';
import {
  ShopAction,
  Product,
} from '../types/services/shop.service.types';
import { CommandCategory, ShopCommand } from '../types/globals/commands.types';
import BaseService from './base.service';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import DeleteLastMessage from '../decorators/delete.last.message.decorator';
import UpdateLastMessage from '../decorators/update.last.message.decorator';
import * as shopUtils from '../utils/shop.util';
import { BotMessage } from '../types/globals/message.types';

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
  @DeleteLastMessage(BotMessage.SHOP)
  private static async sendProductsList(ctx: Context): Promise<Message> {
    const list = shopUtils.getProductsList();

    return ctx.reply(
      'За бибакоины можно купить:',
      {
        reply_markup: Markup.inlineKeyboard([
          ...list.map((product) => [Markup.button.callback(
            shopUtils.getProductActionContext(product),
            shopUtils.getActionByProduct(product),
          )]),
          [Markup.button.callback('Проверить баланс', BibacoinAction.BALANCE)],
        ]).reply_markup,
      },
    );
  }

  @UpdateLastMessage(BotMessage.BIBA_TABLE)
  private async buyOneCM(ctx: Context): Promise<void> {
    try {
      const price = shopUtils.getProductPrice(Product.BIBA_CM);
      const chatId = ctx.chat!.id;
      const userId = ctx.from!.id;
      await this.bibacoinService.hasEnoughCredits(userId, chatId, price);

      const currentBiba = await this.bibaRepo.getBibaByIds(chatId, userId);

      if (!currentBiba) {
        await ctx.answerCbQuery(NO_BIBA_TO_BUY);
        return;
      }

      if (currentBiba.outdated) {
        await ctx.answerCbQuery('Биба уже пованивает, обнови её с помощью /biba');
        return;
      }

      await this.bibaRepo.setBiba(chatId, { ...currentBiba, size: currentBiba.size + 1 });

      await this.bibacoinService.withdrawCoins(userId, chatId, price);
      await ctx.answerCbQuery(`Теперь твоя биба ${currentBiba.size + 1} см`);
    } catch (e) {
      await ctx.answerCbQuery(e.message, { show_alert: true });
      throw e;
    }
  }

  protected initProps(): void {
    this.categoryName = CommandCategory.SHOP;
  }

  protected initListeners(): BotListener[] {
    return [
      {
        type: BotCommandType.ACTION,
        name: ShopAction.BIBA_CM,
        callback: (ctx): Promise<void> => this.buyOneCM(ctx),
      },
      {
        type: BotCommandType.ACTION,
        name: ShopAction.BIBA_REROLL,
        callback: (ctx): Promise<void> => this.buyReroll(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: ShopCommand.SHOP,
        description: 'Магазин / проверка баланса',
        callback: (ctx): Promise<Message> => ShopService.sendProductsList(ctx),
      },
    ];
  }

  private async buyReroll(ctx: Context): Promise<void> {
    try {
      const price = shopUtils.getProductPrice(Product.BIBA_REROLL);
      const chatId = ctx.chat!.id;
      const userId = ctx.from!.id;
      await this.bibacoinService.hasEnoughCredits(userId, chatId, price);

      const currentBiba = await this.bibaRepo.getBibaByIds(chatId, userId);

      if (!currentBiba) {
        await ctx.answerCbQuery(NO_BIBA_TO_REROLL);
        return;
      }

      if (currentBiba.outdated) {
        await ctx.answerCbQuery('Биба уже пованивает, обнови её с помощью /biba');
        return;
      }

      await this.bibaService.rerollBiba(ctx);

      await this.bibacoinService.withdrawCoins(userId, chatId, price);
      await ctx.answerCbQuery('Реролл куплен!');
    } catch (e) {
      await ctx.answerCbQuery(e.message, { show_alert: true });
      throw e;
    }
  }
}
