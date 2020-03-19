export enum ChangeTitleCommandType {
  START_RENAME = 'start_rename',
  STOP_RENAME = 'stop_rename',
  RENAME = 'rename',
  ITERATION_CHANGE = 'iteration_change',
}

export enum BibaCommand {
  BIBA = 'biba',
  UNRANKED_BIBA = 'unbiba',
  BIBA_TABLE = 'biba_table',
}

export enum BibacoinCommand {
  BALANCE = 'balance',
  INCOME_LIST = 'income_list',
  SET_BALANCE = 'set_balance',
}

export enum TrashCommand {
  FLIP = 'flip',
  ROLL = 'roll',
  FLIP_STAT = 'flip_stat',
}

export enum ShopCommand {
  SHOP = 'shop',
}

export enum GlobalCommand {
  START = 'start',
  STOP = 'stop',
}
