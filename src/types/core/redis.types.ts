import redis from 'redis';

export interface PromisifiedRedis extends redis.RedisClient {
  setAsync(key: string, value: string): Promise<void>;
  keysAsync(key: string): Promise<Array<string>>;
  mgetAsync(keys: Array<string>): Promise<Array<string>>;
  getAsync(key: string): Promise<string>;
  delAsync(key: string): Promise<void>;
}
