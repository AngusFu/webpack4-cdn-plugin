import assert from 'assert'
import { parse } from 'url'
import { dirname, isAbsolute, join as joinPath } from 'path'

import chalk from 'chalk'
import { RawSource } from 'webpack-sources'
import { Compiler, compilation } from 'webpack'

import {
  Configuration as IConfiguration,
  FileInfo as IFileInfo,
  standardize
} from './configuration'
import {
  quickRegExpr,
  getExtname,
  group,
  mapToJSON,
  getQueryAndHash
} from './utils'

type Chunk = compilation.Chunk
type Compilation = compilation.Compilation

// hack
type ChunkGroup = compilation.ChunkGroup & {
  getFiles: () => string[]
}
// hack
interface MainTemplate extends Compilation {
  mainTemplate: Compilation
  requireFn: string
}

export type FileInfo = IFileInfo
export type Configuration = IConfiguration

export default class Webpack4CDNPlugin {
  private config: Required<Configuration>
  private entryFeature = '// webpackBootstrap'
  private entryFeatureMarker = '__webpackBootstrap__=1'

  private assetsMap = new Map()
  private assetManifest: string = ''
  public pluginName = 'asset-cdn-manifest-plugin'

  constructor(config: Configuration) {
    this.config = standardize(config)
  }

  /** Webpack plugin interface */
  public apply(compiler: Compiler) {
    const env = process.env.NODE_ENV || compiler.options.mode

    // only works on productions mode (or debugging mode)
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

    this.checkPublicPath(compiler)
    // this.renameRequireFn(compiler)
    this.tapCompilationHook(compiler)
    compiler.hooks.emit.tapAsync(this.pluginName, this.onEmit.bind(this))
  }

  /*
  private renameRequireFn(compiler: Compiler) {
    compiler.hooks.compilation.tap('rename_main_template', compilation => {
      const mainTemplate = <MainTemplate>compilation.mainTemplate
      mainTemplate.requireFn = this.config.requireFn
    })
  }
  */

  /** take `publicPath` carefully */
  private checkPublicPath(compiler: Compiler) {
    compiler.hooks.thisCompilation.tap(this.pluginName, compilation => {
      const mainTemplate = <MainTemplate>compilation.mainTemplate
      const { outputOptions } = mainTemplate
      const publicPath = outputOptions.publicPath || ''

      assert(
        !publicPath || publicPath === '/',
        `Error: do not set \`ouput.publicPath\`: ${publicPath}`
      )

      // set default publicPath
      outputOptions.publicPath = publicPath
    })
  }

  private tapCompilationHook(compiler: Compiler) {
    const { pluginName } = this

    compiler.hooks.compilation.tap(pluginName, compilation => {
      // SEE https://github.com/webpack/webpack/blob/master/lib/TemplatedPathPlugin.js
      const mainTemplate = <MainTemplate>compilation.mainTemplate
      const assetPathHook = mainTemplate.hooks.assetPath

      assetPathHook.tap(pluginName, (path, data) => {
        const taps = assetPathHook.taps.filter(tap => tap.name !== pluginName)

        // there should be one tap at least
        assert(
          taps.length > 0,
          'Unexpected Error in compilation.mainTemplate.hooks.assetPath: ' +
            'please file an issue to the author.'
        )

        // no `\n` is allowed, since we have to replace asset path with
        // `global[mappingVar].find(original)`
        const str = String(taps[0].fn(path, data)).trim()
        assert(
          /\n/.test(str) === false,
          'Unexpected Error in compilation.mainTemplate.hooks.assetPath: ' +
            `asset path should not contain any line breaker ——\n ${str}`
        )

        // asset path that is ensured by us
        return str
      })

      // SEE https://webpack.js.org/api/compilation-hooks/#optimizechunkassets
      const optimizeChunkAssetsHook = compilation.hooks.optimizeChunkAssets
      const onOptimizeChunkAsset = this.onOptimizeChunkAsset.bind(
        this,
        compilation
      )
      optimizeChunkAssetsHook.tapAsync(pluginName, onOptimizeChunkAsset)
    })
  }

  private async onOptimizeChunkAsset(
    compilation: Compilation,
    chunks: Chunk[],
    callback: CallableFunction
  ) {
    const { entryFeature, entryFeatureMarker } = this

    const mainTemplate = <MainTemplate>compilation.mainTemplate
    const requireFn = <string>mainTemplate.requireFn

    const regexp = (re: RegExp) =>
      quickRegExpr(re, '__webpack_require__', requireFn)

    const rePublicPathAssign = regexp(/__webpack_require__\.p\s*=\s*[^\n]+/g)
    const reWebapckRequireAsset = regexp(
      /__webpack_require__\.p\s*\+\s*([^\n;]+)/g
    )

    const files = chunks.reduce(
      (acc: string[], chunk) => acc.concat(chunk.files),
      []
    )

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
        source = source.replace(
          rePublicPathAssign,
          (match: string) => `/* ${match} */`
        )
        changed = true
      }

