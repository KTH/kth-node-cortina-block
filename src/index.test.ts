import log from '@kth/log'
import { cortina } from './index'
import { Config, RedisConfig } from './types'

log.init({ name: 'unit test', env: 'production' })

const helloWorld = '<div>Hello world!</div>'
const helloRedis = '<div>Hello redis!</div>'
const redisResponse = {
  title: helloRedis,
  secondaryMenu: helloRedis,
  megaMenu: helloRedis,
  image: helloRedis,
  footer: helloRedis,
  search: helloRedis,
}

const createRedisClient = (shouldFail: boolean) => {
  const error = new Error('Connection refused')
  return {
    hgetallAsync(key: string) {
      if (shouldFail) return Promise.reject(error)

      return Promise.resolve(redisResponse)
    },

    hmsetAsync(key: string, value: string) {
      if (shouldFail) return Promise.reject(error)

      return Promise.resolve(redisResponse)
    },

    expireAsync(value: string) {
      if (shouldFail) return Promise.reject(error)

      return Promise.resolve(redisResponse)
    },
  }
}
const mockFetch = jest.fn()

;(global.fetch as jest.Mock) = mockFetch

const config: Config = {
  blockApiUrl: 'http://block-api.cortina',
  resourceUrl: 'http://kth.se',
}

const redisConfig: RedisConfig = {
  host: 'localhost',
  port: 0,
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
    const result = await cortina(config.blockApiUrl, config.headers, 'en', true, config.blocksConfig)

    expect(result.footer).toEqual(helloWorld)
    expect(result.image).toEqual(helloWorld)
    expect(result.megaMenu).toEqual(helloWorld)
    expect(result.search).toEqual(helloWorld)
    expect(result.secondaryMenu).toEqual(helloWorld)
    expect(result.title).toEqual(helloWorld)
  })

  test('should thow internal server error and return empty object', async () => {
    mockFetch.mockRejectedValue(new Error('Internal server error'))

    let result
    try {
      result = await cortina(config.blockApiUrl, config.headers, 'en', true, config.blocksConfig)
    } catch (error) {
      expect(cortina).toThrow('Internal server error')
    }
    expect(result).toEqual({})
  })

  test('get blocks from redis cache', async () => {
    const result = await cortina(
      config.blockApiUrl,
      config.headers,
      'en',
      true,
      config.blocksConfig,
      redisConfig,
      createRedisClient(false)
    )
    expect(result.footer).toEqual(helloRedis)
    expect(result.image).toEqual(helloRedis)
    expect(result.megaMenu).toEqual(helloRedis)
    expect(result.search).toEqual(helloRedis)
    expect(result.secondaryMenu).toEqual(helloRedis)
    expect(result.title).toEqual(helloRedis)
  })

  test('fetch blocks from api if redis fails', async () => {
    const result = await cortina(
      config.blockApiUrl,
      config.headers,
      'en',
      true,
      config.blocksConfig,
      redisConfig,
      createRedisClient(true)
    )
    expect(result.footer).toEqual(helloWorld)
    expect(result.image).toEqual(helloWorld)
    expect(result.megaMenu).toEqual(helloWorld)
    expect(result.search).toEqual(helloWorld)
    expect(result.secondaryMenu).toEqual(helloWorld)
    expect(result.title).toEqual(helloWorld)
  })
})
