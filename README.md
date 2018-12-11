# webpack4-cdn-plugin

Upload your webpack-generated assets to CDN, allowing renaming/rehashing.

## Important Notes

- **Node 8+** (which supports `async/await`) is required.

- This plugin only works with **webpack@4**.

- **Do NOT** set `output.publicPath`!

- This plugin only works in **production mode**. (i.e., `process.env.NODE_ENV` is set to `production`)

-  `optimization.minimize: false` is **preferred** if your CDN provider can do minimization works (compressing/uglifying/optimizing).

## Install

```
npm install -D webpack4-cdn-plugin

# or
yarn add --dev webpack4-cdn-plugin
```

## Demo

[Demo](https://github.com/AngusFu/webpack-demo) with Vue and webpack dll plugin.

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
  const cdnPlugin =  new WebpackCDNPlugin({
    // whether to keep generated files (on local fs), default `false`
    keepLocalFiles: false,
    // whether to keep generated sourcemaps, default `false`
    keepSourcemaps: false,
    // whether to backup html files (before replaced), default `false`
    backupHTMLFiles: true,
    // manifest file name (`String | false`)
    manifestFilename: 'manifest.json',
    // global varibale name to manifest object
    assetMappingVariable: 'webpackAssetMappings',

    // a function, which returns `Promise<url>`
    // you can do your compressing works with content
    // `params.content`: `String | Buffer`
    // `params.extname`: file extension
    // `params.file`: original file (with path)
    uploadContent ({ content, extname, file }) {
      /**
       * Return falsy value is to say that you want to keep
       * the file as it is. This usually happens with certain
       * file types that is either not supported by your CDN
       * provider, or that must be at the same server/origin
       * with your HTML files (for example, files like `.wasm`
       * that should be loaded by `fetch` or `XMLHttpRequest`).
       *
       * !!! Note
       * Be CAREFUL with media resources (especially images).
       * When you are using an image in your stylesheets, but
       * choose to not upload that that image, this can cause
       * a `404 (Not Found)` ERROR!
       */
      if (['ico', 'txt', 'wasm'].includes(extname)) {
        return false
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
