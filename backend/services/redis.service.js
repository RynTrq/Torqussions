import Redis from 'ioredis';

const redisConfigured = Boolean(process.env.REDIS_HOST && process.env.REDIS_PORT);

const rawRedisClient = redisConfigured
    ? new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
    })
    : null;

if (rawRedisClient) {
    rawRedisClient.on('connect', () => {
        console.log('Redis connected');
    });

    rawRedisClient.on('error', (error) => {
        console.warn(`Redis unavailable: ${error.message}`);
    });
}

const connectIfNeeded = async () => {
    if (!rawRedisClient) {
        return null;
    }

    if (rawRedisClient.status === 'wait') {
        try {
            await rawRedisClient.connect();
        } catch (error) {
            console.warn(`Redis connection failed: ${error.message}`);
            return null;
        }
    }

    return rawRedisClient;
};

const redisClient = {
    enabled: redisConfigured,
    raw: rawRedisClient,
    async get(key) {
        const client = await connectIfNeeded();

        if (!client) {
            return null;
        }

        try {
            return await client.get(key);
        } catch (error) {
            console.warn(`Redis GET failed: ${error.message}`);
            return null;
        }
    },
    async set(key, value, ...args) {
        const client = await connectIfNeeded();

        if (!client) {
            return null;
        }

        try {
            return await client.set(key, value, ...args);
        } catch (error) {
            console.warn(`Redis SET failed: ${error.message}`);
            return null;
        }
    }
};

export default redisClient;
