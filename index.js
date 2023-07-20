'use strict'

const url = require('url')
const cheerio = require('cheerio')
const log = require('@kth/log')

// Creates a new copy of default config with config
// Note deep copy is limited to only the second level
//
function generateConfig(defaultConfig, config) {
  const rval = JSON.parse(JSON.stringify(defaultConfig))
  for (const key in config) {
    if (Object.prototype.hasOwnProperty.call(config, key) && config[key]) {
      if (key === 'redis') {
        rval.redis = config.redis
      } else if (typeof config[key] === 'object') {
        rval[key] = { ...rval[key], ...config[key] }
      } else {
        rval[key] = config[key]
      }
    }
  }
  return rval
}

/**
 * Get the current environment from the given Host or Content Management Host.
 *
 * @param host the given host URL.
 */
function _getHostEnv(hostUrl) {
  if (hostUrl) {
    if (hostUrl.startsWith('https://www.kth')) {
      return 'prod'
    }
    if (hostUrl.startsWith('https://www-r.referens.sys.kth') || hostUrl.startsWith('https://app-r.referens.sys.kth')) {
      return 'ref'
    }
    if (hostUrl.startsWith('http://localhost')) {
      return 'ref'
    }
  }
  return 'prod'
}
/**
 * Get language.
 * @param {*} lang the given language parameter.
 */
function _getLanguage(lang) {
  if (lang === 'sv') {
    return lang
  }
  return 'en'
}

/**
 * Gets the block version, defaults to "head".
 * @param {*} version the given block version.
 */
function _getVersion(version) {
  return version || 'head'
}

/**
 * Check if it the given object is an object and if so, we asume that it is the language object.
 * @param blockObj the given object.
 * @returns {boolean} true if language object.
 */
function isLanguage(blockObj) {
  return typeof blockObj === 'object'
}
/**
 * Get the url for the current environmen.
 *
 * @param {*} currentEnv current environment.
 * @param {*} config the given config.
 */
function _getEnvUrl(currentEnv, config) {
  if (currentEnv && config) {
    if (currentEnv === 'prod') {
      return config.urls.prod
    }
    if (currentEnv === 'ref') {
      return config.urls.ref
    }
    return config.urls.dev
  }
  return config.urls.prod
}
/**
 * This function makes a decision based on the HOST_URL environment variable
 * on whether we are in production or referens and serves the correct config.
 *
 * Most values are the same but could be different based on the current state in choosen Cortina environment.
 * Eg. if we have imported a database dump from one environment in to the other.
 */
function _getEnvSpecificConfig() {
  const prodDefaults = {
    env: 'prod',
    url: null,
    debug: false,
    version: 'head',
    language: 'en',
    redisKey: 'CortinaBlock_',
    redisExpire: 600,
    redis: null,
    blocks: {
      title: '1.260060',
      megaMenu: '1.855134',
      secondaryMenu: '1.865038',
      image: '1.77257',
      footer: '1.202278',
      search: '1.77262',
      language: {
        en: '1.77273',
        sv: '1.272446',
      },
      klaroConfig: '1.1137647',
      matomoAnalytics: '1.714097',
    },
  }

  const refDefaults = {
    env: 'ref',
    url: null,
    debug: false,
    version: 'head',
    language: 'en',
    redisKey: 'CortinaBlock_',
    redisExpire: 600,
    redis: null,
    blocks: {
      title: '1.260060',
      megaMenu: '1.855134',
      secondaryMenu: '1.865038',
      image: '1.77257',
      footer: '1.202278',
      search: '1.77262',
      language: {
        en: '1.77273',
        sv: '1.272446',
      },
      klaroConfig: '1.1011116',
      matomoAnalytics: '1.714097',
    },
  }

  let host = process.env.SERVER_HOST_URL
  let cmhost = process.env.CM_HOST_URL
  const localhost = 'http://localhost'

  /*
   * When in development, default host is localhost and default cmhost is REF
   * if not set in process.env.SERVER_HOST_URL resp process.env.CM_HOST_URL
   */
  if (process.env.NODE_ENV === 'development') {
    host = host || localhost
    cmhost = cmhost || 'https://www-r.referens.sys.kth.se/cm/'
  }

  const hostEnv = _getHostEnv(host)
  const cmHostEnv = _getHostEnv(cmhost)

  // CM_HOST_URL is used when working with Azure
  if (cmHostEnv) {
    if (cmHostEnv === 'prod') {
      return prodDefaults
    }
    // Check if in DEV environment and use block for localhost.
    if (host.startsWith(localhost)) {
      refDefaults.blocks.klaroConfig = '1.1011389'
      refDefaults.blocks.matomoAnalytics = '1.714097'
      return refDefaults
    }
    return refDefaults
  }

  if (hostEnv && hostEnv === 'prod') {
    return prodDefaults
  }
  return refDefaults
}

