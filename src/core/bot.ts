import Telegraf, {ContextMessageUpdate} from 'telegraf';
import { GenerateNameService } from '../services/generate-name.service';
import Bull from 'bull';
import redis from 'redis';
import bluebird from 'bluebird';
import zipObject from 'lodash.zipobject';

bluebird.promisifyAll(redis);

const TIMER_ITERATION = 1;

enum TimerUnits {
    MINUTES = 60000,
    HOURS = 3600000
}

enum CommandType {
    START = 'start',
    STOP = 'stop',
    RENAME = 'rename'
}

export class Bot {
    private bot: Telegraf<ContextMessageUpdate>;
    private queue: Bull.Queue = {} as Bull.Queue;
    private redis: redis.RedisClient | any;

    constructor() {
        this.bot = new Telegraf(process.env.BOT_TOKEN as string);
        this.initRedis();
        this.initJobQueue();
        this.initListeners();
        this.startPooling();
    }

    private initJobQueue() {
        this.queue = new Bull('auto renames', process.env.REDIS_URL as string);
        this.queue.process(async (job) => await this.resolveRenames());
        this.queue.add('timeToRename', { repeat: { cron: '* * * * *' } });
    }

    private async initRedis() {
        this.redis = redis.createClient({ url: process.env.REDIS_URL as string });
    }

    private async resolveRenames() {
        const keys = await this.redis.keysAsync('auto:rename:*');
        if (!keys.length) return console.log('No timers');

        const ids = keys.map((key: string) => key.split(':')[2]);
        const values = await this.redis.mgetAsync(keys);
        const objectedTimers: Record<string, string> = zipObject(ids, values);

        for (const id of Object.keys(objectedTimers)) {
            console.log(`[${id}] Processing`);
            if ((Math.abs(+new Date() - +new Date(objectedTimers[id])) / TimerUnits.MINUTES) > TIMER_ITERATION) {
                console.log(`[${id}] Auto-rename`);
                await this.changeTitle(parseInt(id));
                await this.redis.setAsync(`auto:rename:${id}`, new Date().toISOString());
            }
        }
    }

    private async startPooling() {
        await this.bot.launch();
        console.log('Bot is up');
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
            await this.bot.telegram.sendMessage('-395013027', e.message)
        }
    }

    private async onStart(ctx: ContextMessageUpdate) {
        if (!ctx.chat) return;

        const isTimerActive = await this.redis.getAsync(`auto:rename:${ctx.chat.id.toString()}`);

        if (isTimerActive) return ctx.reply('Уже запущен.');

        await ctx.reply(`Ща как буду раз в ${TIMER_ITERATION} часов имена менять`);
        await this.changeTitle(ctx.chat.id);
        await this.redis.setAsync(`auto:rename:${ctx.chat.id.toString()}`, new Date().toISOString());
        console.log(`[${ctx.chat.id}] Started`);
    }

    private async onStop(ctx: ContextMessageUpdate) {
        if (!ctx.chat) return;

        await this.redis.delAsync(`auto:rename:${ctx.chat.id.toString()}`);
        console.log(`[${ctx.chat.id}] Stopped`);
        await ctx.reply('Всё, больше не буду');
    }

    private async onRename(ctx: ContextMessageUpdate) {
        if (!ctx.chat) return;

        await this.changeTitle(ctx.chat.id);
        console.log(`[${ctx.chat.id}] Renamed`);
    }

    private async changeTitle(id: number) {
        const newName = await GenerateNameService.getInstance().generateName();
        console.log(`[${id}] New name: ${newName}`);
        await (this.bot.telegram as any).setChatTitle(id, newName);
    }
}
