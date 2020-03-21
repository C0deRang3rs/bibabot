import { ContextMessageUpdate } from 'telegraf';
import zipObject from 'lodash.zipobject';
import Bull from 'bull';
import { Message } from 'telegraf/typings/telegram-types';
import GenerateNameUtil from '../utils/generate-name.util';
import { ChangeTitleCommandType } from '../types/globals/commands.types';
import { TimerUnits } from '../types/services/change-title.service.types';
import Bot from '../core/bot';
import { BotCommandType } from '../types/core/bot.types';
import TimerRepository from '../repositories/timer.repo';
import BaseService from './base.service';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import DeleteResponseMessage from '../decorators/delete.response.message.decorator';

export default class ChangeTitleService extends BaseService {
  protected static instance: ChangeTitleService;
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
    private readonly timerRepo: TimerRepository,
  ) {
    super();
  }

  public static getInstance(): ChangeTitleService {
    if (!ChangeTitleService.instance) {
      ChangeTitleService.instance = new ChangeTitleService(
        new TimerRepository(),
      );
    }

    return ChangeTitleService.instance;
  }

  public async resolveRenames(done: Bull.DoneCallback): Promise<void> {
    const ids = await this.timerRepo.getAllTimers();

    if (!ids.length) {
      return;
    }

    const values = await this.timerRepo.getTimersByChatIds(ids);
    const objectedTimers: Record<string, string> = zipObject(ids, values);

    await Promise.all(Object.keys(objectedTimers).map(async (id: string) => {
      if (this.isRenameNeeded(objectedTimers[id])) {
        console.log(`[${id}] Auto-rename`);

        try {
          await this.changeTitle(parseInt(id, 10));
        } catch (err) {
          Bot.handleError(err);
        }

        await this.timerRepo.setTimerByChatId(id, new Date());
      }
    }));

    done();
  }

  @DeleteRequestMessage()
  @DeleteResponseMessage(5000)
  public async onIterationChange(ctx: ContextMessageUpdate): Promise<Message> {
    const commandData = ctx.message!.text!.split(' ');

    switch (commandData[2]) {
      case 'hours':
        this.iterationUnits = TimerUnits.HOURS;
        break;
      case 'minutes':
        this.iterationUnits = TimerUnits.MINUTES;
        break;
      default: return ctx.reply('Wrong time format, try something like: 2 hours, 5 minutes, 1 hours (lmao)');
    }

    const newIterationTime = parseInt(commandData[1], 10);

    if (!new RegExp(/^\d+$/).test(commandData[1]) || newIterationTime <= 0) {
      return ctx.reply('Время может содержать только числа больше 1');
    }

    if (commandData[1].length > 3) {
      return ctx.reply('Время не может быть больше 999');
    }

    this.iterationTime = newIterationTime;

    console.log(`[${ctx.chat!.id}] Interval - ${this.iterationTime}, units - ${this.iterationUnits}`);
    return ctx.reply('Iteration interval changed');
  }

  @DeleteRequestMessage()
  @DeleteResponseMessage(10000)
  public async onStart(ctx: ContextMessageUpdate): Promise<Message> {
    const chatId = ctx.chat!.id;
    const isTimerActive = await this.timerRepo.getTimerByChatId(chatId);

    if (isTimerActive) {
      return ctx.reply('Уже запущен.');
    }

    await this.changeTitle(chatId);
    await this.timerRepo.setTimerByChatId(chatId, new Date());
    return ctx.reply(`Ща как буду раз в ${this.iterationTime} ${this.unitsName} имена менять`);
  }

  @DeleteRequestMessage()
  @DeleteResponseMessage(10000)
  public async onStop(ctx: ContextMessageUpdate): Promise<Message> {
    await this.timerRepo.removeTimer(ctx.chat!.id);
    return ctx.reply('Всё, больше не буду');
  }

  public async onRename(ctx: ContextMessageUpdate): Promise<void> {
    if (!ctx.chat) return;

    await this.changeTitle(ctx.chat.id);
    console.log(`[${ctx.chat.id}] Renamed`);
  }

  protected initListeners(): void {
    this.bot.addListeners([
      {
        type: BotCommandType.COMMAND,
        name: ChangeTitleCommandType.START_RENAME,
        callback: (ctx): Promise<Message> => this.onStart(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: ChangeTitleCommandType.STOP_RENAME,
        callback: (ctx): Promise<Message> => this.onStop(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: ChangeTitleCommandType.RENAME,
        callback: (ctx): Promise<void> => this.onRename(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: ChangeTitleCommandType.ITERATION_CHANGE,
        callback: (ctx): Promise<Message> => this.onIterationChange(ctx),
      },
    ]);
  }

  private async changeTitle(id: number): Promise<void> {
    const newName = await GenerateNameUtil.generateName();
    console.log(`[${id}] New name: ${newName}`);
    await this.bot.app.telegram.setChatTitle(id, newName);
  }

  private isRenameNeeded(timer: string): boolean {
    const now = new Date().getTime();
    const parsedTimer = new Date(timer).getTime();
    return (Math.abs(now - parsedTimer) / this.iterationUnits) > this.iterationTime;
  }
}
