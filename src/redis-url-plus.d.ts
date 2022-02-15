declare module 'redis-url-plus' {
    export default function redisUrlPlus(url: string): import('ioredis').RedisOptions;
}