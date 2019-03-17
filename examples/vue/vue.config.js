const WebpackCDNPlugin = require('../../dist')

const plugin = new WebpackCDNPlugin({
  keepLocalFiles: true,
  keepSourcemaps: false,
  backupHTMLFiles: false,
  manifestFilename: false,
  assetMappingVariable: 'webpackAssetMappings',
  uploadContent({ file, content, extname }) {
    // Test error handling
    if (file.endsWith('.svg') || file.endsWith('.css')) {
      return false
    }
    return `//localhost:8080/${file}`
    // return require('your-cdn-provider').content(content, extname, {
    //   https: true
    // })
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
