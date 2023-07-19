import log from '@kth/log'
import cortina from './index'
import { SupportedLang } from './types'

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
  language: helloRedis,
}
function createConfig() {
  return {
    url: '/',
    version: '1.0.0',
    language: 'sv' as SupportedLang,
    blocks: {
      title: 'title',
      image: 'image',
      footer: 'footer',
      search: 'search',
      language: {
        en: 'english',
        sv: 'swedish',
      },
    },
  }
}

function createConfigWithRedis(redisFails: boolean = false) {
  const configWithoutRedis = createConfig()
  const error = new Error('Connection refused')
  // @ts-ignore
  error.code = 'ECONNREFUSED'
  return {
    ...configWithoutRedis,
    redis: {
      hgetallAsync(_key) {
        if (redisFails) return Promise.reject(error)

        return Promise.resolve(redisResponse)
      },

      hmsetAsync(_key, _value) {
        if (redisFails) return Promise.reject(error)

        return Promise.resolve(redisResponse)
      },

      expireAsync(_value) {
        if (redisFails) return Promise.reject(error)

        return Promise.resolve(redisResponse)
      },
    },
  }
}

describe(`Cortina blocks tests`, () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock) = jest.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve(helloWorld),
        ok: true,
      })
    )
  })
  afterAll(() => jest.resetAllMocks())

  test('gets all blocks', async () => {
    const result = await cortina(createConfig())

    expect(result.footer).toEqual(helloWorld)

    expect(result.image).toEqual(helloWorld)
    expect(result.language).toEqual(helloWorld)
    expect(result.megaMenu).toEqual(helloWorld)

    expect(result.search).toEqual(helloWorld)
    expect(result.secondaryMenu).toEqual(helloWorld)
    expect(result.title).toEqual(helloWorld)
  })

  test('yields errors', async () => {
    ;(global.fetch as jest.Mock) = jest.fn().mockRejectedValue(new Error('Internal server error'))

    let result
    try {
      result = await cortina(createConfig())
    } catch (ex) {
      expect(cortina).toThrow('Internal server error')
    }
    expect(result).toEqual({})
  })

  test('uses redis cache', async () => {
    const result = await cortina(createConfigWithRedis())
    expect(result.footer).toEqual(helloRedis)
    expect(result.image).toEqual(helloRedis)
    expect(result.language).toEqual(helloRedis)
    expect(result.megaMenu).toEqual(helloRedis)
    expect(result.search).toEqual(helloRedis)
    expect(result.secondaryMenu).toEqual(helloRedis)
    expect(result.title).toEqual(helloRedis)
  })

  test('falls back to api if redis fails', async () => {
    const result = await cortina(createConfigWithRedis(true))
    expect(result.footer).toEqual(helloWorld)
    expect(result.image).toEqual(helloWorld)
    expect(result.language).toEqual(helloWorld)
    expect(result.megaMenu).toEqual(helloWorld)
    expect(result.search).toEqual(helloWorld)
    expect(result.secondaryMenu).toEqual(helloWorld)
    expect(result.title).toEqual(helloWorld)
  })
})
