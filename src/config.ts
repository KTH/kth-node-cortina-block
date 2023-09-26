import { Config, Environment, SupportedLang, PrepareConfig, PrepareConfigIn } from './types'
import { _getHostEnv } from './utils'

/**
 * Default configuration
 */
export const prepareDefaults: PrepareConfig = {
  urls: {
    prod: 'https://www.kth.se',
    ref: 'https://www-r.referens.sys.kth.se',
    request: '',
    app: '',
  },
  selectors: {
    logo: '.mainLogo img',
    siteName: '.siteName a',
    localeLink: 'a.block.link[hreflang]',
    secondaryMenuLocale: '.block.links a[hreflang]',
  },
}

// Creates a new copy of default config with config
// Note deep copy is limited to only the second level
//
export function generateConfig(defaultConfig: Config, config: Config) {
  const rval = structuredClone(defaultConfig)
  for (const key in config) {
    if (Object.prototype.hasOwnProperty.call(config, key) && config[key]) {
      if (typeof config[key] === 'object') {
        rval[key] = { ...rval[key], ...config[key] }
      } else {
        rval[key] = config[key]
      }
    }
  }
  return rval
}

export function generatePrepareConfig(prepareConfig: PrepareConfig, config: PrepareConfigIn) {
  const rval = structuredClone(prepareConfig)
  for (const key in config) {
    if (Object.prototype.hasOwnProperty.call(config, key) && config[key]) {
      if (typeof config[key] === 'object') {
        rval[key] = { ...rval[key], ...config[key] }
      } else {
        rval[key] = config[key]
      }
    }
  }
  return rval
}

/**
 * This function makes a decision based on the HOST_URL environment variable
 * on whether we are in production or referens and serves the correct config.
 *
 * Most values are the same but could be different based on the current state in choosen Cortina environment.
 * Eg. if we have imported a database dump from one environment in to the other.
 */
export function _getEnvSpecificConfig() {
  const prodDefaults: Config = {
    env: 'prod' as Environment,
    url: '',
    debug: false,
    version: 'head',
    language: 'en' as SupportedLang,
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
    env: 'ref' as Environment,
    url: '',
    debug: false,
    version: 'head',
    language: 'en' as SupportedLang,
    redisKey: 'CortinaBlock_',
    redisExpire: 600,
    blocks: prodDefaults.blocks,
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
  // TODO: Remove these two lines
  host = host || localhost
  cmhost = cmhost || 'https://www-r.referens.sys.kth.se/cm/'
  const hostEnv = _getHostEnv(host)
  const cmHostEnv = _getHostEnv(cmhost)

  // CM_HOST_URL is used when working with Azure
  if (cmHostEnv) {
    if (cmHostEnv === 'prod') {
      return prodDefaults
    }
    // Check if in DEV environment and use block for localhost.
    if (host.startsWith(localhost)) {
      return refDefaults
    }
    return refDefaults
  }

  if (hostEnv && hostEnv === 'prod') {
    return prodDefaults
  }
  return refDefaults
}
