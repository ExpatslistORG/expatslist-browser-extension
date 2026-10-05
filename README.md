# Expatslist.org browser extension

See what is new in your Expatslist.org city from the toolbar: recommendations, questions, blog posts and businesses that locals post, plus a shortcut to your messages. It defaults to the nearest of the 44 cities, or you can search any city.

Works in Chrome, Microsoft Edge and Firefox. This repo holds the full source.

## What is a browser extension?

A browser extension is a small add-on in your browser toolbar. Click its icon and a popup opens. This one shows a short list, and each item opens the real page on Expatslist.org.

## About Expatslist.org

Expatslist.org is a community site for cities across North America, Latin America, Europe, Asia and the Middle East, used by newcomers, expats, remote workers, retirees and locals. Visit it at https://expatslist.org.

## Install

1. Open `chrome://extensions` (Chrome), `edge://extensions` (Edge) or `about:debugging` (Firefox).
2. Turn on Developer mode, then choose Load unpacked (Firefox: Load Temporary Add-on and pick `manifest.json`).
3. Select this folder.
4. Click the toolbar icon.

## Privacy and permissions

It asks for one permission, `storage`, to remember your chosen city and to cache the city list for 24 hours. It has no background worker, no content script, no host permissions and no sign-in.

It reads three public, read-only endpoints on expatslist.org: the city list, a city feed and a nearest-city lookup based on your browser timezone.

The extension collects nothing and stores no credentials. Privacy policy: https://expatslist.org/privacy.

## Build

- Edge: `node scripts/build-edge-extension.mjs` writes `expatslist-extension-edge.zip`.
- Firefox: `node scripts/build-firefox-extension.mjs` writes `expatslist-extension-firefox.zip`. It adds the Firefox-only manifest block (add-on id and the "collects no data" declaration).
- Chrome: zip `manifest.json`, `popup.html`, `popup.js` and `icons/` with forward-slash paths (for example `tar -a -cf ../ext.zip manifest.json popup.html popup.js icons`).

## More from Expatslist.org

- Website: https://expatslist.org
- Developer docs for Claude: https://expatslist.org/developers/claude
- Developer docs for ChatGPT: https://expatslist.org/developers/chatgpt
- ChatGPT plugin: https://github.com/ExpatsListORG/expatslist-chatgpt-plugin
- Claude connector: https://github.com/ExpatsListORG/expatslist-claude-connector
- Privacy policy: https://expatslist.org/privacy
- Terms of service: https://expatslist.org/terms
- Contact: https://expatslist.org/contact

## License

MIT. See `LICENSE`.
