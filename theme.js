(function (global) {
  'use strict';

  /**
   * Применяет пастельную тему к :root через CSS-переменные.
   * @param {number} hue — оттенок 0..359
   */
  function applyTheme(hue) {
    const root = document.documentElement;
    const vars = {
      '--primary':         `hsl(${hue}, 55%, 62%)`,   // основной акцент
      '--primary-dark':    `hsl(${hue}, 55%, 42%)`,   // тёмный (hover, заголовки)
      '--primary-darker':  `hsl(${hue}, 60%, 28%)`,   // самый тёмный (текст)
      '--primary-soft':    `hsl(${hue}, 55%, 92%)`,   // фон градиента (верх)
      '--primary-softer':  `hsl(${hue}, 45%, 97%)`,   // фон градиента (низ)
      '--primary-border':  `hsl(${hue}, 55%, 55%)`,   // полоска под хедером
      '--primary-glow':    `hsla(${hue}, 55%, 55%, 0.25)` // тень/свечение
    };
    for (const k in vars) root.style.setProperty(k, vars[k]);
    root.dataset.themeHue = String(hue);
  }

  /** Случайный оттенок 0..359 */
  function randomPastelHue() {
    return Math.floor(Math.random() * 360);
  }

  global.MemeTheme = {
    applyTheme,
    randomPastelHue,
    /** Зелёная тема — для главной */
    applyGreen:  () => applyTheme(125),
    /** Случайная пастель — для страниц тем */
    applyRandom: () => applyTheme(randomPastelHue()),
    get currentHue() {
      return Number(document.documentElement.dataset.themeHue);
    }
  };
})(window);