import { Biba } from '../types/services/biba.service.types';
import BaseRepository from './base.repository';

export default class BibaRepository extends BaseRepository {
  protected entityName = 'biba';

  public async getBibaByIds(chatId: number, userId: number): Promise<Biba> {
    const biba = await this.redis.getAsync(`${this.entityName}:${chatId}:${userId}`);
    return JSON.parse(biba);
  }

  public async setBiba(chatId: number, payload: Biba): Promise<void> {
    await this.redis.setAsync(`${this.entityName}:${chatId}:${payload.userId}`, JSON.stringify(payload));
  }

  public async getAllBibasByChatId(chatId: number): Promise<Array<Biba>> {
    const allBibasKeys = await this.redis.keysAsync(`${this.entityName}:${chatId}:*`);

    if (!allBibasKeys.length) {
      return [];
    }

    const allBibas = await this.redis.mgetAsync(allBibasKeys);
    let parsedBibas: Array<Biba> = allBibas.map((rawBiba: string) => JSON.parse(rawBiba));
    parsedBibas = parsedBibas.filter((biba) => !biba.outdated);
    parsedBibas.sort((biba1, biba2) => (biba1.size < biba2.size ? 1 : -1));

    return parsedBibas;
  }

  public async setAllBibasOutdated(chatId: number): Promise<void> {
    const allBibas = await this.getAllBibasByChatId(chatId);

    await Promise.all(allBibas.map(async (biba) => {
      await this.setBiba(chatId, { ...biba, outdated: true });
    }));
  }

  public async removeBiba(chatId: number, userId: number): Promise<void> {
    await this.redis.delAsync(`${this.entityName}:${chatId}:${userId}`);
  }
}