const defaults = _getEnvSpecificConfig()

/**
 * Default configuration
 */
const prepareDefaults = {
  urls: {
    prod: 'https://www.kth.se',
    ref: 'https://www-r.referens.sys.kth.se',
    request: null,
    app: '',
    siteUrl: null,
  },
  siteName: null,
  localeText: null,
  selectors: {
    logo: '.mainLogo img',
    siteName: '.siteName a',
    localeLink: 'a.block.link[hreflang]',
    secondaryMenuLocale: '.block.links a[hreflang]',
  },
}

/**
 * Build API url to Cortins from where to retrieve the blocks.
 * @param {*} config the given config
 * @param {*} type the block type eg. image
 * @param {*} multi
 */
function _buildUrl(config, type, multi) {
  const language = _getLanguage(config.language)
  const block = multi ? config.blocks[type][language] : config.blocks[type]
  const version = _getVersion(config.version)
  return `${config.url}${block}?v=${version}&l=${language}`
}

async function fetchBlock(urlIn, config, blockName) {
  const headers = config.headers ? config.headers : {}
  try {
    const response = await fetch(urlIn, { headers })
    if (!response.ok) {
      log.error(`Failed to fetch cortina block at ${urlIn}: ${response.status}`)
      return { blockName, result: '' }
    }
    const result = await response.text()
    return { blockName, result }
  } catch (err) {
    log.error(`WARNING! FAILED TO FETCH ${blockName} ${err.toString()}`)
    return { blockName, result: '' }
  }
}

/**
 * Build up the Redis key
 *
 * @param {*} prefix the given prefix.
 * @param {*} lang the given language.
 * @private
 */
function _buildRedisKey(prefix, lang) {
  return prefix + _getLanguage(lang)
}

/**
 * Fetch all Cortina blocks from API.
 * @param config the given cinfig
 * @returns {Promise}
 * @private
 */
function _getAll(config) {
  const allblocks = []
  const blocksObj = config.blocks
  for (const i in blocksObj) {
    if (Object.prototype.hasOwnProperty.call(blocksObj, i)) {
      if (isLanguage(blocksObj[i])) {
        allblocks.push({ blockName: 'language', url: _buildUrl(config, 'language', true) })
      } else {
        allblocks.push({ blockName: i, url: _buildUrl(config, i) })
      }
    }
  }

  return Promise.all(allblocks.map(block => fetchBlock(block.url, config, block.blockName)))
    .then(results => {
      const result = {}
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
 * Wrap a Redis get call in a Promise.
 * @param config
 * @returns {Promise}
 * @private
 */
function _getRedisItem(config) {
  const key = _buildRedisKey(config.redisKey, config.language)
  return config.redis.hgetallAsync(key)
}

/**
 * Wrap Redis set call in a Promise.
 * @param config
 * @param blocks
 * @returns {Promise}
 * @private
 */
function _setRedisItem(config, blocks) {
  const key = _buildRedisKey(config.redisKey, config.language)
  return config.redis
    .hmsetAsync(key, blocks)
    .then(() => config.redis.expireAsync(key, config.redisExpire))
    .then(() => blocks)
}

function areAllValuesEmptyString(obj) {
  return Object.values(obj).every(val => val === '')
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
module.exports = function cortina(configIn) {
  const config = generateConfig(defaults, configIn)

  if (!config.url) {
    return Promise.reject(new Error('URL must be specified.'))
  }
  if (!config.redis) {
    return _getAll(config)
  }

  // Try to get from Redis otherwise get from web service then cache result
  // in Redis using config.redisKey. If Redis connection fails, call API
  // directly and don't cache results.

  return _getRedisItem(config)
    .then(blocks => {
      if (blocks) {
        return blocks
      }

      return _getAll(config).then(cortinaBlocks => {
        if (!areAllValuesEmptyString(cortinaBlocks)) return _setRedisItem(config, cortinaBlocks)
        else return cortinaBlocks
      })
    })
    .catch(err => {
      if (config.debug) {
        log.error('Redis failed:', err.message, err.code)
      }

      if (err.code === 'ECONNREFUSED' || err.code === 'CONNECTION_BROKEN') {
        if (config.debug) {
          log.log('Redis bad connection, getting from API...')
        }

        return _getAll(config)
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
module.exports.prepare = function prepare(blocksIn, configIn) {
  let $
  let $el

  const blocks = JSON.parse(JSON.stringify(blocksIn))

  const config = generateConfig(prepareDefaults, configIn)

  const currentEnv = _getEnvSpecificConfig().env

  /*
   * Creating the logo block
   */
  $ = cheerio.load(blocks.image, {
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
  $ = cheerio.load(blocks.title, {
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
  $ = cheerio.load(blocks.language, {
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
    $ = cheerio.load(blocks.secondaryMenu, {
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
