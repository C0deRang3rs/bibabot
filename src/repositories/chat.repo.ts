import BaseRepository from './base.repository';

export default class ChatRepository extends BaseRepository {
  protected entityName = 'chat';

  public async getAllChats(): Promise<Array<number>> {
    const chatKeys = await this.redis.keysAsync(`${this.entityName}:*`);
    const chatIds = chatKeys.map((key: string) => key.split(':')[1]);
    return chatIds.map((chatId) => parseInt(chatId, 10));
  }

  public async getChat(chatId: number): Promise<string> {
    return this.redis.getAsync(`${this.entityName}:${chatId}`);
  }

  public async addChat(chatId: number): Promise<void> {
    await this.redis.setAsync(`${this.entityName}:${chatId}`, 'true');
  }

  public async removeChat(chatId: number): Promise<void> {
    await this.redis.delAsync(`${this.entityName}:${chatId}`);
  }
}
