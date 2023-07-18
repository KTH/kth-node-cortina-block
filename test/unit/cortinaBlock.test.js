const log = require('@kth/log')
const cortina = require('../../index')

log.init({ name: 'unit test', env: 'production' })
const testConfig = {
  url: '/',
  version: '1.0.0',
  language: 'sv',
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

function createConfig() {
  return {
    url: '/',
    version: '1.0.0',
    language: 'sv',
    blocks: {
      title: 'title',

      language: {
        en: 'english',
        sv: 'swedish',
      },
    },
  }
}

const helloWorld = '<div>Hello world!</div>'

describe(`Cortina blocks tests`, () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve(helloWorld),
        ok: true,
      })
    )
  })
  afterAll(() => jest.resetAllMocks())

  test('gets all blocks', async () => {
    const result = await cortina(testConfig)

    expect(result.footer).toEqual(helloWorld)

    expect(result.image).toEqual(helloWorld)
    expect(result.language).toEqual(helloWorld)
    expect(result.megaMenu).toEqual(helloWorld)

    expect(result.search).toEqual(helloWorld)
    expect(result.secondaryMenu).toEqual(helloWorld)
    expect(result.title).toEqual(helloWorld)
  })

  test('yields errors', async () => {
    fetch.mockRejectedValue(new Error('Internal server error'))

    let result
    try {
      result = await cortina(testConfig)
    } catch (ex) {
      expect(cortina).toThrow('Internal server error')
    }
    expect(result).toEqual({})
  })

  test('uses redis cache', async () => {
    const config = createConfig()
    const cache = {}

    let calledGet = false
    let calledSet = false

    config.redis = {
      hgetallAsync(key) {
        calledGet = true
        return Promise.resolve(cache[key])
      },

      hmsetAsync(key, value) {
        calledSet = true
        cache[key] = value
        return Promise.resolve(value)
      },

      expireAsync(value) {
        return Promise.resolve(value)
      },
    }
    const result = await cortina(config)

    expect(result.footer).toEqual(helloWorld)

    expect(result.image).toEqual(helloWorld)
    expect(result.language).toEqual(helloWorld)
    expect(result.megaMenu).toEqual(helloWorld)

    expect(result.search).toEqual(helloWorld)
    expect(result.secondaryMenu).toEqual(helloWorld)
    expect(result.title).toEqual(helloWorld)

    expect(calledGet).toEqual(true)
    expect(calledSet).toEqual(true)
  })

  test('falls back to api if redis fails', async () => {
    const config = createConfig()
    let calledGet = false
    const helloWorld = '<div>Hello world!</div>'

    config.redis = {
      hgetallAsync() {
        const error = new Error('Connection refused')
        error.code = 'ECONNREFUSED'
        calledGet = true
        return Promise.reject(error)
      },
    }
    const result = await cortina(config)

    expect(calledGet).toEqual(true)
    expect(result.footer).toEqual(helloWorld)
  })
})
