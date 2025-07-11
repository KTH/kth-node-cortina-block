import { NextFunction, Request } from 'express'
import log from '@kth/log'
import redis from 'kth-node-redis'

import { Config, SupportedLang, BlocksObject, BlocksConfig, Redis, ExtendedResponse, RedisConfig } from './types'
import { getRedisItem, setRedisItem } from './redis-utils'
import { fetchAllBlocks } from './fetch-blocks'
import { defaultBlocksConfig, defaultSupportedLanguages, redisItemSettings, devBlocks } from './config'
export * from './types'

// Gets HTML blocks from Cortina or Redis.
function cortina(options: {
  blockApiUrl: string
  language: SupportedLang
  shouldSkipCookieScripts: boolean
  blocksConfig?: BlocksConfig
  redisConfig?: RedisConfig
  redisKey?: string
  memoryCache: boolean
}): Promise<{
  [blockName: string]: string
}> {
  const { blockApiUrl, language, shouldSkipCookieScripts, blocksConfig, redisConfig, redisKey } = options
  const { memoryCache } = options

  const fullBlocksConfig: BlocksConfig = { ...defaultBlocksConfig, ...blocksConfig }
  if (shouldSkipCookieScripts) {
    fullBlocksConfig.klaroConfig = devBlocks.klaroConfig
    fullBlocksConfig.matomoAnalytics = devBlocks.matomoAnalytics
  }

  if (!blockApiUrl) {
    throw new Error('Block api url must be specified.')
  }
  if (redisConfig) {
    return fetchWithRedis(redisConfig, blockApiUrl, language, fullBlocksConfig, redisKey)
  }
  return fetchAllBlocks(fullBlocksConfig, blockApiUrl, language, memoryCache)
}

const fetchWithRedis = async (
  redisConfig: RedisConfig,
  blockApiUrl: string,
  language: SupportedLang,
  fullBlocksConfig: BlocksConfig,
  redisKey?: string
) => {
  const { defaultKey, redisExpire } = redisItemSettings
  const finalRedisKey = redisKey || defaultKey

  const redisClient: Redis = await redis('cortina', redisConfig)

  // Try to get from Redis otherwise get from web service then cache result
  // in Redis using redisKey. If Redis connection fails, call API
  // directly and don't cache results.
  return getRedisItem<BlocksObject>(redisClient, finalRedisKey, language)
    .then(storedBlocks => {
      if (storedBlocks) {
        return storedBlocks
      }

      return fetchAllBlocks(fullBlocksConfig, blockApiUrl, language, false).then(cortinaBlocks =>
        setRedisItem(redisClient, finalRedisKey, redisExpire, language, cortinaBlocks)
      )
    })
    .catch(err => {
      log.error('Redis failed:', err.message, err.code)
      return fetchAllBlocks(fullBlocksConfig, blockApiUrl, language, false)
    })
}

const getLanguage = (res: ExtendedResponse, supportedLanguages?) => {
  let detectedLanguage = (res.locals?.locale?.language as SupportedLang) ?? 'sv'

  const finalSupportedLanguages = supportedLanguages || defaultSupportedLanguages

  if (!finalSupportedLanguages.includes(detectedLanguage)) {
    return finalSupportedLanguages[0]
  }

  return detectedLanguage
}

const validateConfig = (config: Config) => {
  if (config.memoryCache && config.redisConfig) {
    const errorMessage = '@kth/cortina-block config "memoryCache" and "redisConfig" are not valid at the same time'
    log.error(errorMessage)
    throw new Error(errorMessage)
  }

  if (config.redisKey && !config.redisConfig) {
    const errorMessage = '@kth/cortina-block config "redisKey" is not allowed without "redisConfig"'
    log.error(errorMessage)
    throw new Error(errorMessage)
  }
}

const shouldUseMemoryCache = (config: Config): boolean => {
  const { memoryCache: memoryCacheConfig = true, redisConfig } = config

  if (!redisConfig) return !!memoryCacheConfig

  return false
}

export function cortinaMiddleware(config: Config) {
  validateConfig(config)
  return async (req: Request, res: ExtendedResponse, next: NextFunction) => {
    // don't load cortina blocks for static content, or if query parameter 'nocortinablocks' is present
    if (/^\/static\/.*/.test(req.url) || req.query.nocortinablocks !== undefined) {
      next()
      return
    }
    const { redisConfig, redisKey, skipCookieScriptsInDev = true, supportedLanguages } = config
    const memoryCache = shouldUseMemoryCache(config)

    const language = getLanguage(res, supportedLanguages)

    let shouldSkipCookieScripts = false
    if (req.hostname.includes('localhost') && skipCookieScriptsInDev) {
      shouldSkipCookieScripts = true
    }
    const { blockApiUrl, blocksConfig } = config
    return cortina({
      blockApiUrl,
      language,
      shouldSkipCookieScripts,
      blocksConfig,
      redisConfig,
      redisKey,
      memoryCache,
    })
      .then(blocks => {
        // @ts-ignore
        res.locals.blocks = blocks
        log.debug('Cortina blocks loaded.')
        next()
      })
      .catch(err => {
        log.error('Cortina failed to load blocks: ' + err.message)
        // @ts-ignore
        res.locals.blocks = {}
        next()
      })
  }
}
