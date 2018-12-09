# webpack4-cdn-plugin

Upload webpack assets to cdn, allowing to rename/hash assets.

## Important Notes

- This plugin only works with **webpack@4**.

- This plugin only takes effects in **production mode**. (`process.env.NODE_ENV` is set to `production`)

## Install

```
npm install -D webpack4-cdn-plugin

# or
yarn add --dev webpack4-cdn-plugin
```

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

    // a function, which return `Promise<url>`
    // `params.content`: `String | Buffer`
    // `params.extname`: file extension
    // `params.filename`: original filename
    uploadContent ({ content, extname, filename }) {
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
