import { Bot } from "../core/bot";
import { ContextMessageUpdate } from "telegraf";

export class TrashService {
    private static instance: TrashService;

    private constructor(
        private bot: Bot
    ) {
        this.initListeners();
    }

    public static getInstance(): TrashService {
        if (!TrashService.instance)
        TrashService.instance = new TrashService(Bot.getInstance());
        
        return TrashService.instance;
    }

    private initListeners() {
        this.bot.app.on('message', async (ctx) => await this.trashHandler(ctx));
    }

    public async trashHandler(ctx: ContextMessageUpdate) {
        if (ctx.message!.text && ctx.message!.text.toLowerCase().includes('один хуй'))
            await ctx.reply(`Не "один хуй", а "однохуйственно". Учи рузкий блядь`);
    }
}