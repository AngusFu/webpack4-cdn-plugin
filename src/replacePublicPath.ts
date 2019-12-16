import * as t from '@babel/types'
import * as parser from '@babel/parser'
import generate from '@babel/generator'
import traverse, { NodePath } from '@babel/traverse'
import MagicString from 'magic-string'

export function replacePublicPath(source: string, variableName: string) {
  const code = new MagicString(source)
  const ast = parser.parse(source)
  let changed = false

  traverse(ast, {
    BinaryExpression(path) {
      const { left, operator, right } = path.node

      if (operator !== '+' || t.isMemberExpression(left) === false) {
        return
      }

      const { object, property } = left as t.MemberExpression

      if (
        t.isIdentifier(object) &&
        object.name === '__webpack_require__' &&
        t.isIdentifier(property) &&
        property.name === 'p'
      ) {
        path.replaceWith(right)

        let parent = path as NodePath<t.BinaryExpression>
        while (true) {
          if (t.isBinaryExpression(parent.parentPath)) {
            parent = parent.parentPath as NodePath<t.BinaryExpression>
          } else {
            break
          }
        }

        const { start, end } = parent.node

        parent.replaceWith(
          t.callExpression(
            t.memberExpression(
              t.memberExpression(
                t.identifier('window'),
                t.stringLiteral(variableName),
                true
              ),
              t.identifier('find')
            ),
            [
              parent.node as t.BinaryExpression,
              t.identifier('__webpack_require__')
            ]
          )
        )

        changed = true
        code.overwrite(start!, end!, generate(parent.node).code)
      }
    }
  })

  return { code: code.toString(), changed }
}
