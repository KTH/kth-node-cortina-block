import { Config, Environment, SupportedLang, PrepareConfig } from './types'

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

export const prodDefaults: Config = {
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

export const refDefaults: Config = {
  env: 'ref' as Environment,
  url: '',
  debug: false,
  version: 'head',
  language: 'en' as SupportedLang,
  blocks: prodDefaults.blocks,
}
