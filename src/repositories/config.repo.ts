import BaseRepository from './base.repo';
import { Config, DEFAULT_CONFIG, ConfigProperty } from '../types/services/config.service.types';

export default class ConfigRepository extends BaseRepository {
  protected entityName = 'config';

  private static compareConfig(config: Config): boolean {
    const currentConfigKeys = Object.keys(config).sort();
    const defaultConfigKeys = Object.keys(DEFAULT_CONFIG).sort();

    return JSON.stringify(currentConfigKeys) !== JSON.stringify(defaultConfigKeys);
  }

  public async migrate(): Promise<void> {
    const configKeys = await this.redis.keysAsync(`${this.entityName}:*`);

    if (!configKeys) return;

    await Promise.all(configKeys.map(async (redisKey) => {
      const rawConfig = await this.redis.getAsync(redisKey);
      const config = JSON.parse(rawConfig!);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newConfig = {} as any;

      Object.keys(config).forEach((key) => {
        newConfig[key.toUpperCase()] = config[key];
      });

      await this.redis.setAsync(redisKey, JSON.stringify(newConfig));
    }));
  }

  public async getConfigByChatId(chatId: number): Promise<Config> {
    const config = await this.redis.getAsync(`${this.entityName}:${chatId}`);

    if (!config) {
      await this.setDefaultConfig(chatId);
      return DEFAULT_CONFIG;
    }

    const resultConfig = JSON.parse(config) as Config;
    const isConfigUpdateNeeded = ConfigRepository.compareConfig(resultConfig);

    if (isConfigUpdateNeeded) {
      Object.keys(DEFAULT_CONFIG).forEach((key: string) => {
        const typedKey = key as ConfigProperty;
        resultConfig[typedKey] = resultConfig[typedKey] || DEFAULT_CONFIG[typedKey];
      });
    }

    return resultConfig;
  }

  public async setConfigByChatId(chatId: number, config: Config): Promise<void> {
    await this.redis.setAsync(`${this.entityName}:${chatId}`, JSON.stringify(config));
  }

  public async setDefaultConfig(chatId: number): Promise<void> {
    await this.redis.setAsync(`${this.entityName}:${chatId}`, JSON.stringify(DEFAULT_CONFIG));
  }
}
