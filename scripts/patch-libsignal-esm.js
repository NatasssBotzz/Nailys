import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const targets = [path.join(root, 'lib'), path.join(root, 'src')]
const importNames = ['curve', 'crypto', 'protobufs']
let changed = 0

function patchFile(file) {
  let code = fs.readFileSync(file, 'utf8')
  const before = code
  for (const name of importNames) {
    code = code
      .replaceAll(`'libsignal/src/${name}'`, `'libsignal/src/${name}.js'`)
      .replaceAll(`"libsignal/src/${name}"`, `"libsignal/src/${name}.js"`)
  }
  if (code !== before) {
    fs.writeFileSync(file, code)
    changed += 1
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) walk(full)
    else if (/\.(?:js|ts|d\.ts)$/.test(full)) patchFile(full)
  }
}

for (const target of targets) walk(target)
console.log(`[Naileys ESM Patch] libsignal import extension check selesai. File diubah: ${changed}`)
