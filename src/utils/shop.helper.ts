import { IncomingMessage } from 'telegraf/typings/telegram-types';
import {
  BibacoinCredit,
  BibacoinActivity,
} from '../types/services/bibacoin.service.types';
import {
  Product, ShopAction, ProductToActionMap, ProductPrice,
} from '../types/services/shop.service.types';

export const getActionByProduct = (product: Product): ShopAction => ProductToActionMap[product];

export const getProductPrice = (product: Product): number => ProductPrice[product];

export const getPriceByActivity = (activity: BibacoinActivity): number => BibacoinCredit[activity];

export const getActivitiesList = (): Array<BibacoinActivity> => Object.keys(BibacoinActivity) as Array<BibacoinActivity>;

export const getProductsList = (): Array<Product> => Object.keys(ProductPrice) as Array<Product>;

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
    case BibacoinActivity.BIBA_CM: message = 'Один см бибы'; break;
    case BibacoinActivity.SMALL_PEPE: message = 'Маленькая биба'; break;
    case BibacoinActivity.MEME_LIKE: message = 'Лайк на мем'; break;
    default: message = 'Пока нет описания этой активности';
  }

  return `${message} - 💰${getPriceByActivity(activity)}¢`;
};

export const getProductActionContext = (product: Product): string => {
  let message: string;

  switch (product) {
    case Product.BIBA_CM: message = '+1 см бибы'; break;
    case Product.BIBA_REROLL: message = 'Перемерять бибу'; break;
    default: return 'No description yet';
  }

  return `${message} 💰${getProductPrice(product)}¢`;
};
