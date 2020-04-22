export enum MemeAction {
  LIKE = 'like',
  DISLIKE = 'dislike',
}

export interface Stat {
  likeIds: Array<number>;
  dislikeIds: Array<number>;
  authorId: number;
}

export enum MemeStatStatus {
  STAT_ADDED = 'STAT_ADDED',
  STAT_RETRACTED = 'STAT_RETRACTED',
  STAT_SWITCHED = 'STAT_SWITCHED',
}

export interface MemeStatResult {
  message: string;
  status: MemeStatStatus;
  authorId: number;
}
