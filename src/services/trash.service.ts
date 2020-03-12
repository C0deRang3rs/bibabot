import { Bot, BotCommandType, BotEvent } from "../core/bot";
import { ContextMessageUpdate } from "telegraf";
import fs from 'fs';
import { PromisifiedRedis, Redis } from "../core/redis";

enum TrashCommand {
    FLIP = 'flip',
    ROLL = 'roll',
    FLIP_STAT = 'flip_stat',
}

const FUCK_TRIGGERS = [
    'иди нахуй',
    'пошёл нахуй',
    'пошел нахуй'
];

export class TrashService {
    private static instance: TrashService;

    private constructor(
        private readonly bot: Bot,
        private readonly redis: PromisifiedRedis
    ) {
        this.initListeners();
    }

    public static getInstance(): TrashService {
        if (!TrashService.instance)
            TrashService.instance = new TrashService(Bot.getInstance(), Redis.getInstance().client);
        
        return TrashService.instance;
    }

    private initListeners() {
        this.bot.addListeners([
            { type: BotCommandType.COMMAND, name: TrashCommand.FLIP, callback: (ctx) => this.coinFlip(ctx) },
            { type: BotCommandType.COMMAND, name: TrashCommand.ROLL, callback: (ctx) => this.roll(ctx) },
            { type: BotCommandType.COMMAND, name: TrashCommand.FLIP_STAT, callback: (ctx) => this.coinFlipStat(ctx) },
            { type: BotCommandType.ON, name: BotEvent.MESSAGE, callback: (ctx) => this.trashHandler(ctx) },
        ]);
    }

    private async trashHandler(ctx: ContextMessageUpdate) {
        if (!ctx.message || !ctx.message.text) return;
        
        const msg = ctx.message!.text!.toLowerCase();

        if (FUCK_TRIGGERS.some(s=>msg.includes(s)))
            await ctx.reply(`Сам иди нахуй`);
        if (msg.includes('соси'))
            await ctx.reply(`Сам соси!`);
        if (msg === 'да')
            await ctx.reply(`пизда`);
        if (msg === 'да.')
            await ctx.reply(`пизда.`);
        if (msg === 'нет ты')
            await ctx.reply(`Нет ты`);
        if (msg.includes('один хуй'))
            await ctx.reply(`Не "один хуй", а "однохуйственно". Учи рузкий блядь`);
        if (msg === 'f') 
            await ctx.replyWithPhoto({ source: fs.createReadStream(__dirname + '/../../assets/F.png') });
    }

    private async coinFlip(ctx: ContextMessageUpdate) {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Empty message');

        const flipResult = (Math.floor(Math.random() * 2) == 0) ? 'Heads' : 'Tails';

        const currentResultCount = await this.redis.getAsync(`${flipResult.toLowerCase()}:count`);

        if (currentResultCount)
            await this.redis.setAsync(`${flipResult.toLowerCase()}:count`, +currentResultCount + 1)
        else
            await this.redis.setAsync(`${flipResult.toLowerCase()}:count`, 1)

        await ctx.reply(flipResult);
    }

    private async coinFlipStat(ctx: ContextMessageUpdate) {
        const tailsCount = +(await this.redis.getAsync('tails:count'));
        const headsCount = +(await this.redis.getAsync('heads:count'));

        await ctx.reply(
            `Tails - ${Math.round((tailsCount / (tailsCount + headsCount)) * 100)}%\nHeads - ${Math.round((headsCount / (tailsCount + headsCount)) * 100)}%`
        );
    }

    private async roll(ctx: ContextMessageUpdate) {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Empty message');

        const payload = ctx.message.text.split(TrashCommand.ROLL)[1].trim();
        
        let from = 1;
        let to = 100;

        if (payload) {
            const parameters = payload.split('-');

            let min = parseInt(parameters[0]);
            let max = parseInt(parameters[1]);

            if (!min || !max) return ctx.reply('Wrong format');

            if (!Number.isInteger(min) || !Number.isInteger(max)) return ctx.reply('Wrong data given');

            from = min;
            to = max;
        }

        await ctx.reply(Math.floor(Math.random() * (to - from + 1) + from).toString());
    }
}