      // rename asset paths
      if (reWebapckRequireAsset.test(source)) {
        source = source.replace(
          reWebapckRequireAsset,
          (m: string, g1: string) => {
            return `/* ${m.trim()} */ window["${
              this.config.assetMappingVariable
            }"].find(${g1});\n`
          }
        )
        changed = true
      }

      if (changed) {
        compilation.assets[file] = new RawSource(source)
      }
    })

    callback()
  }

  private async onEmit(compilation: Compilation, callback: CallableFunction) {
    const assetsMap = this.assetsMap
    const uploadFile = (file: string) => this.upload(file, compilation)

    const mainTemplate = <MainTemplate>compilation.mainTemplate
    const { publicPath } = mainTemplate.outputOptions
    const chunkGroups = compilation.chunkGroups

    // ignore sourcemaps
    const isNotSourceMap = (file: string) => !file.endsWith('.map')
    const getFileOfChunkGroups = function(groups: ChunkGroup[]) {
      return groups.reduce((acc: string[], g) => acc.concat(g.getFiles()), [])
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
    const [epChunksGroups, otherChunkGroups] = group(chunkGroups, group =>
      group.isInitial()
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
    const variableName = this.config.assetMappingVariable
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
    const replaceImports = function(source: string) {
      return source.replace(
        reImport,
        (match: string, _: string, path: string) => {
          if (reIgnorePath.test(path)) return match
          // avoid query strings that may affect the result
          // then strip public path ('' or '/')
          const file = path.split('?')[0].replace(rePublicPath, '')
          const url = assetsMap.get(file)
          return url ? match.replace(path, url) : match
        }
      )
    }

    const { entryFeatureMarker, assetManifest } = this
    for (let file of htmlFilenames) {
      const origSource = compilation.assets[file].source
      const html = compilation.assets[file].source().toString()
      let replaced = replaceImports(html)

      // inject manifest in case there is a inline chunk plugin...
      // TODO more strict check: replace only within <script> tags
      if (assetManifest && replaced.includes(entryFeatureMarker)) {
        replaced = replaced.replace(entryFeatureMarker, `${assetManifest}`)
      }

      compilation.assets[file].source = () => replaced

      // backup html files according to user option
      if (this.config.backupHTMLFiles) {
        compilation.assets[`${file}.bak`] = {
          ...compilation.assets[file],
          source: origSource
        }
      }
    }

    // remove sourcemaps according to user option
    if (!this.config.keepSourcemaps) {
      assetFilenames.forEach(file => {
        if (!isNotSourceMap(file)) {
          delete compilation.assets[file]
        }
      })
    }

    // generate manifest file
    const { manifestFilename } = this.config
    if (manifestFilename && typeof manifestFilename === 'string') {
      compilation.assets[manifestFilename] = new RawSource(mapToJSON(assetsMap))
    }
    callback()
  }

  /** replace `url()` in CSS using assets map */
  private replaceCSSURLs(cssFiles: string[], compilation: Compilation) {
    // SEE https://www.regextester.com/106463
    const re = /url\((?!['"]?(?:data:|https?:|\/\/))(['"]?)([^'")]*)\1\)/g
    const assets = compilation.assets
    const mainTemplate = <MainTemplate>compilation.mainTemplate
    const { publicPath } = mainTemplate.outputOptions

    for (let file of cssFiles) {
      let changed = false
      let content = assets[file].source().toString()

      // TODO
      // path matching is still error-prone
      // errors could happen in an unexpected way
      content = content.replace(
        re,
        (match: string, _: string, path: string) => {
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
          const url = this.assetsMap.get(parse(media).pathname)

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
        }
      )

      if (changed) {
        assets[file].source = () => content
      }
    }
  }

  /**
   * upload file using the function in user config,
   * program would terminate if any error is caught
   */
  private async upload(file: string, compilation: Compilation) {
    try {
      const asset = this.tryInjectManifest(file, compilation)
      const url = await this.config.uploadContent({
        file,
        content: asset.source(),
        extname: getExtname(file)
      })

      // we took falsy value as an signal that we should
      // keep the file as it is.
      if (!url || typeof url !== 'string') {
        return file
      }

      // ensure that we get a valid URL
      assert(/^(https?:)?\/\//.test(url), `Invalid url: ${url}`)

      // delete asset according to user option
      if (!this.config.keepLocalFiles) {
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
   * injects asset manifest into entrypoint JavaScript files
   *
   * @param {String} file        file path
   * @param {Object} compilation webpack compilation
   * @returns {Object} webpack asset object whose `.source` method could have been overridden
   */
  private tryInjectManifest(file: string, compilation: Compilation) {
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
}
