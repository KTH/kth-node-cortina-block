export type Config = {
  env: Environment
  url: string
  debug: boolean
  version: string
  language: SupportedLang
  redisKey: string
  redisExpire: number
  redis?: Redis
  blocks: Blocks
  headers?: Headers
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

export type Redis = {
  hgetallAsync: (key: string) => Promise<any>
  hmsetAsync: (key: string, value: any) => Promise<any>
  expireAsync: (key: string) => Promise<any>
}

export type Environment = 'prod' | 'ref'

export type SupportedLang = 'sv' | 'en'
