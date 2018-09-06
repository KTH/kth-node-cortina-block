# kth-cortina-block

Fetch Cortina blocks and optionally cache using Redis.

## Installation

```bash
npm install --save https://github.com/KTH/kth-node-cortina-block.git#v1.0.0
```

## Usage

```javascript
const cortina = require('kth-node-cortina-block');
const options = { /* see below for options */ };

// somewhere else, usually in an express controller

cortina(options).then(function(blocks) {

  // blocks should be used in the layout/view
  // each block contains HTML,
  // meaning it should not be escaped in the view

  // blocks is a plain object with the following properties:
  // title, image, footer, search, language, analytics

  res.render('page', { blocks: blocks });

}).catch(function(err) {

  log.error({ err: err }, 'failed to get cortina blocks');

  // either display the error:

  res.render('error', { err: err });

  // or render page without blocks:

  res.render('page', { blocks: {} });

});
```

## Options

- `url` is required. Should point to the Cortina block API endpoint.
- `headers` is optional, pass headers used when fetching Cortina blocks.
- `debug` is optional, defaults to `false`. Enables logging of Redis
  errors.
- `version` is optional, defaults to `head`. Change if needed.
- `language` is optional, defaults to `en_UK`.
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
  - `image` defaults to `1.77257`.
  - `footer` defaults to `1.202278`.
  - `search` defaults to `1.77262`.
  - `language` optional object with language block IDs.
    - `en_UK` defaults to `1.77273`.
    - `sv_SE` defaults to `1.272446`._
  - `analytics` defaults to `1.464751`.
  - `gtmAnalytics` defaults to `1.714097`.
  - `gtmNoscript` defaults to `1.714099`.
  
  You can also add application specific blocks to the options obejct like this:
  
  ```javascript
  blocks: {
    placesSearch: '1.672888'
  }
  ```
  
## Run tests

Clone this repository, run `npm install` followed by `npm test`.

## New version

Run the `npm version <version>` command. See https://docs.npmjs.com/cli/version
for more details.

## Prepare helper

A helper to modify paths in the blocks HTML for logo, site link/name,
and locale link. The resulting blocks object should not be cached (i.e.
called this after getting the blocks from the cache/API), because the
locale URL changes with the request URL.

### Usage

```javascript
const cortina = require('kth-cortina-block');

function prepare(blocks, req, config) {
  return cortina.prepare(blocks, {
    urls: {
      request: req.url,
      app: config.full.hostUrl + config.full.proxyPrefixPath.uri
    }
    // more options below
  });
}
```

### Options

- `blocks` is required. You get this from the main call to `cortina`.
- `config` is required. A plain object with the following properties:
  - `siteName` is optional. Set this to override the site link text.
  - `localeText` is optional. Set this to override the locale link text.
  - `urls` is required. A plain object with the following properties:
    - `prod` is optional, defaults to `//www.kth.se`. The production URL.
    - `request` is required. Usually the express `req.url` value.
    - `app` is optional, defaults to an empty string. Usually the
      host URL and the proxy prefix path.
    - `siteUrl` is optional, overides default url on the site name only.
  - `selectors` is optional, defaults to a plain object with the
    following properties:
    - `logo` is optional, defaults to `.imageWrapper img`.
    - `siteName` is optional, defaults to `.siteName a`.
    - `localeLink` is optional, defaults to `.block.link a.localeLink`.
