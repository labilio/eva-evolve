import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Keep canonical build outputs for existing syntax/contract tooling. The browser
// loads exactly one content-addressed copy, in the same directory so relative
// asset references preserve their meaning. Only these URLs get immutable cache.
export function fingerprintVendorAssets(outputRoot) {
  const entry = path.join(outputRoot, 'index.html');
  let html = fs.readFileSync(entry, 'utf8');
  const assets = {};
  for (const name of ['eva-runtime.module.js', 'eva-legacy.css']) {
    const source = `vendor/${name}`;
    const bytes = fs.readFileSync(path.join(outputRoot, source));
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 20);
    const ext = path.extname(name);
    const target = `vendor/${name.slice(0, -ext.length)}.${hash}${ext}`;
    const attribute = name.endsWith('.js') ? 'src' : 'href';
    const reference = `${attribute}="${source}"`;
    if (html.split(reference).length !== 2) throw new Error(`Expected one entry reference: ${source}`);
    fs.writeFileSync(path.join(outputRoot, target), bytes);
    html = html.replace(reference, `${attribute}="${target}"`);
    assets[source] = target;
  }
  fs.writeFileSync(entry, html);
  return assets;
}
