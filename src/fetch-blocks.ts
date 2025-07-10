import log from '@kth/log'
import { BlocksConfig, BlocksObject, SupportedLang } from '.'
import { memoryCache } from './mem-cache'

const fetchBlock = async (url: string, blockName: string, useMemCache: boolean) => {
  try {
    const lang = url.split('l=')[1]
    const cacheKey = `${blockName}_${lang}`

    const cacheHit = useMemCache ? await memoryCache.get(cacheKey) : undefined
    if (cacheHit) {
      return { blockName, html: cacheHit }
    }

    const res = await fetch(url)

    if (!res.ok) {
      log.error(`Failed to fetch cortina block at ${url}: ${res.status}`)
      return { blockName, html: '' }
    }
    const html = await res.text()

    if (useMemCache) {
      memoryCache.set(cacheKey, html, 600)
    }

    return { blockName, html }
  } catch (err) {
    log.error(`WARNING! FAILED TO FETCH ${blockName} ${err}`)
  }
}

// Fetch all Cortina blocks from API.
export const fetchAllBlocks = async (
  blocksConfig: BlocksConfig,
  blockApiUrl: string,
  lang: SupportedLang,
  memCache: boolean
) => {
  const allblocks: { blockName: string; url: string }[] = []
  for (const blockName in blocksConfig) {
    const blockId = blocksConfig[blockName]
    allblocks.push({ blockName, url: `${blockApiUrl}${blockId}?l=${lang}` })
  }
  return Promise.all(allblocks.map(block => fetchBlock(block.url, block.blockName, memCache)))
    .then(fetchedBlocks => {
      const blocksObject: BlocksObject = {}
      fetchedBlocks.forEach(block => {
        if (block) {
          blocksObject[block.blockName] = block.html
        }
      })
      return blocksObject
    })
    .catch(err => {
      const blockName = err.options ? err.options.uri : 'NO URI FOUND'
      log.error(`WARNING! 
        NO BLOCKS WILL BE LOADED DUE TO ERROR IN ONE OF THE BLOCKS. 
        FIX ALL BROKEN BLOCKS IMMEDIATELY. 
        ATTEMPTED TO LOAD BLOCK: ${blockName}`)
      throw err
    })
}
