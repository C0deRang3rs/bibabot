export enum BibacoinActivity {
  MESSAGE = 'MESSAGE',
  PHOTO = 'PHOTO',
  VOICE = 'VOICE',
  STICKER = 'STICKER',
  VIDEO = 'VIDEO',
  SMALL_PEPE = 'SMALL_PEPE',
  BIBA_CM = 'BIBA_CM',
  MEME_LIKE = 'MEME_LIKE',
}

export enum BibacoinAction {
  BALANCE = 'BALANCE',
}

export enum BibacoinCredit {
  MESSAGE = 1,
  PHOTO = 2,
  VOICE = -1,
  STICKER = 1,
  VIDEO = 2,
  SMALL_PEPE = 20,
  BIBA_CM = 1,
  MEME_LIKE = 2,
}

export const ZERO_BALANCE = 'Пока что у тебя нет бибакоинов, ты можешь получить их за любую активность в чате';
export const NO_BIBA_TO_BUY = 'У тебя нет бибы, так что увеличивать нечего';
export const NO_BIBA_TO_REROLL = 'У тебя нет бибы, так что измерять нечего';
export const NO_BIBA_NO_TRADE = 'К сожалению сейчас обмениваться бибакоинами могут только те у кого хоть раз была биба';
export const DAILY_BIBACOINT_INCOME_PERCENT = 10;
export const MAX_DAILY_BIBACOINT_INCOME = 1000;
