import BaseRepository from './base.repo';
import { Config, DEFAULT_CONFIG, ConfigProperty } from '../types/services/config.service.types';
import Bot from '../core/bot';

export default class ConfigRepository extends BaseRepository {
  protected entityName = 'config';
  private readonly bot = Bot.getInstance();

  private static compareConfig(config: Config): boolean {
    const currentConfigKeys = Object.keys(config).sort();
    const defaultConfigKeys = Object.keys(DEFAULT_CONFIG).sort();

    return JSON.stringify(currentConfigKeys) !== JSON.stringify(defaultConfigKeys);
  }

  public async getConfigByChatId(chatId: number): Promise<Config> {
    const config = await this.redis.getAsync(`${this.entityName}:${chatId}`);

    if (!config) {
      return await this.setDefaultConfig(chatId);
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
    const membersCount = await this.bot.app.telegram.getChatMembersCount(chatId);
    const minVoteCount = Math.floor(membersCount / 2);

    await this.redis.setAsync(`${this.entityName}:${chatId}`, JSON.stringify({ ...DEFAULT_CONFIG, [ConfigProperty.JAIL_MIN_VOTE]: minVoteCount }));

    return { ...DEFAULT_CONFIG, [ConfigProperty.JAIL_MIN_VOTE]: minVoteCount }
  }
}
