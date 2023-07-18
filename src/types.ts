export type DefaultConfig = {
  env: 'ref' | 'prod'
  url: string
  debug: boolean
  version: 'head'
  language: 'en' | 'sv'
  redisKey: string
  redisExpire: number
  redis: null
  blocks: {
    title: string
    megaMenu: string
    secondaryMenu: string
    image: string
    footer: string
    search: string
    language: {
      en: string
      sv: string
    }
    klaroConfig: string
    matomoAnalytics: string
  }
}

export type CortinaBlockConfig = DefaultConfig & {
  headers: Headers
}

export type ConfigIn = {
  language: 'sv' | 'en'
  url: string
  headers: Headers
  redis: client
  blocks: addBlocks
  redisKey: string
}
