import { PromisifiedRedis } from '../types/core/redis.types';
import Redis from '../core/redis';

export default abstract class BaseRepository {
  protected redis: PromisifiedRedis;

  protected abstract entityName: string;

  constructor() {
    this.redis = Redis.getInstance().client;
  }
}
