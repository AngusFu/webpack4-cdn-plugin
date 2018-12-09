const assert = require('assert')
const { extname, join: joinPath } = require('path')
const RawSource = require('webpack-sources').RawSource

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
  constructor (options) {
    const {
      uploadContent,
      keepLocalFiles,
      keepSourcemaps,
      backupHTMLFiles,
      manifestFilename,
      assetMappingVariable
    } = options || {}

    assert(typeof uploadContent === 'function', '`options.uploadContent` is not a function')

    this.pluginName = 'asset-cdn-manifest-plugin'
    this.assetsMap = new Map()

    this.uploadContent = uploadContent
    this.manifestFilename = manifestFilename
    this.keepSourcemaps = Boolean(keepSourcemaps)
    this.keepLocalFiles = Boolean(keepLocalFiles)
    this.backupHTMLFiles = Boolean(backupHTMLFiles)
    this.assetMappingVariable = String(assetMappingVariable || 'webpackAssetMappings')
  }

  /**
   * replaces webpack public paths in JavaScript files,
   * and injects asset manifest into entrypoint JavaScript files
   *
   * @param {String} file        file path
   * @param {Object} compilation webpack compilation
   * @returns {Object} webpack asset object whose `.source` method could have been overridden
   */
  replaceFileContents (file, compilation) {
    const asset = compilation.assets[file]
    assert(asset, `${file} does not exists`)

    if (getExtname(file) !== 'js') return asset

    const regexp = function (re) {
      const { requireFn } = compilation.mainTemplate
      const code = `return ${re.toString()}`.replace('__webpack_require__', requireFn)
      // eslint-disable-next-line
      return Function(code)()
    }

    let source = asset.source()
    let changed = false

    // use `// webpackBootstrap` as entry chunk's feature
    const entryFeature = '// webpackBootstrap'
    if (source.includes(entryFeature)) {
      // public path assigning is no longer necessary
      // `__webpack_require__.p = "/static/"`
      const reWebpackRequireAssignment = regexp(
        /__webpack_require__\.p\s*=\s*[^\n]+/g
      )

      // for public path concatenations that are not followed by quotes,
      // just remove them
      // expample 1: `__webpack_require__.p \s*=\s*[]+ href`
      // expample 2: `__webpack_require__.p \s*=\s*[]+ ({...`
      const reWebpackRequireConcatenation = regexp(
        /(__webpack_require__\.p\s*\+\s*)([^"\s][^\n]+)/g
      )

      changed = true
      source = source
        // inject manifest
        .replace(entryFeature, `${entryFeature}\n${this.assetManifest}\n`)
        // drop public path to empty string
        .replace(reWebpackRequireAssignment, match => `/* ${match} */`)
        // drop public path concatenation
        .replace(reWebpackRequireConcatenation, (_, g1, g2) => `/* ${g1} */ ${g2}\n`)
    }

    // public path concatenation followed by quote (for now, ONLY double quote)
    // example: `__webpack_require__.p + "path/to/assets"`
    const reWebapckRequireAsset = regexp(/__webpack_require__.p\s*\+\s*"([^"]+)"/g)
    if (reWebapckRequireAsset.test(source)) {
      changed = true
      source = source.replace(reWebapckRequireAsset, (m, g1) => {
        return `/* ${m} */ window.${this.assetMappingVariable}["${g1}"]`
      })
    }

    if (changed) {
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
  async upload (file, compilation) {
    try {
      const asset = this.replaceFileContents(file, compilation)
      const url = await this.uploadContent({
        file,
        content: asset.source(),
        extname: getExtname(file)
      })
      // delete asset according to user option
      if (!this.keepLocalFiles) {
        delete compilation.assets[file]
      }
      this.assetsMap.set(file, url)
      return url
    } catch (e) {
      // TODO
      console.error(e)
      process.exit()
    }
  }

  /**
   * Webpack plugin interface
   */
  apply (compiler) {
    if (!process.env.VS_DEBUG && process.env.NODE_ENV !== 'production') {
      console.warn(
        'This plugin is meant to be used only under production mode.'
      )
      return
    }

    compiler.hooks.compilation.tap(this.pluginName, compilation => {
      const assetPathHook = compilation.mainTemplate.hooks.assetPath
      assetPathHook.tap(this.pluginName, (path, data) => {
        // SEE https://github.com/webpack/webpack/blob/master/lib/TemplatedPathPlugin.js
        const taps = assetPathHook.taps.filter(tap => tap.name !== this.pluginName)
        assert(taps.length > 0, 'Unexpected Error: please file an issue to the author.')

        const str = taps[0].fn(path, data)

        // change chunk mapping rules here
        // `"js" + ({"chunck-name": ...`
        if (str && /\(\{/.test(str)) {
          // eslint-disable-next-line
          return `window.${this.assetMappingVariable}[${str}]`
        }
        return str
      })
    })

    compiler.hooks.emit.tapAsync(this.pluginName, this.onEmit.bind(this))
  }

  async onEmit (compilation, done) {
    const assetsMap = this.assetsMap
    const chunkGroups = compilation.chunkGroups
    const uploadFile = file => this.upload(file, compilation)
    // ignore sourcemaps
    const isNotSourceMap = file => !file.endsWith('.map')
    const getFileOfChunkGroups = function (groups) {
      return groups.reduce((acc, g) => acc.concat(g.getFiles()), [])
    }

    const assetFilenames = Object.keys(compilation.assets)
    const htmlFilenames = assetFilenames
      .filter(file => getExtname(file) === 'html')

    // all chunk files
    const chunkFiles = getFileOfChunkGroups(chunkGroups)
    // assets (html & chunk files excluded)
    const staticAssets = assetFilenames.filter(file => {
      if (getExtname(file) === 'html' || chunkFiles.includes(file)) {
        return false
      }
      return true
    })

    // Note: ep === entrypoint
    const [
      epChunksGroups,
      otherChunkGroups
    ] = toBinaryGroup(chunkGroups, group => group.isInitial())
    const epFiles = getFileOfChunkGroups(epChunksGroups).filter(isNotSourceMap)
    const otherChunkFiles = getFileOfChunkGroups(otherChunkGroups).filter(isNotSourceMap)

    // upload static assets and dynamic chunks first
    // so as to collect file mapping data
    const firstBatchFiles = staticAssets.concat(otherChunkFiles)
    await Promise.all(firstBatchFiles.map(uploadFile))

    // DO NOT move this line!!!
    this.assetManifest = `window.${this.assetMappingVariable} = ${mapToJSON(assetsMap)}`

    // upload entry chunk files
    await Promise.all(epFiles.map(uploadFile))

    // now, since all files (except html/sourcemap) are uploaded,
    // we can replace these urls within html files
    const { publicPath = '' } = compilation.mainTemplate.outputOptions
    const replacers = Array.from(assetsMap.entries()).map(([file, url]) => {
      const path = publicPath === '' ? file : joinPath(publicPath, file)
      const re = new RegExp(path.replace(/\./g, '\\.'), 'g')
      return s => s.replace(re, url)
    })
    for (let file of htmlFilenames) {
      const orirgSource = compilation.assets[file].source
      const html = compilation.assets[file].source()
      const replaced = replacers.reduce((s, fn) => fn(s), html)
      compilation.assets[file].source = () => replaced

      // backup html files according to user option
      if (this.backupHTMLFiles) {
        compilation.assets[`${file}.bak`] = {
          ...compilation.assets[file],
          source: orirgSource
        }
      }
    }

    // rmeove sourcemaps according to user option
    if (!this.keepSourcemaps) {
      assetFilenames.forEach(file => {
        if (!isNotSourceMap(file)) {
          delete compilation.assets[file]
        }
      })
    }

    // generate manifest file
    if (this.manifestFilename) {
      compilation.assets[this.manifestFilename] = new RawSource(mapToJSON(assetsMap))
    }
    done()
  }
}

/**
 * returns file extension, without leading period ('.')
 *
 * @param {String} file filename
 */
function getExtname (file) {
  return extname(file).replace(/^\./, '')
}

/**
 * converts js map into JSON
 *
 * @param {Map} map simple JavaScript Map object
 */
function mapToJSON (map) {
  return JSON.stringify(
    [...map].reduce((o, [k, v]) => Object.assign(o, { [k]: v }), {}),
    null,
    2
  )
}

/**
 * divide array into to groups
 *
 * @param {Array} arr
 * @param {Function} pred
 */
function toBinaryGroup (arr, pred) {
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
