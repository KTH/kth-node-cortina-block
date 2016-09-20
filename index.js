'use strict'

const request = require('request-promise')
const cheerio = require('cheerio')
const url = require('url')
const _ = require('lodash/fp')

const defaults = {
  url: null,
  debug: false,
  version: 'head',
  language: 'en',
  redisKey: 'CortinaBlock_',
  redisExpire: 600,
  redis: null,
  blocks: {
    title: '1.260060',
    image: '1.77257',
    footer: '1.202278',
    search: '1.77262',
    language: {
      'en_UK': '1.77273',
      'sv_SE': '1.272446'
    },
    analytics: '1.464751'
  }
}

const prepareDefaults = {
  urls: {
    prod: '//www.kth.se',
    request: null,
    app: ''
  },
  siteName: null,
  localeText: null,
  selectors: {
    logo: '.imageWrapper img',
    siteName: '.siteName a',
    localeLink: '.block.link a.localeLink'
  }
}

function _buildUrl (config, type, multi) {
  let url = config.url
  let language = _getLanguage(config.language)
  let block = multi ? config.blocks[type][language] : config.blocks[type]
  let version = _getVersion(config.version)
  return `${url}${block}?v=${version}&l=${language}`
}

function _getLanguage (lang) {
  if (lang === 'sv') {
    return 'sv_SE'
  }

  return 'en_UK'
}

function _getVersion (version) {
  return version || 'head'
}

function _getBlock (config, type, multi) {
  return request.get(_buildUrl(config, type, multi)).then(result => { return { blockName: type, result: result } })
}

function _buildRedisKey (prefix, lang) {
  return prefix + _getLanguage(lang)
}

/**
 * Fetch all Cortina blocks from API.
 * @param config
 * @returns {Promise}
 * @private
 */
function _getAll (config) {
  return Promise.all(
    handleBlocks(config)
  ).then(function (results) {
      let result = {}
      results.forEach(function (block) {
        result[block.blockName] = block.result
      })
      return result
    })
}

/**
 * Handles all the blocks based on the given config.
 * @param config
 * @returns {Array}
 */
function handleBlocks (config) {
  let blocks = []
  let blocksObj = config.blocks
  for (let i in blocksObj) {
    if(blocksObj.hasOwnProperty(i)) {
      if(isLanguage (blocksObj[i])) {
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
function _getRedisItem (config) {
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
function _setRedisItem (config, blocks) {
  let key = _buildRedisKey(config.redisKey, config.language)
  return config.redis.hmsetAsync(key, blocks)
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
 * @param {String} [config.language=en_UK] - Language for the current session.
 * @param {String} [config.redisKey=CortinaBlock_] - Key prefix to use when caching.
 * @param {Number} [config.redisExpire=600] - Expiration time in seconds, defaults to 10 minutes.
 * @param {Object} [config.redis] - Redis client instance.
 * @param {Object} [config.blocks] - Object with Cortina block IDs.
 * @param {String} [config.blocks.title=1.260060]
 * @param {String} [config.blocks.image=1.77257]
 * @param {String} [config.blocks.footer=1.202278]
 * @param {String} [config.blocks.search=1.77262]
 * @param {Object} [config.blocks.language] - Object with language block IDs.
 * @param {String} [config.blocks.language.en_UK=1.77273] - English language block.
 * @param {String} [config.blocks.language.sv_SE=1.272446] - Swedish language block.
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

        return _getAll(config)
          .then(function (blocks) {
            return _setRedisItem(config, blocks)
          })
      })
      .catch(function (err) {
        if (config.debug) {
          console.error('Redis failed:', err.message, err.code)
        }

        if (err.code === 'ECONNREFUSED' || err.code === 'CONNECTION_BROKEN') {
          if (config.debug) {
            console.log('Redis bad connection, getting from API...')
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
 * Adjusts URLs to logo, locale link, and app link. Also sets app (site) name.
 * @param {Object} blocks - A blocks object.
 * @param {Object} config - Preparation configuration.
 * @param {String} [config.siteName] - Optional site name. Leave empty to use current value.
 * @param {String} [config.localeText] - Optional locale text. Leave empty to use current value.
 * @param {Object} config.urls - Plain object with URLs.
 * @param {String} [config.urls.prod='//www.kth.se']
 * @param {String} config.urls.request - Current request URL (usually from req.url).
 * @param {String} config.urls.app - The application host name and prefix path.
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

  $ = cheerio.load(blocks.image)
  $el = $(config.selectors.logo)
  if ($el.length) {
    $el.attr('src', config.urls.prod + $el.attr('src'))
    blocks.image = $.html()
  }

  $ = cheerio.load(blocks.title)
  $el = $(config.selectors.siteName)
  if ($el.length) {
    $el.attr('href', config.urls.app)

    if (config.siteName) {
      $el.text(config.siteName)
    }

    blocks.title = $.html()
  }

  $ = cheerio.load(blocks.language)
  $el = $(config.selectors.localeLink)
  if ($el.length) {
    let urlParts = url.parse(url.resolve(config.urls.app || '', config.urls.request), true)
    urlParts.search = null
    urlParts.query = urlParts.query || {}

    if ($el.attr('hreflang') === 'en-UK') {
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

  $ = null
  $el = null

  return blocks
}
