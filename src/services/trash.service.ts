import { ContextMessageUpdate } from 'telegraf';
import fs from 'fs';
import { Bot, BotCommandType } from '../core/bot';
import { PromisifiedRedis, Redis } from '../core/redis';
import { TrashCommand } from '../types/globals/commands.types';

const FUCK_TRIGGERS = [
  'иди нахуй',
  'пошёл нахуй',
  'пошел нахуй',
];

export default class TrashService {
  private static instance: TrashService;

  private constructor(
    private readonly bot: Bot,
    private readonly redis: PromisifiedRedis,
  ) {
    this.initListeners();
  }

  public static getInstance(): TrashService {
    if (!TrashService.instance) TrashService.instance = new TrashService(Bot.getInstance(), Redis.getInstance().client);

    return TrashService.instance;
  }

  public static async trashHandler(ctx: ContextMessageUpdate, next: Function | undefined): Promise<Function> {
    if (!ctx.message || !ctx.message.text) return next!();

    const msg = ctx.message.text.toLowerCase();

    if (FUCK_TRIGGERS.some((s) => msg.includes(s))) await ctx.reply('Сам иди нахуй');
    if (msg.includes('соси')) await ctx.reply('Сам соси!');
    if (msg === 'да') await ctx.reply('пизда');
    if (msg === 'нет ты') await ctx.reply('Нет ты');
    if (msg.includes('один хуй')) await ctx.reply('Не "один хуй", а "однохуйственно". Учи рузкий блядь');
    if (msg === 'f') await ctx.replyWithPhoto({ source: fs.createReadStream(`${__dirname}/../../assets/F.png`) });
    if (msg === 'нет') await ctx.reply('говна пакет');

    return next!();
  }

  private static async roll(ctx: ContextMessageUpdate): Promise<void> {
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply('Empty message');
      return;
    }

    const payload = ctx.message.text.split(TrashCommand.ROLL)[1].trim();

    let from = 1;
    let to = 100;

    if (payload) {
      const parameters = payload.split('-');

      const min = parseInt(parameters[0], 10);
      const max = parseInt(parameters[1], 10);

      if (!min || !max) {
        await ctx.reply('Wrong format');
        return;
      }

      if (!Number.isInteger(min) || !Number.isInteger(max)) {
        await ctx.reply('Wrong data given');
        return;
      }

      from = min;
      to = max;
    }

    await ctx.reply(Math.floor(Math.random() * (to - from + 1) + from).toString());
  }

  private initListeners(): void {
    this.bot.addListeners([
      {
        type: BotCommandType.COMMAND,
        name: TrashCommand.FLIP,
        callback: (ctx): Promise<void> => this.coinFlip(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: TrashCommand.ROLL,
        callback: (ctx): Promise<void> => TrashService.roll(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: TrashCommand.FLIP_STAT,
        callback: (ctx): Promise<void> => this.coinFlipStat(ctx),
      },
    ]);
  }

  private async coinFlip(ctx: ContextMessageUpdate): Promise<void> {
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply('Empty message');
      return;
    }

    const flipResult = Math.floor(Math.random() * 2) === 0 ? 'Heads' : 'Tails';
    const currentResultCount = await this.redis.getAsync(`${flipResult.toLowerCase()}:count`);
    const newResultCount = currentResultCount ? +currentResultCount + 1 : 1;

    await this.redis.setAsync(`${flipResult.toLowerCase()}:count`, newResultCount.toString());

    await ctx.reply(flipResult);
  }

  private async coinFlipStat(ctx: ContextMessageUpdate): Promise<void> {
    const tailsCount = +await this.redis.getAsync('tails:count');
    const headsCount = +await this.redis.getAsync('heads:count');

    await ctx.reply(
      `Tails - ${Math.round((tailsCount / (tailsCount + headsCount)) * 100)}%\n`
      + `Heads - ${Math.round((headsCount / (tailsCount + headsCount)) * 100)}%`,
    );
  }
}
