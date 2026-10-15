(function (global) {
  'use strict';

  let overlay = null;
  let injected = false;

  // ─── Стили ───
  function injectStyles() {
    if (injected) return;
    injected = true;
    const style = document.createElement('style');
    style.id = 'lightbox-styles';
    style.textContent = `
      .lightbox-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.94);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.22s ease, visibility 0.22s ease;
        cursor: zoom-out;
        padding: 12px;              /* минимальные отступы */
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
      }
      .lightbox-overlay.visible {
        opacity: 1;
        visibility: visible;
      }
      .lightbox-content {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: default;
      }
      .lightbox-content img,
      .lightbox-content video {
        max-width: 98vw;             /* почти весь экран */
        max-height: 98vh;
        width: auto;
        height: auto;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 20px 70px rgba(0, 0, 0, 0.8);
        animation: lightboxZoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        display: block;
        background: #000;
      }
      @keyframes lightboxZoom {
        0%   { transform: scale(0.75); opacity: 0; }
        100% { transform: scale(1);    opacity: 1; }
      }
      .lightbox-close {
        position: fixed;
        top: 22px;
        right: 26px;
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
        font-size: 22px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s, transform 0.15s;
        user-select: none;
        z-index: 1;
        border: 1px solid rgba(255, 255, 255, 0.25);
      }
      .lightbox-close:hover {
        background: rgba(255, 255, 255, 0.32);
        transform: scale(1.1);
      }

      /* Курсор-лупа на кликабельных медиа */
      .meme-img img,
      .meme-img video {
        cursor: zoom-in;
        transition: transform 0.2s ease;
      }
      .meme-img img:hover,
      .meme-img video:hover {
        transform: scale(1.04);
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Оверлей (создаётся один раз) ───
  function ensureOverlay() {
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `
      <div class="lightbox-close" title="Закрыть (Esc)" aria-label="Закрыть">✕</div>
      <div class="lightbox-content"></div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.classList.contains('lightbox-close')) {
        close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('visible')) {
        e.preventDefault();
        close();
      }
    });

    return overlay;
  }

  // ─── Открыть ───
  function open(src, type, alt) {
    injectStyles();
    ensureOverlay();
    const content = overlay.querySelector('.lightbox-content');
    content.innerHTML = '';

    if (type === 'video') {
      const v = document.createElement('video');
      v.src = src;
      v.controls = true;
      v.autoplay = true;
      v.loop = true;
      v.playsInline = true;
      content.appendChild(v);
    } else {
      const img = document.createElement('img');
      img.src = src;
      img.alt = alt || '';
      content.appendChild(img);
    }

    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      overlay.classList.add('visible');
    });
  }

  // ─── Закрыть ───
  function close() {
    if (!overlay) return;
    overlay.classList.remove('visible');
    document.body.style.overflow = '';

    setTimeout(() => {
      const content = overlay.querySelector('.lightbox-content');
      if (content) content.innerHTML = '';
    }, 250);
  }

  // ─── Делегирование клика ───
  function attach() {
    injectStyles();

    document.addEventListener('click', (e) => {
      const img = e.target.closest('.meme-img img');
      if (img) {
        e.preventDefault();
        open(img.currentSrc || img.src, 'image', img.alt);
        return;
      }
      const video = e.target.closest('.meme-img video');
      if (video) {
        e.preventDefault();
        open(video.currentSrc || video.src, 'video');
      }
    });
  }

  global.MemeLightbox = { open, close, attach };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})(window);