import Bull from 'bull';
import { Markup } from 'telegraf';
import { Context } from 'telegraf/typings/context';
import { Message } from 'telegraf/typings/telegram-types';
import { BibaCommand, BibaDebugCommand, CommandCategory } from '../types/globals/commands.types';
import {
  Biba,
  POSITIVE_BIBA,
  NEGATIVE_BIBA,
  NO_BIBA_MEASURED,
  SAME_BIBA,
  DailyBibaResponse,
  TERRORISCTIC_BIBA_SIZE,
  MAX_BIBA_SIZE,
} from '../types/services/biba.service.types';
import Bot from '../core/bot';
import { BotCommandType, BotListener, CommandType } from '../types/core/bot.types';
import BibaRepository from '../repositories/biba.repo';
import BaseService from './base.service';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import DeleteLastMessage from '../decorators/delete.last.message.decorator';
import DeleteResponseMessage from '../decorators/delete.response.message.decorator';
import BibacoinService from './bibacoin.service';
import {
  BibacoinActivity,
  DAILY_BIBACOINT_INCOME_PERCENT,
  MAX_DAILY_BIBACOINT_INCOME,
  NO_BIBA_TO_BUY,
} from '../types/services/bibacoin.service.types';
import { getUpdatedMessage } from '../utils/lists.util';
import UpdateLastMessage from '../decorators/update.last.message.decorator';
import CheckConfig from '../decorators/check.config.decorator';
import { ConfigProperty } from '../types/services/config.service.types';
import { Product } from '../types/services/shop.service.types';
import * as shopUtils from '../utils/shop.util';
import ReplyWithError from '../decorators/reply.with.error.decorator';
import RepliableError from '../types/globals/repliable.error';
import { BotMessage } from '../types/globals/message.types';
import { getUsernameFromContext, getUsernameFromUser } from '../utils/data.utils';
import JailService from './jail.service';
import ChatService from './chat.service';
import CommandTemplate from '../decorators/command.template.decorator';

export default class BibaService extends BaseService {
  private static instance: BibaService;

  private constructor(
    private readonly bibaRepo: BibaRepository,
    private readonly chatService: ChatService,
    private readonly bibacoinService: BibacoinService,
    private readonly jailService: JailService,
  ) {
    super();
  }

  public static getInstance(): BibaService {
    if (!BibaService.instance) {
      BibaService.instance = new BibaService(
        new BibaRepository(),
        ChatService.getInstance(),
        BibacoinService.getInstance(),
        JailService.getInstance(),
      );
    }

    return BibaService.instance;
  }

  private static getNewBibaMessage(oldSize: number, newSize: number): string {
    const diff = oldSize - newSize;

    if (diff === 0) return SAME_BIBA;
    return oldSize - newSize > 0 ? POSITIVE_BIBA : NEGATIVE_BIBA;
  }

  private static getDailyMessage(allBibas: Array<Biba>): DailyBibaResponse {
    let message = '';
    let terrorists: Biba[] = [];

    if (!allBibas.length) {
      message = NO_BIBA_MEASURED;
    }

    if (allBibas.length === 1) {
      message = `Бибу мерял только ${allBibas[0].username}, поэтому он и обсос и король`;
    }

    if (allBibas.length > 1) {
      terrorists = BibaService.findTerroristicBibas(allBibas);
      const terroristsIds = terrorists.map((biba) => biba.userId);
      const goodBoys = allBibas.filter((biba) => !terroristsIds.includes(biba.userId));

      const topBiba = [...allBibas].shift()!;
      const lowBiba = [...allBibas].pop()!;

      if (terrorists.length && goodBoys.length === 1) {
        message = `👑 Честно бибу мерял только ${goodBoys[0].username}, поэтому он король`;
      }

      if (!terrorists.length) {
        message = `👑 Королевская биба сегодня у ${topBiba.username} - ${topBiba.size} см\n\n`
          + `👌 Обсосом дня становится ${lowBiba.username} - ${lowBiba.size} см`;
      }

      if (terrorists.length) {
        message = `${message}\n\n`
          + `У ${terrorists.map((biba) => biba.username).join(', ')} была обнаружена незаконная биба, удачи на бутылке`;
      }
    }

    return {
      terrorists,
      message: `${message}\n\n`
        + `Также все участники чата получили свой дневной прирост бибакоинов в ${DAILY_BIBACOINT_INCOME_PERCENT}%. `
        + `Но не больше ${MAX_DAILY_BIBACOINT_INCOME}\n`
        + `${allBibas.length ? '\nПомерять бибу можно с помощью команды /biba' : ''}`,
    };
  }

