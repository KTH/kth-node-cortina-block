import { memoryCache } from './mem-cache'

describe('memoryCache', () => {
  beforeAll(() => {
    jest.useFakeTimers()
  })
  afterAll(() => {
    jest.useRealTimers()
  })
  beforeEach(() => {
    jest.setSystemTime(new Date())
    // Clear the STORE by setting expired values on any used keys
    memoryCache.set('testKey1', '', -1)
    memoryCache.set('testKey2', '', -1)
  })

  it('should store and retrieve a value before expiration', () => {
    memoryCache.set('testKey1', 'testValue', 1)
    expect(memoryCache.get('testKey1')).toBe('testValue')
  })

  it('should return undefined for a missing key', () => {
    expect(memoryCache.get('testKey1')).toBeUndefined()
  })

  it('should return undefined for an expired key', () => {
    // Set time to 2025-01-01 10:01:00
    jest.setSystemTime(new Date(2025, 0, 1, 10, 1, 0))
    memoryCache.set('testKey1', 'expireValue', 60)

    // Advance time 2 min to 2025-01-01 10:03:00
    jest.setSystemTime(new Date(2025, 0, 1, 10, 3, 0))
    expect(memoryCache.get('testKey1')).toBeUndefined()
  })

  it('should overwrite existing key with new value and ttl', () => {
    memoryCache.set('testKey1', 'first', 1)
    memoryCache.set('testKey1', 'second', 1)
    expect(memoryCache.get('testKey1')).toBe('second')
  })

  it('should store different values on different keys', () => {
    memoryCache.set('testKey1', 'Value 1', 1)
    memoryCache.set('testKey2', 'Value 2', 1)
    expect(memoryCache.get('testKey1')).toBe('Value 1')
    expect(memoryCache.get('testKey2')).toBe('Value 2')
  })
})
