import Telegraf, { ContextMessageUpdate,  } from 'telegraf';
import { MessageSubTypes } from 'telegraf/typings/telegram-types';

export enum BotEvent {
    MESSAGE = 'message'
}

export enum BotCommandType {
    ON = 'on',
    COMMAND = 'command'
}

interface BotListener {
    type: BotCommandType;
    name: MessageSubTypes | string;
    callback(ctx: ContextMessageUpdate): void;
}

export class Bot {
    private static instance: Bot;
    private listeners: Array<BotListener> = [];

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

    public addListeners(list: Array<BotListener>) {
        this.listeners = [...this.listeners, ...list];
    }

    public applyListeners() {
        this.listeners.forEach((listener) => this.app[listener.type](listener.name as MessageSubTypes, listener.callback))
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
