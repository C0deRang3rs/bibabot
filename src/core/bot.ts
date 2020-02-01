import Telegraf, { ContextMessageUpdate } from 'telegraf';
import { ChangeTitleService } from '../services/change-title.service';

export enum CommandType {
    START = 'start',
    STOP = 'stop',
    RENAME = 'rename',
    ITERATION_CHANGE = 'iteration_change'
}

export class Bot {
    private static instance: Bot;

    public bot!: Telegraf<ContextMessageUpdate>;

    private constructor(private changeTitleService: ChangeTitleService) {
        this.initMain();
        this.initListeners();
        this.startPooling();
    }

    public static getInstance(): Bot {
        if (!Bot.instance)
            Bot.instance = new Bot(ChangeTitleService.getInstance());

        return Bot.instance;
    }

    private async initMain() {
        this.bot = new Telegraf(process.env.BOT_TOKEN as string);
    }

    private async startPooling() {
        await this.bot.launch();
        console.log('Bot is up');
    }

    private initListeners() {
        this.bot.command(CommandType.START, async (ctx) => await this.changeTitleService.onStart(ctx));
        this.bot.command(CommandType.STOP, async (ctx) => await this.changeTitleService.onStop(ctx));
        this.bot.command(CommandType.RENAME, async (ctx) => await this.changeTitleService.onRename(ctx));
        this.bot.command(CommandType.ITERATION_CHANGE, async (ctx) => await this.changeTitleService.onIterationChange(ctx));
        this.bot.catch((err: Error) => this.handleError(err));
    }

    public async handleError(err: Error) {
        console.log('Error: ' + err.message);
        await this.bot.telegram.sendMessage(process.env.DEBUG_CHAT_ID as string, 'Error: ' + err.message)
    }
}
