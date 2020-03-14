import {
    BibacoinProduct,
    BibacoinAction,
    BibacoinProductToActionMap,
    BibacoinPrice,
    BibacoinCredit,
    BibacoinActivity
} from "../types/services/bibacoin.service.types";
import { IncomingMessage } from "telegraf/typings/telegram-types";

export const getActionByProduct = (product: BibacoinProduct): BibacoinAction => {
    return BibacoinProductToActionMap[product];
}

export const getProductPrice = (product: BibacoinProduct): number => {
    return BibacoinPrice[product];
}

export const getPriceByActivity = (activity: BibacoinActivity) => {
    return BibacoinCredit[activity];
}

export const getActivitiesList = (): Array<BibacoinActivity> => {
    return Object.keys(BibacoinActivity) as Array<BibacoinActivity>
}

export const getPriceByMessage = (message: IncomingMessage): number => {
    if (message.photo) return BibacoinCredit[BibacoinActivity.PHOTO];
    if (message.sticker) return BibacoinCredit[BibacoinActivity.STICKER];
    if (message.voice) return BibacoinCredit[BibacoinActivity.VOICE];
    if (message.video) return BibacoinCredit[BibacoinActivity.VIDEO];
    return BibacoinCredit[BibacoinActivity.MESSAGE];
};

export const getProductsList = (): Array<BibacoinProduct> => {
    return Object.keys(BibacoinPrice) as Array<BibacoinProduct>;
}