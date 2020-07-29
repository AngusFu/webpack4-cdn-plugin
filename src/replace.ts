import MagicString from 'magic-string'

const assetLookupDefinition = `
!function () {
  __webpackAssetMap__ = 1;
  __webpack_require__.__asset__ = function (path, wR) {
    return __webpackAssetMap__[path] || (wR.p + path);
  };
}();
`

export function replacePublicPath(source: string) {
  const magic = new MagicString(source)
  let changed = false

  const reAssign = /__webpack_require__\.p\s*\=\s*["']/g

  // assume that `__webpack_require__.p + ...` is always in a single line
  const reBinaryExpr = /__webpack_require__\.p\s*\+\s*([^;\n]*?)[;\n]/g

  while (true) {
    const res = reAssign.exec(source)

    if (res === null) {
      break
    }

    changed = true
    magic.appendLeft(res.index, assetLookupDefinition)
  }

  while (true) {
    const res = reBinaryExpr.exec(source)

    if (res === null) {
      break
    }

    const start = res.index
    const end = start + res[0].length

    // prettier-ignore
    const replacement = `__webpack_require__.__asset__(${res[1]}, __webpack_require__);`

    changed = true
    magic.overwrite(start, end, replacement)
  }

  const code = changed ? magic.toString() : source

  return { changed, code }
}

export function injectAssetMap(source: string, json: string) {
  const magic = new MagicString(source)
  let changed = false

  const re = /__webpackAssetMap__\s*=\s*1/g

  while (true) {
    const res = re.exec(source)

    if (res === null) {
      break
    }

    const start = res.index
    const end = start + res[0].length
    const replacement = `var __webpackAssetMap__ = ${json};`

    changed = true
    magic.overwrite(start, end, replacement)
  }

  const code = changed ? magic.toString() : source

  return { changed, code }
}
