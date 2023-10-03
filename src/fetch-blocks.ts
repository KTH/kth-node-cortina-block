import log from '@kth/log'
import { BlocksConfig, BlocksObject, SupportedLang } from '.'

const fetchBlock = async (url: string, headers: Headers | undefined, blockName: string) => {
  try {
    const res = await fetch(url, { headers })
    if (!res.ok) {
      log.error(`Failed to fetch cortina block at ${url}: ${res.status}`)
      return { blockName, html: '' }
    }
    const html = await res.text()
    return { blockName, html }
  } catch (err) {
    log.error(`WARNING! FAILED TO FETCH ${blockName} ${err}`)
  }
}

// Fetch all Cortina blocks from API.
export const fetchAllBlocks = async (
  blocksConfig: BlocksConfig,
  blockApiUrl: string,
  blockVerion: string,
  lang: SupportedLang,
  headers?: Headers
) => {
  const allblocks: { blockName: string; url: string }[] = []
  for (const blockName in blocksConfig) {
    const blockId = blocksConfig[blockName]
    allblocks.push({ blockName, url: `${blockApiUrl}${blockId}?v=${blockVerion}&l=${lang}` })
  }
  return Promise.all(allblocks.map(block => fetchBlock(block.url, headers, block.blockName)))
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
