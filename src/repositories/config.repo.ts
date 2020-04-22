import BaseRepository from './base.repo';
import { Config, DEFAULT_CONFIG } from '../types/services/config.service.types';

export default class ConfigRepository extends BaseRepository {
  protected entityName = 'config';

  public async getConfigByChatId(chatId: number): Promise<Config> {
    const config = await this.redis.getAsync(`${this.entityName}:${chatId}`);

    if (!config) {
      await this.setDefaultConfig(chatId);
      return DEFAULT_CONFIG;
    }

    return JSON.parse(config);
  }

  public async setConfigByChatId(chatId: number, config: Config): Promise<void> {
    await this.redis.setAsync(`${this.entityName}:${chatId}`, JSON.stringify(config));
  }

  public async setDefaultConfig(chatId: number): Promise<void> {
    await this.redis.setAsync(`${this.entityName}:${chatId}`, JSON.stringify(DEFAULT_CONFIG));
  }
}
