import { Bot, BotCommandType, BotEvent } from "../core/bot";
import { ContextMessageUpdate } from "telegraf";
import fs from 'fs';

enum TrashCommand {
    FLIP = 'flip',
    ROLL = 'roll'
}

export class TrashService {
    private static instance: TrashService;

    private constructor(
        private readonly bot: Bot
    ) {
        this.initListeners();
    }

    public static getInstance(): TrashService {
        if (!TrashService.instance)
            TrashService.instance = new TrashService(Bot.getInstance());
        
        return TrashService.instance;
    }

    private initListeners() {
        this.bot.addListeners([
            { type: BotCommandType.COMMAND, name: TrashCommand.FLIP, callback: (ctx) => this.coinFlip(ctx) },
            { type: BotCommandType.COMMAND, name: TrashCommand.ROLL, callback: (ctx) => this.roll(ctx) },
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

        await ctx.reply((Math.floor(Math.random() * 2) == 0) ? 'Heads' : 'Tails');
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