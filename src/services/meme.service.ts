import { Markup } from 'telegraf';
import { Context } from 'telegraf/typings/context';
import BaseService from './base.service';
import { BotCommandType, BotListener } from '../types/core/bot.types';
import MemeRepository from '../repositories/meme.repo';
import { MemeAction, MemeStatResult, MemeStatStatus } from '../types/services/meme.service.types';
import BibacoinService from './bibacoin.service';
import { BibacoinActivity } from '../types/services/bibacoin.service.types';
import CheckConfig from '../decorators/check.config.decorator';
import { ConfigProperty } from '../types/services/config.service.types';
import CheckMessageContent from '../decorators/check.message.content.decorator';
import { MessageContent } from '../types/globals/message.types';
import * as shopUtils from '../utils/shop.util';
import moment from 'moment';
import ReplyWithError from '../decorators/reply.with.error.decorator';
import RepliableError from '../types/globals/repliable.error';

export default class MemeService extends BaseService {
  private static instance: MemeService;

  private repliedMediaIds = new Set();

  private timeoutMap = new Map<number, NodeJS.Timeout>();

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
  public async handleMeme(ctx: Context, next: Function | undefined): Promise<void> {
    if (!ctx.chat || !ctx.message) {
      throw new Error('Wrong context');
    }

    if (this.timeoutMap.has(ctx.chat!.id)) {
      clearTimeout(this.timeoutMap.get(ctx.chat!.id)!);
    }

    this.timeoutMap.set(ctx.chat!.id, setTimeout(() => {
      this.repliedMediaIds = new Set();
    }, 500));

    const chatId = ctx.chat.id;
    const messageId = ctx.message.message_id;
    const mediaId = 'media_group_id' in ctx.message ? ctx.message.media_group_id : null;
    const isReplied = this.repliedMediaIds.has(mediaId);

    if (isReplied && mediaId) {
      next!();
      return;
    }

    this.repliedMediaIds.add(mediaId);

    const responseMessage = await ctx.reply(
      'Оцените данный мем',
      {
        reply_markup: Markup.inlineKeyboard([
          Markup.button.callback('👍 0', MemeAction.LIKE),
          Markup.button.callback('👎 0', MemeAction.DISLIKE),
        ]).reply_markup,
        reply_to_message_id: messageId,
      },
    );

    await this.memeRepo.initStat(chatId, responseMessage.message_id, ctx.from!.id);

    next!();
  }

  @ReplyWithError()
  @CheckConfig(ConfigProperty.MEME_STAT)
  private async changeMemeStat(ctx: Context, actionType: MemeAction): Promise<void> {
    if (
      !ctx.from
      || !ctx.chat
      || !ctx.update
      || !('callback_query' in ctx.update)
      || !ctx.update.callback_query.message
    ) {
      throw new Error('Wrong context');
    }

    const { message } = ctx.update.callback_query;
    const chatId = ctx.chat.id;
    const messageId = message.message_id;
    const userId = ctx.from.id;
    const price = shopUtils.getPriceByActivity(BibacoinActivity.MEME_LIKE);
    const isLike = actionType === MemeAction.LIKE;

    let response: MemeStatResult | null = null;

    try {
      response = isLike ?
        await this.memeRepo.addLike(chatId, messageId, userId) :
        await this.memeRepo.addDislike(chatId, messageId, userId);
    } catch (err) {
      throw new RepliableError(err.message, ctx);
    }

    if (!response) {
      throw new Error('Unexpected error');
    }

    if (
      response.status === MemeStatStatus.STAT_SWITCHED ||
      response.status === MemeStatStatus.STAT_ADDED
    ) {
      const finalPrice = response.status === MemeStatStatus.STAT_SWITCHED ? price * 2 : price;
      isLike ?
        await this.bibacoinService.addCoins(response.authorId, chatId, finalPrice) :
        await this.bibacoinService.withdrawCoins(response.authorId, chatId, finalPrice);
    } else {
      isLike ?
        await this.bibacoinService.withdrawCoins(response.authorId, chatId, price) :
        await this.bibacoinService.addCoins(response.authorId, chatId, price);
    }

    await this.updateStatMessage(chatId, messageId);
    await ctx.answerCbQuery(response.message);
  }

  public async cleanOldMemes(done: Function): Promise<void> {
    const result = await this.memeRepo.getAllMemes();

    for await (const [key, value] of Object.entries(result)) {
      if (moment().diff(moment(value.createdAt), 'days') > 30) {
        console.log(`Removed meme with key: ${key}`);
        await this.memeRepo.removeMeme(key);
      }
    }

    done();
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
      Markup.inlineKeyboard([
        Markup.button.callback(`👍 ${likes}`, MemeAction.LIKE),
        Markup.button.callback(`👎 ${dislikes}`, MemeAction.DISLIKE),
      ]).reply_markup,
    );
  }

  protected initListeners(): BotListener[] {
    return [
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
    ];
  }
}
