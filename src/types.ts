export type Config = {
  env: Environment
  url: string
  debug: boolean
  version: string
  language: SupportedLang
  redisConfig?: {
    redis: Redis
    redisKey: string
    redisExpire: number
  }
  blocks?: Blocks
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

export type PrepareConfig = {
  urls: {
    prod: string
    ref: string
    request: string
    app: string
    siteUrl?: string
  }
  globalLink?: string
  siteName?: string
  localeText?: string
  selectors: {
    logo: string
    siteName: string
    localeLink: string
    secondaryMenuLocale: string
  }
}

export type PrepareConfigIn = {
  urls: {
    prod?: string
    ref?: string
    request: string
    app: string
    siteUrl?: string
  }
  globalLink?: boolean
  siteName?: string
  localeText?: string
}

export type Redis = {
  hgetallAsync: (key: string) => Promise<any>
  hmsetAsync: (key: string, value: any) => Promise<any>
  expireAsync: (key: string) => Promise<any>
}

export type Environment = 'prod' | 'ref'

export type SupportedLang = 'sv' | 'en'
