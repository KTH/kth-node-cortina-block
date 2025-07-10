import { cortinaMiddleware } from './index'
import { fetchAllBlocks } from './fetch-blocks'
import { Config, ExtendedResponse, RedisConfig, SupportedLang } from './types'
import { NextFunction, Request } from 'express'
import mockRedis from 'kth-node-redis'

jest.mock('@kth/log')
jest.mock('kth-node-redis', () => jest.fn())
jest.mock('./fetch-blocks', () => ({ fetchAllBlocks: jest.fn() }))

const BLOCK_FROM_API_FETCH = '<div>Hello from Api fetcher!</div>'
const BLOCK_FROM_REDIS = '<div>Hello from redis!</div>'

const redisResponse = {
  megaMenu: BLOCK_FROM_REDIS,
  footer: BLOCK_FROM_REDIS,
  search: BLOCK_FROM_REDIS,
}

const mockFetchAllBlocks = fetchAllBlocks as jest.Mock

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
    mockFetchAllBlocks.mockResolvedValue({ footer: BLOCK_FROM_API_FETCH })
    mockRedis.mockResolvedValue(createRedisClient({ shouldFail: false }))
  })
  afterAll(() => jest.resetAllMocks())

  test('get all blocks from block-api and store on res.locals', async () => {
    mockFetchAllBlocks.mockResolvedValue({
      footer: 'Footer content',
      megaMenu: 'MegaMenu content',
      search: 'Search content',
    })

    const myMiddleware = cortinaMiddleware(sampleConfig)
    const { req, res, next } = getReqResNext()

    await myMiddleware(req, res, next)

    expect(res.locals?.blocks).toEqual({
      footer: 'Footer content',
      megaMenu: 'MegaMenu content',
      search: 'Search content',
    })
  })
  test('call block-api fetcher with default blocks', async () => {
    const myMiddleware = cortinaMiddleware(sampleConfig)
    const { req, res, next } = getReqResNext()

    await myMiddleware(req, res, next)

    expect(mockFetchAllBlocks).toHaveBeenCalledWith(
      expect.objectContaining({ footer: expect.any(String) }),
      expect.anything(),
      expect.anything(),
      expect.anything()
    )
    expect(mockFetchAllBlocks).toHaveBeenCalledWith(
      expect.objectContaining({ megaMenu: expect.any(String) }),
      expect.anything(),
      expect.anything(),
      expect.anything()
    )
    expect(mockFetchAllBlocks).toHaveBeenCalledWith(
      expect.objectContaining({ search: expect.any(String) }),
      expect.anything(),
      expect.anything(),
      expect.anything()
    )
  })
  test('call block-api fetcher with extended blocks', async () => {
    const config: Config = { ...sampleConfig, blocksConfig: { customBlock: '1.12345' } }

    const myMiddleware = cortinaMiddleware(config)
    const { req, res, next } = getReqResNext()

    await myMiddleware(req, res, next)

    expect(mockFetchAllBlocks).toHaveBeenCalledWith(
      expect.objectContaining({ customBlock: '1.12345' }),
      expect.anything(),
      expect.anything(),
      expect.anything()
    )
  })
  test('replace default block ID from extended blocks', async () => {
    const config: Config = { ...sampleConfig, blocksConfig: { footer: '9.9999' } }

    const myMiddleware = cortinaMiddleware(config)
    const { req, res, next } = getReqResNext()

    await myMiddleware(req, res, next)

    expect(mockFetchAllBlocks).toHaveBeenCalledWith(
      expect.objectContaining({ footer: '9.9999' }),
      expect.anything(),
      expect.anything(),
      expect.anything()
    )
  })

  test('do not use memoryCache if redisConfig is provided', async () => {
    const config: Config = { ...sampleConfig, redisConfig: sampleRedisConfig }
    const redisClient = createRedisClient({ shouldFail: false, shouldReturn: false })
    mockRedis.mockResolvedValue(redisClient)

    const myMiddleware = cortinaMiddleware(config)
    const { req, res, next } = getReqResNext()

    await myMiddleware(req, res, next)

    expect(mockFetchAllBlocks).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), false)
  })

  test('do not use memoryCache if option "memoryCache: false" is passed', async () => {
    const config: Config = { ...sampleConfig, memoryCache: false }

    const myMiddleware = cortinaMiddleware(config)
    const { req, res, next } = getReqResNext()

    await myMiddleware(req, res, next)

    expect(mockFetchAllBlocks).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), false)
  })

  test('get blocks from redis cache if they exist', async () => {
    mockRedis.mockResolvedValue(createRedisClient({ shouldFail: false }))

    const config = { ...sampleConfig, redisConfig: sampleRedisConfig }

    const myMiddleware = cortinaMiddleware(config)
    const { req, res, next } = getReqResNext()

    await myMiddleware(req, res, next)

    expect(res.locals?.blocks?.footer).toEqual(BLOCK_FROM_REDIS)
    expect(res.locals?.blocks?.megaMenu).toEqual(BLOCK_FROM_REDIS)
    expect(res.locals?.blocks?.search).toEqual(BLOCK_FROM_REDIS)
    expect(mockFetchAllBlocks).not.toHaveBeenCalled()
  })
  test('fetch blocks from api if redis fails', async () => {
    mockRedis.mockResolvedValue(createRedisClient({ shouldFail: true }))

    const config = { ...sampleConfig, redisConfig: sampleRedisConfig }

    const myMiddleware = cortinaMiddleware(config)
    const { req, res, next } = getReqResNext()

    await myMiddleware(req, res, next)

    expect(res.locals?.blocks?.footer).toEqual(BLOCK_FROM_API_FETCH)
    expect(mockFetchAllBlocks).toHaveBeenCalled()
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

    expect(mockFetchAllBlocks).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'sv', expect.anything())
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
