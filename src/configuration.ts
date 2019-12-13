import { Omit } from './utils'
import assert from 'assert'

export interface FileInfo {
  file: string
  content: string | Buffer
  extname: string
}

export interface Configuration {
  requireFn?: string

  uploadContent: (file: FileInfo) => Promise<string | boolean>
  /** whether to write webpack assets in local fs (usually for debugging) */
  keepLocalFiles?: boolean
  /** whether to keep sourcemap assets in local fs */
  keepSourcemaps?: boolean
  /** whether to backup the original html assets */
  backupHTMLFiles?: boolean
  /**
   * name of the json file which keeps the url mapping
   * (usually for debugging). `false` means that you do
   * not need this file.
   */
  manifestFilename?: string | boolean
  /** the global variable */
  assetMappingVariable?: string
}

/** default configuration */
export const defaults: Omit<Required<Configuration>, 'uploadContent'> = {
  requireFn: '__webpack4cdn_plugin_require__',
  keepLocalFiles: false,
  keepSourcemaps: false,
  backupHTMLFiles: false,
  manifestFilename: false,
  assetMappingVariable: 'webpackAssetMappings'
}

/** merge user configuration with defaults */
export const standardize = function(
  config: Configuration
): Required<Configuration> {
  assert(
    typeof config.uploadContent === 'function',
    '`config.uploadContent` is not a function.'
  )

  const variableName = config.assetMappingVariable
  const isValidName = variableName && typeof variableName === 'string'
  const name = isValidName ? variableName : defaults.assetMappingVariable

  return {
    ...defaults,
    ...config,
    assetMappingVariable: encodeURIComponent(<string>name)
  }
}
