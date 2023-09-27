import jsdom from 'jsdom'
import url from 'url'
import log from '@kth/log'
import { Config, PrepareConfigIn, RedisConfig } from './types'
import { _getHostEnv, _getEnvUrl, _buildRedisKey, _getRedisItem, _setRedisItem } from './utils'
import { generateConfig, _getEnvSpecificConfig, prepareDefaults, generatePrepareConfig } from './config'
export * from './types'

type Block = { blockName: string; url: string }
const defaults = _getEnvSpecificConfig()

async function fetchBlock(url: string, headers: Headers | undefined, blockName: string) {
  try {
    const response = await fetch(url, { headers })
    if (!response.ok) {
      log.error(`Failed to fetch cortina block at ${url}: ${response.status}`)
      return { blockName, result: '' }
    }
    const result = await response.text()
    return { blockName, result }
  } catch (err) {
    log.error(`WARNING! FAILED TO FETCH ${blockName} ${err}`)
  }
}

// Fetch all Cortina blocks from API.
function fetchAllBlocks(config: Config) {
  const allblocks: Block[] = []
  for (const blockName in config.blocks) {
    const isMulti = blockName === 'language'
    const blockUrl = config.blocks[blockName]
    allblocks.push({ blockName, url: `${config.url}${blockUrl}?v=${config.version}&l=${config.language}` })
  }
  return Promise.all(allblocks.map(block => fetchBlock(block.url, config.headers, block.blockName)))
    .then(results => {
      const result: { [blockName: string]: string } = {}
      results.forEach(block => {
        if (block) {
          result[block.blockName] = block.result
        }
      })
      return result
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
  configIn: Config,
  redisConfig?: RedisConfig
): Promise<{
  [blockName: string]: string
}> {
  const config = generateConfig(defaults, configIn)
  if (!config.url) {
    return Promise.reject(new Error('URL must be specified.'))
  }
  if (!redisConfig) {
    return fetchAllBlocks(config)
  }

  // Try to get from Redis otherwise get from web service then cache result
  // in Redis using config.redisKey. If Redis connection fails, call API
  // directly and don't cache results.
  return _getRedisItem(redisConfig.redis, redisConfig.redisKey, config.language)
    .then(blocks => {
      if (blocks) {
        return blocks
      }

      return fetchAllBlocks(config).then(cortinaBlocks => _setRedisItem(config, cortinaBlocks))
    })
    .catch(err => {
      if (config.debug) {
        log.error('Redis failed:', err.message, err.code)
      }
      if (err.code === 'ECONNREFUSED' || err.code === 'CONNECTION_BROKEN') {
        if (config.debug) {
          log.log('Redis bad connection, getting from API...')
        }

        return fetchAllBlocks(config)
      }
      throw err
    })
}

//const baseUrl = 'https://www-r.referens.sys.kth.se'

const addBaseUrlToImgSrc = (document: Document, baseUrl: string) => {
  const imgElements = document.querySelectorAll('img')
  imgElements.forEach((imgElement: HTMLImageElement) => {
    const currentSrc = imgElement.getAttribute('src')
    if (currentSrc) {
      imgElement.setAttribute('src', baseUrl + currentSrc)
    }
  })
}

const addBaseUrlToAnchorHref = (document: Document, baseUrl: string) => {
  const anchorElements = document.querySelectorAll('a')
  anchorElements.forEach((anchorElement: HTMLAnchorElement) => {
    const currentHref = anchorElement.getAttribute('href')
    if (currentHref) {
      anchorElement.setAttribute('href', baseUrl + currentHref)
    }
  })
}

export const formatHtmlString = (htmlString: string, baseUrl: string) => {
  const { window } = new jsdom.JSDOM(htmlString)
  const document = window.document

  // remove unnecessary blank space
  document.body.innerHTML = document.body.innerHTML.replace(/\s+/g, ' ')

  addBaseUrlToImgSrc(document, baseUrl)
  //addBaseUrlToAnchorHref(document, baseUrl)

  const modifiedHtmlString = document.documentElement.outerHTML
  return modifiedHtmlString
}

const getSitenameBlock = (htmlString: string, selector: string, sitename: string) => {
  const { window } = new jsdom.JSDOM(htmlString)
  const document = window.document
  const sitenameLink = document.querySelector(selector)
  if (sitenameLink) sitenameLink.textContent = sitename
  const modifiedHtmlString = document.documentElement.outerHTML
  return modifiedHtmlString
}

const getLocaleLinkBlock = (htmlString: string, selector: string, localeText: string) => {
  const { window } = new jsdom.JSDOM(htmlString)
  const document = window.document
  const localeLink = document.querySelector(selector)
  if (localeLink) localeLink.textContent = localeText
  const modifiedHtmlString = document.documentElement.outerHTML
  return modifiedHtmlString
}

//Adjusts URLs to logo, locale link, and app link. Also sets app site name.
// Returns a modified blocks object.
export function prepare(
  blocksIn: { [blockName: string]: string },
  configIn: PrepareConfigIn,
  baseUrl: string,
  selectors?: { string: string }
) {
  const defaultSelectors = {
    logo: '.mainLogo img',
    siteName: '.siteName a',
    localeLink: 'a.block.link[hreflang]',
    secondaryMenuLocale: '.block.links a[hreflang]',
  }

  const mergedSelectors = { ...defaultSelectors }

  const blocks = structuredClone(blocksIn)

  const config = generatePrepareConfig(prepareDefaults, configIn)

  const currentEnv = _getEnvSpecificConfig().env

  for (const key in blocks) {
    blocks[key] = formatHtmlString(blocks[key], baseUrl)
  }
  if (blocks.title && config.siteName)
    blocks.title = getSitenameBlock(blocks.title, mergedSelectors.siteName, config.siteName)
  if (blocks.secondaryMenu && config.localeText)
    blocks.secondaryMenu = getLocaleLinkBlock(
      blocks.secondaryMenu,
      mergedSelectors.secondaryMenuLocale,
      config.localeText
    )
  return blocks
}
