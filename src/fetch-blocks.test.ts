import { memoryCache } from './mem-cache'
import { fetchAllBlocks } from './fetch-blocks'
import { BlocksConfig } from './types'

jest.mock('@kth/log')

jest.mock('./mem-cache', () => ({ memoryCache: { get: jest.fn(), set: jest.fn() } }))

const mockFetch = jest.fn()
let originalFetch = global.fetch

const memCacheGet = memoryCache.get as jest.Mock
const memCacheSet = memoryCache.set as jest.Mock

const BLOCK_FROM_CORTINA = '<div>Hello from Cortina!</div>'
const BLOCK_FROM_MEMCACHE = '<div>Hello from memory cache!</div>'

const MOCK_API_URL = 'http://block-api/'

describe('fetch-blocks', () => {
  beforeAll(() => {
    ;(global.fetch as jest.Mock) = mockFetch
  })
  afterAll(() => {
    global.fetch = originalFetch
  })
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      text: () => Promise.resolve(BLOCK_FROM_CORTINA),
      ok: true,
    })
  })

  it('fetches each block from Cortina', async () => {
    const blocksConfig: BlocksConfig = { block1: '1.1234', block2: '2.1234' }

    const result = await fetchAllBlocks(blocksConfig, MOCK_API_URL, 'sv', false)

    expect(result).toEqual({ block1: BLOCK_FROM_CORTINA, block2: BLOCK_FROM_CORTINA })
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('http://block-api/1.1234'))
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('http://block-api/2.1234'))
  })
  it('fetches blocks with swedish language flag', async () => {
    const blocksConfig: BlocksConfig = { block1: '1.1234' }

    await fetchAllBlocks(blocksConfig, MOCK_API_URL, 'sv', false)

    expect(mockFetch).toHaveBeenCalledWith('http://block-api/1.1234?l=sv')
  })
  it('fetches blocks with english language flag', async () => {
    const blocksConfig: BlocksConfig = { block1: '1.1234' }

    await fetchAllBlocks(blocksConfig, MOCK_API_URL, 'en', false)

    expect(mockFetch).toHaveBeenCalledWith('http://block-api/1.1234?l=en')
  })
  it('returns empty object if fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Internal server error'))

    const blocksConfig: BlocksConfig = { block1: '1.1234' }

    const result = await fetchAllBlocks(blocksConfig, MOCK_API_URL, 'sv', false)

    expect(result).toEqual({})
  })
  it('returns empty string for a block that is not OK', async () => {
    mockFetch.mockResolvedValueOnce({
      text: () => Promise.resolve(BLOCK_FROM_CORTINA),
      ok: true,
    })
    mockFetch.mockResolvedValueOnce({
      ok: false,
    })

    const blocksConfig: BlocksConfig = { okBlock: '1.1234', notOkBLock: '2.1234' }

    const result = await fetchAllBlocks(blocksConfig, MOCK_API_URL, 'sv', false)

    expect(result).toEqual({ okBlock: BLOCK_FROM_CORTINA, notOkBLock: '' })
  })

  it('returns block from memoryCache if they exist', async () => {
    memCacheGet.mockReturnValue(BLOCK_FROM_MEMCACHE)

    const blocksConfig: BlocksConfig = { block1: '1.1234' }

    const result = await fetchAllBlocks(blocksConfig, MOCK_API_URL, 'sv', true)

    expect(result).toEqual({ block1: BLOCK_FROM_MEMCACHE })
  })

  it('look for blocks in memoryCache with swedish language key', async () => {
    // memCacheGet.mockReturnValue(BLOCK_FROM_MEMCACHE)

    const blocksConfig: BlocksConfig = { block1: '1.1234' }

    await fetchAllBlocks(blocksConfig, MOCK_API_URL, 'sv', true)

    expect(memCacheGet).toHaveBeenCalledWith('block1_sv')
  })
  it('look for blocks in memoryCache with english language key', async () => {
    // memCacheGet.mockReturnValue(BLOCK_FROM_MEMCACHE)

    const blocksConfig: BlocksConfig = { block1: '1.1234' }

    await fetchAllBlocks(blocksConfig, MOCK_API_URL, 'en', true)

    expect(memCacheGet).toHaveBeenCalledWith('block1_en')
  })
  it('set block in memoryCache if it is in use, and blocks are fetched from Cortina', async () => {
    memCacheGet.mockReturnValue(undefined)

    const blocksConfig: BlocksConfig = { block1: '1.1234' }

    const result = await fetchAllBlocks(blocksConfig, MOCK_API_URL, 'sv', true)

    expect(result).toEqual({ block1: BLOCK_FROM_CORTINA })
    expect(memCacheSet).toHaveBeenCalledWith(expect.any(String), BLOCK_FROM_CORTINA, 600)
  })
  it('set block in memoryCache with swedish language key', async () => {
    memCacheGet.mockReturnValue(undefined)

    const blocksConfig: BlocksConfig = { block1: '1.1234' }

    const result = await fetchAllBlocks(blocksConfig, MOCK_API_URL, 'sv', true)

    expect(result).toEqual({ block1: BLOCK_FROM_CORTINA })
    expect(memCacheSet).toHaveBeenCalledWith('block1_sv', expect.anything(), expect.anything())
  })
  it('set block in memoryCache with english language key', async () => {
    memCacheGet.mockReturnValue(undefined)

    const blocksConfig: BlocksConfig = { block1: '1.1234' }

    const result = await fetchAllBlocks(blocksConfig, MOCK_API_URL, 'en', true)

    expect(result).toEqual({ block1: BLOCK_FROM_CORTINA })
    expect(memCacheSet).toHaveBeenCalledWith('block1_en', expect.anything(), expect.anything())
  })

  it('do not cache a block if API reponse is not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
    })

    const blocksConfig: BlocksConfig = { block1: '1.1234' }

    await fetchAllBlocks(blocksConfig, MOCK_API_URL, 'sv', false)

    expect(memCacheSet).not.toHaveBeenCalled()
  })

  it('do not look for blocks in cache if cache are not used', async () => {
    memCacheGet.mockReturnValue(BLOCK_FROM_MEMCACHE)

    const blocksConfig: BlocksConfig = { block1: '1.1234' }

    await fetchAllBlocks(blocksConfig, MOCK_API_URL, 'sv', false)

    expect(memCacheGet).not.toHaveBeenCalled()
  })
  it('do not set block in memoryCache when blocks are fetched from Cortina, but cache are not used', async () => {
    memCacheGet.mockReturnValue(undefined)

    const blocksConfig: BlocksConfig = { block1: '1.1234' }

    await fetchAllBlocks(blocksConfig, MOCK_API_URL, 'sv', false)

    expect(memCacheSet).not.toHaveBeenCalled()
  })
  it('do not set block in memoryCache if it was already cached', async () => {
    memCacheGet.mockReturnValue(BLOCK_FROM_MEMCACHE)

    const blocksConfig: BlocksConfig = { block1: '1.1234' }

    await fetchAllBlocks(blocksConfig, MOCK_API_URL, 'sv', true)

    expect(memCacheSet).not.toHaveBeenCalled()
  })
})
