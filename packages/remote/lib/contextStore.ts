import { getRedisClient } from './redis';
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Context } from '@mcp/core';

export class RedisContextStore {
  private readonly prefix = 'mcp:context:';
  private readonly ttl = 60 * 60; // 1 hour in seconds

  async set(id: string, context: Context): Promise<void> {
    const redis = await getRedisClient();
    await redis.set(
      this.prefix + id,
      JSON.stringify(context),
      'EX',
      this.ttl
    );
  }

  async get(id: string): Promise<Context | null> {
    const redis = await getRedisClient();
    const data = await redis.get(this.prefix + id);
    if (!data) return null;
    try {
      return JSON.parse(data) as Context;
    } catch (error) {
      console.error(`[Redis] Failed to parse context data for ${id}:`, error);
      await this.delete(id); // Clean up invalid data
      return null;
    }
  }

  async delete(id: string): Promise<void> {
    const redis = await getRedisClient();
    await redis.del(this.prefix + id);
  }

  async has(id: string): Promise<boolean> {
    const redis = await getRedisClient();
    return (await redis.exists(this.prefix + id)) === 1;
  }
}

// Export singleton instance
export const contextStore = new RedisContextStore(); 