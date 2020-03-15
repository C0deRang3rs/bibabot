import bluebird from 'bluebird';
import redis from 'redis';

bluebird.promisifyAll(redis);

export interface PromisifiedRedis extends redis.RedisClient {
  setAsync(key: string, value: string): Promise<void>;
  keysAsync(key: string): Promise<Array<string>>;
  mgetAsync(keys: Array<string>): Promise<Array<string>>;
  getAsync(key: string): Promise<string>;
  delAsync(key: string): Promise<void>;
}

export class Redis {
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
