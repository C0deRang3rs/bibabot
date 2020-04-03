import BaseRepository from './base.repository';

export default class ChatRepository extends BaseRepository {
  protected entityName = 'chat';

  public async getAllChats(): Promise<Array<number>> {
    const chatKeys = await this.redis.keysAsync(`${this.entityName}:*`);

    if (!chatKeys || !chatKeys.length) {
      return [];
    }

    const chatIds = chatKeys.map((key: string) => key.split(':')[1]);
    return chatIds.map((chatId) => parseInt(chatId, 10));
  }

  public async getChat(chatId: number): Promise<string | null> {
    const chat = await this.redis.getAsync(`${this.entityName}:${chatId}`);

    return chat || null;
  }

  public async addChat(chatId: number): Promise<void> {
    await this.redis.setAsync(`${this.entityName}:${chatId}`, 'true');
  }

  public async removeChat(chatId: number): Promise<void> {
    await this.redis.delAsync(`${this.entityName}:${chatId}`);
  }
}
