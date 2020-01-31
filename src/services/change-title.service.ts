import { ContextMessageUpdate } from "telegraf";
import { GenerateNameService } from '../services/generate-name.service';
import zipObject from 'lodash.zipobject';
import { CommandType, Bot } from "../core/bot";
import { Redis, PromisifiedRedis } from "../core/redis";
import Bull from "bull";

enum TimerUnits {
    MINUTES = 60000,
    HOURS = 3600000
}

export class ChangeTitleService {
    private static instance: ChangeTitleService;
    
    private iterationUnits = TimerUnits.MINUTES;
    private iterationTime = 1;

    private constructor(private redis: PromisifiedRedis) {}

    public static getInstance(): ChangeTitleService {
        if (!ChangeTitleService.instance)
            ChangeTitleService.instance = new ChangeTitleService(Redis.getInstance().client);
        
        return ChangeTitleService.instance;
    }

    get unitsName() {
        switch(this.iterationUnits) {
            case TimerUnits.HOURS:
                return this.iterationTime === 1 ? 'час' : this.iterationTime >= 2 && this.iterationTime <= 4 ? 'часа' : 'часов';
            case TimerUnits.MINUTES:
                return this.iterationTime === 1 ? 'минуту' : this.iterationTime >= 2 && this.iterationTime <= 4 ? 'минуты' : 'минут';
        }
    }

    public async resolveRenames(done: Bull.DoneCallback) {
        const keys = await this.redis.keysAsync('auto:rename:*');
        if (!keys.length) return console.log('No timers');

        const ids = keys.map((key: string) => key.split(':')[2]);
        const values = await this.redis.mgetAsync(keys);
        const objectedTimers: Record<string, string> = zipObject(ids, values);

        for (const id of Object.keys(objectedTimers)) {
            console.log(`[${id}] Processing`);
            if ((Math.abs(+new Date() - +new Date(objectedTimers[id])) / this.iterationUnits) > this.iterationTime) {
                console.log(`[${id}] Auto-rename`);
                await this.changeTitle(parseInt(id));
                await this.redis.setAsync(`auto:rename:${id}`, new Date().toISOString());
            } else {
                console.log(`[${id}] Отказано нахуй`);
            }
        }

        done();
    }

    public async onIterationChange(ctx: ContextMessageUpdate) {
        const commandData = ctx.message!.text!.split(CommandType.ITERATION_CHANGE)[1].trim().split(' ');

        switch(commandData[1]) {
            case 'hours':
                this.iterationUnits = TimerUnits.HOURS;
                break;
            case 'minutes':
                this.iterationUnits = TimerUnits.MINUTES;
                break;
            default: return ctx.reply('Wrong time format, try something like: 2 hours, 5 minutes, 1 hours(lmao)');
        }
        this.iterationTime = +commandData[0];

        console.log(`[${ctx.chat!.id}] Interval - ${this.iterationTime}, units - ${this.iterationUnits}`);
        ctx.reply('Iteration interval changed');
    }

    public async onStart(ctx: ContextMessageUpdate) {
        if (!ctx.chat) return;

        const isTimerActive = await this.redis.getAsync(`auto:rename:${ctx.chat.id.toString()}`);

        if (isTimerActive) return ctx.reply('Уже запущен.');

        await ctx.reply(`Ща как буду раз в ${this.iterationTime} ${this.unitsName} имена менять`);
        await this.changeTitle(ctx.chat.id);
        await this.redis.setAsync(`auto:rename:${ctx.chat.id.toString()}`, new Date().toISOString());
        console.log(`[${ctx.chat.id}] Started`);
    }

    public async onStop(ctx: ContextMessageUpdate) {
        if (!ctx.chat) return;

        await this.redis.delAsync(`auto:rename:${ctx.chat.id.toString()}`);
        console.log(`[${ctx.chat.id}] Stopped`);
        await ctx.reply('Всё, больше не буду');
    }

    public async onRename(ctx: ContextMessageUpdate) {
        if (!ctx.chat) return;

        await this.changeTitle(ctx.chat.id);
        console.log(`[${ctx.chat.id}] Renamed`);
    }

    private async changeTitle(id: number) {
        const newName = await GenerateNameService.getInstance().generateName();
        console.log(`[${id}] New name: ${newName}`);
        await (Bot.getInstance().bot.telegram as any).setChatTitle(id, newName);
    }
}