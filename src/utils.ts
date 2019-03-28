import { extname } from 'path'
import { parse, format } from 'url'

/**
 * from https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html
 */
export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>

/**
 * get file extension, without period ('.')
 */
export function getExtname(file: string) {
  return extname(file).replace(/^\./, '')
}

/**
 * convert simple js Map object into JSON
 */
export function mapToJSON(map: Map<string, string>): string {
  let obj: Record<string, string> = Object.create(null)
  let res: Record<string, string> = Object.create(null)
  for (let [k, v] of map) {
    obj[k] = v
  }

  for (let key of Object.keys(obj).sort()) {
    res[key] = obj[key]
  }

  return JSON.stringify(res)
}

/**
 * array grouping
 */
export function group<T>(arr: T[], pred: (arg: T) => boolean) {
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

/**
 * `new RegExp` made easier
 * @param {RegExp} re       regular expression
 * @param {String} replaced simple string in `re`, for example
 * @param {String} replacer regular expression part that is more complex
 */
export function quickRegExpr(re: RegExp, replaced: string, replacer: string) {
  const code = `return ${re.toString()}`.replace(replaced, replacer)
  // eslint-disable-next-line
  return Function(code)()
}

/**
 * get possible extra path info in CSS, like images or web fonts
 */
export const getQueryAndHash = (path: string) => {
  const { search, hash } = parse(path)
  return format({ search, hash })
}
