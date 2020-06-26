import { ContextMessageUpdate, Markup } from 'telegraf';
import { Message, InlineKeyboardMarkup } from 'telegraf/typings/telegram-types';
import BaseService from './base.service';
import { BotCommandType, BotListener } from '../types/core/bot.types';
import { ConfigCommand } from '../types/globals/commands.types';
import { ConfigAction, ConfigProperty } from '../types/services/config.service.types';
import ConfigRepository from '../repositories/config.repo';
import DeleteLastMessage from '../decorators/delete.last.message.decorator';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';

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

  private static getPropertyDescription(property: ConfigProperty, status: boolean): string {
    let message = '';

    switch (property) {
      case ConfigProperty.MEME_STAT: message = 'Оценка мемов'; break;
      case ConfigProperty.RENAME: message = 'Автопереименование конфы'; break;
      case ConfigProperty.DAILY: message = 'Ежедневная биба'; break;
      case ConfigProperty.TRASH_REPLY: message = 'Интересные конкурсы'; break;
      default: return 'No description';
    }

    return `${message} - ${status ? 'ON' : 'OFF'}`;
  }

  public async checkProperty(chatId: number, property: ConfigProperty): Promise<boolean> {
    const config = await this.configRepo.getConfigByChatId(chatId);

    return config[property];
  }

  protected initListeners(): void {
    const listeners: Array<BotListener> = [
      {
        type: BotCommandType.COMMAND,
        name: ConfigCommand.CONFIG,
        callback: (ctx): Promise<Message> => this.configMenu(ctx),
      },
    ];

    // eslint-disable-next-line array-callback-return
    Object.keys(ConfigProperty).map((key) => {
      listeners.push({
        type: BotCommandType.ACTION,
        name: `${ConfigAction.TURN_ON}_${key.toLowerCase()}`,
        callback: (ctx): Promise<void> => this.switchProperty(ctx, key.toLowerCase() as ConfigProperty, true),
      });
      listeners.push({
        type: BotCommandType.ACTION,
        name: `${ConfigAction.TURN_OFF}_${key.toLowerCase()}`,
        callback: (ctx): Promise<void> => this.switchProperty(ctx, key.toLowerCase() as ConfigProperty, false),
      });
    });

    this.bot.addListeners(listeners);
  }

  private async switchProperty(ctx: ContextMessageUpdate, property: ConfigProperty, value: boolean): Promise<void> {
    const chatId = ctx.chat!.id;
    const { message } = ctx.update.callback_query!;
    const config = await this.configRepo.getConfigByChatId(chatId);
    config[property] = value;
    await this.configRepo.setConfigByChatId(chatId, config);
    await this.updateMenu(chatId, message!.message_id);
  }

  @DeleteRequestMessage()
  @DeleteLastMessage('config')
  private async configMenu(ctx: ContextMessageUpdate): Promise<Message> {
    return ctx.reply(
      'Опции бота для данного чата:',
      (await this.getMenuMarkup(ctx.chat!.id)).extra(),
    );
  }

  private async getMenuMarkup(chatId: number): Promise<Markup & InlineKeyboardMarkup> {
    const config = await this.configRepo.getConfigByChatId(chatId);

    return Markup.inlineKeyboard([
      ...Object.keys(config).map((property) => [Markup.callbackButton(
        ConfigService.getPropertyDescription(property as ConfigProperty, config[property as ConfigProperty]),
        config[property as ConfigProperty] ? `${ConfigAction.TURN_OFF}_${property}` : `${ConfigAction.TURN_ON}_${property}`,
      )]),
    ]);
  }

  private async updateMenu(chatId: number, messageId: number): Promise<void> {
    await this.bot.app.telegram.editMessageReplyMarkup(
      chatId,
      messageId,
      undefined,
      JSON.stringify(await this.getMenuMarkup(chatId)),
    );
  }
}
