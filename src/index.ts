import { NextFunction, Request } from 'express'
import log from '@kth/log'
import redis from 'kth-node-redis'

import { Config, SupportedLang, BlocksObject, BlocksConfig, Redis } from './types'
import { getRedisItem, setRedisItem } from './redis-utils'
import { fetchAllBlocks } from './fetch-blocks'
import { defaultBlocksConfig, supportedLanguages, redisItemSettings, devBlocks } from './config'
export * from './types'

// Gets HTML blocks from Cortina using promises.
export function cortina(options: {
  blockApiUrl: string
  language: SupportedLang
  shouldSkipCookieScripts: boolean
  blocksConfig?: BlocksConfig
  redisClient?: Redis
  redisKey?: string
}): Promise<{
  [blockName: string]: string
}> {
  const { blockApiUrl, language, shouldSkipCookieScripts, blocksConfig, redisClient, redisKey } = options

  const fullBlocksConfig = { ...defaultBlocksConfig, ...blocksConfig }
  if (shouldSkipCookieScripts) {
    fullBlocksConfig.klaroConfig = devBlocks.klaroConfig
    fullBlocksConfig.matomoAnalytics = devBlocks.matomoAnalytics
  }
  if (!blockApiUrl) {
    throw new Error('Block api url must be specified.')
  }
  if (!redisClient) {
    return fetchAllBlocks(fullBlocksConfig, blockApiUrl, language)
  }

  const { defaultKey, redisExpire } = redisItemSettings
  const finalRedisKey = redisKey || defaultKey

  // Try to get from Redis otherwise get from web service then cache result
  // in Redis using redisKey. If Redis connection fails, call API
  // directly and don't cache results.
  return getRedisItem<BlocksObject>(redisClient, finalRedisKey, language)
    .then(storedBlocks => {
      if (storedBlocks) {
        return storedBlocks
      }

      return fetchAllBlocks(fullBlocksConfig, blockApiUrl, language).then(cortinaBlocks =>
        setRedisItem(redisClient, finalRedisKey, redisExpire, language, cortinaBlocks)
      )
    })
    .catch(err => {
      log.error('Redis failed:', err.message, err.code)
      return fetchAllBlocks(fullBlocksConfig, blockApiUrl, language)
    })
}

export function cortinaMiddleware(config: Config) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // don't load cortina blocks for static content, or if query parameter 'nocortinablocks' is present
    if (/^\/static\/.*/.test(req.url) || req.query.nocortinablocks !== undefined) {
      next()
      return
    }
    const { redisConfig, redisKey, skipCookieScriptsInDev = true } = config
    let redisClient: Redis | undefined
    if (redisConfig) {
      redisClient = await redis('cortina', redisConfig)
    }
    // @ts-ignore
    let language = (res.locals.locale?.language as SupportedLang) ?? 'sv'
    if (!supportedLanguages.includes(language)) [language] = supportedLanguages
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
      redisClient,
      redisKey,
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
