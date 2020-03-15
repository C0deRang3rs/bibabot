import { IncomingMessage } from 'telegraf/typings/telegram-types';
import {
  BibacoinProduct,
  BibacoinAction,
  BibacoinProductToActionMap,
  BibacoinPrice,
  BibacoinCredit,
  BibacoinActivity,
} from '../types/services/bibacoin.service.types';

export const getActionByProduct = (product: BibacoinProduct): BibacoinAction => BibacoinProductToActionMap[product];

export const getProductPrice = (product: BibacoinProduct): number => BibacoinPrice[product];

export const getPriceByActivity = (activity: BibacoinActivity): number => BibacoinCredit[activity];

export const getActivitiesList = (): Array<BibacoinActivity> => Object.keys(BibacoinActivity) as Array<BibacoinActivity>;

export const getProductsList = (): Array<BibacoinProduct> => Object.keys(BibacoinPrice) as Array<BibacoinProduct>;

export const getPriceByMessage = (message: IncomingMessage): number => {
  if (message.photo) return BibacoinCredit[BibacoinActivity.PHOTO];
  if (message.sticker) return BibacoinCredit[BibacoinActivity.STICKER];
  if (message.voice) return BibacoinCredit[BibacoinActivity.VOICE];
  if (message.video) return BibacoinCredit[BibacoinActivity.VIDEO];
  return BibacoinCredit[BibacoinActivity.MESSAGE];
};

export const getActivityContext = (activity: BibacoinActivity): string => {
  let message: string;

  switch (activity) {
    case BibacoinActivity.MESSAGE: message = 'Сообщение'; break;
    case BibacoinActivity.PHOTO: message = 'Картинка'; break;
    case BibacoinActivity.STICKER: message = 'Стикер'; break;
    case BibacoinActivity.VIDEO: message = 'Видос'; break;
    case BibacoinActivity.VOICE: message = 'Войс'; break;
    default: message = 'Пока нет описания этой активности';
  }

  return `${message} - 💰${getPriceByActivity(activity)}¢`;
};

export const getProductActionContext = (product: BibacoinProduct): string => {
  let message: string;

  switch (product) {
    case BibacoinProduct.BIBA_CM: message = '+1 см бибы'; break;
    case BibacoinProduct.BIBA_REROLL: message = 'Зароллить заново'; break;
    default: return 'No description yet';
  }

  return `${message} 💰${getProductPrice(product)}¢`;
};
