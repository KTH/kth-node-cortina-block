import { cortinaMiddleware } from './index'
import { Config, ExtendedResponse, Redis, RedisConfig, SupportedLang } from './types'
import { NextFunction, Request } from 'express'
import mockRedis from 'kth-node-redis'

jest.mock('kth-node-redis', () => jest.fn())

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

const sampleRedisConfig: RedisConfig = {
  host: 'my-redis',
  port: 8123,
}

const getReqResNext = () => ({
  req: { query: {}, hostname: '' } as Request,
  res: { locals: { locale: { language: 'en' } } } as ExtendedResponse,
  next: jest.fn() as NextFunction,
})

describe(`cortinaMiddleware`, () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      text: () => Promise.resolve(helloWorld),
      ok: true,
    })
    mockRedis.mockResolvedValue(createRedisClient({ shouldFail: false }))
  })
  afterAll(() => jest.resetAllMocks())

  test('get all blocks from block-api and store on res.locals', async () => {
    const myMiddleware = cortinaMiddleware(sampleConfig)
    const { req, res, next } = getReqResNext()

    await myMiddleware(req, res, next)

    expect(res.locals?.blocks?.footer).toEqual(helloWorld)
    expect(res.locals?.blocks?.megaMenu).toEqual(helloWorld)
    expect(res.locals?.blocks?.search).toEqual(helloWorld)
  })

  test('sets blocks to emty object if fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Internal server error'))

    const myMiddleware = cortinaMiddleware(sampleConfig)
    const { req, res, next } = getReqResNext()

    await myMiddleware(req, res, next)

    expect(res.locals?.blocks).toEqual({})
  })

  test('get blocks from redis cache', async () => {
    mockRedis.mockResolvedValue(createRedisClient({ shouldFail: false }))

    const config = { ...sampleConfig, redisConfig: sampleRedisConfig }

    const myMiddleware = cortinaMiddleware(config)
    const { req, res, next } = getReqResNext()

    await myMiddleware(req, res, next)

    expect(res.locals?.blocks?.footer).toEqual(helloRedis)
    expect(res.locals?.blocks?.megaMenu).toEqual(helloRedis)
    expect(res.locals?.blocks?.search).toEqual(helloRedis)
  })

  test('fetch blocks from api if redis fails', async () => {
    mockRedis.mockResolvedValue(createRedisClient({ shouldFail: true }))

    const config = { ...sampleConfig, redisConfig: sampleRedisConfig }

    const myMiddleware = cortinaMiddleware(config)
    const { req, res, next } = getReqResNext()

    await myMiddleware(req, res, next)

    expect(res.locals?.blocks?.footer).toEqual(helloWorld)
    expect(res.locals?.blocks?.megaMenu).toEqual(helloWorld)
    expect(res.locals?.blocks?.search).toEqual(helloWorld)
  })

  test('use custom redis key if provided', async () => {
    const redisClient = createRedisClient({ shouldFail: false, shouldReturn: false })
    mockRedis.mockResolvedValue(redisClient)

    const redisKey = 'CustomRedisKey_'

    const config = { ...sampleConfig, redisConfig: sampleRedisConfig, redisKey }

    const myMiddleware = cortinaMiddleware(config)
    const { req, res, next } = getReqResNext()

    await myMiddleware(req, res, next)

    expect(redisClient.hgetallAsync).toHaveBeenCalledWith('CustomRedisKey_en')
    expect(redisClient.hmsetAsync).toHaveBeenCalledWith('CustomRedisKey_en', expect.anything())
  })

  test('ignore request language and use a supported language if "supportedLanguages" is provided', async () => {
    const supportedLanguages: SupportedLang[] = ['sv']
    const config = { ...sampleConfig, supportedLanguages }
    const myMiddleware = cortinaMiddleware(config)

    const res = { locals: { locale: { language: 'en' } } } as ExtendedResponse
    const { req, next } = getReqResNext()

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
