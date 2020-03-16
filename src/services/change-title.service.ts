import { ContextMessageUpdate } from 'telegraf';
import zipObject from 'lodash.zipobject';
import Bull from 'bull';
import GenerateNameUtil from '../utils/generate-name.util';
import { ChangeTitleCommandType } from '../types/globals/commands.types';
import { TimerUnits } from '../types/services/change-title.service.types';
import Bot from '../core/bot';
import { BotCommandType } from '../types/core/bot.types';
import ChatRepository from '../repositories/chat.repo';

export default class ChangeTitleService {
  private static instance: ChangeTitleService;
  private iterationUnits = TimerUnits.HOURS;
  private iterationTime = 12;

  get unitsName(): string {
    switch (this.iterationUnits) {
      case TimerUnits.HOURS:
        return this.iterationTime === 1 ? 'час'
          : this.iterationTime >= 2 && this.iterationTime <= 4 ? 'часа' : 'часов';
      case TimerUnits.MINUTES:
        return this.iterationTime === 1 ? 'минуту'
          : this.iterationTime >= 2 && this.iterationTime <= 4 ? 'минуты' : 'минут';
      default: return '';
    }
  }

  private constructor(
    private readonly bot: Bot,
    private readonly chatRepo: ChatRepository,
  ) {
    this.initListeners();
  }

  public static getInstance(): ChangeTitleService {
    if (!ChangeTitleService.instance) {
      ChangeTitleService.instance = new ChangeTitleService(
        Bot.getInstance(),
        new ChatRepository(),
      );
    }

    return ChangeTitleService.instance;
  }

  public async resolveRenames(done: Bull.DoneCallback): Promise<void> {
    const ids = await this.chatRepo.getAllChats();

    if (!ids.length) {
      console.log('No timers');
      return;
    }

    const values = await this.chatRepo.getTimersByChatIds(ids);
    const objectedTimers: Record<string, string> = zipObject(ids, values);

    await Promise.all(Object.keys(objectedTimers).map(async (id: string) => {
      if ((Math.abs(+new Date() - +new Date(objectedTimers[id])) / this.iterationUnits) > this.iterationTime) {
        console.log(`[${id}] Auto-rename`);
        try {
          await this.changeTitle(parseInt(id, 10));
        } catch (err) {
          Bot.handleError(err);
        }
        await this.chatRepo.setTimerByChatId(id, new Date());
      }
    }));

    done();
  }

  public async onIterationChange(ctx: ContextMessageUpdate): Promise<void> {
    const commandData = ctx.message!.text!.split(ChangeTitleCommandType.ITERATION_CHANGE)[1].trim().split(' ');

    switch (commandData[1]) {
      case 'hours':
        this.iterationUnits = TimerUnits.HOURS;
        break;
      case 'minutes':
        this.iterationUnits = TimerUnits.MINUTES;
        break;
      default: await ctx.reply('Wrong time format, try something like: 2 hours, 5 minutes, 1 hours (lmao)'); return;
    }
    this.iterationTime = +commandData[0];

    console.log(`[${ctx.chat!.id}] Interval - ${this.iterationTime}, units - ${this.iterationUnits}`);
    await ctx.reply('Iteration interval changed');
  }

  public async onStart(ctx: ContextMessageUpdate): Promise<void> {
    if (!ctx.chat) return;

    const chatId = ctx.chat.id;
    const isTimerActive = await this.chatRepo.getTimerByChatId(chatId);

    if (isTimerActive) {
      await ctx.reply('Уже запущен.');
      return;
    }

    await ctx.reply(`Ща как буду раз в ${this.iterationTime} ${this.unitsName} имена менять`);
    await this.changeTitle(chatId);
    await this.chatRepo.setTimerByChatId(chatId, new Date());
  }

  public async onStop(ctx: ContextMessageUpdate): Promise<void> {
    if (!ctx.chat) return;

    await this.chatRepo.removeChat(ctx.chat.id);
    await ctx.reply('Всё, больше не буду');
  }

  public async onRename(ctx: ContextMessageUpdate): Promise<void> {
    if (!ctx.chat) return;

    await this.changeTitle(ctx.chat.id);
    console.log(`[${ctx.chat.id}] Renamed`);
  }

  private initListeners(): void {
    this.bot.addListeners([
      {
        type: BotCommandType.COMMAND,
        name: ChangeTitleCommandType.START,
        callback: (ctx): Promise<void> => this.onStart(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: ChangeTitleCommandType.STOP,
        callback: (ctx): Promise<void> => this.onStop(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: ChangeTitleCommandType.RENAME,
        callback: (ctx): Promise<void> => this.onRename(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: ChangeTitleCommandType.ITERATION_CHANGE,
        callback: (ctx): Promise<void> => this.onIterationChange(ctx),
      },
    ]);
  }

  private async changeTitle(id: number): Promise<void> {
    const newName = await GenerateNameUtil.generateName();
    console.log(`[${id}] New name: ${newName}`);
    await this.bot.app.telegram.setChatTitle(id, newName);
  }
}
