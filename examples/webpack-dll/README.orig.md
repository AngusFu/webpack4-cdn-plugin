# 说明
- webpack4 demo，加入了常用loader，eslint，babel，用vue做了个例子
- css文件独立的插件已经换为mini-css-extract-plugin，使用更简单，但配置项过少，还有待进一步优化
- 根据整个研究过程写了几个小demo，在`demo`目录

## install

```bash
npm i
```

## 常用命令

- 启动服务
`配置webpack/webpack.dev.js`

```bash
npm start
```

- 修复eslint
`eslint配置在.eslintrc.js文件中`

```bash
npm run lint-fix
```

- build
`配置webpack/webpack.prod.js`

```bash
npm run build
```

## 附加配置

- babel
- eslint
- postcss
- stylus
- vue
- vue-router

## 目录
```bash
├──  bin                           脚本统一管理
├──  demo                          demo目录，每个文件夹中都有步骤的说明
│     ├──  step1                   从头开始
│     ├──  step2                   附件的引入（Asset Management）
│     ├──  step3                   打包输出（Output Management）
│     ├──  step4                   开发（Development）
│     └──  step5                   完成webpack配置
├──  hooks                         git钩子，postinstall自动拷贝文件到.git/hooks目录
├──  src                           vue目录
│     ├──  assets                  图片，样式等
│     ├──  components              组件
│     ├──  router                  路由
│     ├──  store                   vuex
│     ├──  view                    页面
│     ├──  app.vue                 底层模版
│     ├──  config.js               额外配置信息
│     └──  index.js                开发入口
├──  webpack                       webpack配置信息
│     ├──  webpack.common.js       公共配置
│     ├──  webpack.dev.js          开发模式配置
│     ├──  webpack.dll.js          打包dll配置
│     └──  webpack.prod.js         生产模式配置
├──  .babelrc                      babel配置
├──  .eslintrc.js                  eslint配置
├──  .gitignore                    git忽略文件
├──  favicon.ico                   网站图标
├──  index.template.ejs            页面模版
├──  package-lock.json             依赖包版本锁定文件
├──  package.json                  基础信息
├──  postcss.config.js             postcss配置
└──  README.md                     看看
```

## 结合vue开发

```bash
npm i vue vue-router vuex
npm i vue-loader vue-style-loader vue-template-compiler -D
npm i stylus stylus-loader -D
```

### 设置vue-loader

需要为`.vue`和`.styl`文件增加`loader`设置
vue推荐用单文件模式开发，就是`.vue`文件中包含了`script`和`css`等

webpack.common.js
```js
const VueLoaderPlugin = require('vue-loader/lib/plugin')

module.exports = {
  plugins: [
    new VueLoaderPlugin()
  ],
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
    ]
  }
}
```

开发模式设置样式加载,`vue-loader`升级到15后，会把.vue文件中的css,stylus等拆分出来，加载规则直接和样式的写在一起即可

webpack.dev.js
```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'vue-style-loader',
          'css-loader',
          'postcss-loader',
        ]
      },
      {
        test: /\.styl(us)?$/,
        use: [
          'vue-style-loader',
          'css-loader',
          'postcss-loader',
          'stylus-loader',
        ]
      },
    ]
  },
}
```

生产环境需要抽离并压缩`css`和`stylus`
webpack.prod.js
```js
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin')

module.exports = {
  plugins: [
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: '[name]-[hash:8].css',
      chunkFilename: '[id]-[hash:8].css',
    }),
    new OptimizeCssAssetsPlugin(),
  ],
  module: {
    rules: [{
        test: /\.css$/,
        use: [
          'vue-style-loader',
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader'
        ],
      },
      {
        test: /\.styl(us)?$/,
        use: [
          'vue-style-loader',
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
          'stylus-loader'
        ],
      },
    ],
  },
}
```

### 增加eslint插件
因为eslint出5了，而`eslint-plugin-vue`正式版还未出，为了保持版本一致性，安装了beta版本，不能忍受安装时的版本校验不通过warning

```bash
npm i eslint-plugin-vue@next -D
```

更新eslint规则
.eslintrc.js
```js
module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  parserOptions: {
    parser: 'babel-eslint',
    ecmaVersion: 6,
  },
  extends: [
    'plugin:vue/essential',
    'eslint:recommended'
  ],
  plugins: [
    'vue',
  ],
  // add your custom rules here
  rules: {
  },
}
```

配置强制校验，能够实时验证代码准确性

webpack.common.js

```js
module.exports = {
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.(js|vue)$/,
        loader: 'eslint-loader',
        exclude: /node_modules/
      },
    ]
  }
}
```


### 增加babel插件

```bash
npm i @babel/core @babel/preset-env @babel/plugin-syntax-dynamic-import -D
```

更新babel配置
.babelrc
```json
{
  "presets": [
    "@babel/preset-env"
  ],
  "plugins": [
    "@babel/syntax-dynamic-import"
  ]
}
```

### 配置postcss

为了少写代码，又能兼容各种奇葩浏览器，`postcss`是常规操作，除了在样式加载中增加`postcss-loader`,还需要写一个单独的配置文件,也就是加几个plugins的事情，命名规则有点向babel靠拢，人家不用next，用了env，这边也跟上了

postcss.config.js
```js
module.exports = {
  plugins: {
    'postcss-import': {},
    'postcss-preset-env': {},
  },
}
```


## webpack DllPlugin
分离第三方库，加速构建速度，主要是把一些不经常更新版本，或者说不太敢更新版本的必要依赖打个固定包，不用每次都重新编译，开发和线上都能更高效，一般来说，会把vue全家桶打个dll，就这3位已经100k了。。。

需要新增一个`webpack.dll.js`文件用于打包dll文件

```js
const webpack = require('webpack')
const path = require('path')

const vendors = [
  'vue',
  'vue-router',
  'vuex'
]

module.exports = {
  mode: 'production',
  context: process.cwd(),
  output: {
    path: path.join(process.cwd(), 'dll'),
    filename: '[name]_[hash:8].dll.js',
    library: '[name]_[hash:8]',
  },
  entry: {
    vendors
  },
  plugins: [
    new webpack.DllPlugin({
      name: '[name]_[hash:8]',
      path: path.join(process.cwd(), 'dll', '[name]-manifest.json'),
    })
  ]
}
```

在基础配置中新增配置

webpack.common.js
```js
+   new webpack.DllReferencePlugin({
+     manifest: require('./../dll/vendors-manifest.json'),
+   }),
```

在生产环境中，需要把`dll`文件夹拷贝到打包目录`dist`中

webpack.prod.js
```js
+  const CopyWebpackPlugin = require('copy-webpack-plugin')
+    new CopyWebpackPlugin([{
+      // copy dll to dist
+      from: 'dll/*',
+    }])
```

在模版中，还要插入这个打包出来的dll文件
```html
<script src="<%= webpackConfig.output.publicPath + htmlWebpackPlugin.options.dll %>" charset="utf-8"></script>
```



运行开发`npm start`或打包生产环境代码`npm run build`前，都要先编译dll文件`npm run dll`，如果内容没有变化，dll文件不会重新打包

package.json
```json
  "scripts": {
    "start": "node bin start",
    "dll": "node bin dll",
    "fix": "node bin fix",
    "build": "node bin build"
  },
```