const webpackConfig = require('./webpack/webpack.prod')
const Webpack4CDNPlugin = require('../../index')

module.exports = webpackConfig

if (process.env.NODE_ENV === 'production') {
  const writeFileP = require('util').promisify(require('fs').writeFile)
  const { basename, join } = require('path')
  require('mkdirp').sync(join(__dirname, 'output'))

  const plugin = new Webpack4CDNPlugin({
    // whether to keep generated files (on local fs), default `false`
    keepLocalFiles: false,
    // whether to keep generated sourcemaps, default `false`
    keepSourcemaps: false,
    // whether to backup html files (before replaced), default `false`
    backupHTMLFiles: false,
    // manifest file name (`String | false`)
    manifestFilename: 'manifest.json',
    // global varibale name to manifest object
    assetMappingVariable: 'webpackAssetMappings',

    uploadContent ({ content, extname, file }) {
      const name = basename(file)
      const path = join(__dirname, 'output', name)
      return writeFileP(path, content).then(() => {
        return `http://localhost:1234/${name}`
      })
    }
  })
  module.exports.plugins.push(plugin)
}
