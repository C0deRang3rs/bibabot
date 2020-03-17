import Bull from 'bull';
import { ContextMessageUpdate, Markup } from 'telegraf';

import { BibaCommand } from '../types/globals/commands.types';
import { BibacoinProduct } from '../types/services/bibacoin.service.types';
import { getProductPrice, getActionByProduct } from '../utils/shop.helper';
import {
  Biba,
  POSITIVE_BIBA,
  NEGATIVE_BIBA,
  NO_TABLE_DATA,
  NO_BIBA_MEASURED,
} from '../types/services/biba.service.types';
import Bot from '../core/bot';
import { BotCommandType } from '../types/core/bot.types';
import BibaRepository from '../repositories/biba.repo';
import ChatRepository from '../repositories/chat.repo';

export default class BibaService {
  private static instance: BibaService;

  private constructor(
    private readonly bot: Bot,
    private readonly bibaRepo: BibaRepository,
    private readonly chatRepo: ChatRepository,
  ) {
    this.initListeners();
  }

  public static getInstance(): BibaService {
    if (!BibaService.instance) {
      BibaService.instance = new BibaService(
        Bot.getInstance(),
        new BibaRepository(),
        new ChatRepository(),
      );
    }

    return BibaService.instance;
  }

  private static async unrankedBibaMetr(ctx: ContextMessageUpdate): Promise<void> {
    const username = `@${ctx.message!.from!.username}` || ctx.message!.from!.first_name;
    await ctx.reply(`У ${username} биба ${Math.floor(Math.random() * (35 + 1))} см`);
  }

  private static getDailyMessage(allBibas: Array<Biba>): string {
    if (!allBibas.length) return NO_BIBA_MEASURED;

    const topBiba = allBibas.shift();
    const lowBiba = allBibas.pop();

    return `👑 Королевская биба сегодня у ${topBiba!.username} - ${topBiba!.size} см\n\n`
         + `👌 Обсосом дня становится ${lowBiba!.username} - ${lowBiba!.size} см`;
  }

  public async bibaMetr(ctx: ContextMessageUpdate, forceReroll?: boolean): Promise<void> {
    const user = (ctx.message && ctx.message!.from) || ctx.from;
    const username = user!.username ? `@${user!.username}` : `${user!.first_name} ${user!.last_name}`;
    const biba = Math.floor(Math.random() * (35 + 1));
    const lastBiba = await this.bibaRepo.getBibaByIds(ctx.chat!.id, user!.id);
    let bibaMessage = `У ${username} биба ${biba} см`;

    if (lastBiba) {
      if (!lastBiba.outdated && !forceReroll) {
        const price = getProductPrice(BibacoinProduct.BIBA_REROLL);
        await ctx.reply(
          `Ты сегодня уже мерял бибу, приходи завтра или купи ещё одну попытку за ${price} бибакоинов`,
          Markup.inlineKeyboard(
            [Markup.callbackButton(
              `Перемерять бибу 💰${price}¢`,
              getActionByProduct(BibacoinProduct.BIBA_REROLL),
            )],
          ).extra(),
        );
        return;
      }

      bibaMessage = `У ${username} биба ${biba} см, в прошлый раз была ${lastBiba.size} см. `
                  + `${biba - lastBiba.size > 0 ? POSITIVE_BIBA : NEGATIVE_BIBA}`;
    }

    await this.bibaRepo.setBiba(
      ctx.chat!.id,
      {
        size: biba,
        username,
        outdated: false,
        userId: user!.id,
      },
    );

    await ctx.reply(bibaMessage);
  }

  public async dailyBiba(done: Bull.DoneCallback): Promise<void> {
    const chatIds = await this.chatRepo.getAllChats();

    await Promise.all(chatIds.map(async (chatId) => {
      console.log(`[${chatId}] Daily biba`);

      const allBibas = await this.bibaRepo.getAllBibasByChatId(chatId);
      const message = BibaService.getDailyMessage(allBibas);

      if (!allBibas.length) {
        await this.bot.app.telegram.sendMessage(chatId, message);
        return;
      }

      await this.bot.app.telegram.sendMessage(chatId, message);

      await this.bibaRepo.setAllBibasOutdated(chatId);
    }));

    done();
  }

  private initListeners(): void {
    this.bot.addListeners([
      {
        type: BotCommandType.COMMAND,
        name: BibaCommand.BIBA,
        callback: (ctx): Promise<void> => this.bibaMetr(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: BibaCommand.UNRANKED_BIBA,
        callback: (ctx): Promise<void> => BibaService.unrankedBibaMetr(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: BibaCommand.BIBA_TABLE,
        callback: (ctx): Promise<void> => this.bibaTable(ctx),
      },
    ]);
  }

  private async bibaTable(ctx: ContextMessageUpdate): Promise<void> {
    const allBibas = await this.bibaRepo.getAllBibasByChatId(ctx.chat!.id);

    if (!allBibas.length) {
      await ctx.reply(NO_TABLE_DATA);
      return;
    }

    const message = allBibas.map((biba, index) => `${index + 1}. ${biba.username} - ${biba.size} см`);
    ctx.reply(message.join('\n'));
  }
}
