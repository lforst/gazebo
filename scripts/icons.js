const _ = require('lodash')
const fs = require('fs')

const enabledIcons = [
  'search',
]

console.log('Generating Icons import')
console.log('Icons that will be generated: ')
console.log(enabledIcons.join(', '))
console.log('-----------')
console.log('Edit this file to update the icon list')

function generateImports(path) {
  const files = fs.readdirSync(path).filter((name) => name.endsWith('.svg'))

  const lines = files.map((i) => {
    const fileName = i.slice(0, -4)
    const nameIcon = _.camelCase(fileName)
    const commented = enabledIcons.includes(fileName) ? '' : '// '
    return `${commented}export { ReactComponent as ${nameIcon} } from './${i}'`
  })

  const nameFile = path + '/index.js'
  fs.writeFileSync(nameFile, lines.join('\n'))
}

generateImports('./src/ui/Icon/svg/outline')
generateImports('./src/ui/Icon/svg/solid')

console.log('job done')
