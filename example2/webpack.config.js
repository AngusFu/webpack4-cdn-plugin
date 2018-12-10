const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const WebpackCDNPlugin = require('../index')

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
    // DO NOT set publicPath
    // publicPath: '/xxxxx'
  },
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 1
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' }
        ]
      }
    ]
  },
  optimization: {
    minimize: false
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: true
    }),
    new WebpackCDNPlugin({
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
  ]
}
