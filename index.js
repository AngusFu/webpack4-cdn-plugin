const path = require('path')
const { parse, format } = require('url')
const assert = require('assert')
const chalk = require('chalk')
const { RawSource } = require('webpack-sources')
const { extname, dirname, isAbsolute, join: joinPath } = path

const stripHashOrQuery = path => parse(path).pathname
const getQueryAndHash = path => {
  const { search, hash } = parse(path)
  return format({ search, hash })
}

/**
 * `new RegExp` made easier
 * @param {RegExp} re       regular expression
 * @param {String} replaced simple string in `re`, for example
 * @param {String} replacer regular expression part that is more complex
 */
const quickRegExpr = function(re, replaced, replacer) {
  const code = `return ${re.toString()}`.replace(replaced, replacer)
  // eslint-disable-next-line
  return Function(code)()
}

module.exports = class AssetCDNManifestPlugin {
  /**
   * hmm, let variable names describe themselves
   *
   * @param {Function} options.uploadContent
   * @param {Boolean}  options.keepLocalFiles
   * @param {Boolean}  options.keepSourcemaps
   * @param {Boolean}  options.backupHTMLFiles
   * @param {String|Boolean}  options.manifestFilename
   * @param {String} options.assetMappingVariable
   */
  constructor(options) {
    const {
      uploadContent,
      keepLocalFiles,
      keepSourcemaps,
      backupHTMLFiles,
      manifestFilename,
      assetMappingVariable: variableName
    } = options || {}

    assert(
      typeof uploadContent === 'function',
      '`options.uploadContent` is not a function'
    )

    this.pluginName = 'asset-cdn-manifest-plugin'
    this.assetsMap = new Map()

    this.uploadContent = uploadContent
    this.manifestFilename = manifestFilename
    this.keepSourcemaps = Boolean(keepSourcemaps)
    this.keepLocalFiles = Boolean(keepLocalFiles)
    this.backupHTMLFiles = Boolean(backupHTMLFiles)

    const isValidName = typeof variableName === 'string'
    const name = (isValidName && variableName) || 'webpackAssetMappings'
    this.assetMappingVariable = encodeURIComponent(name)

    this.entryFeature = '// webpackBootstrap'
    this.entryFeatureMarker = '__webpackBootstrap__=1'
  }

  /**
   * replace `url()` in CSS using assets map
   * @param {Array<String>} cssFiles list of css filenames
   * @param {Object} compilation webpack compilation
   */
  replaceCSSURLs(cssFiles, compilation) {
    // SEE https://www.regextester.com/106463
    const re = /url\((?!['"]?(?:data:|https?:|\/\/))(['"]?)([^'")]*)\1\)/g
    const assets = compilation.assets
    const { publicPath } = compilation.mainTemplate.outputOptions

    for (let file of cssFiles) {
      let changed = false
      let content = assets[file].source().toString()

      // TODO
      // path matching is still error-prone
      // errors could happen in an unexpected way
      content = content.replace(re, (match, quote, path) => {
        let media = path
        const extra = getQueryAndHash(path)

        // publicPath is '/'
        if (isAbsolute(path)) {
          media = path.replace(RegExp(`^${publicPath}`), '')
        } else if (/^[.]{1,2}\//.test(path)) {
          // real absolute path
          media = joinPath(dirname(file), path)
        }

        // possible chars like `#` `?`
        const url = this.assetsMap.get(stripHashOrQuery(media))

        if (!url) {
          console.log(
            chalk.yellow(
              chalk.black.bgYellow('[Warning]') +
                ' Unexpected Result.\n' +
                `We could not found the importing asset. Details:\n` +
                `File path : ${file}\n` +
                `Asset path: ${path}\n`
            )
          )
          return match
        }

        changed = true
        return match.replace(path, url + extra)
      })

      if (changed) {
        assets[file].source = () => content
      }
    }
  }

  /**
   * injects asset manifest into entrypoint JavaScript files
   *
   * @param {String} file        file path
   * @param {Object} compilation webpack compilation
   * @returns {Object} webpack asset object whose `.source` method could have been overridden
   */
  tryInjectManifest(file, compilation) {
    const asset = compilation.assets[file]
    assert(asset, `${file} does not exists`)

    // only replace JavaScript files
    if (getExtname(file) !== 'js') {
      return asset
    }

    let source = asset.source().toString()
    const { entryFeatureMarker, assetManifest } = this
    // inject manifest
    if (assetManifest && source.includes(entryFeatureMarker)) {
      source = source.replace(entryFeatureMarker, `${assetManifest}`)
      asset.source = () => source
    }

    return asset
  }

  /**
   * upload file using the function in user option,
   * program would terminate if any error is caught
   *
   * @param {String} file    file name
   * @param {*} compilation  webpack compilation object
   * @returns {String|never}
   */
  async upload(file, compilation) {
    try {
      const asset = this.tryInjectManifest(file, compilation)
      const url = await this.uploadContent({
        file,
        content: asset.source(),
        extname: getExtname(file)
      })

      // we took falsy value as an signal that we should
      // keep the file as it is.
      if (!url) {
        return file
      }

      // ensure that we get a valid URL
      assert(/^(https?:)?\/\//.test(url), `Invalid url: ${url}`)

      // delete asset according to user option
      if (!this.keepLocalFiles) {
        delete compilation.assets[file]
      }
      this.assetsMap.set(file, url)
      return url
    } catch (e) {
      console.log(
        chalk.red(chalk.black.bgRed('[Error]') + ' Uploading failed: \n' + file)
      )
      console.log(chalk.red(e.toString()))
      return file
    }
  }

  /**
   * Webpack plugin interface
   */
  apply(compiler) {
    const env = process.env.NODE_ENV || compiler.options.mode
    if (!process.env.VS_DEBUG && env !== 'production') {
      console.log(
        chalk.yellow(
          chalk.black.bgYellow('[Warning]') +
            ' webpack4-cdn-plugin only works under ' +
            chalk.black.bgYellow('production') +
            ' mode.'
        )
      )
      return
    }

    compiler.hooks.thisCompilation.tap(this.pluginName, compilation => {
      const outputOptions = compilation.mainTemplate.outputOptions
      const publicPath = outputOptions.publicPath || ''
      assert(
        !publicPath || publicPath === '/',
        `Error: do not set \`ouput.publicPath\`: ${publicPath}`
      )

      // set default publicPath
      outputOptions.publicPath = publicPath
    })

    compiler.hooks.compilation.tap(this.pluginName, compilation => {
      // SEE https://github.com/webpack/webpack/blob/master/lib/TemplatedPathPlugin.js
      const assetPathHook = compilation.mainTemplate.hooks.assetPath
      const assertMsg =
        'Unexpected Error in compilation.mainTemplate.hooks.assetPath'
      assetPathHook.tap(this.pluginName, (path, data) => {
        const taps = assetPathHook.taps.filter(
          tap => tap.name !== this.pluginName
        )
        assert(
          taps.length > 0,
          `${assertMsg}: please file an issue to the author.`
        )

        const str = String(taps[0].fn(path, data)).trim()
        assert(
          /\n/.test(str) === false,
          `${assertMsg}: asset path shoud not contain any line breaker ——\n ${str}`
        )
        return str
      })

      // SEE https://webpack.js.org/api/compilation-hooks/#optimizechunkassets
      const optimizeChunkAssetsHook = compilation.hooks.optimizeChunkAssets
      const onOptimizeChunkAsset = this.onOptimizeChunkAsset.bind(
        this,
        compilation
      )
      optimizeChunkAssetsHook.tapAsync(this.pluginName, onOptimizeChunkAsset)
    })

    compiler.hooks.emit.tapAsync(this.pluginName, this.onEmit.bind(this))
  }

  async onOptimizeChunkAsset(compilation, chunks, callback) {
    const { requireFn } = compilation.mainTemplate
    const { entryFeature, entryFeatureMarker } = this
    const regexp = re => quickRegExpr(re, '__webpack_require__', requireFn)
    const rePublicPathAssign = regexp(/__webpack_require__\.p\s*=\s*[^\n]+/g)
    // !!! ASSUMPTION
    // assume that the whole expression is in one line
    // for public path concatenations
    const reWebapckRequireAsset = regexp(
      /__webpack_require__\.p\s*\+\s*([^\n;]+)/g
    )
    const files = chunks.reduce((acc, chunk) => acc.concat(chunk.files), [])

    files.forEach(file => {
      // only deal with JavaScript files
      if (file.endsWith('.js') === false) {
        return
      }

      let changed = false
      let source = compilation.assets[file].source().toString()

      if (source.includes(entryFeature)) {
        // entry marker
        source = source.replace(entryFeature, entryFeatureMarker)
        // drop public path to empty string
        source = source.replace(rePublicPathAssign, match => `/* ${match} */`)
        changed = true
      }

      // rename asset paths
      if (reWebapckRequireAsset.test(source)) {
        source = source.replace(reWebapckRequireAsset, (m, g1) => {
          return `/* ${m.trim()} */ window["${
            this.assetMappingVariable
          }"].find(${g1});\n`
        })
        changed = true
      }

      if (changed) {
        compilation.assets[file] = new RawSource(source)
      }
    })

    callback()
  }

  async onEmit(compilation, done) {
    const assetsMap = this.assetsMap
    const uploadFile = file => this.upload(file, compilation)
    const publicPath = compilation.mainTemplate.outputOptions.publicPath
    const chunkGroups = compilation.chunkGroups

    // ignore sourcemaps
    const isNotSourceMap = file => !file.endsWith('.map')
    const getFileOfChunkGroups = function(groups) {
      return groups.reduce((acc, g) => acc.concat(g.getFiles()), [])
    }

    const assetFilenames = Object.keys(compilation.assets)
    const cssFilenames = assetFilenames.filter(
      file => getExtname(file) === 'css'
    )
    const htmlFilenames = assetFilenames.filter(
      file => getExtname(file) === 'html'
    )
    const chunkFiles = getFileOfChunkGroups(chunkGroups)
    // assets (html & chunk files excluded)
    const staticAssets = assetFilenames.filter(file => {
      // html/css should be uploaded later
      if (['css', 'html'].includes(getExtname(file))) return false
      // chunk file uploaded later
      if (chunkFiles.includes(file)) return false
      return true
    })

    // Note: ep === entrypoint
    const [epChunksGroups, otherChunkGroups] = toBinaryGroup(
      chunkGroups,
      group => group.isInitial()
    )
    const epFiles = getFileOfChunkGroups(epChunksGroups).filter(isNotSourceMap)
    const otherChunkFiles = getFileOfChunkGroups(otherChunkGroups)
      .filter(isNotSourceMap)
      // epFiles and otherChunkFiles could contain the same files,
      // this may sound impossible, but it did happened,
      // when I was testing DLL with a demo repo from
      // https://github.com/babytutu/webpack-demo/tree/08ef2805882ba06979669ba5e8254c627010e1e2
      .filter(file => epFiles.includes(file) === false)

    // upload static assets and dynamic chunk files first
    // so as to collect file mapping data
    // 1. statics
    await Promise.all(staticAssets.map(uploadFile))

    // replace CSS `url()` references
    // ASUMPTION: CSS files are always in chunks
    this.replaceCSSURLs(cssFilenames, compilation)

    // 2.dynamic chunk files (js/css)
    await Promise.all(otherChunkFiles.map(uploadFile))

    // DO NOT move this line!!!
    const variableName = this.assetMappingVariable
    this.assetManifest = [
      `\n;window["${variableName}"] = ${mapToJSON(assetsMap)};`,
      `\n;window["${variableName}"].find = function (s) {return this[s] || s;};`
    ].join('')

    // upload entry chunk files
    await Promise.all(epFiles.map(uploadFile))

    // now, since all files (except html/sourcemap) are uploaded,
    // we can replace these urls within html files
    const rePublicPath = RegExp(`^${publicPath}`) // ('' or '/')
    const reIgnorePath = /^(?:(https?:)?\/\/)|(?:data:)/
    const reImport = /(?:<(?:link|script|img)[^>]+(?:src|href)\s*=\s*)(['"]?)([^'"\s>]+)\1/g
    const replaceImports = function(source) {
      return source.replace(reImport, (match, quote, path) => {
        if (reIgnorePath.test(path)) return match
        // avoid query strings that may affect the result
        // then strip public path ('' or '/')
        const file = path.split('?')[0].replace(rePublicPath, '')
        const url = assetsMap.get(file)
        return url ? match.replace(path, url) : match
      })
    }

    for (let file of htmlFilenames) {
      const origSource = compilation.assets[file].source
      const html = compilation.assets[file].source().toString()
      const replaced = replaceImports(html)
      compilation.assets[file].source = () => replaced

      // backup html files according to user option
      if (this.backupHTMLFiles) {
        compilation.assets[`${file}.bak`] = {
          ...compilation.assets[file],
          source: origSource
        }
      }
    }

    // remove sourcemaps according to user option
    if (!this.keepSourcemaps) {
      assetFilenames.forEach(file => {
        if (!isNotSourceMap(file)) {
          delete compilation.assets[file]
        }
      })
    }

    // generate manifest file
    if (this.manifestFilename) {
      compilation.assets[this.manifestFilename] = new RawSource(
        mapToJSON(assetsMap)
      )
    }
    done()
  }
}

/**
 * returns file extension, without leading period ('.')
 *
 * @param {String} file filename
 */
function getExtname(file) {
  return extname(file).replace(/^\./, '')
}

/**
 * converts js map into JSON
 *
 * @param {Map} map simple JavaScript Map object
 */
function mapToJSON(map) {
  return JSON.stringify(
    [...map].reduce((o, [k, v]) => Object.assign(o, { [k]: v }), {})
  )
}

/**
 * divide array into to groups
 *
 * @param {Array} arr
 * @param {Function} pred
 */
function toBinaryGroup(arr, pred) {
  const positives = []
  const negatives = []
  for (let item of arr) {
    if (pred(item)) {
      positives.push(item)
    } else {
      negatives.push(item)
    }
  }
  return [positives, negatives]
}
