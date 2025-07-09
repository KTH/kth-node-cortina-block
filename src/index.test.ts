import { cortina, cortinaMiddleware } from './index'
import { Config, ExtendedResponse, Redis, SupportedLang } from './types'
import { NextFunction, Request } from 'express'

const mockRedisClient = {
  hgetallAsync: jest.fn().mockResolvedValue(false),
  hmsetAsync: jest.fn(),
  expireAsync: jest.fn(),
} as Redis
jest.mock('kth-node-redis', () => () => mockRedisClient)

jest.mock('@kth/log')

const helloWorld = '<div>Hello world!</div>'
const helloRedis = '<div>Hello redis!</div>'
const redisResponse = {
  megaMenu: helloRedis,
  footer: helloRedis,
  search: helloRedis,
}

const createRedisClient = (options: { shouldFail: boolean; shouldReturn?: boolean }) => {
  const { shouldFail, shouldReturn = true } = options
  const error = new Error('Connection refused')

  return {
    hgetallAsync: jest.fn((key: string) => {
      if (shouldFail) return Promise.reject(error)

      if (shouldReturn === false) return Promise.resolve(undefined)

      return Promise.resolve(redisResponse)
    }),

    hmsetAsync: jest.fn((key: string, value: string) => {
      if (shouldFail) return Promise.reject(error)

      return Promise.resolve(redisResponse)
    }),

    expireAsync: jest.fn(),
  }
}
const mockFetch = jest.fn()

;(global.fetch as jest.Mock) = mockFetch

const sampleConfig: Config = {
  blockApiUrl: 'http://block-api.cortina/',
}

describe(`cortina`, () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      text: () => Promise.resolve(helloWorld),
      ok: true,
    })
  })
  afterAll(() => jest.resetAllMocks())

  test('get all blocks from block-api', async () => {
    const result = await cortina({
      blockApiUrl: sampleConfig.blockApiUrl,
      language: 'en',
      shouldSkipCookieScripts: true,
      blocksConfig: sampleConfig.blocksConfig,
    })

    expect(result.footer).toEqual(helloWorld)
    expect(result.megaMenu).toEqual(helloWorld)
    expect(result.search).toEqual(helloWorld)
  })

  test('should thow internal server error and return empty object', async () => {
    mockFetch.mockRejectedValue(new Error('Internal server error'))

    let result
    try {
      result = await cortina({
        blockApiUrl: sampleConfig.blockApiUrl,
        language: 'en',
        shouldSkipCookieScripts: true,
        blocksConfig: sampleConfig.blocksConfig,
      })
    } catch (error) {
      expect(cortina).toThrow('Internal server error')
    }
    expect(result).toEqual({})
  })

  test('get blocks from redis cache', async () => {
    const result = await cortina({
      blockApiUrl: sampleConfig.blockApiUrl,
      language: 'en',
      shouldSkipCookieScripts: true,
      blocksConfig: sampleConfig.blocksConfig,
      redisClient: createRedisClient({ shouldFail: false }),
    })
    expect(result.footer).toEqual(helloRedis)
    expect(result.megaMenu).toEqual(helloRedis)
    expect(result.search).toEqual(helloRedis)
  })

  test('fetch blocks from api if redis fails', async () => {
    const result = await cortina({
      blockApiUrl: sampleConfig.blockApiUrl,
      language: 'en',
      shouldSkipCookieScripts: true,
      blocksConfig: sampleConfig.blocksConfig,
      redisClient: createRedisClient({ shouldFail: true }),
    })
    expect(result.footer).toEqual(helloWorld)
    expect(result.megaMenu).toEqual(helloWorld)
    expect(result.search).toEqual(helloWorld)
  })

  test('use custom redis key if provided', async () => {
    const redisClient = createRedisClient({ shouldFail: false, shouldReturn: false })
    const redisKey = 'CustomRedisKey_'
    await cortina({
      blockApiUrl: sampleConfig.blockApiUrl,
      language: 'en',
      shouldSkipCookieScripts: true,
      blocksConfig: sampleConfig.blocksConfig,
      redisClient,
      redisKey,
    })
    expect(redisClient.hgetallAsync).toHaveBeenCalledWith('CustomRedisKey_en')
    expect(redisClient.hmsetAsync).toHaveBeenCalledWith('CustomRedisKey_en', expect.anything())
  })
})

describe(`cortinaMiddleware`, () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      text: () => Promise.resolve(helloWorld),
      ok: true,
    })
  })
  afterAll(() => jest.resetAllMocks())

  test('ignore request language and use a supported language if "supportedLanguages" is provided', async () => {
    const supportedLanguages: SupportedLang[] = ['sv']
    const config = { ...sampleConfig, supportedLanguages }
    const myMiddleware = cortinaMiddleware(config)

    const req = { query: {}, hostname: '' } as Request
    const res = { locals: { locale: { language: 'en' } } } as ExtendedResponse
    const next = jest.fn() as NextFunction

    await myMiddleware(req, res, next)

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('?l=sv'))
  })
  describe(`config`, () => {
    it('throws if "redisConfig" is passed when "memoryCache" is true', () => {
      const config = { ...sampleConfig, redisConfig: { host: 'redis', port: 123 }, memoryCache: true }

      const initMiddleware = () => cortinaMiddleware(config)

      expect(initMiddleware).toThrow()
    })
    it('throws if redisKey is passed without "redisConfig"', () => {
      const config = { ...sampleConfig, redisConfig: undefined, redisKey: 'custom_key' }

      const initMiddleware = () => cortinaMiddleware(config)

      expect(initMiddleware).toThrow()
    })
    it('dows not throw when config is valid', () => {
      const config = { ...sampleConfig }

      const myMiddleware = cortinaMiddleware(config)

      expect(typeof myMiddleware).toBe('function')
    })
  })
})
