import BaseRepository from './base.repository';

export default class ChatRepository extends BaseRepository {
  protected entityName = 'auto:rename';

  public async getAllChats(): Promise<Array<number>> {
    const chatKeys = await this.redis.keysAsync(`${this.entityName}:*`);
    const chatIds = chatKeys.map((key: string) => key.split(':')[2]);
    return chatIds.map((chatId) => parseInt(chatId, 10));
  }

  public async getTimersByChatIds(chatIds: Array<number>): Promise<Array<string>> {
    return this.redis.mgetAsync(chatIds.map((chatId) => `${this.entityName}:${chatId.toString()}`));
  }

  public async setTimerByChatId(chatId: number, timer: Date): Promise<void>;
  public async setTimerByChatId(chatId: string, timer: Date): Promise<void>;

  public async setTimerByChatId(chatId: number | string, timer: Date): Promise<void> {
    await this.redis.setAsync(`${this.entityName}:${chatId}`, timer.toISOString());
  }

  public async getTimerByChatId(chatId: number): Promise<string> {
    return this.redis.getAsync(`${this.entityName}:${chatId}`);
  }

  public async removeChat(chatId: number): Promise<void> {
    await this.redis.delAsync(`${this.entityName}:${chatId}`);
  }
}
