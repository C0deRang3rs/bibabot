import BaseRepository from './base.repo';
import {
  Config, DEFAULT_CONFIG, ConfigProperty, IndividualConfigProperty,
} from '../types/services/config.service.types';

export default class ConfigRepository extends BaseRepository {
  protected entityName = 'config';

  private static compareConfig(config: Config): boolean {
    const currentConfigKeys = Object.keys(config).sort();
    const defaultConfigKeys = Object.keys(DEFAULT_CONFIG).sort();

    return JSON.stringify(currentConfigKeys) !== JSON.stringify(defaultConfigKeys);
  }

  public async setConfigIndividualProperty(chatId: number, key: IndividualConfigProperty, value: string): Promise<void> {
    await this.redis.setAsync(`${this.entityName}:${chatId}:${key}`, value);
  }

  public async getConfigIndividualProperty(chatId: number, key: IndividualConfigProperty, def?: string): Promise<string | null> {
    const result = await this.redis.getAsync(`${this.entityName}:${chatId}:${key}`);

    if (!result && def) {
      await this.setConfigIndividualProperty(chatId, key, def);
      return def;
    }

    return result;
  }

  public async getConfigByChatId(chatId: number): Promise<Config> {
    const config = await this.redis.getAsync(`${this.entityName}:${chatId}`);

    if (!config) {
      return this.setDefaultConfig(chatId);
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

  public async setDefaultConfig(chatId: number): Promise<Config> {
    await this.redis.setAsync(`${this.entityName}:${chatId}`, JSON.stringify({ ...DEFAULT_CONFIG }));

    return { ...DEFAULT_CONFIG };
  }
}
