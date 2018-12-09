const WebpackCDNPlugin = require('../index')

const plugin = new WebpackCDNPlugin({
  keepLocalFiles: true,
  keepSourcemaps: true,
  backupHTMLFiles: true,
  manifestFilename: 'manifest.json',
  assetMappingVariable: 'webpackAssetMappings',
  uploadContent ({ file, content, extname }) {
    return `//localhost:8080/${file}`
    // const hash = (Math.random() * 10e8).toString(16).split('.')[1]
    // return Promise.resolve(`https://cdn.example.com/${hash}.${extname}`)
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
