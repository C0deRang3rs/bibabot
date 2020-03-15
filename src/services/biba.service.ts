import Bull from 'bull';
import { ContextMessageUpdate, Markup } from 'telegraf';

import { Bot, BotCommandType } from '../core/bot';
import { Redis, PromisifiedRedis } from '../core/redis';
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

export default class BibaService {
  private static instance: BibaService;

  private constructor(
    private readonly bot: Bot,
    private readonly redis: PromisifiedRedis,
  ) {
    this.initListeners();
  }

  public static getInstance(): BibaService {
    if (!BibaService.instance) BibaService.instance = new BibaService(Bot.getInstance(), Redis.getInstance().client);

    return BibaService.instance;
  }

  private static async unrankedBibaMetr(ctx: ContextMessageUpdate): Promise<void> {
    await ctx.reply(`У @${ctx.message!.from!.username} биба ${Math.floor(Math.random() * (35 + 1))} см`);
  }

  public async bibaMetr(ctx: ContextMessageUpdate, forceReroll?: boolean): Promise<void> {
    const user = (ctx.message && ctx.message!.from) || ctx.from;
    const biba = Math.floor(Math.random() * (35 + 1));
    const lastBiba: Biba = JSON.parse(await this.redis.getAsync(`biba:${ctx.chat!.id}:${user!.id}`));
    let bibaMessage = `У @${user!.username} биба ${biba} см`;

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

      bibaMessage = `У @${user!.username} биба ${biba} см, в прошлый раз была ${lastBiba.size} см. `
              + `${biba - parseInt(lastBiba.size, 10) > 0 ? POSITIVE_BIBA : NEGATIVE_BIBA}`;
    }

    await this.redis.setAsync(
      `biba:${ctx.chat!.id}:${user!.id}`,
      JSON.stringify({ size: biba, username: user!.username, outdated: false }),
    );

    await ctx.reply(bibaMessage);
  }

  public async dailyBiba(done: Bull.DoneCallback): Promise<void> {
    const keys = await this.redis.keysAsync('auto:rename:*');
    const chats = keys.map((key: string) => key.split(':')[2]);

    await Promise.all(chats.map(async (chat: string) => {
      // eslint-disable-next-line no-console
      console.log(`[${chat}] Daily biba`);

      const allBibasKeys: Array<string> = await this.redis.keysAsync(`biba:${chat}:*`);
      const message = await this.getDailyMessage(allBibasKeys);

      if (!allBibasKeys.length) {
        await this.bot.app.telegram.sendMessage(chat, message);
        return;
      }

      await this.bot.app.telegram.sendMessage(chat, message);

      await Promise.all(allBibasKeys.map(async (bibaKey: string) => {
        const lastBiba: Biba = JSON.parse(await this.redis.getAsync(bibaKey));
        await this.redis.setAsync(bibaKey, JSON.stringify({ ...lastBiba, outdated: true }));
      }));
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
    const allBibasKeys: Array<string> = await this.redis.keysAsync(`biba:${ctx.chat!.id}:*`);
    if (!allBibasKeys.length) {
      await ctx.reply(NO_TABLE_DATA);
      return;
    }

    const allBibas = await this.getAllBibas(allBibasKeys);
    if (!allBibas.length) {
      await ctx.reply(NO_TABLE_DATA);
      return;
    }

    const message = allBibas.map((biba, index) => `${index + 1}. ${biba.username} - ${biba.size} см`);
    ctx.reply(message.join('\n'));
  }

  private async getDailyMessage(allBibasKeys: Array<string>): Promise<string> {
    const allBibas = await this.getAllBibas(allBibasKeys);

    if (!allBibas.length) return NO_BIBA_MEASURED;

    const topBiba = allBibas[0];
    const lowBiba = allBibas.pop();

    return `👑 Королевская биба сегодня у @${topBiba.username} - ${topBiba.size} см\n\n`
         + `👌 Обсосом дня становится @${lowBiba!.username} - ${lowBiba!.size} см`;
  }

  private async getAllBibas(allBibasKeys: Array<string>): Promise<Array<Biba>> {
    const allBibas = await this.redis.mgetAsync(allBibasKeys);
    let parsedBibas: Array<Biba> = allBibas.map((rawBiba: string) => JSON.parse(rawBiba));
    parsedBibas = parsedBibas.filter((biba) => !biba.outdated);
    parsedBibas.sort((biba1, biba2) => (biba1.size < biba2.size ? 1 : -1));

    return parsedBibas;
  }
}
