import { NextFunction, Request } from 'express'
import log from '@kth/log'
import redis from 'kth-node-redis'

import { Config, RedisConfig, SupportedLang, BlocksObject, BlocksConfig, Redis } from './types'
import { getRedisItem, setRedisItem } from './redis-utils'
import { formatSitenameBlock, formatLocaleLinkBlock, formatImgSrc } from './format-blocks'
import { fetchAllBlocks } from './fetch-blocks'
import { defaultBlocksConfig, supportedLanguages, redisItemSettings, devBlocks } from './config'
export * from './types'

// Gets HTML blocks from Cortina using promises.
export function cortina(
  blockApiUrl: string,
  headers: Headers | undefined,
  language: SupportedLang,
  shouldSkipCookieScripts: boolean,
  blocksConfigIn?: BlocksConfig,
  redisConfig?: RedisConfig,
  redisClient?: Redis,
  styleVersion?: number
): Promise<{
  [blockName: string]: string
}> {
  const blocksConfig = { ...defaultBlocksConfig, ...blocksConfigIn }
  if (shouldSkipCookieScripts) {
    blocksConfig.klaroConfig = devBlocks.klaroConfig
    blocksConfig.matomoAnalytics = devBlocks.matomoAnalytics
  }
  if (!blockApiUrl) {
    throw new Error('Block api url must be specified.')
  }
  if (!redisConfig || !redisClient) {
    return fetchAllBlocks(blocksConfig, blockApiUrl, language, headers, styleVersion)
  }

  const { redisKey, redisExpire } = redisItemSettings

  // Try to get from Redis otherwise get from web service then cache result
  // in Redis using redisKey. If Redis connection fails, call API
  // directly and don't cache results.
  return getRedisItem<BlocksObject>(redisClient, redisKey, language)
    .then(storedBlocks => {
      if (storedBlocks) {
        return storedBlocks
      }

      return fetchAllBlocks(blocksConfig, blockApiUrl, language, headers, styleVersion).then(cortinaBlocks =>
        setRedisItem(redisClient, redisKey, redisExpire, language, cortinaBlocks)
      )
    })
    .catch(err => {
      log.error('Redis failed:', err.message, err.code)
      return fetchAllBlocks(blocksConfig, blockApiUrl, language, headers, styleVersion)
    })
}

//Adjusts URLs to logo, locale link, and app link. Also sets app site name.
// Returns a modified blocks object.
export function prepare(
  blocksIn: BlocksObject,
  resourceUrl: string,
  currentPath: string,
  language: SupportedLang,
  siteName?: { en: string; sv: string },
  localeText?: { en: string; sv: string },
  selectors?: { [selectorName: string]: string }
) {
  const defaultSelectors = {
    logo: '.mainLogo img',
    siteName: '.siteName a',
    localeLink: 'a.block.link[hreflang]',
    secondaryMenuLocale: '.block.links a[hreflang]',
  }

  const mergedSelectors = { ...defaultSelectors, ...selectors }

  const blocks = structuredClone(blocksIn)

  for (const key in blocks) {
    blocks[key] = formatImgSrc(blocks[key], resourceUrl)
  }
  if (blocks.title && siteName)
    blocks.title = formatSitenameBlock(blocks.title, mergedSelectors.siteName, siteName[language])
  if (blocks.secondaryMenu && localeText)
    blocks.secondaryMenu = formatLocaleLinkBlock(
      blocks.secondaryMenu,
      mergedSelectors.secondaryMenuLocale,
      localeText[language === 'sv' ? 'en' : 'sv'],
      `${resourceUrl}${currentPath}`,
      language
    )
  if (blocks.intra_secondaryMenu && localeText) {
    blocks.intra_secondaryMenu = formatLocaleLinkBlock(
      blocks.intra_secondaryMenu,
      mergedSelectors.secondaryMenuLocale,
      localeText[language === 'sv' ? 'en' : 'sv'],
      `https://intra.kth.se${currentPath}`,
      language
    )
  }
  return blocks
}

export function cortinaMiddleware(config: Config) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // don't load cortina blocks for static content, or if query parameter 'nocortinablocks' is present
    if (/^\/static\/.*/.test(req.url) || req.query.nocortinablocks !== undefined) {
      next()
      return
    }
    const { redisConfig, skipCookieScriptsInDev = true } = config
    let redisClient: Redis | undefined
    if (redisConfig) {
      redisClient = await redis('cortina', redisConfig)
    }
    // @ts-ignore
    let lang = (res.locals.locale?.language as SupportedLang) ?? 'sv'
    if (!supportedLanguages.includes(lang)) [lang] = supportedLanguages
    let shouldSkipCookieScripts = false
    if (req.hostname.includes('localhost') && skipCookieScriptsInDev) {
      shouldSkipCookieScripts = true
    }
    return cortina(
      config.blockApiUrl,
      config.headers,
      lang,
      shouldSkipCookieScripts,
      config.blocksConfig,
      redisConfig,
      redisClient,
      config.styleVersion
    )
      .then(blocks => {
        // @ts-ignore
        res.locals.blocks = prepare(
          blocks,
          config.resourceUrl,
          req.originalUrl,
          lang,
          config.siteName,
          config.localeText
        )
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
