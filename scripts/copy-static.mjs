// מעתיק את דף הנחיתה הסטטי (index.html + assets) אל public/ כך ש-Next/Vercel
// יגישו אותו ב-"/" בלי לגעת בעיצוב המקורי. index.html בשורש נשאר מקור האמת היחיד.
import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');

await mkdir(pub, { recursive: true });
await cp(join(root, 'index.html'), join(pub, 'index.html'));

if (existsSync(join(root, 'assets'))) {
  await cp(join(root, 'assets'), join(pub, 'assets'), { recursive: true });
}

console.log('✓ landing copied to public/ (index.html + assets)');
