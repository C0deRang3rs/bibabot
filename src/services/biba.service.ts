import Bull from 'bull';
import { ContextMessageUpdate, Markup } from 'telegraf';

import { Message } from 'telegraf/typings/telegram-types';
import { BibaCommand, BibaDebugCommand } from '../types/globals/commands.types';
import { getProductPrice, getActionByProduct, getPriceByActivity } from '../utils/shop.helper';
import {
  Biba,
  POSITIVE_BIBA,
  NEGATIVE_BIBA,
  NO_TABLE_DATA,
  NO_BIBA_MEASURED,
  SAME_BIBA,
} from '../types/services/biba.service.types';
import Bot from '../core/bot';
import { BotCommandType, BotListener } from '../types/core/bot.types';
import BibaRepository from '../repositories/biba.repo';
import ChatRepository from '../repositories/chat.repo';
import { Product } from '../types/services/shop.service.types';
import BaseService from './base.service';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import DeleteLastMessage from '../decorators/delete.last.message.decorator';
import DeleteResponseMessage from '../decorators/delete.response.message.decorator';
import getUsernameFromContext from '../utils/global.helper';
import BibacoinService from './bibacoin.service';
import { BibacoinActivity } from '../types/services/bibacoin.service.types';

export default class BibaService extends BaseService {
  private static instance: BibaService;

  private constructor(
    private readonly bibaRepo: BibaRepository,
    private readonly chatRepo: ChatRepository,
    private readonly bibacoinService: BibacoinService,
  ) {
    super();
  }

  public static getInstance(): BibaService {
    if (!BibaService.instance) {
      BibaService.instance = new BibaService(
        new BibaRepository(),
        new ChatRepository(),
        BibacoinService.getInstance(),
      );
    }

    return BibaService.instance;
  }

  @DeleteRequestMessage()
  private static async unrankedBibaMetr(ctx: ContextMessageUpdate): Promise<Message> {
    const username = getUsernameFromContext(ctx);
    return ctx.reply(`У ${username} биба ${Math.floor(Math.random() * (35 + 1))} см`);
  }

  private static getDailyMessage(allBibas: Array<Biba>): string {
    if (!allBibas.length) return NO_BIBA_MEASURED;

    if (allBibas.length === 1) {
      return `Бибу мерял только ${allBibas[0].username}, поэтому он и обсос и король`;
    }

    const topBiba = allBibas.shift();
    const lowBiba = allBibas.pop();

    return `👑 Королевская биба сегодня у ${topBiba!.username} - ${topBiba!.size} см\n\n`
         + `👌 Обсосом дня становится ${lowBiba!.username} - ${lowBiba!.size} см`;
  }

  @DeleteResponseMessage(10000)
  private static async sendRerollBlockedMessage(ctx: ContextMessageUpdate, username: string): Promise<Message> {
    const price = getProductPrice(Product.BIBA_REROLL);

    return ctx.reply(
      `${username} сегодня уже мерял бибу, приходи завтра или купи ещё одну попытку за ${price} бибакоинов`,
      Markup.inlineKeyboard(
        [Markup.callbackButton(
          `Перемерять бибу 💰${price}¢`,
          getActionByProduct(Product.BIBA_REROLL),
        )],
      ).extra(),
    );
  }

  private static getNewBibaMessage(oldSize: number, newSize: number): string {
    const diff = oldSize - newSize;

    if (diff === 0) return SAME_BIBA;
    return oldSize - newSize > 0 ? POSITIVE_BIBA : NEGATIVE_BIBA;
  }

  @DeleteRequestMessage()
  public async bibaMetr(ctx: ContextMessageUpdate, forceReroll?: boolean): Promise<Message> {
    const user = (ctx.message && ctx.message!.from!) || ctx.from!;
    const username = getUsernameFromContext(ctx);
    const userId = user.id;
    const chatId = ctx.chat!.id;
    const biba = Math.floor(Math.random() * (35 + 1));
    const lastBiba = await this.bibaRepo.getBibaByIds(chatId, userId);
    let bibaMessage = `У ${username} биба ${biba} см.`;

    if (lastBiba) {
      if (!lastBiba.outdated && !forceReroll) {
        return BibaService.sendRerollBlockedMessage(ctx, username);
      }

      bibaMessage = `${bibaMessage} В прошлый раз была ${lastBiba.size} см. `
                  + `${BibaService.getNewBibaMessage(biba, lastBiba.size)}`;
    }

    await this.bibaRepo.setBiba(
      chatId,
      {
        size: biba,
        username,
        outdated: false,
        userId,
      },
    );

    if (biba <= 5) {
      const price = getPriceByActivity(BibacoinActivity.SMALL_PEPE);
      await this.bibacoinService.addCoins(userId, chatId, price);
      bibaMessage = `${bibaMessage} Не переживай, Фонд Поддержки Неполноценных выделил тебе ${price} бибакоинов`;
    } else if (biba >= 30) {
      bibaMessage = `${bibaMessage} Дорогу здоровяку`;
    }

    return ctx.reply(bibaMessage);
  }

