# @kth/cortina-block

This package exports:

- cortinaMiddleware - Express middleware to fectch cortina blocks and store them in res.locals.blocks (optional resis cache)
- cortina - function that fetches cortina blocks (optional redis cache). Used by cortinaMiddleware.
- prepare - function for formatting fetched cortina blocks, e.g. site name and locale link text. Used by cortinaMiddleware

## Installation

```bash
npm install @kth/cortina-block
```

## Usage

```javascript
import { cortinaMiddleware } from '@kth/cortina-block'
```

apply middleware

```javascript
server.use(
  '',
  cortinaMiddleware(
    {
      blockApiUrl,
      blockVersion,
      siteName,
      localeText,
      resourceUrl,
      blocksConfig,
    },
    redisConfig
  )
)
```

Default blocks that will be fetched can be found in config.ts. If you want to fetch other blocks or override the id of the default blocks, provide the optional blocksConfig:

```javascript
const blocksConfig = {
  anotherBlock: 'id',
}
```

## Options

- `blockApiUrl` is required. Should point to the Cortina block API endpoint.
- `headers` is optional, pass headers used when fetching Cortina blocks.
- `version` is optional, defaults to `head`. Change if needed.
- `language` is optional, defaults to `en`.
- `redisKey` is optional, defaults to `CortinaBlock_`. Used as a prefix
  for the Redis cache. The `language` setting will be appended.
- `redisExpire` is optional, defaults to `600` (10 minutes). Sets
  expiration time in seconds for blocks stored in Redis.
- `redis` is optional. Set to a Redis client instance when you want to
  enable Redis caching. Basically requires an object with `get` and
  `set` functions.
- `blocks` is optional. It's a plain object containing Cortina block IDs. The
  following IDs are default and can be overridden.

  - `title` defaults to `1.260060`.
  - `megaMenu` defaults to `1.855134`.
  - `secondaryMenu` defaults to `1.865038`.
  - `image` defaults to `1.77257`.
  - `footer` defaults to `1.202278`.
  - `search` defaults to `1.77262`.
  - `language` optional object with language block IDs.
    - `en` defaults to `1.77273`.
    - `sv` defaults to `1.272446`.
  - `klaroConfig` defaults to `1.1137647`.
  - `matomoAnalytics` defaults to `1.714097`.

  You can also add application specific blocks to the options obejct like this:

  ```javascript
  addBlocks: {
    placesSearch: '1.672888'
  }
  ```

### Returned blocks

```json

title: "\n\n\n  <h1 class=\"bloc…logy</a>\n  </h1>\n\n\n",
megaMenu: "\n\n\n\n  <nav class=\"b…\n     </nav>\n\n  \n\n",
secondaryMenu: "\n\n\n  <div class=\"blo…   </ul>\n  </div>\n\n\n",
image: "\n\n\n  <figure class=\"…    \n  </figure>\n\n\n",
footer: "\n\n\n  <div class=\"blo…  </div>\n  </div>\n\n\n",
search: "\n\n\n  <div class=\"blo…aded=!0);</script>\n\n\n",
language: "\n\n\n  <a class=\"block…KTH på svenska</a>\n\n\n",
analytics: "\n\n\n  \n    <!-- conte…r\n};</script>\n  \n\n\n",
gtmAnalytics: "\n\n\n  <!-- Begin JavaS…entId-1_714097 -->\n\n\n",
gtmNoscript: "\n\n\n  <!-- Begin HTML …entId-1_714099 -->\n\n\n"
```
