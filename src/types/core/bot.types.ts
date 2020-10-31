import { MessageSubTypes } from 'telegraf/typings/telegram-types';
import Telegraf, { Telegram } from 'telegraf';
import { TelegrafContext } from 'telegraf/typings/context';

export enum BotEvent {
  MESSAGE = 'message',
}

export enum BotCommandType {
  ON = 'on',
  COMMAND = 'command',
  ACTION = 'action',
}

export interface BotListener {
  type: BotCommandType;
  name: MessageSubTypes | string;
  callback(ctx: TelegrafContext): Promise<void | object>;
}

// @ts-ignore
export interface TelegramFull extends Telegram {
  getUserProfilePhotos(id: number, offset?: number, limit?: number): Promise<PictureResponse>;
  setChatStickerSet(chatId: number | string, setName: string): Promise<true>;
  deleteChatStickerSet(chatId: number | string): Promise<true>;
  createNewStickerSet(ownerId: number, name: string, title: string, stickerData: ExtraCreateNewStickerSet): Promise<true>;
  addStickerToSet(ownerId: number, name: string, stickerData: ExtraCreateNewStickerSet, isMask: boolean): Promise<true>;
}

export interface PictureResponse {
  total_count: number;
  photos: Array<Photo[]>;
}

export interface Photo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface File {
  file_id: string;
  file_unique_id: string;
  file_size: number;
  file_path: string;
}

// @ts-ignore
export interface TelegrafFull extends Telegraf<TelegrafContext> {
  telegram: TelegramFull;
}

export interface ExtraCreateNewStickerSet {
  png_sticker?: InputFile;
  tgs_sticker?: InputFile;
  emojis: string;
  contains_masks?: boolean;
  mask_position?: MaskPosition;
}

export type InputFile =
  | FileId
  | InputFileByPath
  | InputFileByReadableStream
  | InputFileByBuffer
  | InputFileByURL;

export type FileId = string;

export interface InputFileByPath {
  source: string;
}

export interface InputFileByReadableStream {
  source: NodeJS.ReadableStream;
}

export interface InputFileByBuffer {
  source: Buffer;
}

export interface InputFileByURL {
  url: string;
  filename: string;
}

export interface MaskPosition {
  /** The part of the face relative to which the mask should be placed. One of “forehead”, “eyes”, “mouth”, or “chin”. */
  point: 'forehead' | 'eyes' | 'mouth' | 'chin';
  /** Shift by X-axis measured in widths of the mask scaled to the face size, from left to right.
   *  For example, choosing -1.0 will place mask just to the left of the default mask position. */
  x_shift: number;
  /** Shift by Y-axis measured in heights of the mask scaled to the face size, from top to bottom.
   * For example, 1.0 will place the mask just below the default mask position. */
  y_shift: number;
  /** Mask scaling coefficient. For example, 2.0 means double size. */
  scale: number;
}
