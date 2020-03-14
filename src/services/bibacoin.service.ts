import { Bot, BotCommandType } from "../core/bot";
import { ContextMessageUpdate, Markup } from "telegraf";
import { PromisifiedRedis, Redis } from "../core/redis";
import {
    BibacoinAction,
    BibacoinProduct,
    ZERO_BALANCE,
    NO_BIBA_TO_BUY,
    BibacoinActivity
} from "../types/services/bibacoin.service.types";
import { BibacoinCommand } from "../types/globals/commands.types";
import { BibaService } from "./biba.service";
import { getPriceByMessage, getProductsList, getProductPrice, getActionByProduct, getPriceByActivity, getActivitiesList } from "../utils/shop.helper";

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
            { type: BotCommandType.COMMAND, name: BibacoinCommand.SHOP, callback: (ctx) => this.sendProductsList(ctx) },
            { type: BotCommandType.COMMAND, name: BibacoinCommand.INCOME_LIST, callback: (ctx) => this.sendIncomeList(ctx) },
            { type: BotCommandType.ACTION, name: BibacoinAction.BUY_CM, callback: (ctx) => this.buyOneCM(ctx) },
            { type: BotCommandType.ACTION, name: BibacoinAction.BUY_REROLL, callback: (ctx) => this.buyReroll(ctx) },
        ]);
    }

    // --- SECTION [HANDLERS] -----------------------------------------------------------------------------------------

    public async addMessageCoins(ctx: ContextMessageUpdate, next: any) {
        if (!ctx.message) return;

        const currentBalance = (await this.redis.getAsync(`coin:${ctx.chat!.id}:${ctx.message!.from!.id}`)) || 0;

        const messagePrice = getPriceByMessage(ctx.message);

        const newBalance = parseFloat(currentBalance) + messagePrice;

        await this.redis.setAsync(`coin:${ctx.chat!.id}:${ctx.message!.from!.id}`, newBalance.toString());

        return next();
    }

    private async sendProductsList(ctx: ContextMessageUpdate) {
        const list = getProductsList();

        return ctx.reply('За бибакоины можно купить:',
            Markup.inlineKeyboard(
                list.map(product => [Markup.callbackButton(this.getProductActionContext(product), getActionByProduct(product))])
            ).extra()
        );
    }

    private async sendIncomeList(ctx: ContextMessageUpdate) {
        const list = getActivitiesList();

        await ctx.reply(list.map(activity => {
            return `${this.getActivityContext(activity)}`
        }).join('\n'));
    }

    private async buyReroll(ctx: ContextMessageUpdate) {
        try {
            const price = getProductPrice(BibacoinProduct.BIBA_REROLL);
            await this.hasEnoughCredits(ctx.from!.id, ctx.chat!.id, price);
            
            await this.bibaService.bibaMetr(ctx, true);

            const balance = await this.newTransaction(ctx.from!.id, ctx.chat!.id, price);

            await ctx.answerCbQuery(`Реролл куплен! На счету осталось ${balance} коинов`);

        } catch (e) {
            await ctx.answerCbQuery(e.message);

            throw e;
        }
    }

    private async buyOneCM(ctx: ContextMessageUpdate) {
        try {
            const price = getProductPrice(BibacoinProduct.BIBA_CM);
            await this.hasEnoughCredits(ctx.from!.id, ctx.chat!.id, price);

            const currentBiba = JSON.parse(await this.redis.getAsync(`biba:${ctx.chat!.id}:${ctx?.from?.id}`));

            if (!currentBiba) return ctx.answerCbQuery(NO_BIBA_TO_BUY)

            currentBiba.size = currentBiba.size + 1;

            await this.redis.setAsync(`biba:${ctx.chat!.id}:${ctx.from!.id}`, JSON.stringify(currentBiba));

            const balance = await this.newTransaction(ctx.from!.id, ctx.chat!.id, price)
            await ctx.answerCbQuery(`Биба увеличена на один см. Теперь ${currentBiba.size}см. На счету осталось ${balance} коинов`);

        } catch (e) {
            await ctx.answerCbQuery(e.message);

            throw e;
        }
    }

    private async hasEnoughCredits(userId: number, chatId: number, value: number): Promise<boolean> {
        const currentBalance = (await this.redis.getAsync(`coin:${chatId}:${userId}`)) || 0;
        if (currentBalance >= value) {
            return true;
        } else {
            throw new Error(`Недостаточно бибакоинов. Требуется ${value}, у тебя ${currentBalance}`);
        }
    }

    private async newTransaction(userId: number, chatId: number, value: number) {
        const currentBalance = (await this.redis.getAsync(`coin:${chatId}:${userId}`)) || 0;

        const newBalance = currentBalance - value;
        await this.redis.setAsync(`coin:${chatId}:${userId}`, newBalance);

        return newBalance;
    }

    // --- SECTION [GETTERS] ------------------------------------------------------------------------------------------

    private async getBalance(ctx: ContextMessageUpdate) {
        const balance = await this.redis.getAsync(`coin:${ctx.chat!.id}:${ctx.message?.from?.id}`);
        const message = balance ? `У тебя на счету ${balance} бибакоинов` : ZERO_BALANCE
        await ctx.reply(message);
    }

    private getActivityContext(activity: BibacoinActivity) {
        let message: string;

        switch (activity) {
            case BibacoinActivity.MESSAGE: message = 'Сообщение'; break;
            case BibacoinActivity.PHOTO: message = 'Мемас'; break;
            case BibacoinActivity.STICKER: message = 'Стикер'; break;
            case BibacoinActivity.VIDEO: message = 'Видос'; break;
            case BibacoinActivity.VOICE: message = 'Войс'; break;
            default: message = 'Пока нет описания этой активности';
        }

        return `${message} - 💰${getPriceByActivity(activity)}¢`;
    }

    private getProductActionContext(product: BibacoinProduct): string {
        let message: string;

        switch (product) {
            case BibacoinProduct.BIBA_CM: message = `+1 см бибы`; break;
            case BibacoinProduct.BIBA_REROLL: message = `Зароллить заново`; break;
            default: return 'No description yet';
        }

        return `${message} 💰${getProductPrice(product)}¢`;
    }
}