import Telegraf, { ContextMessageUpdate } from 'telegraf';

export class Bot {
    private static instance: Bot;

    public app!: Telegraf<ContextMessageUpdate>;

    private constructor() {
        this.initMain();
        this.initHandlers();
        this.startPooling();
    }

    public static getInstance(): Bot {
        if (!Bot.instance)
            Bot.instance = new Bot();

        return Bot.instance;
    }

    public async handleError(err: Error) {
        console.log('Error: ' + err.message);
        await this.app.telegram.sendMessage(process.env.DEBUG_CHAT_ID as string, 'Error: ' + err.message)
    }

    private async initMain() {
        this.app = new Telegraf(process.env.BOT_TOKEN as string);
    }

    private async startPooling() {
        await this.app.launch();
        console.log('Bot is up');
    }

    private initHandlers() {
        this.app.catch((err: Error) => this.handleError(err));
    }
}
