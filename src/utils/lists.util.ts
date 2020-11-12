import Bot from '../core/bot';
import BibaRepository from '../repositories/biba.repo';
import StickerSetRepository from '../repositories/sticker.repo';
import { BotMessage, UpdateMessageResponse } from '../types/globals/message.types';
import { NO_BIBA_TABLE_DATA, NO_STICKER_LIST_DATA } from '../types/services/biba.service.types';
import { getUsernameFromUser } from './data.utils';

const getBibaTableText = async (chatId: number): Promise<UpdateMessageResponse> => {
  const bibaRepo = new BibaRepository();
  const allBibas = await bibaRepo.getAllBibasByChatId(chatId);

  if (!allBibas.length) {
    return { text: NO_BIBA_TABLE_DATA };
  }

  const message = allBibas.map((biba, index) => `${index + 1}. ${biba.username.replace('@', '')} - ${biba.size} см`);
  return { text: message.join('\n') };
};

const getStickerListUpdate = async (chatId: number): Promise<UpdateMessageResponse> => {
  const stickerSetRepo = new StickerSetRepository();
  const stickerSet = await stickerSetRepo.getStickerSet(chatId);
  const sets = stickerSet?.names;

  if (!sets?.length) {
    return { text: NO_STICKER_LIST_DATA };
  }

  const message = [];

  // eslint-disable-next-line no-restricted-syntax
  for await (const set of sets) {
    const setFromTG = await Bot.getInstance().app.telegram.getStickerSet(set);
    const chatMember = await Bot.getInstance().app.telegram.getChatMember(chatId, stickerSet?.ownerId!);
    const index = sets.indexOf(set) + 1;
    // eslint-disable-next-line max-len
    message.push(`<a href="https://t.me/addstickers/${set}">Пак ${index}</a> - ${setFromTG.stickers.length} стикеров, создатель: ${getUsernameFromUser(chatMember.user).replace('@', '')}`);
  }

  return { text: message.join('\n'), extra: { parse_mode: 'HTML' } };
};

// eslint-disable-next-line import/prefer-default-export
export const getUpdatedMessage = async (prefix: string, chatId: number): Promise<UpdateMessageResponse> => {
  switch (prefix) {
    case BotMessage.BIBA_TABLE: return getBibaTableText(chatId);
    case BotMessage.STICKER_LIST: return getStickerListUpdate(chatId);
    default: return {} as UpdateMessageResponse;
  }
};
