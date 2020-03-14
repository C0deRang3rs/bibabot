export enum BibacoinActivity {
    MESSAGE = 'MESSAGE',
    PHOTO = 'PHOTO',
    VOICE = 'VOICE',
    STICKER = 'STICKER',
    VIDEO = 'VIDEO',
}

export const BibacoinCredit: Record<BibacoinActivity, number> = {
    [BibacoinActivity.MESSAGE]: 0.5,
    [BibacoinActivity.PHOTO]: 1.5,
    [BibacoinActivity.VOICE]: -1,
    [BibacoinActivity.STICKER]: 0.5,
    [BibacoinActivity.VIDEO]: 1.5,
};

export enum BibacoinProduct {
    BIBA_CM = 'biba_cm',
    BIBA_REROLL = 'biba_reroll',
}

export enum BibacoinAction {
    BUY_CM = 'buy_cm',
    BUY_REROLL = 'buy_reroll',
}

export const BibacoinPrice: Record<BibacoinProduct, number> = {
    [BibacoinProduct.BIBA_CM]: 15,
    [BibacoinProduct.BIBA_REROLL]: 50,
};

export const BibacoinProductToActionMap: Record<BibacoinProduct, BibacoinAction> = {
    [BibacoinProduct.BIBA_CM]: BibacoinAction.BUY_CM,
    [BibacoinProduct.BIBA_REROLL]: BibacoinAction.BUY_REROLL,
}

export const ZERO_BALANCE = 'Пока что у тебя нет бибакоинов, ты можешь получить их за любую активность в чате';
export const NO_BIBA_TO_BUY = 'У тебя нет бибы, так что увеличивать нечего';