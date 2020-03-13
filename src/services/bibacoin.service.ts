import { Bot, BotCommandType } from "../core/bot";
import { ContextMessageUpdate, Markup } from "telegraf";
import { PromisifiedRedis, Redis } from "../core/redis";
import { IncomingMessage } from "telegraf/typings/telegram-types";
import {
    BibacoinAction,
    BibacoinProduct,
    ZERO_BALANCE,
    BibacoinPrice,
    BibacoinProductToActionMap,
    BibacoinCredit
} from "../types/services/bibacoin.service.types";
import { BibacoinCommand } from "../types/globals/commands.types";
import { BibaService } from "./biba.service";

export class BibacoinService {
    private static instance: BibacoinService;

    private constructor(
        private readonly bot: Bot,
        private readonly redis: PromisifiedRedis,
        private readonly bibaService: BibaService
    ) {
        this.initListeners();
    }

    public static getInstance(): BibacoinService {
        if (!BibacoinService.instance)
            BibacoinService.instance = new BibacoinService(
                Bot.getInstance(),
                Redis.getInstance().client,
                BibaService.getInstance(),
            );

        return BibacoinService.instance;
    }

    private initListeners() {
        this.bot.addListeners([
            { type: BotCommandType.COMMAND, name: BibacoinCommand.BALANCE, callback: (ctx) => this.getBalance(ctx) },
            { type: BotCommandType.COMMAND, name: BibacoinCommand.LIST, callback: (ctx) => this.sendProductsList(ctx) },
            { type: BotCommandType.ACTION, name: BibacoinAction.BUY_CM, callback: (ctx) => this.buyOneCM(ctx) },
            { type: BotCommandType.ACTION, name: BibacoinAction.BUY_REROLL, callback: (ctx) => this.buyReroll(ctx) },
        ]);
    }

    // --- SECTION [HANDLERS] -----------------------------------------------------------------------------------------

    public async addMessageCoins(ctx: ContextMessageUpdate, next: any) {
        if (!ctx.message) return;

        const currentBalance = (await this.redis.getAsync(`coin:${ctx.message?.from?.id}`)) || 0;

        const messagePrice = this.getPriceByMessage(ctx.message);

        const newBalance = parseFloat(currentBalance) + messagePrice;

        await this.redis.setAsync(`coin:${ctx.message?.from?.id}`, newBalance.toString());

        next();
    }

    private async sendProductsList(ctx: ContextMessageUpdate) {
        const list = this.getProductsList();

        return ctx.reply('За бибакоины можно купить:',
            Markup.inlineKeyboard(
                list.map(product => [Markup.callbackButton(this.getProductActionContext(product), this.getActionByProduct(product))])
            ).extra()
        );
    }

    private async buyReroll(ctx: ContextMessageUpdate) {
        try {
            const price = this.getProductPrice(BibacoinProduct.BIBA_REROLL);
            await this.hasEnoughCredits(ctx.from!.id, price);
            
            await this.bibaService.bibaMetr(ctx, true);

            const balance = await this.newTransaction(ctx.from!.id, price);

            await ctx.answerCbQuery(`Реролл куплен! На счету осталось ${balance} коинов`);

        } catch (e) {
            await ctx.answerCbQuery(e.message);

            // throw e;
        }
    }

    private async buyOneCM(ctx: ContextMessageUpdate) {
        try {
            const price = this.getProductPrice(BibacoinProduct.BIBA_CM);
            await this.hasEnoughCredits(ctx.from!.id, price);

            const currentBiba = JSON.parse(await this.redis.getAsync(`biba:${ctx.chat!.id}:${ctx?.from?.id}`));
            currentBiba.size = currentBiba.size + 1;

            await this.redis.setAsync(`biba:${ctx.chat!.id}:${ctx.from!.id}`, JSON.stringify(currentBiba));

            const balance = await this.newTransaction(ctx.from!.id, price)
            await ctx.answerCbQuery(`Биба увеличена на один см. Теперь ${currentBiba.size}см. На счету осталось ${balance} коинов`);

        } catch (e) {
            await ctx.answerCbQuery(e.message);

            // throw e;
        }
    }

    private async hasEnoughCredits(userId: number, value: number): Promise<boolean> {
        const currentBalance = (await this.redis.getAsync(`coin:${userId}`)) || 0;
        if (currentBalance >= value) {
            return true;
        } else {
            throw new Error(`Недостаточно бибакоинов. Требуется ${value}, у тебя ${currentBalance}`);
        }
    }

    private async newTransaction(userId: number, value: number) {
        const currentBalance = (await this.redis.getAsync(`coin:${userId}`)) || 0;

        const newBalance = currentBalance - value;
        await this.redis.setAsync(`coin:${userId}`, newBalance);

        return newBalance;
    }

    // --- SECTION [GETTERS] ------------------------------------------------------------------------------------------

    private async getBalance(ctx: ContextMessageUpdate) {
        const balance = await this.redis.getAsync(`coin:${ctx.message?.from?.id}`);
        const message = balance ? `У тебя на счету ${balance} бибакоинов` : ZERO_BALANCE
        await ctx.reply(message);
    }

    private getProductsList(): Array<BibacoinProduct> {
        return Object.keys(BibacoinPrice) as Array<BibacoinProduct>;
    }

    private getProductActionContext(product: BibacoinProduct): string {
        let message: string;

        switch (product) {
            case BibacoinProduct.BIBA_CM: message = `+1 см бибы`; break;
            case BibacoinProduct.BIBA_REROLL: message = `Зароллить заново`; break;
            default: return 'No description yet';
        }

        return `${message} 💰${this.getProductPrice(product)}¢`;
    }

    private getActionByProduct(product: BibacoinProduct): BibacoinAction {
        return BibacoinProductToActionMap[product];
    }

    private getProductPrice(product: BibacoinProduct): number {
        return BibacoinPrice[product];
    }

    private getPriceByMessage(message: IncomingMessage): number {
        if (message.photo) return BibacoinCredit.PHOTO;
        if (message.sticker) return BibacoinCredit.STICKER;
        if (message.voice) return BibacoinCredit.VOICE;
        return BibacoinCredit.MESSAGE;
    };
}