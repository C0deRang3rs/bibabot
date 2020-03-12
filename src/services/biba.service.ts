import { Bot, BotCommandType } from "../core/bot";
import { ContextMessageUpdate } from "telegraf";
import { Redis, PromisifiedRedis } from "../core/redis";
import Bull = require("bull");

enum BibaCommand {
    BIBA = 'biba',
    UNRANKED_BIBA = 'unbiba',
    BIBA_TABLE = 'biba_table',
}

interface Biba {
    size: string;
    username: string;
    outdated: boolean;
}

const POSITIVE_BIBA = 'Так держать!';
const NEGATIVE_BIBA = 'Чет ты спустил малясь...';
const MEASURED_BIBA = 'Ты сегодня уже мерял бибу, приходи завтра';

export class BibaService {
    private static instance: BibaService;

    private constructor(
        private readonly bot: Bot,
        private readonly redis: PromisifiedRedis
    ) {
        this.initListeners();
    }

    public static getInstance(): BibaService {
        if (!BibaService.instance)
            BibaService.instance = new BibaService(Bot.getInstance(), Redis.getInstance().client);
        
        return BibaService.instance;
    }

    public async dailyBiba(done: Bull.DoneCallback) {
        const keys = await this.redis.keysAsync('auto:rename:*');
        const chats = keys.map((key: string) => key.split(':')[2]);

        for (const chat of chats) {
            console.log(`[${chat}] Daily biba`);

            const allBibasKeys: Array<string> = await this.redis.keysAsync(`biba:${chat}:*`);

            const message = await this.getDailyMessage(allBibasKeys);

            if (!allBibasKeys.length) return this.bot.app.telegram.sendMessage(chat, message);

            await this.bot.app.telegram.sendMessage(chat, message);

            for (const bibaKey of allBibasKeys) {
                const lastBiba: Biba = JSON.parse(await this.redis.getAsync(bibaKey));
                await this.redis.setAsync(bibaKey, JSON.stringify({ ...lastBiba, outdated: true }));
            }
        }

        done();
    }

    private initListeners() {
        this.bot.addListeners([
            { type: BotCommandType.COMMAND, name: BibaCommand.BIBA, callback: (ctx) => this.bibaMetr(ctx) },
            { type: BotCommandType.COMMAND, name: BibaCommand.UNRANKED_BIBA, callback: (ctx) => this.unrankedBibaMetr(ctx) },
            { type: BotCommandType.COMMAND, name: BibaCommand.BIBA_TABLE, callback: (ctx) => this.bibaTable(ctx) },
        ]);
    }

    private async bibaMetr(ctx: ContextMessageUpdate) {
        const biba = Math.floor(Math.random() * (35 + 1));
        let bibaMessage = `У @${ctx.message?.from?.username} биба ${biba} см`;

        const lastBiba: Biba = JSON.parse(await this.redis.getAsync(`biba:${ctx.chat!.id}:${ctx.message?.from?.id}`));

        if (lastBiba) {
            if (!lastBiba.outdated)
                return ctx.reply(MEASURED_BIBA);

            bibaMessage = `У @${ctx.message?.from?.username} биба ${biba} см, в прошлый раз была ${lastBiba.size} см. ${biba - parseInt(lastBiba.size) > 0 ? POSITIVE_BIBA : NEGATIVE_BIBA}`
        }

        await this.redis.setAsync(`biba:${ctx.chat!.id}:${ctx.message?.from?.id}`, JSON.stringify({ size: biba, username: ctx.message?.from?.username, outdated: false }));

        await ctx.reply(bibaMessage);
    }

    private async unrankedBibaMetr(ctx: ContextMessageUpdate) {
        await ctx.reply(`У @${ctx.message?.from?.username} биба ${Math.floor(Math.random() * (35 + 1))} см`);
    }

    private async bibaTable(ctx: ContextMessageUpdate) {
        const allBibasKeys: Array<string> = await this.redis.keysAsync(`biba:${ctx.chat!.id}:*`);

        let allBibas: Array<Biba> = (await this.redis.mgetAsync(allBibasKeys)).map((rawBiba: string) => JSON.parse(rawBiba));
        allBibas = allBibas.filter(biba => !biba.outdated);
        allBibas.sort((biba1, biba2) => (biba1.size < biba2.size) ? 1 : -1);

        if (!allBibas.length) return ctx.reply('Никто не мерял бибу(((\n\nТы можешь померять бибу с помощью команды /biba');

        const message = allBibas.map((biba, index) => `${index + 1}. ${biba.username} - ${biba.size} см`);

        ctx.reply(message.join('\n'));
    }

    private async getDailyMessage(allBibasKeys: Array<string>): Promise<string> {
        let allBibas: Array<Biba> = (await this.redis.mgetAsync(allBibasKeys)).map((rawBiba: string) => JSON.parse(rawBiba));
        allBibas = allBibas.filter(biba => !biba.outdated);
        allBibas.sort((biba1, biba2) => (biba1.size < biba2.size) ? 1 : -1);

        if (!allBibas.length) return 'Вчера никто не мерял бибу(((\n\nТы можешь померять бибу с помощью команды /biba';

        const topBiba = allBibas[0];
        const lowBiba = allBibas.pop();

        return `👑 Королевская биба сегодня у @${topBiba.username} - ${topBiba.size} см\n\n👌 Обсосом дня становится @${lowBiba?.username} - ${lowBiba?.size} см`;
    }
}