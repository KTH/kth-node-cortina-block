# @kth/cortina-block

This package exposes an express middleware, that fetches som predefined blocks from Cortina CMS.  
The blocks are then stored in `res.locals.blocks`, for use in Handlebars or similar.  
Blocks can optionaly be cached in Redis.

## Installation

```bash
npm install @kth/cortina-block
```

## Usage

```typescript
import { cortinaMiddleware } from '@kth/cortina-block'
```

apply middleware

```typescript
server.use(
  '',
  cortinaMiddleware({
    blockApiUrl,
    blocksConfig,
    redisConfig,
  })
)
```

Default blocks that will be fetched can be found in config.ts. If you want to fetch other blocks or override the id of the default blocks, provide the optional `blocksConfig`.

## Options

- `blockApiUrl` is required. Should point to the Cortina block API endpoint.
- `redisConfig` is optional. An object parsed from `kth-node-configuration`, containing `host` and `port`. If provided, blocks will be cached in redis.
- `redisKey` is optional. Use unique keys of multiple apps share the same redis.
- `supportedLanguages` is optional. If app only uses a subset of the supported languages. Default is `['sv', 'en']`.
- `blocksConfig` is optional. It's a plain object containing Cortina block IDs. It can be used both to replace existing id's, and to add new blocks.
  ```typescript
  const blocksConfig = {
    footer: '1.123456', // Replaces existing block
    studentMegaMenu: '1.1066510', // Adds a new block
  }
  ```

## Changes after style 10

Blocks **title**, **image** and **secondaryMenu** are no longer used by the apps.  
That also means that a bunch of config is no longer needed.

## Upgrade from @kth/cortina-block 6

- Config **headers** is no longer used.
- Config **localeText** is no longer used.
- Config **resourceUrl** is no longer used.
- Config **siteName** is no longer used.
- Config **useStyle10** is no longer used.

## Upgrade from wrapper in @kth/kth-node-web-common

- Config **addBlocks** has been renamed to **blocksConfig**.
- Config **blockUrl** has been renamed to **blockApiUrl**.
- Config **blockVersion** is no longer used.
- Config **globalLink** is no longer used.
- Config **hostUrl** is no longer used.
- Config **proxyPrefixPath** is no longer used.
- Config **useStyle10** is no longer used.

## Returned blocks

All fetched blocks will be avalible on `res.locals.blocks`.

```typescript
{
  megaMenu: "\n\n\n\n  <nav class=\"b…\n     </nav>\n\n  \n\n",
  footer: "\n\n\n  <div class=\"blo…  </div>\n  </div>\n\n\n",
  search: "\n\n\n  <div class=\"blo…aded=!0);</script>\n\n\n",
  etc..
}
```
