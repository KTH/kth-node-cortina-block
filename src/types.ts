export type Config = {
  blockApiUrl: string
  blocksConfig?: BlocksConfig
  redisConfig?: RedisConfig
  skipCookieScriptsInDev?: boolean
}

export type RedisConfig = {
  host: string
  port: number
}

export type BlocksConfig = { [blockName: string]: string }
export type BlocksObject = { [blockName: string]: string }

export type Redis = {
  hgetallAsync: (key: string) => Promise<any>
  hmsetAsync: (key: string, value: any) => Promise<any>
  expireAsync: (key: string, expire: number) => Promise<any>
}

export type SupportedLang = 'sv' | 'en'
