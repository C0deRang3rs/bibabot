import BaseRepository from './base.repository';

export default class LastMessageRepository extends BaseRepository {
  protected entityName = 'last:message';

  public async setLastMessage(prefix: string, chatId: number, messageId: number): Promise<void> {
    await this.redis.setAsync(`${this.entityName}:${prefix}:${chatId}`, messageId.toString());
  }

  public async getLastMessage(prefix: string, chatId: number): Promise<number | null> {
    const result = await this.redis.getAsync(`${this.entityName}:${prefix}:${chatId}`);

    if (!result) {
      return null;
    }

    return parseInt(result, 10);
  }
}
