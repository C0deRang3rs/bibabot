import { BasePoll } from '../types/services/poll.service.types';
import BaseRepository from './base.repo';

export default class PollRepository extends BaseRepository {
  protected entityName = 'poll';

  public async addPoll<T extends BasePoll>(chatId: number, data: T): Promise<void> {
    const query = `${this.entityName}:${chatId}:${data.pollId}`;

    await this.redis.setAsync(query, JSON.stringify(data));
  }

  public async getPoll<T extends BasePoll>(chatId: number, pollId: number): Promise<T | null> {
    const query = `${this.entityName}:${chatId}:${pollId}`;
    const result = await this.redis.getAsync(query);

    if (!result) {
      return null;
    }

    return JSON.parse(result);
  }

  public async getPollById<T extends BasePoll>(pollId: number): Promise<T | null> {
    const query = `${this.entityName}:*:${pollId}`;
    const keys = await this.redis.keysAsync(query);

    if (!keys || !keys.length) {
      return null;
    }

    const result = await this.redis.mgetAsync(keys);

    if (!result) {
      return null;
    }

    return JSON.parse(result[0]);
  }

  public async updatePollInfo<T extends BasePoll>(pollId: number, chatId: number, data: T): Promise<void> {
    const query = `${this.entityName}:${chatId}:${pollId}`;

    const poll = await this.getPoll(chatId, pollId);

    if (!poll) {
      throw new Error('иди нахуй');
    }

    const pollData = {
      ...poll,
      data,
    };

    await this.redis.setAsync(query, JSON.stringify(pollData));
  }

  public async removePoll(pollId: number, chatId: number): Promise<void> {
    const query = `${this.entityName}:${chatId}:${pollId}`;

    await this.redis.delAsync(query);
  }
}
