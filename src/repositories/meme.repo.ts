import zipObject from 'lodash.zipobject';
import BaseRepository from './base.repo';
import { Stat, MemeStatStatus, MemeStatResult } from '../types/services/meme.service.types';

export default class MemeRepository extends BaseRepository {
  protected entityName = 'meme';

  public async getStat(chatId: number, responseMessageId: number): Promise<Stat | null> {
    const result = await this.redis.getAsync(`${this.entityName}:${chatId}:${responseMessageId}`);

    return JSON.parse(result!);
  }

  public async initStat(chatId: number, responseMessageId: number, userId: number): Promise<void> {
    const payload: Stat = {
      authorId: userId,
      likeIds: [],
      dislikeIds: [],
      createdAt: new Date(),
    };

    await this.redis.setAsync(`${this.entityName}:${chatId}:${responseMessageId}`, JSON.stringify(payload));
  }

  public async addLike(chatId: number, responseMessageId: number, userId: number): Promise<MemeStatResult> {
    let stat = await this.getStat(chatId, responseMessageId);

    if (!stat) {
      throw new Error('Данный мем удалён из базы')
    }

    let response = {
      message: 'Ты влепил лайк',
      status: MemeStatStatus.STAT_ADDED,
      authorId: stat.authorId,
      date: new Date(),
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

    if (!stat) {
      throw new Error('Данный мем удалён из базы')
    }

    let response: MemeStatResult = {
      message: 'Ты влепил дизлайк',
      status: MemeStatStatus.STAT_ADDED,
      authorId: stat.authorId,
      date: new Date(),
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

  public async getAllMemes(): Promise<Record<string, Stat>> {
    const keys = await this.getAllMemesKeys();

    if (!keys.length) {
      return {};
    }

    const result = await this.redis.mgetAsync(keys);

    if (!result || !result.length) {
      return {};
    }

    return zipObject(keys, result.map((res) => JSON.parse(res)));
  }

  public async getAllMemesKeys(): Promise<string[]> {
    const chatKeys = await this.redis.keysAsync(`${this.entityName}:*`);

    if (!chatKeys || !chatKeys.length) {
      return [];
    }

    return chatKeys;
  }

  public async removeMeme(key: string): Promise<void> {
    await this.redis.delAsync(key);
  }

  public async batchUpdate(payload: Record<string, Stat>): Promise<void> {
    for await (const [key, stat] of Object.entries(payload)) {
      await this.redis.setAsync(key, JSON.stringify(stat));
    }
  }
}
