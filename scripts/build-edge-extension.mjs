// Packages browser-extension/ for Microsoft Edge Add-ons.
//
// Edge is Chromium, so the manifest needs no changes from the Chrome Web
// Store package: no browser_specific_settings block, no data-collection
// declaration. Just zip the same source files.
//
// Zipped with Windows' bsdtar, not Compress-Archive: PowerShell 5.1 writes
// backslash paths ("icons\icon16.png"), which the Edge store rejects.
//
//   node scripts/build-edge-extension.mjs  ->  expatslist-extension-edge.zip
import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const OUT = resolve('expatslist-extension-edge.zip')
const SRC = resolve('.')

const manifest = JSON.parse(readFileSync(resolve(SRC, 'manifest.json'), 'utf8'))
rmSync(OUT, { force: true })
const tar = process.platform === 'win32' ? 'C:\\Windows\\System32\\tar.exe' : 'bsdtar'
execFileSync(tar, ['-a', '-cf', OUT, '-C', SRC, 'manifest.json', 'popup.html', 'popup.js', 'icons'])
console.log(`${OUT}  (v${manifest.version})`)
