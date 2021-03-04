import { Context } from 'telegraf/typings/context';
import { Message, InlineKeyboardMarkup } from 'telegraf/typings/telegram-types';
import { Markup } from 'telegraf';
import BaseService from './base.service';
import { BotCommandType, BotListener } from '../types/core/bot.types';
import { BotAction, ConfigCommand } from '../types/globals/commands.types';
import { ConfigAction, ConfigProperty, getPropertyDescription } from '../types/services/config.service.types';
import ConfigRepository from '../repositories/config.repo';
import DeleteLastMessage from '../decorators/delete.last.message.decorator';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import { BotMessage } from '../types/globals/message.types';

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
  @DeleteLastMessage(BotMessage.CONFIG)
  private async configMenu(ctx: Context): Promise<Message> {
    return ctx.reply(
      'Опции бота для данного чата:',
      { reply_markup: await this.getMenuMarkup(ctx.chat!.id) },
    );
  }

  public async checkProperty(chatId: number, property: ConfigProperty): Promise<boolean> {
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
      ...Object.keys(config).map((property) => [Markup.button.callback(
        `${getPropertyDescription(property as ConfigProperty)} - ${config[property as ConfigProperty] ? 'ON' : 'OFF'}`,
        config[property as ConfigProperty] ? `${ConfigAction.TURN_OFF}_${property}` : `${ConfigAction.TURN_ON}_${property}`,
      )]),
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
