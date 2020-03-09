import { Bot, BotCommandType, BotEvent } from "../core/bot";
import { ContextMessageUpdate } from "telegraf";
import fs from 'fs';
import { PromisifiedRedis, Redis } from "../core/redis";

enum TrashCommand {
    FLIP = 'flip',
    ROLL = 'roll',
    FLIP_STAT = 'flip_stat',
    BIBA = 'biba',
    UNRANKED_BIBA = 'unbiba',
    BIBA_TABLE = 'biba_table'
}

interface Biba {
    size: string;
    time: string;
    username: string;
}

const POSITIVE_BIBA = 'Так держать!';
const NEGATIVE_BIBA = 'Чет ты спустил малясь...';

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
            { type: BotCommandType.COMMAND, name: TrashCommand.BIBA, callback: (ctx) => this.bibaMetr(ctx) },
            { type: BotCommandType.COMMAND, name: TrashCommand.UNRANKED_BIBA, callback: (ctx) => this.unrankedBibaMetr(ctx) },
            { type: BotCommandType.COMMAND, name: TrashCommand.BIBA_TABLE, callback: (ctx) => this.bibaTable(ctx) },
            { type: BotCommandType.ON, name: BotEvent.MESSAGE, callback: (ctx) => this.trashHandler(ctx) },
        ]);
    }

    private async trashHandler(ctx: ContextMessageUpdate) {
        if (!ctx.message || !ctx.message.text) return;
        
        if (ctx.message!.text!.toLowerCase().includes('один хуй'))
            await ctx.reply(`Не "один хуй", а "однохуйственно". Учи рузкий блядь`);
        if (ctx.message!.text!.toLowerCase().includes('иди нахуй'))
            await ctx.reply(`Сам иди нахуй`);
        if (ctx.message!.text!.toLowerCase() === 'f') 
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

    private async bibaMetr(ctx: ContextMessageUpdate) {
        const biba = Math.floor(Math.random() * (35 + 1));
        let bibaMessage = `У @${ctx.message?.from?.username} биба ${biba} см`;

        const lastBiba = JSON.parse(await this.redis.getAsync(`biba:${ctx.message?.from?.id}`));

        if (lastBiba) {
            if ((Math.abs(+new Date() - +new Date(lastBiba.time)) / 3600000) < +process.env.HOURS_BETWEEN_BIBAS!)
                return ctx.reply('Ты сегодня уже мерял бибу, приходи завтра');
            bibaMessage = `У @${ctx.message?.from?.username} биба ${biba} см, в прошлый раз была ${lastBiba.size} см. ${biba - lastBiba.size > 0 ? POSITIVE_BIBA : NEGATIVE_BIBA}`
        }

        await this.redis.setAsync(`biba:${ctx.message?.from?.id}`, JSON.stringify({ size: biba, time: new Date().toISOString(), username: ctx.message?.from?.username }));

        await ctx.reply(bibaMessage);
    }

    private async unrankedBibaMetr(ctx: ContextMessageUpdate) {
        await ctx.reply(`У @${ctx.message?.from?.username} биба ${Math.floor(Math.random() * (35 + 1))} см`);
    }

    private async bibaTable(ctx: ContextMessageUpdate) {
        const allBibasKeys: Array<string> = await this.redis.keysAsync('biba:*');
        const allBibas: Array<Biba> = (await this.redis.mgetAsync(allBibasKeys)).map((rawBiba: string) => JSON.parse(rawBiba));
        allBibas.sort((biba1, biba2) => (biba1.size < biba2.size) ? 1 : -1);

        const message = allBibas.map((biba, index) => `${index + 1}. ${biba.username} - ${biba.size} см`);

        ctx.reply(message.join('\n'));
    }

    private async roll(ctx: ContextMessageUpdate) {
        if (!ctx.message || !ctx.message.text) return ctx.reply('Empty message');

        const payload = ctx.message.text.split(TrashCommand.ROLL)[1].trim();
        
        let from = 1;
        let to = 100;

        if (payload) {
            const parameters = payload.split('-');

            if (!parameters[0] || !parameters[1]) return ctx.reply('Wrong format');

            from = +parameters[0];
            to = +parameters[1];
        }

        await ctx.reply(Math.floor(Math.random() * (to - from + 1) + from).toString());
    }
}