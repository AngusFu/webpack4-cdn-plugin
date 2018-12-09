const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const WebpackCDNPlugin = require('../index')

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  plugins: [
    new HtmlWebpackPlugin(),
    new WebpackCDNPlugin({
      keepLocalFiles: true,
      keepSourcemaps: true,
      backupHTMLFiles: true,
      manifestFilename: 'manifest.json',
      assetMappingVariable: 'webpackAssetMappings',
      uploadContent ({ filename, content, extname }) {
        // return filename
        const hash = (Math.random() * 10e8).toString(16).split('.')[1]
        return Promise.resolve(`https://cdn.example.com/${hash}.${extname}`)
      }
    })
  ]
}
