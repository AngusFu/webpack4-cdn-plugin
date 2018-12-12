const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const webpack = require('webpack')
const VueLoaderPlugin = require('vue-loader/lib/plugin')

let favicon = path.join(process.cwd(), 'favicon.ico')

if (!require('fs').existsSync(favicon)) {
  favicon = undefined
  console.info('missing favicon')
}

module.exports = {
  entry: {
    app: './src/index.js'
  },
  output: {
    filename: '[name].[contenthash:8].js',
    path: path.join(process.cwd(), 'dist')
  },
  plugins: [
    new HtmlWebpackPlugin({
      favicon,
      title: 'webpack-demo',
      template: path.join(process.cwd(), 'index.template.ejs'),
      dll: 'dll/vendors.dll.js'
    }),
    new webpack.DllReferencePlugin({
      manifest: require('./../dll/vendors-manifest.json')
    }),
    new webpack.optimize.MinChunkSizePlugin({
      // set a rather small number
      // in order to check how/whether webpack4-cdn-plugin works
      // with this demo
      minChunkSize: 50 // Minimum number of characters
    }),
    new VueLoaderPlugin()
  ],
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.(js|vue)$/,
        loader: 'eslint-loader',
        exclude: /node_modules/
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              name: '[path][name].[ext]',
              outputPath: 'assets/',
              limit: 8192
            }
          }
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              name: '[path][name].[ext]',
              outputPath: 'assets/',
              limit: 8192
            }
          }
        ]
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          'babel-loader',
          'eslint-loader'
        ]
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      }
    ]
  },
  resolve: {
    alias: {
      'src': path.join(process.cwd(), 'src')
    }
  },
  stats: {
    // Add built modules information
    modules: false
  }
}
