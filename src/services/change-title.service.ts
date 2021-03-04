import { Context } from 'telegraf/typings/context';
import Bull from 'bull';
import GenerateNameUtil from '../utils/generate-name.util';
import { ChangeTitleCommandType } from '../types/globals/commands.types';
import Bot from '../core/bot';
import { BotCommandType, BotListener } from '../types/core/bot.types';
import TimerRepository from '../repositories/timer.repo';
import BaseService from './base.service';
import { ConfigProperty } from '../types/services/config.service.types';
import CheckConfig from '../decorators/check.config.decorator';
import { TimerUnit } from '../types/services/change-title.service.types';

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

  @CheckConfig(ConfigProperty.RENAME)
  private async changeTitle(id: number, auto: boolean): Promise<void> {
    const newName = await GenerateNameUtil.generateName();
    console.log(`[${id}]${auto ? ' Auto-rename.' : ''} New name: ${newName}`);
    await this.bot.app.telegram.setChatTitle(id, newName);
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

  public async onRename(ctx: Context): Promise<void> {
    if (!ctx.chat) return;

    await this.changeTitle(ctx.chat.id, false);
  }

  protected initListeners(): BotListener[] {
    return [
      {
        type: BotCommandType.COMMAND,
        name: ChangeTitleCommandType.RENAME,
        description: 'Переименовать конфу',
        callback: (ctx): Promise<void> => this.onRename(ctx),
      },
    ];
  }

  private isRenameNeeded(timer: string): boolean {
    const now = new Date().getTime();
    const parsedTimer = new Date(timer).getTime();
    return (Math.abs(now - parsedTimer) / this.iterationUnits) > this.iterationTime;
  }
}
