import Redis from 'ioredis';

let redisClient: Redis | null = null;
let connectionPromise: Promise<Redis> | null = null;

export async function getRedisClient(): Promise<Redis> {
  if (!redisClient) {
    if (!process.env.REDIS_URL) {
      throw new Error('[Redis] REDIS_URL is required in production');
    }

    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          throw new Error(`[Redis] Could not connect after ${times} attempts`);
        }
        return Math.min(times * 200, 1000);
      },
      enableOfflineQueue: true,
      lazyConnect: true, // Prevent auto-connect
    });

    redisClient.on('error', (error: Error) => {
      console.error('[Redis] Error:', error);
      // Reset connection promise on error so we can retry
      connectionPromise = null;
    });

    // Create a connection promise
    connectionPromise = new Promise<Redis>((resolve, reject) => {
      redisClient!.once('ready', () => resolve(redisClient!));
      redisClient!.once('error', reject);
    });

    // Initiate connection
    await redisClient.connect();
  }
  
  // Wait for connection to be ready
  if (connectionPromise) {
    await connectionPromise;
  }
  
  return redisClient;
}

export async function closeRedisConnection() {
  if (redisClient) {
    await redisClient.quit(); // Graceful shutdown
    redisClient = null;
    connectionPromise = null;
  }
} 