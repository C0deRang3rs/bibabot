export enum BibacoinCredit {
    MESSAGE = 0.5,
    PHOTO = 1.5,
    VOICE = -1,
    STICKER = 0.5,
}

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