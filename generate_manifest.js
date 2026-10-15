// Запуск: node generate-manifest.js
const fs = require('fs');
const path = require('path');

const ROOT        = __dirname;
const TOPICS_DIR  = path.join(ROOT, 'topics');
const TOP_DIR     = path.join(ROOT, 'top');
const OUT_FILE    = path.join(TOPICS_DIR, 'manifest.json');
const META_FILE   = path.join(TOPICS_DIR, 'meta.json');

const MEDIA_EXT = new Set([
  'jpg','jpeg','png','gif','webp','bmp','svg','avif','ico',
  'mp4','webm','ogg','mov','m4v'
]);

function isMedia(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return MEDIA_EXT.has(ext);
}
function prettify(slug) {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function readMeta() {
  if (!fs.existsSync(META_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(META_FILE, 'utf8')); }
  catch (e) { console.warn('⚠ meta.json — ошибка парсинга, игнорирую'); return {}; }
}

const meta = readMeta();
const topics = [];

if (fs.existsSync(TOPICS_DIR)) {
  for (const entry of fs.readdirSync(TOPICS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;

    const folderPath = path.join(TOPICS_DIR, entry.name);
    const files = fs.readdirSync(folderPath)
      .filter(f => isMedia(f) && !f.startsWith('.'))
      .sort((a, b) => a.localeCompare(b, 'ru'));

    if (!files.length) continue;

    const m = meta[entry.name] || {};
    topics.push({
      folder: entry.name,
      name: m.name || prettify(entry.name),
      emoji: m.emoji || '',
      memes: files
    });
  }
}
topics.sort((a, b) => a.folder.localeCompare(b.folder));

let topFiles = [];
if (fs.existsSync(TOP_DIR)) {
  topFiles = fs.readdirSync(TOP_DIR)
    .filter(f => isMedia(f) && !f.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, 'ru'));
}

const manifest = { topics, top: topFiles };
fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`✅ manifest.json обновлён: ${topics.length} тем, ${topFiles.length} мемов недели`);