import { Context } from 'telegraf';
import CommandTemplate from '../decorators/command.template.decorator';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import ReplyWithError from '../decorators/reply.with.error.decorator';
import {
  BotCommandType, TelegramError, CommandType, BotListener,
} from '../types/core/bot.types';
import { CommandCategory, LabelCommand } from '../types/globals/commands.types';
import RepliableError from '../types/globals/repliable.error';
import { MAX_LABEL_LENGTH, ProductPrice } from '../types/services/shop.service.types';
import { getUsernameFromContext } from '../utils/data.utils';
import BaseService from './base.service';
import BibacoinService from './bibacoin.service';

export default class LabelService extends BaseService {
  private static instance: LabelService;

  private constructor(
    private readonly bibacoinService: BibacoinService,
  ) {
    super();
  }

  public static getInstance(): LabelService {
    if (!LabelService.instance) {
      LabelService.instance = new LabelService(
        BibacoinService.getInstance(),
      );
    }

    return LabelService.instance;
  }

  @DeleteRequestMessage()
  @ReplyWithError()
  @CommandTemplate([CommandType.COMMAND, CommandType.ANY_CHARS])
  private async buyLabel(ctx: Context): Promise<void> {
    if (
      !ctx.chat
      || !ctx.message
      || !('text' in ctx.message)
    ) {
      throw new Error('Wrong context');
    }

    const chatId = ctx.chat.id;
    const userId = ctx.message.from.id;
    const username = getUsernameFromContext(ctx);
    const customLabel = ctx.message.text.split(new RegExp(`^\\/${LabelCommand.BUY_LABEL}`))[1].trimLeft();

    if (customLabel.length > MAX_LABEL_LENGTH) {
      throw new RepliableError('Слишком длинный лейбл', ctx);
    }

    try {
      await this.bibacoinService.hasEnoughCredits(userId, chatId, ProductPrice.LABEL);
    } catch (err) {
      throw new RepliableError(err.message.split(',')[0], ctx);
    }

    try {
      await ctx.promoteChatMember(userId, {
        can_change_info: true,
        can_delete_messages: false,
        can_invite_users: true,
        can_pin_messages: true,
        can_promote_members: false,
        can_restrict_members: false,
        is_anonymous: false,
      });
      await ctx.setChatAdministratorCustomTitle(userId, customLabel);
    } catch (err) {
      if (err.response.description === TelegramError.CANT_REMOVE_CHAT_OWNER) {
        throw new RepliableError('Данная функция недоступна для создателя чата', ctx);
      }

      if (err.response.description === TelegramError.CHAT_ADMIN_REQUIRED) {
        throw new RepliableError('Для использования этой функции админ-права должен выдать бот', ctx);
      }

      throw err;
    }

    await this.bibacoinService.withdrawCoins(userId, chatId, ProductPrice.LABEL);

    await ctx.reply(`${username} купил лейбл "${customLabel}"`);
  }

  protected initListeners(): BotListener[] {
    return [
      {
        type: BotCommandType.COMMAND,
        name: LabelCommand.BUY_LABEL,
        description: `Купить себе кастомный лейбл за ${ProductPrice.LABEL} коинов`,
        category: CommandCategory.SHOP,
        callback: (ctx): Promise<void> => this.buyLabel(ctx),
      },
    ];
  }
}
