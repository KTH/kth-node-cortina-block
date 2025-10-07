import type { Response } from 'express'

export type Config = {
  blockApiUrl: string
  blocksConfig?: BlocksConfig
  redisConfig?: RedisConfig
  redisKey?: string
  skipCookieScriptsInDev?: boolean
  supportedLanguages?: SupportedLang[]
  memoryCache?: boolean
}

export type RedisConfig = {
  host: string
  port: number
}

export type BlocksConfig = { [blockName: string]: string }
export type BlocksObject = { [blockName: string]: string }

export type SupportedLang = 'sv' | 'en'

export type ExtendedResponse = Response & {
  locals?: { locale: { language: SupportedLang }; blocks?: { [key: string]: string } }
}
