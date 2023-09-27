import { Redis, SupportedLang } from './types'

/**
 * Wrap a Redis get call in a Promise.
 * @param config
 * @returns {Promise}
 * @private
 */
export function _getRedisItem(redis: Redis, redisKey: string, lang: SupportedLang) {
  return redis.hgetallAsync(redisKey + lang)
}

/**
 * Wrap Redis set call in a Promise.
 * @param config
 * @param blocks
 * @returns {Promise}
 * @private
 */
export function _setRedisItem(
  redis: Redis,
  redisKey: string,
  redisExpire: number,
  lang: SupportedLang,
  blocks: {
    [blockName: string]: string
  }
) {
  return redis
    .hmsetAsync(redisKey + lang, blocks)
    .then(() => redis.expireAsync(redisKey + lang, redisExpire))
    .then(() => blocks)
}
