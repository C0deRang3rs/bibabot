import BaseRepository from './base.repository';

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
    return parseFloat(coins);
  }
}
