const webpack = require('webpack')
const path = require('path')

const vendors = ['vue', 'vue-router', 'vuex']

module.exports = {
  mode: 'production',
  context: process.cwd(),
  output: {
    path: path.join(process.cwd(), 'dll'),
    filename: '[name].dll.js',
    library: '__$$[name]_[fullhash]$$__'
  },
  entry: {
    vendors
  },
  plugins: [
    new webpack.ids.HashedModuleIdsPlugin(),
    new webpack.DllPlugin({
      name: '__$$[name]_[fullhash]$$__',
      path: path.join(process.cwd(), 'dll', '[name]-manifest.json')
    })
  ],
  stats: {
    // Add built modules information
    modules: false
  }
}
