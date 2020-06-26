import { ContextMessageUpdate } from 'telegraf';
import fs from 'fs';
import { Message } from 'telegraf/typings/telegram-types';
import { TrashCommand } from '../types/globals/commands.types';
import { BotCommandType } from '../types/core/bot.types';
import StatRepository from '../repositories/stat.repo';
import { FUCK_TRIGGERS, CoinSide } from '../types/services/trash.service.types';
import BaseService from './base.service';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import DeleteLastMessage from '../decorators/delete.last.message.decorator';
import GlobalHelper from '../utils/global.helper';
import { getUsernameFromContext } from '../utils/global.util';

export default class TrashService extends BaseService {
  private static instance: TrashService;

  private constructor(
    private readonly statRepo: StatRepository,
  ) {
    super();
  }

  public static getInstance(): TrashService {
    if (!TrashService.instance) {
      TrashService.instance = new TrashService(
        new StatRepository(),
      );
    }

    return TrashService.instance;
  }

  public static async trashHandler(ctx: ContextMessageUpdate, next: Function | undefined): Promise<Function> {
    if (!ctx.message || !ctx.message.text || !ctx.message.from) return next!();

    const msg = ctx.message.text.toLowerCase();
    const name = ctx.message.from.first_name;

    if (FUCK_TRIGGERS.some((s) => msg.includes(s))) await ctx.reply('Сам иди нахуй');
    if (msg.includes('соси')) await ctx.reply(name ? `Сам соси, ${name}!` : 'Сам соси!');
    if (msg === 'да') await ctx.reply('пизда');
    if (msg === 'нет ты') await ctx.reply('Нет ты');
    if (msg.includes('один хуй')) await ctx.reply('Не "один хуй", а "однохуйственно". Учи рузкий блядь');
    if (msg === 'f') await ctx.replyWithPhoto({ source: fs.createReadStream(`${__dirname}/../../assets/F.png`) });
    if (msg === 'нет') await ctx.reply('говна пакет');

    return next!();
  }

  @DeleteRequestMessage()
  private static async roll(ctx: ContextMessageUpdate): Promise<Message> {
    const username = getUsernameFromContext(ctx);
    const payload = ctx.message!.text!.split(' ')[1];

    let from = 1;
    let to = 100;

    if (payload) {
      const parameters = payload.split('-');

      const min = parseInt(parameters[0], 10);
      const max = parseInt(parameters[1], 10);

      if (!min || !max) {
        return GlobalHelper.sendError(ctx, 'Wrong format');
      }

      if (!Number.isInteger(min) || !Number.isInteger(max)) {
        return GlobalHelper.sendError(ctx, 'Wrong data');
      }

      from = min;
      to = max;
    }

    return ctx.reply(`${username} рандомит ${Math.floor(Math.random() * (to - from + 1) + from)}`);
  }

  protected initListeners(): void {
    this.bot.addListeners([
      {
        type: BotCommandType.COMMAND,
        name: TrashCommand.FLIP,
        callback: (ctx): Promise<Message> => this.coinFlip(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: TrashCommand.ROLL,
        callback: (ctx): Promise<Message> => TrashService.roll(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: TrashCommand.FLIP_STAT,
        callback: (ctx): Promise<Message> => this.coinFlipStat(ctx),
      },
    ]);
  }

  @DeleteRequestMessage()
  private async coinFlip(ctx: ContextMessageUpdate): Promise<Message> {
    const username = getUsernameFromContext(ctx);
    const flipResult = Math.floor(Math.random() * 2) === 0 ? 'Heads' : 'Tails';

    await this.statRepo.incrementStatCount(flipResult.toLowerCase());

    return ctx.reply(`${username} выкидывает ${flipResult}`);
  }

  @DeleteRequestMessage()
  @DeleteLastMessage('flip_stat')
  private async coinFlipStat(ctx: ContextMessageUpdate): Promise<Message> {
    const tailsCount = await this.statRepo.getStatCount(CoinSide.TAILS);
    const headsCount = await this.statRepo.getStatCount(CoinSide.HEADS);
    const tailsStat = Math.round((tailsCount / (tailsCount + headsCount)) * 100);
    const headsStat = Math.round((headsCount / (tailsCount + headsCount)) * 100);

    return ctx.reply(
      `Tails - ${tailsStat || 0}% - ${tailsCount} раз\n`
    + `Heads - ${headsStat || 0}% - ${headsCount} раз`,
    );
  }
}
