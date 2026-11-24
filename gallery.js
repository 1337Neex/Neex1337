(() => {
  const intro = document.querySelector('#intro');
  const sections = [...intro.querySelectorAll('section[id]')];
  const catalogs = [document.querySelector('#projects'), document.querySelector('#references')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const references = catalogs[1];
  const picks = [...references.querySelectorAll('.reference-pick')];
  const selection = references.querySelector('.selection');
  const selectionJump = references.querySelector('.selection-jump');
  const referenceList = references.querySelector('#reference-list');
  const copyStatus = references.querySelector('.copy-status');
  const storageKey = 'made-by-neex:references';

  function renderRoute(hash, { animate = false, focus = false } = {}) {
    const active = catalogs.find(catalog => `#${catalog.id}` === hash);
    const returningFromCatalog = intro.hidden;
    intro.hidden = Boolean(active);
    for (const catalog of catalogs) catalog.hidden = catalog !== active;

    if (active) {
      scrollTo({ top: 0, behavior: 'instant' });
      if (focus) active.querySelector('h1').focus({ preventScroll: true });
      if (animate && !reducedMotion.matches) {
        active.animate([
          { opacity: .16, transform: 'translateY(24px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ], { duration: 320, easing: 'cubic-bezier(.2,.75,.25,1)' });
      }
      return;
    }

    const section = sections.find(item => `#${item.id}` === hash);
    if (section) {
      const smoothScroll = animate && !reducedMotion.matches && !returningFromCatalog;
      section.scrollIntoView({ behavior: smoothScroll ? 'smooth' : 'instant' });
      if (focus) section.querySelector('h2').focus({ preventScroll: true });
    } else {
      scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const hash = link.hash;
    if (hash !== '#intro' && ![...sections, ...catalogs].some(item => `#${item.id}` === hash)) return;
    event.preventDefault();
    if (link.classList.contains('shelf-card') && location.hash !== '#works') {
      history.replaceState(null, '', '#works');
    }
    if (location.hash !== hash) history.pushState(null, '', hash);
    renderRoute(hash, { animate: true, focus: hash !== '#intro' });
  });
  history.scrollRestoration = 'manual';
  window.addEventListener('hashchange', () => renderRoute(location.hash, { focus: true }));
  for (const button of references.querySelectorAll('[data-jump]')) {
    button.addEventListener('click', () => {
      const heading = document.getElementById(button.dataset.jump);
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    });
  }

  function updateSelection() {
    const chosen = picks.filter(button => button.getAttribute('aria-pressed') === 'true')
      .map(button => {
        const item = button.closest('.catalog-item');
        const title = item.querySelector('h3').textContent;
        const url = new URL(item.querySelector('.reference-source').href);
        return url.protocol === 'file:' ? title : `${title} — ${url.href}`;
      });
    selection.hidden = chosen.length === 0;
    selectionJump.hidden = selection.hidden;
    selectionJump.textContent = `Мой выбор (${chosen.length})`;
    referenceList.value = chosen.join('\n');
    copyStatus.textContent = '';
  }

  let savedIds = [];
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    // Earlier versions stored positions from the public-only list.
    const previousOrder = ['ivory', 'lura', 'timemore'];
    if (Array.isArray(stored)) savedIds = stored.map(id => Number.isInteger(id) ? previousOrder[id] : id);
  } catch {
    // The current page still keeps the selection if browser storage is unavailable.
  }
  function setPick(button, selected) {
    button.setAttribute('aria-pressed', String(selected));
    button.textContent = selected ? 'Выбрано' : 'Выбрать';
    const action = selected ? 'Убрать' : 'Выбрать';
    button.setAttribute('aria-label', `${action} ${button.closest('.catalog-item').querySelector('h3').textContent}`);
  }
  for (const button of picks) {
    setPick(button, savedIds.includes(button.dataset.referenceId));
    button.addEventListener('click', () => {
      setPick(button, button.getAttribute('aria-pressed') !== 'true');
      updateSelection();
      try {
        const ids = picks.filter(pick => pick.getAttribute('aria-pressed') === 'true')
          .map(pick => pick.dataset.referenceId);
        localStorage.setItem(storageKey, JSON.stringify(ids));
      } catch {
        // Copying the current selection works without storage.
      }
    });
  }
  references.querySelector('#copy-references').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(referenceList.value);
      copyStatus.textContent = 'Подборка скопирована';
    } catch {
      referenceList.focus();
      referenceList.select();
      copyStatus.textContent = 'Подборка выделена. Скопируйте её вручную.';
    }
  });
  updateSelection();
  renderRoute(location.hash);
})();
