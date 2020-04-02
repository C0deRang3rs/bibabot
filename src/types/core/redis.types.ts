import redis from 'redis';

export interface PromisifiedRedis extends redis.RedisClient {
  setAsync(key: string, value: string): Promise<void>;
  keysAsync(key: string): Promise<Array<string> | null>;
  mgetAsync(keys: Array<string>): Promise<Array<string> | null>;
  getAsync(key: string): Promise<string | null>;
  delAsync(key: string): Promise<void>;
}
