import { Config, Redis, SupportedLang } from './types'

/**
 * Get the current environment from the given Host or Content Management Host.
 *
 * @param host the given host URL.
 */
export function _getHostEnv(hostUrl: string) {
  if (
    hostUrl.startsWith('https://www-r.referens.sys.kth') ||
    hostUrl.startsWith('https://app-r.referens.sys.kth') ||
    hostUrl.startsWith('http://localhost')
  ) {
    return 'ref'
  }
  return 'prod'
}
/**
 * Get language.
 * @param {*} lang the given language parameter.
 */
export function _getLanguage(lang: SupportedLang) {
  return lang === 'sv' ? 'sv' : 'en'
}

/**
 * Get the url for the current environmen.
 *
 * @param {*} currentEnv current environment.
 * @param {*} config the given config.
 */
export function _getEnvUrl(currentEnv: string, config: any) {
  return config.urls[currentEnv]
}

/**
 * Build API url to Cortins from where to retrieve the blocks.
 * @param {*} config the given config
 * @param {*} type the block type eg. image
 * @param {*} multi
 */
export function _buildUrl(config: Config, type: string, multi: boolean) {
  const language = _getLanguage(config.language)
  const block = multi ? config.blocks[type][language] : config.blocks[type]
  const version = config.version || 'head'
  return `${config.url}${block}?v=${version}&l=${language}`
}

/**
 * Build up the Redis key
 *
 * @param {*} prefix the given prefix.
 * @param {*} lang the given language.
 * @private
 */
export function _buildRedisKey(prefix: string, lang: SupportedLang) {
  return prefix + _getLanguage(lang)
}

/**
 * Wrap a Redis get call in a Promise.
 * @param config
 * @returns {Promise}
 * @private
 */
export function _getRedisItem(redis: Redis, redisKey: string, lang: SupportedLang) {
  const key = _buildRedisKey(redisKey, lang)
  return redis.hgetallAsync(key)
}

/**
 * Wrap Redis set call in a Promise.
 * @param config
 * @param blocks
 * @returns {Promise}
 * @private
 */
export function _setRedisItem(config, blocks) {
  const key = _buildRedisKey(config.redisKey, config.language)
  return config.redis
    .hmsetAsync(key, blocks)
    .then(() => config.redis.expireAsync(key, config.redisExpire))
    .then(() => blocks)
}
