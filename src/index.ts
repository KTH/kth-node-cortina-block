import { load } from 'cheerio'
import url from 'url'
import log from '@kth/log'
import { Config, PrepareConfigIn } from './types'
import { _getHostEnv, _getLanguage, _getEnvUrl, _buildUrl, _buildRedisKey, _getRedisItem, _setRedisItem } from './utils'
import { generateConfig, _getEnvSpecificConfig, prepareDefaults, generatePrepareConfig } from './config'

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

/**
 * Fetch all Cortina blocks from API.
 * @param config the given cinfig
 * @returns {Promise}
 * @private
 */
function fetchAllBlocks(config: Config) {
  const allblocks: Block[] = []
  for (const blockName in config.blocks) {
    const isMulti = blockName === 'language'
    const blockUrl = config.blocks[blockName]
    allblocks.push({ blockName, url: `${blockUrl}${blockUrl}?v=${config.version}&l=${config.language}` })
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

/**
 * Gets HTML blocks from Cortina using promises.
 * @param {Object} config - Configuration object.
 * @param {String} config.url - URL to the Cortina block API.
 * @param {Boolean} [config.debug=false] - Enable logging of Redis errors.
 * @param {String} [config.version=head] - Cortina API version.
 * @param {String} [config.language=en] - Language for the current session.
 * @param {String} [config.redisKey=CortinaBlock_] - Key prefix to use when caching.
 * @param {Number} [config.redisExpire=600] - Expiration time in seconds, defaults to 10 minutes.
 * @param {Object} [config.redis] - Redis client instance.
 * @param {Object} [config.blocks] - Object with Cortina block IDs.
 * @param {String} [config.blocks.title=1.260060]
 * @param {String} [config.blocks.image=1.77257]
 * @param {String} [config.blocks.footer=1.202278]
 * @param {String} [config.blocks.search=1.77262]
 * @param {Object} [config.blocks.language] - Object with language block IDs.
 * @param {String} [config.blocks.language.en=1.77273] - English language block.
 * @param {String} [config.blocks.language.sv=1.272446] - Swedish language block.
 * @param {String} [config.blocks.analytics=1.464751]
 * @returns {Promise} A promise that will evaluate to an object with the HTML blocks.
 */
export default function cortina(configIn: Config): Promise<{
  [blockName: string]: string
}> {
  const config = generateConfig(defaults, configIn)
  if (!config.url) {
    return Promise.reject(new Error('URL must be specified.'))
  }
  if (!config.redisConfig) {
    return fetchAllBlocks(config)
  }

  // Try to get from Redis otherwise get from web service then cache result
  // in Redis using config.redisKey. If Redis connection fails, call API
  // directly and don't cache results.
  if (!config.redisConfig) return fetchAllBlocks(config).then(cortinaBlocks => _setRedisItem(config, cortinaBlocks))
  return _getRedisItem(config.redisConfig.redis, config.redisConfig.redisKey, config.language)
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

/**
 * Adjusts URLs to logo, locale link, and app link. Also sets app site name.
 * @param {Object} blocks - A blocks object.
 * @param {Object} config - Preparation configuration.
 * @param {String} [config.siteName] - Optional site name. Leave empty to use current value.
 * @param {String} [config.localeText] - Optional locale text. Leave empty to use current value.
 * @param {Object} config.urls - Plain object with URLs.
 * @param {String} [config.urls.prod='//www.kth.se']
 * @param {String} config.urls.request - Current request URL (usually from req.url).
 * @param {String} config.urls.app - The application host name and prefix path.
 * @param {String} config.urls.siteUrl - The url to overide app url in sitename if needed.
 * @param {Object} [config.selectors] - Optional plain object with CSS selectors.
 * @param {String} [config.selectors.logo='.mainLogo img'] CSS selectors for the logo.
 * @param {String} [config.selectors.siteName='.siteName a'] CSS selectors for the sitename.
 * @param {String} [config.selectors.localeLink='a.block.link[hreflang]'] CSS selectors for the language link.
 * @param {String} [config.selectors.secondaryMenuLocale='.block.links a[hreflang]'] CSS selectors for the secondary menu locale.
 * @returns {Object} Returns a modified blocks object.
 */
export function prepare(blocksIn: { [blockName: string]: string }, configIn: PrepareConfigIn) {
  let $
  let $el

  const blocks = structuredClone(blocksIn)

  const config = generatePrepareConfig(prepareDefaults, configIn)

  const currentEnv = _getEnvSpecificConfig().env

  /*
   * Creating the logo block
   */
  $ = load(blocks.image, {
    xmlMode: true,
  })

  $el = $(config.selectors.logo)

  const envUrl = _getEnvUrl(currentEnv, config)

  if ($el.length) {
    $el.attr('src', envUrl + $el.attr('src'))
    blocks.image = $.html()
  }

  /*
   * Creating the site name block
   */
  $ = load(blocks.title, {
    xmlMode: true,
  })
  $el = $(config.selectors.siteName)
  if ($el.length) {
    if (config.urls.siteUrl) {
      $el.attr('href', config.urls.siteUrl)
    } else {
      $el.attr('href', config.urls.app)
    }

    if (config.siteName) {
      $el.text(config.siteName)
    }

    blocks.title = $.html()
  }

  /*
   * Creating the locale link block
   */
  $ = load(blocks.language, {
    xmlMode: true,
  })

  $el = $(config.selectors.localeLink)

  if ($el.length) {
    const urlParts = url.parse(url.resolve(config.urls.app || '', config.urls.request), true)
    urlParts.search = null
    urlParts.query = urlParts.query || {}

    if ($el.attr('hreflang').startsWith('en')) {
      $el.attr('href', $el.attr('href').replace('/en', '/'))
      urlParts.query.l = 'en'
    } else {
      urlParts.query.l = 'sv'
    }

    if (config.localeText) {
      $el.text(config.localeText)
    }

    $el.attr('href', url.format(urlParts))
    blocks.language = $.html()
  }

  // Creating the locale link block for secondaryMenu
  if (blocks.secondaryMenu) {
    $ = load(blocks.secondaryMenu, {
      xmlMode: true,
    })

    $el = $(config.selectors.secondaryMenuLocale)

    if ($el.length) {
      const urlParts = url.parse(url.resolve(config.urls.app || '', config.urls.request), true)
      urlParts.search = null
      urlParts.query = urlParts.query || {}
      let langPathSegment = ''

      if ($el.attr('hreflang').startsWith('en')) {
        $el.attr('href', $el.attr('href').replace('/en', '/'))
        urlParts.query.l = 'en'
        langPathSegment = '/en'
      } else {
        urlParts.query.l = 'sv'
      }

      if (config.localeText) {
        $el.text(config.localeText)
      }

      // If true, the language link should point to KTH startpage
      if (config.globalLink) {
        $el.attr('href', envUrl + langPathSegment)
      } else {
        $el.attr('href', url.format(urlParts))
      }
      blocks.secondaryMenu = $.html()
    }
  }

  $ = null
  $el = null

  return blocks
}

export * from './types'
