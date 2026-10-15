(function () {
  // 👇 ЗАМЕНИ НА СВОЮ ПОЧТУ
  const EMAIL = 'e8489728a491243463663d80c30bdc42';
  const RESTORE_DELAY = 5000;

  // Плашечка рядом с конкретным полем
  function fieldHint(input, text) {
    // Убираем старую подсказку, если есть
    const wrap = input.closest('.field-wrap') || input.parentElement;
    let hint = wrap.querySelector('.field-hint');
    if (!hint) {
      hint = document.createElement('span');
      hint.className = 'field-hint';
      wrap.appendChild(hint);
    }
    hint.textContent = text;
    hint.classList.add('visible');

    // Прячем через 3 секунды или при исправлении
    clearTimeout(hint._timer);
    hint._timer = setTimeout(() => hint.classList.remove('visible'), 3000);
  }

  function clearHint(input) {
    const wrap = input.closest('.field-wrap') || input.parentElement;
    const hint = wrap.querySelector('.field-hint');
    if (hint) hint.classList.remove('visible');
  }

  function attach(selector, subject, successText) {
    const form = document.querySelector(selector);
    if (!form) return;

    const originalHTML = form.innerHTML;

    // Снимаем подсказку при вводе
    form.addEventListener('input', (e) => {
      if (e.target.matches('input, textarea, select')) {
        clearHint(e.target);
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Проверка обязательных полей
      const required = form.querySelectorAll('[required]');
      for (const el of required) {
        if (!el.value.trim()) {
          fieldHint(el, 'Заполните это поле');
          el.focus();
          return;
        }
      }

      // Проверка email — плашечка рядом с полем
      const emailInput = form.querySelector('input[type="email"]');
      if (emailInput) {
        const value = emailInput.value.trim();
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        if (!ok) {
          fieldHint(emailInput, 'Неверный email');
          emailInput.focus();
          return;
        }
      }

      const btn = form.querySelector('button[type="submit"]');
      const orig = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Отправка...';

      const data = new FormData(form);
      data.append('_subject', subject);
      data.append('_template', 'table');
      data.append('_captcha', 'false');

      try {
        const res = await fetch(`https://formsubmit.co/ajax/${EMAIL}`, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: data
        });
        if (!res.ok) throw new Error('Network error');

        form.innerHTML = `<p class="form-success">✅ ${successText}</p>`;

        setTimeout(() => {
          form.innerHTML = originalHTML;
        }, RESTORE_DELAY);

      } catch (err) {
        btn.disabled = false;
        btn.textContent = orig;
        fieldHint(btn, 'Не удалось отправить');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    attach(
      '#meme-form',
      '🎉 Новый мем от пользователя',
      'Спасибо! Мы обязательно посмотрим ваш мем.'
    );
    attach(
      '#feedback-form',
      '📬 Обращение с MemeZone',
      'Спасибо! Ваше обращение отправлено.'
    );
  });
})();