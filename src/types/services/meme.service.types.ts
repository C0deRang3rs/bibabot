export enum MemeAction {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

export interface Stat {
  likeIds: Array<number>;
  dislikeIds: Array<number>;
  authorId: number;
  createdAt: Date;
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
  date: Date;
}
