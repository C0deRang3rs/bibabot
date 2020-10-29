import { Message, User } from 'telegraf/typings/telegram-types';
import fs from 'fs';
import puppeteer from 'puppeteer';
import axios from 'axios';
import { TelegrafContext } from 'telegraf/typings/context';
import BaseService from './base.service';
import { BotCommandType } from '../types/core/bot.types';
import { StickerCommand } from '../types/globals/commands.types';
import StickerSetRepository from '../repositories/sticker.repo';
import ReplyWithError from '../decorators/reply.with.error.decorator';
import RepliableError from '../types/globals/repliable.error';
import OnlyReply from '../decorators/only.reply.decorator';
import OnlyMention from '../decorators/only.mention.decorator';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import DeleteResponseMessage from '../decorators/delete.response.message.decorator';

export default class StickerService extends BaseService {
  private static instance: StickerService;

  private constructor(
    private stickerSetRepo: StickerSetRepository,
  ) {
    super();
  }

  public static getInstance(): StickerService {
    if (!StickerService.instance) {
      StickerService.instance = new StickerService(
        new StickerSetRepository(),
      );
    }

    return StickerService.instance;
  }

  private static async createImage(text: string, messageAuthor: User, time: string): Promise<void> {
    const colorSet = ['#58A5E6', '#F0948B', '#3E82C7', '#8263CE', '#EA6759', '#EA7F34'];
    const color = colorSet[Math.floor(Math.random() * colorSet.length)];
    const htmlTemplateResponse = await axios.get(`http://127.0.0.1:${process.env.PORT}/img`, {
      data: {
        text,
        messageAuthor,
        time,
        color,
      },
    });
    const htmlString = htmlTemplateResponse.data;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlString);
    await page.evaluate(() => { document.body.style.background = 'transparent'; });

    const message = await page.$('#message');
    await message!.screenshot({
      path: 'example.png',
      omitBackground: true,
    });

    await browser.close();
  }

  @ReplyWithError()
  @OnlyMention(false)
  @OnlyReply(false)
  public async handleStickerCreation(ctx: TelegrafContext, next: Function | undefined): Promise<void> {
    const reply = ctx.message!.reply_to_message!;
    const text = reply.text!;
    const messageAuthor = reply.from!;
    const chatId = ctx!.chat!.id;
    const setName = `set_${chatId.toString().replace('-', '1')}_by_${this.bot.app.options.username}`;

    const date = new Date(reply.date * 1000);
    date.setTime(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
    const time = `${`0${date.getUTCHours()}`.slice(-2)}:${`0${date.getUTCMinutes()}`.slice(-2)}`;

    await StickerService.createImage(text, messageAuthor, time);
    const imageStream = fs.createReadStream(`${__dirname}/../../example.png`);

    const isCreated = await this.stickerSetRepo.getStickerSet(chatId);

    try {
      if (isCreated) {
        await this.bot.app.telegram.addStickerToSet(
          ctx.message!.from!.id,
          setName,
          { png_sticker: { source: imageStream }, emojis: '🍌' },
          false,
        );
      } else {
        await this.bot.app.telegram.createNewStickerSet(
          ctx.message!.from!.id,
          setName,
          ctx.chat!.title!,
          { png_sticker: { source: imageStream }, emojis: '🍌' },
        );

        await this.stickerSetRepo.setStickerSet(chatId, messageAuthor.id, setName);
      }
    } catch (err) {
      if (err.description === 'Bad Request: USER_IS_BOT') {
        throw new RepliableError('Первый стикер в сете не может быть от бота', ctx);
      }

      throw err;
    }

    const set = await this.bot.app.telegram.getStickerSet(setName);
    const sticker = set.stickers.pop()!.file_id;

    await ctx.replyWithSticker(sticker);

    next!();
  }

  protected initListeners(): void {
    this.bot.addListeners([
      {
        type: BotCommandType.COMMAND,
        name: StickerCommand.REMOVE_STICKER,
        callback: (ctx): Promise<Message> => this.removeStickerFromPack(ctx),
      },
    ]);
  }

  @ReplyWithError()
  @DeleteRequestMessage()
  @OnlyReply()
  @DeleteResponseMessage(5000)
  private async removeStickerFromPack(ctx: TelegrafContext): Promise<Message> {
    const reply = ctx.message!.reply_to_message!;

    if (!reply.sticker) {
      throw new RepliableError('Реплай должен быть на стикер', ctx);
    }

    try {
      await this.bot.app.telegram.deleteStickerFromSet(reply.sticker!.file_id);
    } catch (err) {
      throw new RepliableError('Стикер не удалён. Либо он не принадлежит боту, либо он был удалён ранее', ctx);
    }

    await this.bot.app.telegram.deleteMessage(ctx.chat!.id, reply.message_id);

    return ctx.reply('Стикер удалён');
  }
}
