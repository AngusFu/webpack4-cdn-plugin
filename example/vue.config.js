const WebpackCDNPlugin = require('../index')

const plugin = new WebpackCDNPlugin({
  keepLocalFiles: true,
  keepSourcemaps: true,
  backupHTMLFiles: true,
  manifestFilename: 'manifest.json',
  assetMappingVariable: 'webpackAssetMappings',
  uploadContent ({ file, content, extname }) {
    return require('@q/qcdn').content(content, extname, {
      https: true
    })
    // return `//localhost:8080/${file}`
  }
})

module.exports = {
  assetsDir: 'static',
  productionSourceMap: true,
  configureWebpack: {
    plugins: process.env.NODE_ENV === 'production' ? [plugin] : [],
    optimization: {
      minimize: false
    }
  },
  pages: {
    index: {
      entry: 'src/main.js',
      template: 'public/index.html',
      filename: 'index.html',
      title: 'Index Page',
      chunks: ['chunk-vendors', 'chunk-common', 'index']
    },
    subpage: 'src/subpage.js'
  }
}
