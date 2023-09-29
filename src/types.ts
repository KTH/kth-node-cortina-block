export type Config = {
  blockApiUrl: string
  debug: boolean
  blockVersion: string
  headers?: Headers
  siteName?: { en: string; sv: string }
  localeText?: { en: string; sv: string }
  baseUrl: string
  blocksConfig?: BlocksConfig
}

export type RedisConfig = {
  redis: Redis
  redisKey: string
  redisExpire: number
}

export type BlocksConfig = { [blockName: string]: string }
export type BlocksObject = { [blockName: string]: string }

/* {
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
} */

export type Redis = {
  hgetallAsync: (key: string) => Promise<any>
  hmsetAsync: (key: string, value: any) => Promise<any>
  expireAsync: (key: string, expire: number) => Promise<any>
}

export type SupportedLang = 'sv' | 'en'
