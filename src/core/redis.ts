import bluebird from 'bluebird';
import redis from 'redis';
import { PromisifiedRedis } from '../types/core/redis.types';

bluebird.promisifyAll(redis);

export default class Redis {
  private static instance: Redis;

  public client!: PromisifiedRedis;

  private constructor() {
    this.initMain();
  }

  public static getInstance(): Redis {
    if (!Redis.instance) {
      Redis.instance = new Redis();
    }

    return Redis.instance;
  }

  private async initMain(): Promise<void> {
    this.client = redis.createClient({ url: process.env.REDIS_URL as string }) as PromisifiedRedis;
  }
}
