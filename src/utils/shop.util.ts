import { Message } from 'telegraf/typings/core/types/typegram';
import { BibacoinActivity, BibacoinCredit } from '../types/services/bibacoin.service.types';
import {
  Product,
  ShopAction,
  ProductPrice,
  ActivityContext,
  ProductActionContext,
} from '../types/services/shop.service.types';

export const getActivityByMessageContent = (message: Message): BibacoinActivity => {
  if ('photo' in message) return BibacoinActivity.PHOTO;
  if ('sticker' in message) return BibacoinActivity.STICKER;
  if ('voice' in message) return BibacoinActivity.VOICE;
  if ('video' in message) return BibacoinActivity.VIDEO;
  return BibacoinActivity.MESSAGE;
};

export const getActionByProduct = (product: Product): ShopAction => ShopAction[product];

export const getProductPrice = (product: Product): number => ProductPrice[product];

export const getPriceByActivity = (activity: BibacoinActivity): number => BibacoinCredit[activity];

export const getActivitiesList = (): Array<BibacoinActivity> => Object.keys(BibacoinActivity) as Array<BibacoinActivity>;

export const getProductsList = (): Array<Product> => Object.keys(Product) as Array<Product>;

export const getPriceByMessage = (message: Message): number => getPriceByActivity(getActivityByMessageContent(message));

export const getActivityContext = (activity: BibacoinActivity): string => {
  const context = ActivityContext[activity] || 'Пока нет описания этой активности';

  return `${context} - ${getPriceByActivity(activity)}💰`;
};

export const getProductActionContext = (product: Product): string => {
  const context = ProductActionContext[product] || 'Пока нет описания этой этого продукта';

  return `${context} ${getProductPrice(product)}💰`;
};
