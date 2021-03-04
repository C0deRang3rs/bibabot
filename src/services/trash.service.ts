import { Context } from 'telegraf/typings/context';
import fs from 'fs';
import { Message } from 'telegraf/typings/telegram-types';
import { CommandCategory, TrashCommand } from '../types/globals/commands.types';
import { BotCommandType, BotListener, CommandType } from '../types/core/bot.types';
import StatRepository from '../repositories/stat.repo';
import { FUCK_TRIGGERS, CoinSide } from '../types/services/trash.service.types';
import BaseService from './base.service';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import DeleteLastMessage from '../decorators/delete.last.message.decorator';
import { ConfigProperty } from '../types/services/config.service.types';
import CheckConfig from '../decorators/check.config.decorator';
import ReplyWithError from '../decorators/reply.with.error.decorator';
import RepliableError from '../types/globals/repliable.error';
import { BotMessage } from '../types/globals/message.types';
import { getUsernameFromContext } from '../utils/data.utils';
import CommandTemplate from '../decorators/command.template.decorator';
import optional from '../utils/decorators.utils';

export default class TrashService extends BaseService {
  private static instance: TrashService;

  protected categoryName: CommandCategory = CommandCategory.TRASH;

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

  @CheckConfig(ConfigProperty.TRASH_REPLY)
  public static async trashHandler(ctx: Context, next: Function): Promise<Function> {
    if (
      !ctx.message
      || !('text' in ctx.message)
    ) {
      return next();
    }

    const msg = ctx.message.text.toLowerCase();
    const name = ctx.message.from.first_name;

    if (FUCK_TRIGGERS.some((s) => msg.includes(s))) await ctx.reply(name ? `Сам иди нахуй, ${name}` : 'Сам иди нахуй');
    if (msg.includes('соси')) await ctx.reply(name ? `Сам соси, ${name}!` : 'Сам соси!');
    if (msg === 'да') await ctx.reply('Пизда');
    if (msg === 'нет ты') await ctx.reply('Нет ты');
    if (msg.includes('один хуй')) await ctx.reply('Не "один хуй", а "однохуйственно". Учи рузкий блядь');
    if (msg === 'f') await ctx.replyWithPhoto({ source: fs.createReadStream(`${__dirname}/../../assets/F.png`) });
    if (msg === 'нет') await ctx.reply('Говна пакет');
    if (msg === 'а') await ctx.reply('В жопе нога');

    return next!();
  }

  @DeleteRequestMessage()
  @ReplyWithError()
  @CommandTemplate([CommandType.COMMAND, optional(CommandType.RANGE)])
  private static async roll(ctx: Context): Promise<Message> {
    if (
      !ctx.message
      || !('text' in ctx.message)
    ) {
      throw new Error('Wrong context');
    }

    const username = getUsernameFromContext(ctx);
    const payload = ctx.message.text.split(' ')[1];

    let from = 1;
    let to = 100;

    if (payload) {
      const parameters = payload.split('-');

      from = parseInt(parameters[0], 10);
      to = parseInt(parameters[1], 10);

      if (!from || !to) {
        throw new RepliableError('Wrong format', ctx);
      }

      if (!Number.isInteger(from) || !Number.isInteger(to)) {
        throw new RepliableError('Wrong data', ctx);
      }
    }

    return ctx.reply(`${username} рандомит ${Math.floor(Math.random() * (to - from + 1) + from)}`);
  }

  @DeleteRequestMessage()
  private async coinFlip(ctx: Context): Promise<Message> {
    const username = getUsernameFromContext(ctx);
    const flipResult = Math.floor(Math.random() * 2) === 0 ? 'Heads' : 'Tails';

    await this.statRepo.incrementStatCount(flipResult.toLowerCase());

    return ctx.reply(`${username} выкидывает ${flipResult}`);
  }

  @DeleteRequestMessage()
  @DeleteLastMessage(BotMessage.FLIP_STAT)
  private async coinFlipStat(ctx: Context): Promise<Message> {
    const tailsCount = await this.statRepo.getStatCount(CoinSide.TAILS);
    const headsCount = await this.statRepo.getStatCount(CoinSide.HEADS);
    const tailsStat = Math.round((tailsCount / (tailsCount + headsCount)) * 100);
    const headsStat = Math.round((headsCount / (tailsCount + headsCount)) * 100);

    return ctx.reply(
      `Tails - ${tailsStat || 0}% - ${tailsCount} раз\n`
    + `Heads - ${headsStat || 0}% - ${headsCount} раз`,
    );
  }

  protected initProps(): void {
    this.categoryName = CommandCategory.TRASH;
  }

  protected initListeners(): BotListener[] {
    return [
      {
        type: BotCommandType.COMMAND,
        name: TrashCommand.FLIP,
        description: 'Бросить монетку',
        callback: (ctx): Promise<Message> => this.coinFlip(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: TrashCommand.ROLL,
        description: 'Случайное число 1-100 либо min-max',
        callback: (ctx): Promise<Message> => TrashService.roll(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: TrashCommand.FLIP_STAT,
        description: 'Статистика по броскам монеток',
        callback: (ctx): Promise<Message> => this.coinFlipStat(ctx),
      },
    ] as Array<BotListener>;
  }
}
