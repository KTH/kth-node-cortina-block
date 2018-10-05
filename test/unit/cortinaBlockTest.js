'use strict'

const test = require('tape')
const proxyquire = require('proxyquire')
const mockery = require('mockery')

const mockLogger = {}
mockLogger.debug = mockLogger.warn = mockLogger.error = mockLogger.init = mockLogger.info = () => {}
mockery.registerMock('kth-node-log', mockLogger)
mockery.enable({
  warnOnUnregistered: false
})

const request = {}

const cortina = proxyquire('../../index', { 'request-promise': request })

function _assertBlocks (assert, blocks) {
  assert.equal(blocks.title.uri, '/title?v=1.0.0&l=sv_SE')
  assert.equal(blocks.image.uri, '/image?v=1.0.0&l=sv_SE')
  assert.equal(blocks.footer.uri, '/footer?v=1.0.0&l=sv_SE')
  assert.equal(blocks.search.uri, '/search?v=1.0.0&l=sv_SE')
  assert.equal(blocks.language.uri, '/swedish?v=1.0.0&l=sv_SE')
  assert.equal(blocks.analytics.uri, '/analytics?v=1.0.0&l=sv_SE')
}

function createConfig () {
  return {
    url: '/',
    version: '1.0.0',
    language: 'sv',
    blocks: {
      title: 'title',
      image: 'image',
      footer: 'footer',
      search: 'search',
      language: {
        en_UK: 'english',
        sv_SE: 'swedish'
      },
      analytics: 'analytics'
    }
  }
}

test('gets all blocks', (assert) => {
  const config = createConfig()

  request.get = function (url) {
    return Promise.resolve(url)
  }

  return cortina(config)
    .then((blocks) => {
      _assertBlocks(assert, blocks)
      assert.end()
    })
    .catch((err) => {
      assert.error(err, 'Should not yield errors.')
      assert.end()
    })
})

test('yields errors', (assert) => {
  const config = createConfig()

  request.get = function () {
    return Promise.reject(new Error())
  }

  return cortina(config)
    .catch((err) => {
      assert.equal(typeof err, typeof new Error())
      assert.end()
    })
})

test('uses redis cache', (assert) => {
  const config = createConfig()
  const cache = {}

  let calledGet = false
  let calledSet = false

  request.get = function (url) {
    return Promise.resolve(url)
  }

  config.redis = {
    hgetallAsync: function (key) {
      calledGet = true
      return Promise.resolve(cache[key])
    },

    hmsetAsync: function (key, value) {
      calledSet = true
      cache[key] = value
      return Promise.resolve(value)
    },

    expireAsync: function (value) {
      return Promise.resolve(value)
    }
  }

  return cortina(config).then((blocks) => {
    _assertBlocks(assert, blocks)
    assert.equal(calledGet, true)
    assert.equal(calledSet, true)
    assert.end()
  }).catch((err) => {
    assert.error(err, 'Should not yield errors.')
    assert.end()
  })
})

test('falls back to api if redis fails', (assert) => {
  const config = createConfig()
  let calledGet = false

  request.get = function (url) {
    return Promise.resolve(url)
  }

  config.redis = {
    hgetallAsync: function () {
      let error = new Error('Connection refused')
      error.code = 'ECONNREFUSED'
      calledGet = true
      return Promise.reject(error)
    }
  }

  return cortina(config)
    .then((blocks) => {
      _assertBlocks(assert, blocks)
      assert.equal(calledGet, true)
      assert.end()
    })
    .catch((err) => {
      assert.error(err, 'Connection error should be handled.')
      assert.end()
    })
})
