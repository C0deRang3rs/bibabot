import BaseRepository from './base.repository';

export default class TimerRepository extends BaseRepository {
  protected entityName = 'auto:rename';

  public async getAllTimers(): Promise<Array<number>> {
    const chatKeys = await this.redis.keysAsync(`${this.entityName}:*`);

    if (!chatKeys || !chatKeys.length) {
      return [];
    }

    const chatIds = chatKeys.map((key: string) => key.split(':')[2]);
    return chatIds.map((chatId) => parseInt(chatId, 10));
  }

  public async getTimersByChatIds(chatIds: Array<number>): Promise<Array<string>> {
    const result = await this.redis.mgetAsync(chatIds.map((chatId) => `${this.entityName}:${chatId.toString()}`));

    if (!result || !result.length) {
      return [];
    }

    return result;
  }

  public async setTimerByChatId(chatId: number, timer: Date): Promise<void>;
  public async setTimerByChatId(chatId: string, timer: Date): Promise<void>;

  public async setTimerByChatId(chatId: number | string, timer: Date): Promise<void> {
    await this.redis.setAsync(`${this.entityName}:${chatId}`, timer.toISOString());
  }

  public async getTimerByChatId(chatId: number): Promise<string | null> {
    const result = await this.redis.getAsync(`${this.entityName}:${chatId}`);

    return result || null;
  }

  public async removeTimer(chatId: number): Promise<void> {
    await this.redis.delAsync(`${this.entityName}:${chatId}`);
  }
}
