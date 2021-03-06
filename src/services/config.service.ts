import { Context } from 'telegraf/typings/context';
import { Message, InlineKeyboardMarkup, InlineKeyboardButton } from 'telegraf/typings/telegram-types';
import { Markup } from 'telegraf';
import BaseService from './base.service';
import { BotCommandType, BotListener, CommandType } from '../types/core/bot.types';
import { BotAction, CommandCategory, ConfigCommand } from '../types/globals/commands.types';
import { ConfigAction, ConfigProperty, getPropertyDescription } from '../types/services/config.service.types';
import ConfigRepository from '../repositories/config.repo';
import DeleteLastMessage from '../decorators/delete.last.message.decorator';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import { BotMessage } from '../types/globals/message.types';
import ReplyWithError from '../decorators/reply.with.error.decorator';
import CommandTemplate from '../decorators/command.template.decorator';
import RepliableError from '../types/globals/repliable.error';

export default class ConfigService extends BaseService {
  private static instance: ConfigService;

  private constructor(
    private readonly configRepo: ConfigRepository,
  ) {
    super();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService(
        new ConfigRepository(),
      );
    }

    return ConfigService.instance;
  }

  @DeleteRequestMessage()
  @ReplyWithError()
  @CommandTemplate([CommandType.COMMAND, CommandType.NUMBER])
  private async changeJailMinVote(ctx: Context): Promise<Message> {
    if (
      !ctx.from
      || !ctx.chat
      || !ctx.message
      || !('text' in ctx.message)
    ) {
      throw new Error('Wrong context');
    }


    //TODO: вынести команды для создателя чата / админов с высокими правами
    const chatId = ctx.chat.id;
    const admins = await this.bot.app.telegram.getChatAdministrators(ctx.chat.id);
    const isUserCreator = admins.find((user) => user.user.id === ctx.from!.id)?.status === 'creator';

    if (!isUserCreator) {
      throw new RepliableError('Команда доступна только основателю чата', ctx);
    }

    const membersCount = await this.bot.app.telegram.getChatMembersCount(chatId);
    const minVoteCount = parseInt(ctx.message.text.split(' ')[1]);

    if (minVoteCount > membersCount) {
      throw new RepliableError('Нельзя указать больше чем кол-во пользователей в чате', ctx);
    }

    if (minVoteCount <= 1) {
      throw new RepliableError('Нельзя указать меньше чем 1', ctx);
    }

    const currentConfig = await this.configRepo.getConfigByChatId(chatId);
    await this.configRepo.setConfigByChatId(chatId, { ...currentConfig, JAIL_MIN_VOTE: minVoteCount - 1 });

    return ctx.reply(`Минимальное количество голосов для бана изменено на ${minVoteCount}`);
  }

  @DeleteRequestMessage()
  @DeleteLastMessage(BotMessage.CONFIG)
  private async configMenu(ctx: Context): Promise<Message> {
    return ctx.reply(
      'Опции бота для данного чата:',
      { reply_markup: await this.getMenuMarkup(ctx.chat!.id) },
    );
  }

  public async checkProperty(chatId: number, property: ConfigProperty): Promise<boolean | number> {
    const config = await this.configRepo.getConfigByChatId(chatId);
    return config[property];
  }

  protected initListeners(): BotListener[] {
    const listeners = [
      {
        type: BotCommandType.COMMAND,
        name: ConfigCommand.CONFIG,
        description: 'Настройки бота для данного чата',
        callback: (ctx): Promise<Message> => this.configMenu(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: ConfigCommand.MIN_VOTE_COUNT,
        category: CommandCategory.JAIL,
        description: 'Изменить колво голосов для бана. (Доступно только для основателя чата)',
        callback: (ctx): Promise<Message> => this.changeJailMinVote(ctx),
      },
    ] as BotListener[];

    Object.keys(ConfigProperty).forEach((key) => {
      listeners.push({
        type: BotCommandType.ACTION,
        name: `${ConfigAction.TURN_ON}_${key}` as BotAction,
        callback: (ctx): Promise<void> => this.switchProperty(ctx, key as ConfigProperty, true),
      });
      listeners.push({
        type: BotCommandType.ACTION,
        name: `${ConfigAction.TURN_OFF}_${key}` as BotAction,
        callback: (ctx): Promise<void> => this.switchProperty(ctx, key as ConfigProperty, false),
      });
    });

    return listeners;
  }

  private async switchProperty(ctx: Context, property: ConfigProperty, value: boolean): Promise<void> {
    if (!('callback_query' in ctx.update)) {
      return;
    }

    const chatId = ctx.chat!.id;
    const { message } = ctx.update.callback_query!;

    const config = await this.configRepo.getConfigByChatId(chatId);
    config[property] = value;

    await this.configRepo.setConfigByChatId(chatId, config);
    await this.updateMenu(chatId, message!.message_id);
  }

  private async getMenuMarkup(chatId: number): Promise<InlineKeyboardMarkup> {
    const config = await this.configRepo.getConfigByChatId(chatId);

    return Markup.inlineKeyboard([
      ...Object.keys(config).reduce((acc, property) => {
        const description = getPropertyDescription(property as ConfigProperty);
        if (description) {
          return [...acc, [Markup.button.callback(`${description} - ${config[property as ConfigProperty] ? 'ON' : 'OFF'}`, config[property as ConfigProperty] ? `${ConfigAction.TURN_OFF}_${property}` : `${ConfigAction.TURN_ON}_${property}`)]];
        }

        return acc;
      }, [] as InlineKeyboardButton[][]),
    ]).reply_markup;
  }

  private async updateMenu(chatId: number, messageId: number): Promise<void> {
    await this.bot.app.telegram.editMessageReplyMarkup(
      chatId,
      messageId,
      undefined,
      await this.getMenuMarkup(chatId),
    );
  }
}