  public async dailyBiba(done?: Bull.DoneCallback, forcedChatId?: number): Promise<void> {
    try {
      const chatIds = forcedChatId ? [forcedChatId] : await this.chatRepo.getAllChats();

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
    } catch (err) {
      Bot.handleError(err);
    }

    if (done) {
      done();
    }
  }

  protected initListeners(): void {
    const commands: Array<BotListener> = [
      {
        type: BotCommandType.COMMAND,
        name: BibaCommand.BIBA,
        callback: (ctx): Promise<Message> => this.bibaMetr(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: BibaCommand.UNRANKED_BIBA,
        callback: (ctx): Promise<Message> => BibaService.unrankedBibaMetr(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: BibaCommand.BIBA_TABLE,
        callback: (ctx): Promise<Message> => this.bibaTable(ctx),
      },
    ];

    if (process.env.PRODUCTION === 'false') {
      commands.push(
        {
          type: BotCommandType.COMMAND,
          name: BibaDebugCommand.SET_BIBA,
          callback: (ctx) => this.setBiba(ctx),
        },
        {
          type: BotCommandType.COMMAND,
          name: BibaDebugCommand.REMOVE_BIBA,
          callback: (ctx) => this.removeBiba(ctx),
        },
        {
          type: BotCommandType.COMMAND,
          name: BibaDebugCommand.TRIGGER_DAILY,
          callback: (ctx) => this.dailyBiba(undefined, ctx.chat!.id),
        },
      );
    }

    this.bot.addListeners(commands);
  }

  private async removeBiba(ctx: ContextMessageUpdate): Promise<Message> {
    const params = ctx.message!.text!.split(' ');
    const chatId = ctx.chat!.id;

    if (params.length < 1 || params.length > 2) {
      return ctx.reply('Wrong format');
    }

    const targetUsername = params[1];

    if (targetUsername && targetUsername.includes('@')) {
      const bibas = await this.bibaRepo.getAllBibasByChatId(chatId);
      const targetBiba = bibas.find((biba) => biba.username === targetUsername);

      if (!targetBiba) {
        return ctx.reply('Wrong user');
      }

      await this.bibaRepo.removeBiba(chatId, targetBiba.userId);
    } else if (targetUsername && !targetUsername.includes('@')) {
      return ctx.reply('Wrong format');
    } else {
      await this.bibaRepo.removeBiba(chatId, ctx.from!.id);
    }

    return ctx.reply('Done');
  }

  private async setBiba(ctx: ContextMessageUpdate): Promise<Message> {
    const params = ctx.message!.text!.split(' ');
    const chatId = ctx.chat!.id;

    if (params.length < 2 || params.length > 3) {
      return ctx.reply('Wrong format');
    }

    const size = parseInt(params[1], 10);
    const targetUsername = params[2];

    if (targetUsername && targetUsername.includes('@')) {
      const bibas = await this.bibaRepo.getAllBibasByChatId(chatId);
      const targetBiba = bibas.find((biba) => biba.username === targetUsername);

      if (!targetBiba) {
        return ctx.reply('Wrong user');
      }

      await this.bibaRepo.setBiba(chatId, { ...targetBiba, size });
    } else if (targetUsername && !targetUsername.includes('@')) {
      return ctx.reply('Wrong format');
    } else {
      const targetBiba = await this.bibaRepo.getBibaByIds(chatId, ctx.from!.id);

      await this.bibaRepo.setBiba(chatId, { ...targetBiba, size });
    }

    return ctx.reply('Done');
  }

  @DeleteRequestMessage()
  @DeleteLastMessage('biba_table')
  private async bibaTable(ctx: ContextMessageUpdate): Promise<Message> {
    const allBibas = await this.bibaRepo.getAllBibasByChatId(ctx.chat!.id);

    if (!allBibas.length) {
      return ctx.reply(NO_TABLE_DATA);
    }

    const message = allBibas.map((biba, index) => `${index + 1}. ${biba.username.replace('@', '')} - ${biba.size} см`);
    return ctx.reply(message.join('\n'));
  }
}
