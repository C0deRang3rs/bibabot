import { Bot, BotCommandType } from "../core/bot";
import { ContextMessageUpdate } from "telegraf";
import { PromisifiedRedis, Redis } from "../core/redis";

enum BibacoinCommand {
    BALANCE = 'balance'
}

enum BibacoinPrice {
    MESSAGE = 1,
}

const ZERO_BALANCE = 'Пока что у тебя нет бибакоинов, ты можешь получить их за любую активность в чате';

export class BibacoinService {
    private static instance: BibacoinService;

    private constructor(
        private readonly bot: Bot,
        private readonly redis: PromisifiedRedis
    ) {
        this.initListeners();
    }

    public static getInstance(): BibacoinService {
        if (!BibacoinService.instance)
            BibacoinService.instance = new BibacoinService(Bot.getInstance(), Redis.getInstance().client);
        
        return BibacoinService.instance;
    }

    public async addMessageCoins(ctx: ContextMessageUpdate, next: any) {
        const currentBalance = await this.redis.getAsync(`coin:${ctx.message?.from?.id}`);
        await this.redis.setAsync(`coin:${ctx.message?.from?.id}`, currentBalance ? (+currentBalance + BibacoinPrice.MESSAGE).toString() : BibacoinPrice.MESSAGE.toString());
        next();
    }

    private initListeners() {
        this.bot.addListeners([
            { type: BotCommandType.COMMAND, name: BibacoinCommand.BALANCE, callback: (ctx) => this.getBalance(ctx) },
        ]);
    }

    private async getBalance(ctx: ContextMessageUpdate) {
        const balance = await this.redis.getAsync(`coin:${ctx.message?.from?.id}`);
        const message = balance ? `У тебя на счету ${balance} бибакоинов` : ZERO_BALANCE
        await ctx.reply(message);
    }
}