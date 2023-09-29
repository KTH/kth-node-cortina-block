import jsdom from 'jsdom'
import log from '@kth/log'
import { Config, RedisConfig, SupportedLang, BlocksObject, BlocksConfig } from './types'
import { getRedisItem, setRedisItem } from './utils'
import { defaultBlocksConfig } from './config'
import { NextFunction, Request } from 'express'
export * from './types'

async function fetchBlock(url: string, headers: Headers | undefined, blockName: string) {
  try {
    const res = await fetch(url, { headers })
    if (!res.ok) {
      log.error(`Failed to fetch cortina block at ${url}: ${res.status}`)
      return { blockName, html: '' }
    }
    const html = await res.text()
    return { blockName, html }
  } catch (err) {
    log.error(`WARNING! FAILED TO FETCH ${blockName} ${err}`)
  }
}

// Fetch all Cortina blocks from API.
function fetchAllBlocks(
  blocksConfig: BlocksConfig,
  blockApiUrl: string,
  blockVerion: string,
  lang: SupportedLang,
  headers?: Headers
) {
  const allblocks: { blockName: string; url: string }[] = []
  for (const blockName in blocksConfig) {
    //const isMulti = blockName === 'language'
    const blockId = blocksConfig[blockName]
    allblocks.push({ blockName, url: `${blockApiUrl}${blockId}?v=${blockVerion}&l=${lang}` })
  }
  return Promise.all(allblocks.map(block => fetchBlock(block.url, headers, block.blockName)))
    .then(fetchedBlocks => {
      const blocksObject: BlocksObject = {}
      fetchedBlocks.forEach(block => {
        if (block) {
          blocksObject[block.blockName] = block.html
        }
      })
      return blocksObject
    })
    .catch(err => {
      const blockName = err.options ? err.options.uri : 'NO URI FOUND'
      log.error(`WARNING! 
      NO BLOCKS WILL BE LOADED DUE TO ERROR IN ONE OF THE BLOCKS. 
      FIX ALL BROKEN BLOCKS IMMEDIATELY. 
      ATTEMPTED TO LOAD BLOCK: ${blockName}`)
      throw err
    })
}

// Gets HTML blocks from Cortina using promises.
export default function cortina(
  blockApiUrl: string,
  blockVersion: string,
  headers: Headers | undefined,
  debug: boolean,
  language: SupportedLang,
  blocksConfigIn?: BlocksConfig,
  redisConfig?: RedisConfig
): Promise<{
  [blockName: string]: string
}> {
  const blocksConfig = { ...defaultBlocksConfig, ...blocksConfigIn }
  if (!blockApiUrl) {
    throw new Error('Block api url must be specified.')
  }
  if (!redisConfig) {
    return fetchAllBlocks(blocksConfig, blockApiUrl, blockVersion, language, headers)
  }

  const { redis, redisKey, redisExpire } = redisConfig

  // Try to get from Redis otherwise get from web service then cache result
  // in Redis using redisKey. If Redis connection fails, call API
  // directly and don't cache results.
  return getRedisItem<BlocksObject>(redis, redisKey, language)
    .then(storedBlocks => {
      if (storedBlocks) {
        return storedBlocks
      }

      return fetchAllBlocks(blocksConfig, blockApiUrl, blockVersion, language, headers).then(cortinaBlocks =>
        setRedisItem(redis, redisKey, redisExpire, language, cortinaBlocks)
      )
    })
    .catch(err => {
      if (debug) {
        log.error('Redis failed:', err.message, err.code)
      }
      if (err.code === 'ECONNREFUSED' || err.code === 'CONNECTION_BROKEN') {
        if (debug) {
          log.log('Redis bad connection, getting from API...')
        }

        return fetchAllBlocks(blocksConfig, blockApiUrl, blockVersion, language, headers)
      }
      throw err
    })
}

const addBaseUrlToImgSrc = (document: Document, baseUrl: string) => {
  const imgElements = document.querySelectorAll('img')
  imgElements.forEach((imgElement: HTMLImageElement) => {
    const currentSrc = imgElement.getAttribute('src')
    if (currentSrc) {
      imgElement.setAttribute('src', baseUrl + currentSrc)
    }
  })
}

export const formatHtmlString = (htmlString: string, baseUrl: string) => {
  const { window } = new jsdom.JSDOM(htmlString)
  const document = window.document

  // remove unnecessary blank space
  document.body.innerHTML = document.body.innerHTML.replace(/\s+/g, ' ')

  addBaseUrlToImgSrc(document, baseUrl)

  const modifiedHtmlString = document.documentElement.outerHTML
  return modifiedHtmlString
}

const formatSitenameBlock = (htmlString: string, selector: string, sitename: string) => {
  const { window } = new jsdom.JSDOM(htmlString)
  const document = window.document
  const sitenameLink = document.querySelector(selector)
  if (sitenameLink) sitenameLink.textContent = sitename
  const modifiedHtmlString = document.documentElement.outerHTML
  return modifiedHtmlString
}

const formatLocaleLinkBlock = (htmlString: string, selector: string, localeText: string, linkUrl: string) => {
  const { window } = new jsdom.JSDOM(htmlString)
  const document = window.document
  const localeLink = document.querySelector(selector) as HTMLAnchorElement
  const url = new URL(linkUrl)
  const langParam = url.searchParams.get('l')
  url.searchParams.set('l', langParam === 'en' ? 'sv' : 'en')
  if (localeLink) {
    localeLink.textContent = localeText
    localeLink.href = url.toString()
  }
  const modifiedHtmlString = document.documentElement.outerHTML
  return modifiedHtmlString
}

//Adjusts URLs to logo, locale link, and app link. Also sets app site name.
// Returns a modified blocks object.
export function prepare(
  blocksIn: BlocksObject,
  baseUrl: string,
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
    blocks[key] = formatHtmlString(blocks[key], baseUrl)
  }
  if (blocks.title && siteName)
    blocks.title = formatSitenameBlock(blocks.title, mergedSelectors.siteName, siteName[language])
  if (blocks.secondaryMenu && localeText)
    blocks.secondaryMenu = formatLocaleLinkBlock(
      blocks.secondaryMenu,
      mergedSelectors.secondaryMenuLocale,
      localeText[language === 'sv' ? 'en' : 'sv'],
      currentPath
    )
  return blocks
}

const supportedLanguages: SupportedLang[] = ['sv', 'en']

export function cortinaMiddleware(config: Config, redisConfig?: RedisConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    // don't load cortina blocks for static content, or if query parameter 'nocortinablocks' is present
    if (/^\/static\/.*/.test(req.url) || req.query.nocortinablocks !== undefined) {
      next()
      return
    }
    // @ts-ignore
    let lang = (res.locals.locale?.language as SupportedLang) ?? 'sv'
    if (!supportedLanguages.includes(lang)) [lang] = supportedLanguages

    return cortina(
      config.blockApiUrl,
      config.blockVersion,
      config.headers,
      config.debug,
      lang,
      config.blocksConfig,
      redisConfig
    )
      .then(blocks => {
        // @ts-ignore
        res.locals.blocks = prepare(
          blocks,
          config.baseUrl,
          `${req.protocol}://${req.get('host')}${req.url}`,
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
