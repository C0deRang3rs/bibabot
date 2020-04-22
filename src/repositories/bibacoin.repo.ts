import zipObject from 'lodash.zipobject';
import BaseRepository from './base.repo';

export default class BibacoinRepository extends BaseRepository {
  protected entityName = 'coin';

  public async setBibacoinBalance(chatId: number, userId: number, newBalance: number): Promise<void>;
  public async setBibacoinBalance(chatId: number, userId: number, newBalance: string): Promise<void>;

  public async setBibacoinBalance(chatId: number, userId: number, newBalance: number | string): Promise<void> {
    const balance = typeof newBalance === 'number' ? newBalance.toString() : newBalance;
    await this.redis.setAsync(`${this.entityName}:${chatId}:${userId}`, balance);
  }

  public async getBibacoinBalanceByIds(chatId: number, userId: number): Promise<number> {
    const coins = await this.redis.getAsync(`${this.entityName}:${chatId}:${userId}`);

    if (!coins) {
      return 0;
    }

    return parseInt(coins, 10);
  }

  public async getAllBalancesKeysByChatId(chatId: number): Promise<Array<number>> {
    const balancesKeys = await this.redis.keysAsync(`${this.entityName}:${chatId}:*`);

    if (!balancesKeys || !balancesKeys.length) {
      return [];
    }

    return balancesKeys.map((key: string) => parseInt(key.split(':')[2], 10));
  }

  public async getAllBalancesByUserIdsAndChatId(userIds: Array<number>, chatId: number): Promise<Array<number>> {
    const balances = await this.redis.mgetAsync(userIds.map((userId) => `${this.entityName}:${chatId}:${userId}`));

    if (!balances || !balances.length) {
      return [];
    }

    return balances.map((balance) => parseInt(balance, 10));
  }

  public async getAllBalancesByChatId(chatId: number): Promise<Record<string, number>> {
    const ids = await this.getAllBalancesKeysByChatId(chatId);

    if (!ids || !ids.length) {
      return {};
    }

    const balances = await this.getAllBalancesByUserIdsAndChatId(ids, chatId);

    return zipObject(ids, balances);
  }
}
