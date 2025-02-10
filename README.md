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
  cortinaMiddleware({
    blockApiUrl,
    localeText,
    resourceUrl,
    blocksConfig,
    redisConfig,
  })
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
- `blocks` is optional. It's a plain object containing Cortina block IDs. The
  following IDs are default and can be overridden.

  - `megaMenu` defaults to `1.855134`.
  - `secondaryMenu` defaults to `1.865038`.
  - `footer` defaults to `1.202278`.
  - `search` defaults to `1.77262`.
  - `language` optional object with language block IDs.
    - `en` defaults to `1.77273`.
    - `sv` defaults to `1.272446`.
  - `klaroConfig` defaults to `1.1137647`.
  - `matomoAnalytics` defaults to `1.714097`.

- `redisConfig` is optional. An object parsed from `kth-node-configuration`, containing `host` and `port`. If provided, blocks will be cached in redis.

### Returned blocks

```json

megaMenu: "\n\n\n\n  <nav class=\"b…\n     </nav>\n\n  \n\n",
secondaryMenu: "\n\n\n  <div class=\"blo…   </ul>\n  </div>\n\n\n",
footer: "\n\n\n  <div class=\"blo…  </div>\n  </div>\n\n\n",
search: "\n\n\n  <div class=\"blo…aded=!0);</script>\n\n\n",
language: "\n\n\n  <a class=\"block…KTH på svenska</a>\n\n\n",
analytics: "\n\n\n  \n    <!-- conte…r\n};</script>\n  \n\n\n",
gtmAnalytics: "\n\n\n  <!-- Begin JavaS…entId-1_714097 -->\n\n\n",
gtmNoscript: "\n\n\n  <!-- Begin HTML …entId-1_714099 -->\n\n\n"
```
