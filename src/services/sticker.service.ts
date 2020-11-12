/* eslint-disable spaced-comment */
import { Message, User } from 'telegraf/typings/telegram-types';
import fs from 'fs';
import puppeteer from 'puppeteer';
import axios from 'axios';
import gm from 'gm';
import { TelegrafContext } from 'telegraf/typings/context';
import BaseService from './base.service';
import { BotCommandType, TelegramError } from '../types/core/bot.types';
import { StickerCommand } from '../types/globals/commands.types';
import StickerSetRepository from '../repositories/sticker.repo';
import ReplyWithError from '../decorators/reply.with.error.decorator';
import RepliableError from '../types/globals/repliable.error';
import OnlyReply from '../decorators/only.reply.decorator';
import OnlyMention from '../decorators/only.mention.decorator';
import DeleteRequestMessage from '../decorators/delete.request.message.decorator';
import DeleteResponseMessage from '../decorators/delete.response.message.decorator';
import {
  MAX_TEXT_LENGTH, NameColor, STATUS_CREATOR, StickerSet,
} from '../types/services/sticker.service.types';
import DeleteLastMessage from '../decorators/delete.last.message.decorator';
import UpdateLastMessage from '../decorators/update.last.message.decorator';
import { BotMessage } from '../types/globals/message.types';
import { getUpdatedMessage } from '../utils/lists.util';

export default class StickerService extends BaseService {
  private static instance: StickerService;

  private avatarMap = new Map<number, Buffer>();

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

  private static getNameColor(messageAuthor: User): string {
    const userId = messageAuthor.id;
    const nameColors = [
      NameColor.LIGHT_RED,
      NameColor.GREEN,
      NameColor.YELLOW,
      NameColor.LIGHT_BLUE,
      NameColor.PURPLE,
      NameColor.PINK,
      NameColor.LIGHT_GREEN,
      NameColor.ORANGE,
      NameColor.RED,
    ];

    const nameMap = [0, 7, 4, 1, 6, 3, 5];
    const nameIndex = Math.abs(userId) % 7;
    return nameColors[nameMap[nameIndex]];
  }

  private static async createImage(text: string, messageAuthor: User, time: string): Promise<void> {
    const color = StickerService.getNameColor(messageAuthor);
    const htmlTemplateResponse = await axios.get(`http://127.0.0.1:${process.env.PORT}/img`, {
      data: {
        text,
        messageAuthor,
        time,
        color,
      },
    });
    const htmlString = htmlTemplateResponse.data;

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlString);
    await page.evaluate(() => { document.body.style.background = 'transparent'; });

