import BaseRepository from './base.repo';
import { Stat, MemeStatStatus, MemeStatResult } from '../types/services/meme.service.types';

export default class MemeRepository extends BaseRepository {
  protected entityName = 'meme';

  public async getStat(chatId: number, responseMessageId: number): Promise<Stat> {
    const result = await this.redis.getAsync(`${this.entityName}:${chatId}:${responseMessageId}`);

    return JSON.parse(result!);
  }

  public async initStat(chatId: number, responseMessageId: number, userId: number): Promise<void> {
    await this.redis.setAsync(`${this.entityName}:${chatId}:${responseMessageId}`, JSON.stringify({
      authorId: userId,
      likeIds: [],
      dislikeIds: [],
    }));
  }

  public async addLike(chatId: number, responseMessageId: number, userId: number): Promise<MemeStatResult> {
    let stat = await this.getStat(chatId, responseMessageId);
    let response = {
      message: 'Ты влепил лайк',
      status: MemeStatStatus.STAT_ADDED,
      authorId: stat.authorId,
    };

    if (stat.likeIds.includes(userId)) {
      stat = {
        ...stat,
        likeIds: stat.likeIds.filter((id) => id !== userId),
      };

      response = {
        ...response,
        message: 'Лайк убран',
        status: MemeStatStatus.STAT_RETRACTED,
      };
    } else if (stat.dislikeIds.includes(userId)) {
      stat = {
        ...stat,
        dislikeIds: stat.dislikeIds.filter((id) => id !== userId),
      };

      stat.likeIds.push(userId);
      response.status = MemeStatStatus.STAT_SWITCHED;
    } else {
      stat.likeIds.push(userId);
    }

    await this.redis.setAsync(`${this.entityName}:${chatId}:${responseMessageId}`, JSON.stringify(stat));

    return response;
  }

  public async addDislike(chatId: number, responseMessageId: number, userId: number): Promise<MemeStatResult> {
    let stat = await this.getStat(chatId, responseMessageId);
    let response: MemeStatResult = {
      message: 'Ты влепил дизлайк',
      status: MemeStatStatus.STAT_ADDED,
      authorId: stat.authorId,
    };

    if (stat.dislikeIds.includes(userId)) {
      stat = {
        ...stat,
        dislikeIds: stat.dislikeIds.filter((id) => id !== userId),
      };

      response = {
        ...response,
        message: 'Дизлайк убран',
        status: MemeStatStatus.STAT_RETRACTED,
      };
    } else if (stat.likeIds.includes(userId)) {
      stat = {
        ...stat,
        likeIds: stat.likeIds.filter((id) => id !== userId),
      };

      stat.dislikeIds.push(userId);
      response.status = MemeStatStatus.STAT_SWITCHED;
    } else {
      stat.dislikeIds.push(userId);
    }

    await this.redis.setAsync(`${this.entityName}:${chatId}:${responseMessageId}`, JSON.stringify(stat));

    return response;
  }
}
