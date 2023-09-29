import { BlocksObject, Redis, SupportedLang } from './types'

export function getRedisItem<T>(redis: Redis, redisKey: string, lang: SupportedLang): Promise<T | undefined> {
  return redis.hgetallAsync(redisKey + lang)
}

/**
 * Wrap Redis set call in a Promise.
 * @param config
 * @param blocks
 * @returns {Promise}
 * @private
 */
export function setRedisItem(
  redis: Redis,
  redisKey: string,
  redisExpire: number,
  lang: SupportedLang,
  blocks: BlocksObject
) {
  return redis
    .hmsetAsync(redisKey + lang, blocks)
    .then(() => redis.expireAsync(redisKey + lang, redisExpire))
    .then(() => blocks)
}
