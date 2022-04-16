import assert from 'assert'
import { parse } from 'url'
import { dirname, isAbsolute, join as joinPath } from 'path'

import posthtml from 'posthtml'
import chalk from 'chalk'
import { RawSource, ConcatSource } from 'webpack-sources'
import { Compiler, compilation } from 'webpack'

import {
  Configuration as IConfiguration,
  FileInfo as IFileInfo,
  standardize
} from './configuration'

import { getExtname, group, mapToJSON, getQueryAndHash } from './utils'
import { replacePublicPath, injectAssetMap } from './replace'

type Chunk = compilation.Chunk
type Compilation = compilation.Compilation
type CompilationHooks = compilation.CompilationHooks

interface ICompilation extends Compilation {
  emitAsset?: any
  updateAsset?: any
  getAsset?: any
  getAssets?: any
  deleteAsset?: any
}

// hack
interface MainTemplate extends Compilation {
  mainTemplate: Compilation
}

// hack in webpack5
interface ICompilationHooks extends CompilationHooks {
  processAssets: any
}
interface ICompiler extends Compiler {
  resolvers: any
  webpack: any
}

interface IWebpackCompilation {
  PROCESS_ASSETS_STAGE_OPTIMIZE?: number
}

export type FileInfo = IFileInfo
export type Configuration = IConfiguration

export default class Webpack4CDNPlugin {
  private config: Required<Configuration>

  private assetsMap = new Map()
  private assetMapJSON = '{}'
  private isWebpack4 = false
  private compilation: IWebpackCompilation = {}
  public pluginName = 'webpack4-cdn-plugin'

  constructor(config: Configuration) {
    this.config = standardize(config)
  }

  public apply(compiler: ICompiler) {
    const env = process.env.NODE_ENV || compiler.options.mode
    // https://github.com/webpack-contrib/mini-css-extract-plugin/blob/fed2dea277062ab8a115a8cdf9ee47991b081102/src/index.js#L106

    if (compiler.webpack) {
      this.isWebpack4 = false
      this.compilation = compiler.webpack.Compilation
    } else {
      this.isWebpack4 = typeof compiler.resolvers !== 'undefined'
    }

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

    const { pluginName } = this
    const onEmit = this.onEmit.bind(this)
    const onCompilation = this.onCompilation.bind(this)
    const onThisCompilation = this.onThisCompilation.bind(this)

    if (compiler.hooks) {
      compiler.hooks.emit.tapAsync(pluginName, onEmit)
      compiler.hooks.compilation.tap(pluginName, onCompilation)
      compiler.hooks.thisCompilation.tap(pluginName, onThisCompilation)
    } else {
      compiler.plugin('emit', onEmit)
      compiler.plugin('compilation', onCompilation)
      compiler.plugin('this-compilation', onThisCompilation)
    }
  }

  private onThisCompilation(compilation: Compilation) {
    const mainTemplate = <MainTemplate>compilation.mainTemplate
    const { outputOptions } = this.isWebpack4 ? mainTemplate : compilation
    const publicPath = outputOptions.publicPath || ''

    assert(
      !publicPath || publicPath === '/',
      `Error: do not set \`output.publicPath\`: ${publicPath}`
    )

    // set default publicPath
    outputOptions.publicPath = publicPath
  }

  private onCompilation(compilation: Compilation) {
    const { pluginName, onOptimizeChunkAsset } = this

    const fn = onOptimizeChunkAsset.bind(this, compilation)
    const onProcessAssets = this.onProcessAssets.bind(this, compilation)

    if (compilation.hooks) {
      if (this.isWebpack4) {
        compilation.hooks.optimizeChunkAssets.tapAsync(pluginName, fn)
      } else {
        ;(compilation.hooks as ICompilationHooks).processAssets.tap(
          {
            name: pluginName,
            stage: this.compilation.PROCESS_ASSETS_STAGE_OPTIMIZE
          },
          onProcessAssets
        )
      }
    } else {
      compilation.plugin('optimize-chunk-assets', fn)
    }
  }

  private async onProcessAssets(compilation: ICompilation, assets: any) {
    // only deal with JavaScript files
    const filenames = Object.keys(assets).filter(file => file.endsWith('.js'))

    filenames.forEach(name => {
      const asset = assets[name]
      const source = asset.source().toString()
      // rewrite `__webpack_require__.p + ...` to function call,
      // and add `__webpack_require__.__asset__` method
      const result = replacePublicPath(source)

      if (result.changed) {
        compilation.emitAsset(name, new RawSource(result.code))
        // TODO rewrite sourcemap file
      }
    })
  }

  private async onOptimizeChunkAsset(
    compilation: Compilation,
    chunks: Chunk[],
    callback: CallableFunction
  ) {
    const files = chunks.reduce(
      (acc: string[], chunk) => acc.concat(chunk.files),
      []
    )

    files.forEach(file => {
      // only deal with JavaScript files
      if (file.endsWith('.js') === false) {
        return
      }

      const source = compilation.assets[file].source().toString()
      // rewrite `__webpack_require__.p + ...` to function call,
      // and add `__webpack_require__.__asset__` method
      const result = replacePublicPath(source)

      if (result.changed) {
        compilation.assets[file] = new RawSource(result.code)
        // TODO rewrite sourcemap file
      }
    })

    callback()
  }

