import { Bot, BotCommandType } from "../core/bot";
import { ContextMessageUpdate, Markup } from "telegraf";
import { PromisifiedRedis, Redis } from "../core/redis";
import { IncomingMessage } from "telegraf/typings/telegram-types";

enum BibacoinCommand {
    BALANCE = 'balance',
    BUY = 'buy',
    LIST = 'list'
}

enum BibacoinCredit {
    MESSAGE = 0.5,
    PHOTO = 1.5,
    VOICE = -1,
    STICKER = 0.5,
}

enum BibacoinPrice {
    BIBA_CM = 15,
    BIBA_REROLL = 100,
}

enum BibacoinAction {
    BUY_CM = 'buy_cm',
    BUY_REROLL = 'buy_reroll',
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
        if (!ctx.message) return;

        const currentBalance = await this.redis.getAsync(`coin:${ctx.message?.from?.id}`) || 0;

        const messagePrice = this.getPriceByMessage(ctx.message);

        const newBalance = parseFloat(currentBalance) + messagePrice;

        await this.redis.setAsync(`coin:${ctx.message?.from?.id}`, newBalance);

        next();
    }

    private async sendProductsList(ctx: ContextMessageUpdate) {
        const list = this.productsList;

        return ctx.reply('За бибакоины можно купить:',
            Markup.inlineKeyboard([
                [Markup.callbackButton(`+1 см бибы 💰${BibacoinPrice.BIBA_CM}¢`, BibacoinAction.BUY_CM)],
            ]).extra()
        );

        // await ctx.reply(list.map((product, index) =>
        //     `${index + 1}. ${product.toLowerCase()} - ${this.getProductDescription(product)}`
        // ).join('\n'));
    }

    private async buy(ctx: ContextMessageUpdate) {
        const product: string = ctx.message!.text!.split(' ')[1];

        if (!product) return ctx.reply('Нужно указать имя товара');

        const price = (<any>BibacoinPrice)[product.toUpperCase()]

        await ctx.reply(price);
    }

    private async buyOneCM(ctx: ContextMessageUpdate) {
        this.newTransaction(ctx.from!.id, BibacoinPrice.BIBA_CM).then(async (balance) => {

            const currentBiba = JSON.parse(await this.redis.getAsync(`biba:${ctx.chat!.id}:${ctx?.from?.id}`));
            currentBiba.size = currentBiba.size + 1;

            await this.redis.setAsync(`biba:${ctx.chat!.id}:${ctx.from!.id}`, JSON.stringify(currentBiba));
        
            await ctx.answerCbQuery(`Биба увеличена на один см. Теперь ${currentBiba.size}см. На счету осталось ${balance} коинов`);

        }).catch(async (e) => {
            await ctx.answerCbQuery(e)
        });
    }

    private async newTransaction(userId: number, value: number) {
        const currentBalance = await this.redis.getAsync(`coin:${userId}`) || 0;
        return new Promise(async (resolve, reject) => {
            if (currentBalance < value) {
                reject('Недостаточно бибакоинов на счету.');
            }else{
                const newBalance = currentBalance - value;
                await this.redis.setAsync(`coin:${userId}`, newBalance);
                resolve(newBalance);
            }
        })
    }

    private get productsList() {
        return Object.keys(BibacoinPrice).filter(price => parseInt((<any>BibacoinPrice)[price]));
    }

    private getProductDescription(productName: string): string {
        switch (productName) {
            case BibacoinPrice[BibacoinPrice.BIBA_CM]: return 'добавь 1 см к сегодняшней бибе';
            case BibacoinPrice[BibacoinPrice.BIBA_REROLL]: return 'испытай удачу ещё раз';
            default: return 'No description yet'
        }
    }

    private getPriceByMessage(message: IncomingMessage): number {
        if (message.photo) return BibacoinCredit.PHOTO;
        if (message.sticker) return BibacoinCredit.STICKER;
        if (message.voice) return BibacoinCredit.VOICE;
        return BibacoinCredit.MESSAGE;
    };

    private initListeners() {
        this.bot.addListeners([
            { type: BotCommandType.COMMAND, name: BibacoinCommand.BALANCE, callback: (ctx) => this.getBalance(ctx) },
            { type: BotCommandType.COMMAND, name: BibacoinCommand.BUY, callback: (ctx) => this.buy(ctx) },
            { type: BotCommandType.COMMAND, name: BibacoinCommand.LIST, callback: (ctx) => this.sendProductsList(ctx) },
            { type: BotCommandType.ACTION, name: BibacoinAction.BUY_CM, callback: (ctx) => this.buyOneCM(ctx) },
            { type: BotCommandType.ACTION, name: BibacoinAction.BUY_REROLL, callback: (ctx) => ctx.answerCbQuery(`Oh! Great choice`) },
        ]);
    }

    private async getBalance(ctx: ContextMessageUpdate) {
        const balance = await this.redis.getAsync(`coin:${ctx.message?.from?.id}`);
        const message = balance ? `У тебя на счету ${balance} бибакоинов` : ZERO_BALANCE
        await ctx.reply(message);
    }
}