(function (global) {
  'use strict';

  const CACHE_KEY = 'memezone_tree_v1';
  const CACHE_TTL = 2 * 60 * 1000; // 2 минуты

  const IMAGE_EXTS = new Set(['jpg','jpeg','png','gif','webp','bmp','svg','avif','ico']);
  const VIDEO_EXTS = new Set(['mp4','webm','ogg','mov','m4v']);

  // ─── Определяем owner/repo из URL github.io ───
  function detectRepo() {
    const host = location.hostname;
    const m = host.match(/^([^.]+)\.github\.io$/i);
    if (!m) return null;
    const user = m[1];
    const parts = location.pathname.split('/').filter(Boolean);
    // username.github.io/repo/...   → repo = первый сегмент
    // username.github.io/...        → user pages, repo = username.github.io
    let repo = user + '.github.io';
    if (parts.length > 0 && !parts[0].includes('.')) repo = parts[0];
    return { user, repo };
  }

  // ─── Кэш дерева репозитория ───
  function getCachedTree() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (Date.now() - o.t > CACHE_TTL) return null;
      return o.tree;
    } catch (e) { return null; }
  }
  function setCachedTree(tree) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), tree })); } catch (e) {}
  }

  // ─── GitHub Git Trees API — один запрос на весь репозиторий ───
  async function fetchTree() {
    const cached = getCachedTree();
    if (cached) return cached;

    const info = detectRepo();
    if (!info) throw new Error('Not a github.io site');

    let lastErr;
    for (const branch of ['main', 'master']) {
      try {
        const url = `https://api.github.com/repos/${info.user}/${info.repo}/git/trees/${branch}?recursive=1`;
        const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json' } });
        if (!res.ok) { lastErr = new Error('GitHub HTTP ' + res.status); continue; }
        const data = await res.json();
        if (!Array.isArray(data.tree)) { lastErr = new Error('Bad tree payload'); continue; }
        setCachedTree(data.tree);
        return data.tree;
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('GitHub API unavailable');
  }

  // ─── Fallback: topics/manifest.json ───
  async function fetchManifest() {
    const res = await fetch('topics/manifest.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('manifest.json not found');
    return res.json();
  }

  // ─── meta.json — красивые имена и эмодзи для тем (опционально) ───
  async function fetchMeta() {
    try {
      const res = await fetch('topics/meta.json', { cache: 'no-store' });
      if (!res.ok) return {};
      return await res.json();
    } catch (e) { return {}; }
  }

  // ─── Утилиты ───
  function ext(name) {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.slice(i + 1).toLowerCase() : '';
  }
  function isMedia(name) {
    const e = ext(name);
    return IMAGE_EXTS.has(e) || VIDEO_EXTS.has(e);
  }
  function isVideo(name) { return VIDEO_EXTS.has(ext(name)); }
  function caption(name) {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.slice(0, i) : name;
  }
  function prettify(slug) {
    return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  function mediaUrl(folder, file) {
    if (folder) return `topics/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;
    return `top/${encodeURIComponent(file)}`;
  }

  // ─── Из дерева достаём темы ───
  function topicsFromTree(tree) {
    const map = new Map();
    for (const entry of tree) {
      if (entry.type !== 'blob') continue;
      if (!entry.path.startsWith('topics/')) continue;
      const rest = entry.path.slice('topics/'.length);
      const slash = rest.indexOf('/');
      if (slash === -1) continue;            // файл лежит прямо в topics/, игнор
      const folder = rest.slice(0, slash);
      const file = rest.slice(slash + 1);
      if (!file || file.includes('/')) continue; // вложенные подпапки игнорим
      if (!isMedia(file)) continue;
      if (!map.has(folder)) map.set(folder, []);
      map.get(folder).push(file);
    }
    const topics = [];
    for (const [folder, memes] of map) {
      memes.sort((a, b) => a.localeCompare(b, 'ru'));
      topics.push({ folder, name: prettify(folder), emoji: '', memes });
    }
    topics.sort((a, b) => a.folder.localeCompare(b.folder));
    return topics;
  }

  // ─── Из дерева достаём мемы недели (папка top/) ───
  function topFromTree(tree) {
    const memes = [];
    for (const entry of tree) {
      if (entry.type !== 'blob') continue;
      if (!entry.path.startsWith('top/')) continue;
      const rest = entry.path.slice('top/'.length);
      if (!rest || rest.includes('/')) continue;
      if (!isMedia(rest)) continue;
      memes.push(rest);
    }
    memes.sort((a, b) => a.localeCompare(b, 'ru'));
    return memes;
  }

  // ─── Публичное API ───

  async function getTopics() {
    // 1) GitHub API
    try {
      const [tree, meta] = await Promise.all([fetchTree(), fetchMeta()]);
      const topics = topicsFromTree(tree).map(t => {
        const m = meta[t.folder] || {};
        return { ...t, name: m.name || t.name, emoji: m.emoji || '' };
      });
      if (topics.length) return { topics, source: 'github' };
    } catch (e) {
      console.warn('[MemeLoader] GitHub API:', e.message);
    }
    // 2) Manifest fallback
    try {
      const m = await fetchManifest();
      const topics = (m.topics || []).map(t => ({
        folder: t.folder,
        name: t.name || prettify(t.folder),
        emoji: t.emoji || '',
        memes: t.memes || []
      }));
      return { topics, source: 'manifest' };
    } catch (e) {
      console.warn('[MemeLoader] Manifest:', e.message);
      return { topics: [], source: 'none' };
    }
  }

  async function getTopMemes() {
    // 1) GitHub API
    try {
      const tree = await fetchTree();
      const memes = topFromTree(tree);
      if (memes.length) return { memes, source: 'github' };
    } catch (e) {
      console.warn('[MemeLoader] GitHub API:', e.message);
    }
    // 2) Manifest fallback
    try {
      const m = await fetchManifest();
      return { memes: m.top || [], source: 'manifest' };
    } catch (e) {
      console.warn('[MemeLoader] Manifest:', e.message);
      return { memes: [], source: 'none' };
    }
  }

  async function getTopic(folder) {
    // 1) GitHub API
    try {
      const [tree, meta] = await Promise.all([fetchTree(), fetchMeta()]);
      const t = topicsFromTree(tree).find(x => x.folder === folder);
      if (t) {
        const m = meta[t.folder] || {};
        return { ...t, name: m.name || t.name, emoji: m.emoji || '' };
      }
    } catch (e) {
      console.warn('[MemeLoader] GitHub API:', e.message);
    }
    // 2) Manifest fallback
    try {
      const m = await fetchManifest();
      const t = (m.topics || []).find(x => x.folder === folder);
      if (t) return {
        folder: t.folder,
        name: t.name || prettify(t.folder),
        emoji: t.emoji || '',
        memes: t.memes || []
      };
    } catch (e) {
      console.warn('[MemeLoader] Manifest:', e.message);
    }
    return null;
  }

  global.MemeLoader = {
    getTopics, getTopMemes, getTopic,
    isVideo, isMedia, caption, prettify, mediaUrl,
    _detectRepo: detectRepo // для отладки
  };
})(window);