  private static findTerroristicBibas(biba: Biba[]): Biba[] {
    return biba.filter((b) => b.size >= TERRORISCTIC_BIBA_SIZE);
  }

  @DeleteResponseMessage(5000)
  public async rerollBiba(ctx: Context): Promise<Message> {
    return this.bibaMetr(ctx, true);
  }

  @UpdateLastMessage(BotMessage.BIBA_TABLE)
  public async botBibaMetr(chatId: number): Promise<Message> {
    const bot = await this.bot.app.telegram.getMe();
    const username = getUsernameFromUser(bot);
    const biba = Math.floor(Math.random() * (MAX_BIBA_SIZE + 1));
    const lastBiba = await this.bibaRepo.getBibaByIds(chatId, bot.id);
    let bibaMessage = `У ${username} биба ${biba} см.`;

    if (lastBiba) {
      bibaMessage = `${bibaMessage} В прошлый раз была ${lastBiba.size} см. `
        + `${BibaService.getNewBibaMessage(biba, lastBiba.size)}`;
    }

    await this.bibaRepo.setBiba(
      chatId,
      {
        size: biba,
        username,
        outdated: false,
        userId: bot.id,
      },
    );

    return this.bot.app.telegram.sendMessage(chatId, bibaMessage);
  }

  @UpdateLastMessage(BotMessage.BIBA_TABLE)
  @DeleteRequestMessage()
  public async bibaMetr(ctx: Context, forceReroll?: boolean): Promise<Message> {
    const user = (ctx.message && ctx.message!.from!) || ctx.from!;
    const username = getUsernameFromContext(ctx);
    const userId = user.id;
    const chatId = ctx.chat!.id;
    const biba = Math.floor(Math.random() * (MAX_BIBA_SIZE + 1));
    const lastBiba = await this.bibaRepo.getBibaByIds(chatId, userId);
    let bibaMessage = `У ${username} биба ${biba} см.`;

    if (lastBiba) {
      if (!lastBiba.outdated && !forceReroll) {
        return this.sendRerollBlockedMessage(chatId, username);
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
      const price = shopUtils.getPriceByActivity(BibacoinActivity.SMALL_PEPE);
      await this.bibacoinService.addCoins(userId, chatId, price);
      bibaMessage = `${bibaMessage} Не переживай, Фонд Поддержки Неполноценных выделил тебе ${price} бибакоинов`;
    } else if (biba >= 30) {
      bibaMessage = `${bibaMessage} Дорогу здоровяку`;
    }

    return ctx.reply(bibaMessage);
  }

  @DeleteRequestMessage()
  private static async unrankedBibaMetr(ctx: Context): Promise<Message> {
    const username = getUsernameFromContext(ctx);
    return ctx.reply(`У ${username} биба ${Math.floor(Math.random() * (MAX_BIBA_SIZE + 1))} см`);
  }

  @DeleteResponseMessage(10000)
  private async sendRerollBlockedMessage(chatId: number, username: string): Promise<Message> {
    const price = shopUtils.getProductPrice(Product.BIBA_REROLL);

    return this.bot.app.telegram.sendMessage(
      chatId,
      `${username} сегодня уже мерял бибу, приходи завтра или купи ещё одну попытку за ${price} бибакоинов`,
      Markup.inlineKeyboard(
        [Markup.button.callback(
          `Перемерять бибу 💰${price}¢`,
          shopUtils.getActionByProduct(Product.BIBA_REROLL),
        )],
      ),
    );
  }

  @CheckConfig(ConfigProperty.DAILY)
  private async triggerDailyBibaForChat(chatId: number): Promise<void> {
    console.log(`[${chatId}] Daily biba`);
    await this.bibacoinService.dailyIncome(chatId);

    const allBibas = await this.bibaRepo.getAllBibasByChatId(chatId);
    const daily = BibaService.getDailyMessage(allBibas);

    await this.bot.app.telegram.sendMessage(chatId, daily.message);

    if (!allBibas.length) {
      return;
    }

    await this.bibaRepo.setAllBibasOutdated(chatId);

    if (daily.terrorists.length) {
      for await (const terrorist of daily.terrorists) {
        try {
          await this.jailService.imprisonUser(chatId, terrorist.userId);
        } catch (err) {
          if (err.description === '') {}
        }
      }
    }

    const doesBotRollsBiba = Math.random() > 0.5;

    if (doesBotRollsBiba) {
      await this.bot.app.telegram.sendMessage(chatId, 'Я тоже хочу бибу');

      await this.botBibaMetr(chatId);
    }
  }

  @DeleteRequestMessage()
  @DeleteLastMessage(BotMessage.BIBA_TABLE)
  private static async bibaTable(ctx: Context): Promise<Message> {
    const { text, extra } = await getUpdatedMessage(BotMessage.BIBA_TABLE, ctx.chat!.id);
    return ctx.reply(text, extra);
  }

  @UpdateLastMessage(BotMessage.BIBA_TABLE)
  @DeleteRequestMessage()
  @DeleteResponseMessage(5000)
  @ReplyWithError(false, true)
  private async buyBiba(ctx: Context): Promise<Message> {
    if (
      !ctx.from
      || !ctx.chat
      || !ctx.message
      || !('text' in ctx.message)
    ) {
      throw new Error('Wrong context');
    }

    const price = shopUtils.getProductPrice(Product.BIBA_CM);
    const count = parseInt(ctx.message.text.split(' ')[1], 10);
    const totalPrice = price * count;
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const username = getUsernameFromContext(ctx);

    if (!count) throw new RepliableError('Wrong format', ctx);
    if (count <= 0) throw new RepliableError(`${username} ты не можешь купить меньше 1 см`, ctx);

    try {
      await this.bibacoinService.hasEnoughCredits(userId, chatId, totalPrice);
    } catch (err) {
      throw new RepliableError(err.message.split(',')[0], ctx);
    }

    const currentBiba = await this.bibaRepo.getBibaByIds(chatId, userId);

    if (!currentBiba) throw new RepliableError(NO_BIBA_TO_BUY, ctx);
    if (currentBiba.outdated) throw new RepliableError('Биба уже пованивает, обнови её с помощью /biba', ctx);

    await this.bibaRepo.setBiba(chatId, { ...currentBiba, size: currentBiba.size + count });

    await this.bibacoinService.withdrawCoins(userId, chatId, totalPrice);

    return ctx.reply(`${username} купил ${count} см для своей бибы`);
  }

  @UpdateLastMessage(BotMessage.BIBA_TABLE)
  @DeleteRequestMessage()
  @ReplyWithError()
  @CommandTemplate([CommandType.COMMAND, CommandType.NUMBER])
  private async sellBiba(ctx: Context): Promise<Message> {
    if (
      !ctx.from
      || !ctx.chat
      || !ctx.message
      || !('text' in ctx.message)
    ) {
      throw new Error('Wrong context');
    }

    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const username = getUsernameFromContext(ctx);
    const params = ctx.message.text.split(' ');
    const count = parseInt(params[1], 10);

    if (!count) throw new RepliableError('Wrong format', ctx);
    if (count <= 0) throw new RepliableError(`${username} ты не можешь продать меньше 1 см`, ctx);

    const biba = await this.bibaRepo.getBibaByIds(chatId, userId);

    if (!biba) throw new RepliableError(`${username} у тебя нет бибы`, ctx);

    const newSize = biba.size - count;

    if (newSize < 0) throw new RepliableError(`${username} ты не можешь продать больше, чем отрастил`, ctx);

    await this.bibaRepo.setBiba(chatId, { ...biba, size: newSize });
    const cost = count * shopUtils.getPriceByActivity(BibacoinActivity.BIBA_CM);
    await this.bibacoinService.addCoins(userId, chatId, cost);

    return ctx.reply(`У ${username} отрезали ${count} см бибы, но взамен он получил ${cost} бибакоинов`);
  }

  @UpdateLastMessage(BotMessage.BIBA_TABLE)
  @ReplyWithError()
  private async removeBiba(ctx: Context): Promise<Message> {
    if (!ctx.chat || !ctx.message || !('text' in ctx.message)) {
      throw new Error('Wrong context');
    }

    const params = ctx.message.text.split(' ');
    const chatId = ctx.chat.id;

    if (params.length < 1 || params.length > 2) throw new RepliableError('Wrong format', ctx);

    const targetUsername = params[1];

    if (targetUsername && targetUsername.includes('@')) {
      const targetBiba = await this.bibaRepo.findBibaByUsernameInChat(chatId, targetUsername);

      if (!targetBiba) throw new RepliableError('Wrong user', ctx);

      await this.bibaRepo.removeBiba(chatId, targetBiba.userId);
    } else if (targetUsername && !targetUsername.includes('@')) {
      throw new RepliableError('Wrong format', ctx);
    } else {
      await this.bibaRepo.removeBiba(chatId, ctx.from!.id);
    }

    return ctx.reply('Done');
  }

  @UpdateLastMessage(BotMessage.BIBA_TABLE)
  @ReplyWithError()
  private async setBiba(ctx: Context): Promise<Message> {
    if (!ctx.chat || !ctx.message || !('text' in ctx.message)) {
      throw new Error('Wrong context');
    }

    const params = ctx.message.text.split(' ');
    const chatId = ctx.chat.id;

    if (params.length < 2 || params.length > 3) throw new RepliableError('Wrong format', ctx);

    const size = parseInt(params[1], 10);
    const targetUsername = params[2];

    if (targetUsername && targetUsername.includes('@')) {
      const targetBiba = await this.bibaRepo.findBibaByUsernameInChat(chatId, targetUsername);

      if (!targetBiba) throw new RepliableError('Wrong user', ctx);

      await this.bibaRepo.setBiba(chatId, { ...targetBiba, size });
    } else if (targetUsername && !targetUsername.includes('@')) {
      throw new RepliableError('Wrong format', ctx);
    } else {
      const targetBiba = await this.bibaRepo.getBibaByIds(chatId, ctx.from!.id);

      if (!targetBiba) throw new RepliableError('У этого пользователя нет бибы', ctx);

      await this.bibaRepo.setBiba(chatId, { ...targetBiba, size });
    }

    return ctx.reply('Done');
  }

  public async dailyBiba(done?: Bull.DoneCallback, forcedChatId?: number): Promise<void> {
    try {
      const chatIds = forcedChatId ? [forcedChatId] : await this.chatService.getAllChats();
      await Promise.all(chatIds.map(async (chatId) => this.triggerDailyBibaForChat(chatId)));
    } catch (err) {
      Bot.handleError(err);
    }

    if (done) {
      done();
    }
  }

  protected initProps(): void {
    this.categoryName = CommandCategory.BIBA;
  }

  protected initListeners(): BotListener[] {
    const commands = [
      {
        type: BotCommandType.COMMAND,
        name: BibaCommand.BIBA,
        description: 'Померять бибу',
        callback: (ctx): Promise<Message> => this.bibaMetr(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: BibaCommand.UNRANKED_BIBA,
        description: 'Померять бибу не в таблицу',
        callback: (ctx): Promise<Message> => BibaService.unrankedBibaMetr(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: BibaCommand.BIBA_TABLE,
        description: 'Таблица всех биб за сегодня',
        callback: (ctx): Promise<Message> => BibaService.bibaTable(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: BibaCommand.SELL_BIBA,
        description: 'Продажа хозяйства',
        callback: (ctx): Promise<Message> => this.sellBiba(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: BibaCommand.BUY_BIBA,
        description: 'Купить сантиметры к бибулику',
        callback: (ctx): Promise<Message> => this.buyBiba(ctx),
      },
    ] as Array<BotListener>;

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
          description: 'Триггер дейли биба',
          category: CommandCategory.OTHER,
          callback: (ctx) => this.dailyBiba(undefined, ctx.chat!.id),
        },
      );
    }

    return commands;
  }
}
