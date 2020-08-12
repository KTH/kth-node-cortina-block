'use strict'

const request = require('request-promise')
const cheerio = require('cheerio')
const url = require('url')
const log = require('kth-node-log')
const _ = require('lodash/fp')

const defaults = _getEnvSpecificConfig()

/**
 * This function makes a decision based on the HOST_URL environment variable
 * on whether we are in production, referens or development and serves the correct config.
 *
 * Most values are the same but could be different based on the current state in choosen Cortina environment.
 * Eg. if we have imported a database dum from one environment in to the other.
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
      analytics: '1.464751',
      gtmAnalytics: '1.714097',
      gtmNoscript: '1.714099',
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
      analytics: '1.464751',
      gtmAnalytics: '1.714097',
      gtmNoscript: '1.714099',
    },
  }

  const devDefaults = {
    env: 'dev',
    url: null,
    debug: false,
    version: 'head',
    language: 'en',
    redisKey: 'CortinaBlock_',
    redisExpire: 600,
    redis: null,
    blocks: {
      title: '1.260060',
      megaMenu: '1.260064',
      secondaryMenu: '1.865038',
      image: '1.77257',
      footer: '1.202278',
      search: '1.77262',
      language: {
        en: '1.77273',
        sv: '1.272446',
      },
      analytics: '1.464751',
      gtmAnalytics: '1.714097',
      gtmNoscript: '1.714099',
    },
  }

  const host = process.env['SERVER_HOST_URL']
  const hostEnv = _getHostEnv(host)

  const cmhost = process.env['CM_HOST_URL']
  const cmHostEnv = _getHostEnv(cmhost)

  // CM_HOST_URL is used when working with Azure
  if (cmHostEnv) {
    if (cmHostEnv === 'prod') {
      return prodDefaults
    } else if (cmHostEnv === 'ref') {
      return refDefaults
    } else {
      return devDefaults
    }
  }

  if (hostEnv && hostEnv === 'prod') {
    return prodDefaults
  } else if (hostEnv === 'ref') {
    return refDefaults
  } else {
    return devDefaults
  }
}

/**
 * Get the current environment from the given Host or Content Management Host.
 * @param {*} host the given host URL.
 */
function _getHostEnv(hostUrl) {
  if (hostUrl) {
    if (hostUrl.startsWith('https://www.kth')) {
      return 'prod'
    } else if (
      hostUrl.startsWith('https://www-r.referens.sys.kth') ||
      hostUrl.startsWith('https://app-r.referens.sys.kth')
    ) {
      return 'ref'
    } else if (hostUrl.startsWith('http://localhost')) {
      return 'dev'
    } else {
      return 'prod'
    }
  }
}

/**
 * Default configuration
 */
const prepareDefaults = {
  urls: {
    prod: 'https://www.kth.se',
    ref: 'https://www-r.referens.sys.kth.se',
    dev: 'https://www-r.referens.sys.kth.se',
    request: null,
    app: '',
    siteUrl: null,
  },
  siteName: null,
  localeText: null,
  selectors: {
    logo: '.imageWrapper img',
    logoV3: '.mainLogo img',
    siteName: '.siteName a',
    localeLink: '.block.link a.localeLink',
    localeLinkV3: 'a.block.link[hreflang]',
    secondaryMenuLocaleV3: '.block.links a[hreflang]',
  },
}

/**
 * Build API url to Cortins from where to retrieve the blocks.
 * @param {*} config the given config
 * @param {*} type the block type eg. image
 * @param {*} multi
 */
