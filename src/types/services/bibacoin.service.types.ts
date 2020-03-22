export enum BibacoinActivity {
  MESSAGE = 'MESSAGE',
  PHOTO = 'PHOTO',
  VOICE = 'VOICE',
  STICKER = 'STICKER',
  VIDEO = 'VIDEO',
}

export enum BibacoinAction {
  BALANCE = 'balance',
}

export const BibacoinCredit: Record<BibacoinActivity, number> = {
  [BibacoinActivity.MESSAGE]: 0.5,
  [BibacoinActivity.PHOTO]: 1.5,
  [BibacoinActivity.VOICE]: -1,
  [BibacoinActivity.STICKER]: 0.5,
  [BibacoinActivity.VIDEO]: 1.5,
};

export const ZERO_BALANCE = 'Пока что у тебя нет бибакоинов, ты можешь получить их за любую активность в чате';
export const NO_BIBA_TO_BUY = 'У тебя нет бибы, так что увеличивать нечего';
export const NO_BIBA_TO_REROLL = 'У тебя нет бибы, так что измерять нечего';
