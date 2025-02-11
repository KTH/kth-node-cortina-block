import log from '@kth/log'
import { cortina } from './index'
import { Config, Redis } from './types'

const mockRedisClient = {
  hgetallAsync: jest.fn().mockResolvedValue(false),
  hmsetAsync: jest.fn(),
  expireAsync: jest.fn(),
} as Redis
jest.mock('kth-node-redis', () => () => mockRedisClient)

log.init({ name: 'unit test', env: 'production' })

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

const config: Config = {
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
      blockApiUrl: config.blockApiUrl,
      language: 'en',
      shouldSkipCookieScripts: true,
      blocksConfig: config.blocksConfig,
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
        blockApiUrl: config.blockApiUrl,
        language: 'en',
        shouldSkipCookieScripts: true,
        blocksConfig: config.blocksConfig,
      })
    } catch (error) {
      expect(cortina).toThrow('Internal server error')
    }
    expect(result).toEqual({})
  })

  test('get blocks from redis cache', async () => {
    const result = await cortina({
      blockApiUrl: config.blockApiUrl,
      language: 'en',
      shouldSkipCookieScripts: true,
      blocksConfig: config.blocksConfig,
      redisClient: createRedisClient({ shouldFail: false }),
    })
    expect(result.footer).toEqual(helloRedis)
    expect(result.megaMenu).toEqual(helloRedis)
    expect(result.search).toEqual(helloRedis)
  })

  test('fetch blocks from api if redis fails', async () => {
    const result = await cortina({
      blockApiUrl: config.blockApiUrl,
      language: 'en',
      shouldSkipCookieScripts: true,
      blocksConfig: config.blocksConfig,
      redisClient: createRedisClient({ shouldFail: true }),
    })
    expect(result.footer).toEqual(helloWorld)
    expect(result.megaMenu).toEqual(helloWorld)
    expect(result.search).toEqual(helloWorld)
  })

  test('use custom redis key if provided', async () => {
    const redisClient = createRedisClient({ shouldFail: false, shouldReturn: false })
    const redisKey = 'CustomRedisKey_'
    const result = await cortina({
      blockApiUrl: config.blockApiUrl,
      language: 'en',
      shouldSkipCookieScripts: true,
      blocksConfig: config.blocksConfig,
      redisClient,
      redisKey,
    })
    expect(redisClient.hgetallAsync).toBeCalledWith('CustomRedisKey_en')
    expect(redisClient.hmsetAsync).toBeCalledWith('CustomRedisKey_en', expect.anything())
  })
})
