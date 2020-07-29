# webpack4-cdn-plugin

[![npm status](https://img.shields.io/npm/v/webpack4-cdn-plugin.svg)](https://www.npmjs.org/package/webpack4-cdn-plugin)

Upload your webpack-generated assets to CDN, allowing renaming/rehashing.

## Requirements & Important Notes

- **Node 8+** (which supports `async/await`) is <del>required</del> recommanded.

- This plugin has NOT been tested on **Windows** platform.

- This plugin supports **webpack@4** ONLY.

## Webpack Configuration

- `process.env.NODE_ENV` OR `options.mode`: this plugin only works in **production mode**.

- `output.publicPath`: we only support `/` or empty string (for simplicity).

- `optimization.minimize`: `false` is **preferred** if your CDN provider can do compressing work.

## Installation

```
npm install -D webpack4-cdn-plugin

# or
yarn add --dev webpack4-cdn-plugin
```

## Demo

- [Vue demo with @vue/cli](./examples/vue)

- [Webpack demo with DllPlugin](./examples/webpack-dll)

## Usage

```js
const WebpackCDNPlugin = require('webpack4-cdn-plugin')

module.exports = {
  // ... other fields
  plugins: [
    // ...other plugins
  ]
}

if (process.env.NODE_ENV === 'production') {
  const cdnPlugin = new WebpackCDNPlugin({
    // whether to keep generated files (on local fs), default: `false`
    keepLocalFiles: false,
    // whether to keep generated sourcemaps, default: `false`
    keepSourcemaps: false,
    // whether to backup html files (before replaced), default: `false`
    backupHTMLFiles: true,
    // manifest file name (`String | false`)
    manifestFilename: 'manifest.json',

    // a function, which returns `Promise<url>`
    // you can do your compressing works with content
    // `params.content`: `String | Buffer`
    // `params.extname`: file extension
    // `params.file`: original file (with path)
    uploadContent({ content, extname, file }) {
      /**
       * Return falsy value means that you want to KEPP the
       * file as it is. This usually happens with certain
       * file types, which may not be supported by your CDN
       * provider, or must be under the same origin with your
       * HTML files(for example, files like `.wasm` that
       * should be loaded by `fetch` or `XMLHttpRequest`).
       *
       * !!! Note !!!
       * Be CAREFUL with media resources (especially images).
       * When you are using an image in your CSS file, while
       * deciding not to upload that it(the image), it CAN lead
       * to an unexpected `404 (Not Found)` ERROR.
       */
      if (['ico', 'txt', 'wasm'].includes(extname)) {
        return false
      }

      // You can also implement your own cache here
      const hash = md5(content)
      if (youCache.has(hash)) {
        return youCache.get(hash)
      }

      return require('your-cdn-provider').uploadContent({
        content: content,
        fileType: getFileType(extname)
      })
      // for testing
      // const hash = (Math.random() ).toString(16).split('.')[1]
      // return Promise.resolve(`https://cdn.example.com/${hash}.${extname}`)
    }
  })

  module.exports.plugins.push(cdnPlugin)
}
```