function _buildUrl(config, type, multi) {
  let url = config.url
  let language = _getLanguage(config.language)
  let block = multi ? config.blocks[type][language] : config.blocks[type]
  let version = _getVersion(config.version)
  return `${url}${block}?v=${version}&l=${language}`
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
 * Gets the block based on the given config and type.
 * @param {*} config the given config
 * @param {*} type the block type eg. image
 * @param {*} multi
 */
function _getBlock(config, type, multi) {
  const options = {
    uri: _buildUrl(config, type, multi),
  }

  if (config.headers) {
    options['headers'] = config.headers
  }
  return request.get(options).then((result) => {
    return { blockName: type, result: result }
  })
}

/**
 * Build up the Redis key.
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
  return Promise.all(handleBlocks(config))
    .then(function (results) {
      let result = {}
      results.forEach(function (block) {
        result[block.blockName] = block.result
      })
      return result
    })
    .catch((err) => {
      var blockName = err.options ? err.options.uri : 'NO URI FOUND'
      log.error(`WARNING! 
      NO BLOCKS WILL BE LOADED DUE TO ERROR IN ONE OF THE BLOCKS. 
      FIX ALL BROKEN BLOCKS IMMEDIATELY. 
      ATTEMPTED TO LOAD BLOCK: ${blockName}`)
      throw err
    })
}

/**
 * Handles all the blocks based on the given config.
 * @param config
 * @returns {Array}
 */
function handleBlocks(config) {
  let blocks = []
  let blocksObj = config.blocks
  for (let i in blocksObj) {
    if (blocksObj.hasOwnProperty(i)) {
      if (isLanguage(blocksObj[i])) {
        blocks.push(_getBlock(config, 'language', true))
      } else {
        blocks.push(_getBlock(config, i))
      }
    }
  }
  return blocks
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
 * Wrap a Redis get call in a Promise.
 * @param config
 * @returns {Promise}
 * @private
 */
function _getRedisItem(config) {
  let key = _buildRedisKey(config.redisKey, config.language)
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
  let key = _buildRedisKey(config.redisKey, config.language)
  return config.redis
    .hmsetAsync(key, blocks)
    .then(function () {
      return config.redis.expireAsync(key, config.redisExpire)
    })
    .then(function () {
      return blocks
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
module.exports = function (config) {
  config = _.defaultsDeep(defaults, config)

  if (!config.url) {
    return Promise.reject(new Error('URL must be specified.'))
  }

  if (config.redis) {
    // Try to get from Redis otherwise get from web service then cache result
    // in Redis using config.redisKey. If Redis connection fails, call API
    // directly and don't cache results.

    return _getRedisItem(config)
      .then(function (blocks) {
        if (blocks) {
          return blocks
        }

        return _getAll(config).then(function (blocks) {
          return _setRedisItem(config, blocks)
        })
      })
      .catch(function (err) {
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
  } else {
    return _getAll(config)
  }
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
 * @param {String} [config.selectors.logo='.imageWrapper img']
 * @param {String} [config.selectors.siteName='.siteName a']
 * @param {String} [config.selectors.localeLink='.block.link a.localeLink']
 * @returns {Object} Returns a modified blocks object.
 */
module.exports.prepare = function (blocks, config) {
  let $
  let $el

  blocks = _.clone(blocks)
  config = _.defaultsDeep(prepareDefaults, config)

  const currentEnv = _getEnvSpecificConfig().env

  // Creating the logo block

  $ = cheerio.load(blocks.image, {
    xmlMode: true,
  })

  $el = $(config.selectors.logo)

  let envUrl = _getEnvUrl(currentEnv, config)

  if ($el.length) {
    $el.attr('src', envUrl + $el.attr('src'))
    blocks.image = $.html()
  } else {
    $el = $(config.selectors.logoV3)
    if ($el.length) {
      $el.attr('src', envUrl + $el.attr('src'))
      blocks.image = $.html()
    }
  }

  // Creating the site name block
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

  // Creating the locale link block
  $ = cheerio.load(blocks.language, {
    xmlMode: true,
  })
  $el = $(config.selectors.localeLink)
  if (!$el.length) {
    $el = $(config.selectors.localeLinkV3) // Use the new html selector for KTH Style ver. 3.
  }

  if ($el.length) {
    let urlParts = url.parse(url.resolve(config.urls.app || '', config.urls.request), true)
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
    $el = $(config.selectors.secondaryMenuLocaleV3)

    if ($el.length) {
      let urlParts = url.parse(url.resolve(config.urls.app || '', config.urls.request), true)
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
      blocks.secondaryMenu = $.html()
    }
  }

  $ = null
  $el = null

  return blocks
}

/**
 * Get the url for the current environmen.
 * @param {*} currentEnv current environment.
 * @param {*} config the given config.
 */
function _getEnvUrl(currentEnv, config) {
  if (currentEnv && config) {
    if (currentEnv === 'prod') {
      return config.urls.prod
    } else if (currentEnv === 'ref') {
      return config.urls.ref
    } else {
      return config.urls.dev
    }
  }
}
