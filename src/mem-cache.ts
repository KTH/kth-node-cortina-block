const STORE = {}

const set = (name, value, ttl_seconds) => {
  STORE[name] = { value, expires: Date.now() + ttl_seconds * 1000 }
}

const get = name => {
  if (!STORE[name]) {
    return undefined
  }

  const { expires, value } = STORE[name]

  if (Date.now() > expires) {
    return undefined
  }

  return value
}

export const memoryCache = { get, set }

module.exports = { memoryCache: { get, set } }
