// Packages browser-extension/ for Firefox (addons.mozilla.org).
//
// Same code as the Chrome build; Firefox only needs its own manifest block:
// a fixed add-on id, and the data-collection declaration AMO requires of every
// new extension since Nov 2025 (Firefox 140+). Kept out of the Chrome manifest
// so the Web Store package stays warning-free.
//
// Zipped with Windows' bsdtar, not Compress-Archive: PowerShell 5.1 writes
// backslash paths ("icons\icon16.png"), which AMO rejects.
//
//   node scripts/build-firefox-extension.mjs  ->  expatslist-extension-firefox.zip
import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const GECKO_ID = 'extension@expatslist.org'
const OUT = resolve('expatslist-extension-firefox.zip')
const SRC = resolve('.')

const dir = mkdtempSync(join(tmpdir(), 'ff-ext-'))
try {
  for (const f of ['manifest.json', 'popup.html', 'popup.js', 'icons']) {
    cpSync(join(SRC, f), join(dir, f), { recursive: true })
  }
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
  manifest.browser_specific_settings = {
    gecko: {
      id: GECKO_ID,
      strict_min_version: '140.0',
      data_collection_permissions: { required: ['none'] },
    },
    // data_collection_permissions arrived in Firefox for Android 142, a release later than desktop.
    gecko_android: { strict_min_version: '142.0' },
  }
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  rmSync(OUT, { force: true })
  const tar = process.platform === 'win32' ? 'C:\\Windows\\System32\\tar.exe' : 'bsdtar'
  execFileSync(tar, ['-a', '-cf', OUT, '-C', dir, 'manifest.json', 'popup.html', 'popup.js', 'icons'])
  console.log(`${OUT}  (v${manifest.version}, id ${GECKO_ID})`)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
