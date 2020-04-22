import { ContextMessageUpdate, Markup } from 'telegraf';
import { Message } from 'telegraf/typings/telegram-types';
import BaseService from './base.service';
import { BotCommandType } from '../types/core/bot.types';
import MemeRepository from '../repositories/meme.repo';
import { MemeAction, MemeStatResult, MemeStatStatus } from '../types/services/meme.service.types';
import BibacoinService from './bibacoin.service';
import { getPriceByActivity } from '../utils/shop.helper';
import { BibacoinActivity } from '../types/services/bibacoin.service.types';
import CheckConfig from '../decorators/check.config.decorator';
import { ConfigProperty } from '../types/services/config.service.types';
import CheckMessageContent from '../decorators/check.message.content.decorator';
import { MessageContent } from '../types/globals/message.types';

export default class MemeService extends BaseService {
  private static instance: MemeService;

  private constructor(
    private readonly memeRepo: MemeRepository,
    private readonly bibacoinService: BibacoinService,
  ) {
    super();
  }

  public static getInstance(): MemeService {
    if (!MemeService.instance) {
      MemeService.instance = new MemeService(
        new MemeRepository(),
        BibacoinService.getInstance(),
      );
    }

    return MemeService.instance;
  }

  @CheckMessageContent(MessageContent.PHOTO)
  @CheckConfig(ConfigProperty.MEME_STAT)
  public async handleMeme(ctx: ContextMessageUpdate, next: Function | undefined): Promise<Message> {
    const chatId = ctx.chat!.id;
    const messageId = ctx.message!.message_id;

    const responseMessage = await ctx.reply(
      'Оцените данный мем',
      {
        reply_markup: Markup.inlineKeyboard([
          Markup.callbackButton('👍 0', MemeAction.LIKE),
          Markup.callbackButton('👎 0', MemeAction.DISLIKE),
        ]),
        reply_to_message_id: messageId,
      },
    );

    await this.memeRepo.initStat(chatId, responseMessage.message_id, ctx.from!.id);

    return next!();
  }

  protected initListeners(): void {
    this.bot.addListeners([
      {
        type: BotCommandType.ACTION,
        name: MemeAction.LIKE,
        callback: (ctx): Promise<void> => this.changeMemeStat(ctx, MemeAction.LIKE),
      },
      {
        type: BotCommandType.ACTION,
        name: MemeAction.DISLIKE,
        callback: (ctx): Promise<void> => this.changeMemeStat(ctx, MemeAction.DISLIKE),
      },
    ]);
  }

  @CheckConfig(ConfigProperty.MEME_STAT)
  private async changeMemeStat(ctx: ContextMessageUpdate, actionType: MemeAction): Promise<void> {
    const { message } = ctx.update.callback_query!;
    const chatId = ctx.chat!.id;
    const messageId = message!.message_id;
    const userId = ctx.from!.id;
    const price = getPriceByActivity(BibacoinActivity.MEME_LIKE);
    let response: MemeStatResult;

    switch (actionType) {
      case MemeAction.LIKE:
        response = await this.memeRepo.addLike(chatId, messageId, userId);
        break;
      case MemeAction.DISLIKE:
        response = await this.memeRepo.addDislike(chatId, messageId, userId);
        break;
      default:
        throw new Error('This action is unsupported');
    }

    switch (response.status) {
      case MemeStatStatus.STAT_SWITCHED:
      case MemeStatStatus.STAT_ADDED: {
        const finalPrice = response.status === MemeStatStatus.STAT_SWITCHED ? price * 2 : price;
        switch (actionType) {
          case MemeAction.LIKE: await this.bibacoinService.addCoins(response.authorId, chatId, finalPrice); break;
          case MemeAction.DISLIKE: await this.bibacoinService.withdrawCoins(response.authorId, chatId, finalPrice); break;
          default: throw new Error('This action is unsupported');
        }
        break;
      }
      case MemeStatStatus.STAT_RETRACTED: {
        switch (actionType) {
          case MemeAction.LIKE: await this.bibacoinService.withdrawCoins(response.authorId, chatId, price); break;
          case MemeAction.DISLIKE: await this.bibacoinService.addCoins(response.authorId, chatId, price); break;
          default: throw new Error('This action is unsupported');
        }
        break;
      }
      default: throw new Error('Unsupported status');
    }

    await this.updateStatMessage(chatId, messageId);
    await ctx.answerCbQuery(response.message);
  }

  private async updateStatMessage(chatId: number, messageId: number): Promise<void> {
    const stat = await this.memeRepo.getStat(chatId, messageId);

    if (!stat) {
      throw new Error('No stat for this message');
    }

    const likes = stat.likeIds.length;
    const dislikes = stat.dislikeIds.length;

    await this.bot.app.telegram.editMessageReplyMarkup(
      chatId,
      messageId,
      undefined,
      JSON.stringify(
        Markup.inlineKeyboard([
          Markup.callbackButton(`👍 ${likes}`, MemeAction.LIKE),
          Markup.callbackButton(`👎 ${dislikes}`, MemeAction.DISLIKE),
        ]),
      ),
    );
  }
}
