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
  entry: './src/index.js',
  output: {
    publicPath: '',
    path: path.join(process.cwd(), 'dist'),
    filename: 'static/js/[name].[contenthash:8].js',
    chunkFilename: 'static/js/[name].[contenthash:8].js'
  },
  plugins: [
    new HtmlWebpackPlugin({
      favicon,
      title: 'webpack-demo',
      template: path.join(process.cwd(), 'index.template.ejs'),
      // take this path carefully
      // this is used in the template
      dll: 'static/dll/vendors.dll.js'
    }),
    new webpack.ids.HashedModuleIdsPlugin(),
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
              name: 'static/img/[name].[contenthash:8].[ext]',
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
        use: ['babel-loader', 'eslint-loader']
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      }
    ]
  },
  resolve: {
    alias: {
      src: path.join(process.cwd(), 'src')
    }
  },
  stats: {
    // Add built modules information
    modules: false
  }
}
