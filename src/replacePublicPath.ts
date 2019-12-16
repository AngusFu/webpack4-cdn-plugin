import * as t from '@babel/types'
import * as parser from '@babel/parser'
import generate from '@babel/generator'
import traverse, { NodePath } from '@babel/traverse'

export function replacePublicPath(source: string, variableName: string) {
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
        let current = path as NodePath<t.BinaryExpression>

        // replace `__webpack_require__.p + ?` with `?`
        path.replaceWith(right)

        while (true) {
          if (t.isBinaryExpression(current.parentPath)) {
            current = current.parentPath as NodePath<t.BinaryExpression>
          } else {
            break
          }
        }

        current.replaceWith(
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
              current.node as t.BinaryExpression,
              t.identifier('__webpack_require__')
            ]
          )
        )

        changed = true
      }
    }
  })

  return { code: changed ? generate(ast).code : source, changed }
}
