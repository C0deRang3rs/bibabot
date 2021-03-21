import { Context } from 'telegraf';
import { Message } from 'telegraf/typings/core/types/typegram';
import DeleteLastMessage from '../decorators/delete.last.message.decorator';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import ReplyWithError from '../decorators/reply.with.error.decorator';
import { BotCommandType, BotListener } from '../types/core/bot.types';
import {
  CategorizedCommands, CommandCategory, HelpCommand, SortedCommandCategories,
} from '../types/globals/commands.types';
import { BotMessage } from '../types/globals/message.types';
import BaseService from './base.service';

export default class HelpService extends BaseService {
  private static instance: HelpService;

  private constructor(
  ) {
    super();
  }

  public static getInstance(): HelpService {
    if (!HelpService.instance) {
      HelpService.instance = new HelpService();
    }

    return HelpService.instance;
  }

  @ReplyWithError()
  @DeleteRequestMessage()
  @DeleteLastMessage(BotMessage.HELP)
  private async help(ctx: Context): Promise<Message> {
    const text: string[] = [];

    text.push('/help - Список всех доступных команд');

    const commandsByCategory = Array.from(this.bot.descMap)
      .reduce((acc: CategorizedCommands, [command, { category, description }]) => (
        {
          ...acc,
          [category]: acc[category] ? [...acc[category], `/${command} - ${description}`] : [`/${command} - ${description}`],
        }
      ), {} as CategorizedCommands);

    const sortedCategories = {} as CategorizedCommands;

    SortedCommandCategories.forEach((category) => {
      sortedCategories[category] = commandsByCategory[category];
    });

    Object.entries(sortedCategories).forEach(([category, commandList]) => {
      text.push(`----------------------------------------------------------\n<b>${category}</b>:`);
      if (category === CommandCategory.STICKERS) {
        text.push(`@${ctx.me} - [Ответ на сообщение] создать новый стикер`);
      }
      text.push(`${commandList.join('\n')}`);
    });

    return ctx.reply(text.join('\n'), { parse_mode: 'HTML' });
  }

  protected initListeners(): BotListener[] {
    return [
      {
        type: BotCommandType.COMMAND,
        name: HelpCommand.HELP,
        callback: (ctx): Promise<Message> => this.help(ctx),
      },
    ];
  }
}
