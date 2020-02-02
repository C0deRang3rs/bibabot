import bluebird from 'bluebird';
import redis from 'redis';

bluebird.promisifyAll(redis);

export interface PromisifiedRedis extends redis.RedisClient {
    [k: string]: any;
}

export class Redis {
    private static instance: Redis;

    public client!: PromisifiedRedis;

    private constructor() {
        this.initMain();
    }

    public static getInstance(): Redis {
        if (!Redis.instance)
            Redis.instance = new Redis();

        return Redis.instance;
    }

    private async initMain() {
        this.client = redis.createClient({ url: process.env.REDIS_URL as string });
    }
}