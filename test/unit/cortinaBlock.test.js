const fetch = require('node-fetch')
const cortina = require('../../index')

// jest.mock('kth-node-log', () => ({
//   init: jest.fn().mockName('init'),
//   // eslint-disable-next-line no-console
//   debug: jest.fn(txt => console.log(`DEBUG: ${txt}`)).mockName('debug'),
//   // eslint-disable-next-line no-console
//   error: jest.fn(txt => console.log(`ERROR: ${txt}`)).mockName('error'),
//   // eslint-disable-next-line no-console
//   info: jest.fn(txt => console.log(`INFO: ${txt}`)).mockName('info'),
// }))

jest.mock('kth-node-log', () => ({
  init: jest.fn().mockName('init'),
  debug: jest.fn().mockName('debug'),
  error: jest.fn().mockName('error'),
  info: jest.fn().mockName('info'),
}))

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

// jest.mock('node-fetch', () => ({
//   fetch: jest.fn(() => ({
//     text: () => Promise.resolve('<div>Hello world!</div>'),
//     json: () => Promise.resolve({ msg: 'Hello world!' }),
//   })),
// }))

// const fetch = jest.fn(() =>
//   Promise.resolve({
//     text: () => Promise.resolve('<div>Hello world!</div>'),
//     json: () => Promise.resolve({ msg: 'Hello world!' }),
//   })
// )

jest.mock('node-fetch')

const { Response } = jest.requireActual('node-fetch')

describe(`Cortina blocks tests`, () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => jest.resetAllMocks())

  test('gets all blocks', async () => {
    const helloWorld = '<div>Hello world!</div>'

    fetch.mockImplementation(() => Promise.resolve(new Response(helloWorld)))

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
    fetch.mockImplementation(() => Promise.reject(new Error('Internal server error')))

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
    const helloWorld = '<div>Hello world!</div>'

    fetch.mockImplementation(() => Promise.resolve(new Response(helloWorld)))

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

    fetch.mockImplementation(() => Promise.resolve(new Response(helloWorld)))

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