    const message = await page.$('#message');
    await message!.screenshot({
      path: 'test.png',
      omitBackground: true,
    });
    await browser.close();
    return new Promise((resolve, reject) => {
      gm('test.png').resize(512, 512).write('example.png', (err) => {
        if (err) {
          reject(err);
        }

        resolve();
      });
    });
  }

  @ReplyWithError()
  @OnlyMention(false)
  @OnlyReply(false)
  @DeleteRequestMessage()
  @UpdateLastMessage(BotMessage.STICKER_LIST)
  public async handleStickerCreation(ctx: TelegrafContext, next: Function | undefined): Promise<void> {
    const reply = ctx.message!.reply_to_message!;
    const text = reply.text!;
    const messageAuthor = reply.from!;
    const chatId = ctx!.chat!.id;
    let ownerId = ctx.message!.from!.id;

    if (!text) {
      throw new RepliableError('У этого сообщения нет текста', ctx);
    }

    if (text.length > MAX_TEXT_LENGTH) {
      throw new RepliableError('Слишком длинное сообщение 😢', ctx);
    }

    const date = new Date(reply.date * 1000);
    date.setTime(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
    const time = `${`0${date.getUTCHours()}`.slice(-2)}:${`0${date.getUTCMinutes()}`.slice(-2)}`;

    await StickerService.createImage(text, messageAuthor, time);

    const imageStream = fs.readFileSync(`${__dirname}/../../example.png`);

    const owner = (await this.bot.app.telegram.getChatAdministrators(chatId)).find((usr) => usr.status === STATUS_CREATOR)?.user;

    if (owner) {
      ownerId = owner.id;
    }

    const createdSet = await this.stickerSetRepo.getStickerSet(chatId);

    let setName;
    let isStickerAdded = false;
    if (createdSet) {
      // eslint-disable-next-line no-restricted-syntax
      for await (const name of createdSet.names) {
        try {
          await this.bot.app.telegram.addStickerToSet(
            ownerId,
            name,
            { png_sticker: { source: imageStream }, emojis: '🍌' },
            false,
          );

          setName = name;
          isStickerAdded = true;
          break;
        } catch (err) {
          if (err.description === TelegramError.STICKERSET_INVALID) {
            await this.stickerSetRepo.setStickerSet(chatId, {
              names: createdSet.names.filter((n) => n !== name),
              ownerId: createdSet.ownerId,
            });
          }

          if (
            err.description !== TelegramError.STICKERS_TOO_MUCH
            && err.description !== TelegramError.STICKERSET_INVALID
          ) {
            throw err;
          }
        }
      }
    }
    if (!isStickerAdded) {
      try {
        const payload = {
          ownerId,
        } as StickerSet;

        if (createdSet) {
          // eslint-disable-next-line max-len
          setName = `set${createdSet.names.length + 1}_${chatId.toString().replace('-', '1')}_by_${this.bot.app.options.username}`;
          payload.names = [...createdSet.names, setName];
        } else {
          setName = `set1_${chatId.toString().replace('-', '1')}_by_${this.bot.app.options.username}`;
          payload.names = [setName];
        }

        await this.bot.app.telegram.createNewStickerSet(
          ownerId,
          setName,
          ctx.chat!.title!,
          { png_sticker: { source: imageStream }, emojis: '🍌' },
        );
        isStickerAdded = true;

        await this.stickerSetRepo.setStickerSet(chatId, payload);
      } catch (err) {
        if (err.description === TelegramError.USER_IS_BOT) {
          throw new RepliableError('Первый стикер в сете не может быть от бота', ctx);
        }

        if (err.description === TelegramError.PEER_ID_INVALID) {
          throw new RepliableError('Бот должен быть активирован в лс у создателя группы', ctx);
        }

        throw err;
      }
    }

    if (isStickerAdded && setName) {
      const set = await this.bot.app.telegram.getStickerSet(setName);
      const sticker = set.stickers.pop()!.file_id;

      await ctx.replyWithSticker(sticker);
    }

    next!();
  }

  @ReplyWithError()
  @OnlyReply()
  @DeleteRequestMessage()
  @DeleteResponseMessage(5000)
  @UpdateLastMessage(BotMessage.STICKER_LIST)
  private async removeStickerFromPack(ctx: TelegrafContext): Promise<Message> {
    const reply = ctx.message!.reply_to_message!;

    if (!reply.sticker) {
      throw new RepliableError('Реплай должен быть на стикер', ctx);
    }

    try {
      const botStickerSet = await this.stickerSetRepo.getStickerSet(ctx.chat!.id!);

      if (!botStickerSet) {
        throw new RepliableError('Для этого чата пока нет стикер сета', ctx);
      }

      if (!botStickerSet.names.includes(reply.sticker.set_name!)) {
        throw new RepliableError('Этот стикер не принадлежит этому чату', ctx);
      }

      await this.bot.app.telegram.deleteStickerFromSet(reply.sticker.file_id);
    } catch (err) {
      if (err instanceof RepliableError) {
        throw err;
      }

      throw new RepliableError('Стикер не удалён. Либо он не принадлежит боту, либо он был удалён ранее', ctx);
    }

    await this.bot.app.telegram.deleteMessage(ctx.chat!.id, reply.message_id);

    return ctx.reply('Стикер удалён');
  }

  @DeleteRequestMessage()
  @DeleteLastMessage(BotMessage.STICKER_LIST)
  private static async sendStickerList(ctx: TelegrafContext): Promise<Message> {
    const { text, extra } = await getUpdatedMessage(BotMessage.STICKER_LIST, ctx.chat!.id!);
    return ctx.reply(text, extra);
  }

  protected initListeners(): void {
    this.bot.addListeners([
      {
        type: BotCommandType.COMMAND,
        name: StickerCommand.REMOVE_STICKER,
        callback: (ctx): Promise<Message> => this.removeStickerFromPack(ctx),
      },
      {
        type: BotCommandType.COMMAND,
        name: StickerCommand.STICKERS,
        callback: (ctx): Promise<Message> => StickerService.sendStickerList(ctx),
      },
    ]);
  }
}
