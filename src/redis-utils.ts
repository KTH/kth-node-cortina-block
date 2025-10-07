import { RedisClient } from 'kth-node-redis'
import { BlocksObject, SupportedLang } from './types'

export async function getRedisItem(
  redis: RedisClient,
  redisKey: string,
  lang: SupportedLang
): Promise<BlocksObject | undefined> {
  const redisResult = await redis.hGetAll(redisKey + lang)

  if (Object.keys(redisResult)?.length < 1) return undefined

  return redisResult
}

/**
 * Wrap Redis set call in a Promise.
 * @param config
 * @param blocks
 * @returns {Promise}
 * @private
 */
export function setRedisItem(
  redis: RedisClient,
  redisKey: string,
  redisExpire: number,
  lang: SupportedLang,
  blocks: BlocksObject
) {
  return redis
    .hSet(redisKey + lang, blocks)
    .then(() => redis.expire(redisKey + lang, redisExpire))
    .then(() => blocks)
}