  private async onEmit(compilation: ICompilation, callback: CallableFunction) {
    const uploadFile = (file: string) => this.upload(file, compilation)

    const { assetsMap } = this
    const filenames: string[] = this.isWebpack4
      ? Object.keys(compilation.assets)
      : compilation.getAssets().map((asset: any) => asset.name)

    const entryPoints = (compilation.chunkGroups || compilation.chunks)
      .filter(g => g.isInitial())
      .reduce(
        (acc: string[], g) =>
          acc.concat(
            g.getFiles
              ? g.getFiles() // webpack4
              : g.files
          ),
        []
      )
      .filter(file => file.endsWith('.js'))

    const [cssOrHtml, otherFiles] = group(filenames, file =>
      /\.(css|html)$/.test(file)
    )
    const [cssFilenames, htmlFilenames] = group(cssOrHtml, file =>
      file.endsWith('.css')
    )
    const staticAssets = otherFiles.filter(file => {
      return (
        file.endsWith('.js') === false || entryPoints.includes(file) === false
      )
    })

    // 1. static assets like js/fonts/images
    await Promise.all(staticAssets.map(uploadFile))

    // 2. replace CSS `url()`s, then upload them
    this.interpolateCSSAssets(cssFilenames, compilation)
    await Promise.all(cssFilenames.map(uploadFile))

    // DO NOT move this line!!!
    this.assetMapJSON = mapToJSON(assetsMap)

    // upload entry chunk files
    await Promise.all(entryPoints.map(uploadFile))

    // now that all files (except html / source map) are uploaded,
    // we can replace these urls within html files
    await this.interpolateHTMLAssets(htmlFilenames, compilation)

    const { keepSourcemaps, manifestFilename } = this.config

    // remove sourcemaps according to user option
    if (!keepSourcemaps) {
      filenames.forEach(file => {
        if (file.endsWith('.map')) {
          if (this.isWebpack4) {
            delete compilation.assets[file]
          } else {
            compilation.deleteAsset(file)
          }
        }
      })
    }

    // generate manifest file
    if (manifestFilename && typeof manifestFilename === 'string') {
      if (this.isWebpack4) {
        compilation.assets[manifestFilename] = new RawSource(
          mapToJSON(assetsMap)
        )
      } else {
        compilation.emitAsset(
          manifestFilename,
          new RawSource(mapToJSON(assetsMap))
        )
      }
    }

    callback()
  }

  private async interpolateHTMLAssets(
    htmlFiles: string[],
    compilation: ICompilation
  ) {
    const { assetsMap, assetMapJSON } = this
    const mainTemplate = <MainTemplate>compilation.mainTemplate
    const { publicPath } = this.isWebpack4
      ? mainTemplate.outputOptions
      : compilation.outputOptions

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

    const validScriptTypes = [
      'module',
      'application/javascript',
      'text/javascript'
    ]
    const replaceHTML = (html: string) => {
      return posthtml<any, string>([
        // replace possible inline manifest
        function(tree) {
          tree.match({ tag: 'script' }, node => {
            const { attrs } = node

            if (attrs) {
              if ('src' in attrs) return node

              if (
                'type' in attrs &&
                validScriptTypes.includes(String(attrs.type)) === false
              ) {
                return node
              }
            }

            if (!node.content) {
              return node
            }

            const content = node.content![0] as string
            const result = injectAssetMap(content, assetMapJSON)

            if (result.changed) {
              node.content[0] = result.code
            }

            return node
          })
        }
      ]).process(html)
    }

    for (let file of htmlFiles) {
      const origSource = this.isWebpack4
        ? compilation.assets[file].source
        : compilation.getAsset(file).source

      const html: string = this.isWebpack4
        ? origSource().toString()
        : origSource.source().toString()

      let replaced = replaceImports(html)
      const result = await replaceHTML(replaced)
      replaced = result.html

      if (this.isWebpack4) {
        compilation.assets[file].source = () => replaced
      } else {
        compilation.updateAsset(file, () => new ConcatSource(replaced))
      }
      // backup html files according to user option
      if (this.config.backupHTMLFiles) {
        if (this.isWebpack4) {
          compilation.assets[`${file}.bak`] = {
            ...compilation.assets[file],
            source: origSource
          }
        } else {
          compilation.emitAsset(`${file}.bak`, origSource)
        }
      }
    }
  }

  private interpolateCSSAssets(cssFiles: string[], compilation: ICompilation) {
    // SEE https://www.regextester.com/106463
    const re = /url\((?!['"]?(?:data:|https?:|\/\/))(['"]?)([^'")]*)\1\)/g
    const mainTemplate = <MainTemplate>compilation.mainTemplate
    const { publicPath } = this.isWebpack4
      ? mainTemplate.outputOptions
      : compilation.outputOptions

    for (let file of cssFiles) {
      let changed = false
      let content = this.isWebpack4
        ? compilation.assets[file].source().toString()
        : compilation
            .getAsset(file)
            .source.source()
            .toString()

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
        if (this.isWebpack4) {
          compilation.assets[file].source = () => content
        } else {
          compilation.updateAsset(file, () => new ConcatSource(content))
        }
      }
    }
  }

  private async upload(file: string, compilation: ICompilation) {
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
        if (this.isWebpack4) {
          delete compilation.assets[file]
        } else {
          compilation.deleteAsset(file)
        }
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

  private tryInjectManifest(file: string, compilation: ICompilation) {
    const asset = this.isWebpack4
      ? compilation.assets[file]
      : compilation.getAsset(file).source

    assert(asset, `${file} does not exists`)

    // only replace JavaScript files
    if (getExtname(file) !== 'js') {
      return asset
    }

    let source = asset.source().toString()
    const result = injectAssetMap(source, this.assetMapJSON)

    if (result.changed) {
      source = result.code

      asset.source = () => source
    }

    return asset
  }
}
