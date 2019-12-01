import Telegraf, {ContextMessageUpdate} from 'telegraf';
import express from 'express';
import {Chat} from 'telegraf/typings/telegram-types';

const generateName = require('./services/generate-name.service');

enum CommandType {
    START = 'start',
    STOP = 'stop',
    RENAME = 'rename'
}

class Bot {
    private bot: Telegraf<ContextMessageUpdate>;
    private intervals: Record<string, NodeJS.Timeout> = {};
    private chats: Record<string, Chat> = {};

    constructor() {
        this.bot = new Telegraf(process.env.BOT_TOKEN as string);
        this.initListeners();
        this.startPooling();
    }

    private startPooling() {
        this.bot.launch().then(() => console.log('Bot is up'));
    }

    private initListeners() {
        this.bot.command(CommandType.START, async (ctx) => await this.handleProcessor(ctx, CommandType.START));
        this.bot.command(CommandType.STOP, async (ctx) => await this.handleProcessor(ctx, CommandType.STOP));
        this.bot.command(CommandType.RENAME, async (ctx) => await this.handleProcessor(ctx, CommandType.RENAME));
    }

    private async handleProcessor(ctx: ContextMessageUpdate, type: CommandType) {
        try {
            switch (type) {
                case CommandType.START:
                    await this.onStart(ctx);
                    break;
                case CommandType.STOP:
                    await this.onStop(ctx);
                    break;
                case CommandType.RENAME:
                    await this.onRename(ctx);
                    break;
            }
        } catch (e) {
            console.error(e);
            await this.bot.telegram.sendMessage('-395013027', e.message)
        }
    }

    private async onStart(ctx: ContextMessageUpdate) {
        if (!ctx.chat) return;

        if (!!this.intervals[ctx.chat.id]) return ctx.reply('Уже запущен.');

        this.intervals[ctx.chat.id] = setInterval(async () => await this.changeTitle(ctx), 12 * 60 * 60 * 1000);

        await ctx.reply('Ща как буду раз в 12 часов имена менять');
        await this.changeTitle(ctx);
        console.log(`[${ctx.chat.id}] Started`);
    }

    private async onStop(ctx: ContextMessageUpdate) {
        if (!ctx.chat) return;

        clearInterval(this.intervals[ctx.chat.id]);
        console.log(`[${ctx.chat.id}] Stopped`);
        await ctx.reply('Всё, больше не буду');
    }

    private async onRename(ctx: ContextMessageUpdate) {
        if (!ctx.chat) return;

        await this.changeTitle(ctx);
        console.log(`[${ctx.chat.id}] Renamed`);
    }

    private async changeTitle(ctx: ContextMessageUpdate) {
        if (!ctx.chat) return;

        const newName = await generateName();
        console.log(`[${ctx.chat.id}] New name: ${newName}`);
        await (this.bot.telegram as any).setChatTitle(ctx.chat.id, newName);

        if (!this.chats[ctx.chat.id.toString()]) this.chats[ctx.chat.id] = ctx.chat;
    }
}

new Bot();

const rest = express();

rest.use(express.json());
rest.use(express.urlencoded({extended: false}));

rest.get('/chats', (req: any, res: any) => {
});

rest.listen(process.env.PORT || 3000);