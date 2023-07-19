export type DefaultConfig = {
  env: 'ref' | 'prod'
  url: string
  debug: boolean
  version: 'head'
  language: 'en' | 'sv'
  redisKey: string
  redisExpire: number
  redis: null
  blocks: Blocks
}

export type CortinaBlockConfig = DefaultConfig & {
  headers: Headers
}

export type ConfigIn = {
  language: 'sv' | 'en'
  url: string
  headers?: Headers
  version: string
  redis?: Redis
  blocks: Blocks
  redisKey?: string
}

type Blocks = {
  title?: string
  megaMenu?: string
  secondaryMenu?: string
  image?: string
  footer?: string
  search?: string
  language: {
    en: string
    sv: string
  }
  klaroConfig?: string
  matomoAnalytics?: string
}

type Redis = {
  hgetallAsync: (key: string) => Promise<any>
  hmsetAsync: (key: string, value: any) => Promise<any>
  expireAsync: (key: string) => Promise<any>
}
