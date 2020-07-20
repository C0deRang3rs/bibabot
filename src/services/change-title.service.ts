import { ContextMessageUpdate } from 'telegraf';
import Bull from 'bull';
import { Message } from 'telegraf/typings/telegram-types';
import GenerateNameUtil from '../utils/generate-name.util';
import { ChangeTitleCommandType } from '../types/globals/commands.types';
import Bot from '../core/bot';
import { BotCommandType } from '../types/core/bot.types';
import TimerRepository from '../repositories/timer.repo';
import BaseService from './base.service';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import DeleteResponseMessage from '../decorators/delete.response.message.decorator';
import { ConfigProperty } from '../types/services/config.service.types';
import CheckConfig from '../decorators/check.config.decorator';
import { TimerUnit, TimerUnitName } from '../types/services/change-title.service.types';

export default class ChangeTitleService extends BaseService {
  protected static instance: ChangeTitleService;
  private iterationUnits = TimerUnit.HOURS;
  private iterationTime = 12;

  get unitsName(): string {
    switch (this.iterationUnits) {
      case TimerUnit.HOURS:
        return this.iterationTime === 1 ? 'час'
          : this.iterationTime >= 2 && this.iterationTime <= 4 ? 'часа' : 'часов';
      case TimerUnit.MINUTES:
        return this.iterationTime === 1 ? 'минуту'
          : this.iterationTime >= 2 && this.iterationTime <= 4 ? 'минуты' : 'минут';
      default: return '';
    }
  }

  constructor(
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
    const objectedTimers = await this.timerRepo.getAllTimers();

    await Promise.all(Object.keys(objectedTimers).map(async (id: string) => {
      if (this.isRenameNeeded(objectedTimers[id])) {
        try {
          await this.changeTitle(parseInt(id, 10), true);
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
      case TimerUnitName.HOURS:
        this.iterationUnits = TimerUnit.HOURS;
        break;
      case TimerUnitName.MINUTES:
        this.iterationUnits = TimerUnit.MINUTES;
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

  public async onRename(ctx: ContextMessageUpdate): Promise<void> {
    if (!ctx.chat) return;

    await this.changeTitle(ctx.chat.id, false);
  }

  protected initListeners(): void {
    this.bot.addListeners([
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

  @CheckConfig(ConfigProperty.RENAME)
  private async changeTitle(id: number, auto: boolean): Promise<void> {
    const newName = await GenerateNameUtil.generateName();
    console.log(`[${id}]${auto ? ' Auto-rename.' : ''} New name: ${newName}`);
    await this.bot.app.telegram.setChatTitle(id, newName);
  }

  private isRenameNeeded(timer: string): boolean {
    const now = new Date().getTime();
    const parsedTimer = new Date(timer).getTime();
    return (Math.abs(now - parsedTimer) / this.iterationUnits) > this.iterationTime;
  }
}
