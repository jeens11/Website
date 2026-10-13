function createNavLink(section) {
  const link = document.createElement('a');
  link.href = `#${section.id}`;
  link.dataset.area = section.id;
  link.innerHTML = `<span class="nav-num">${section.number}</span>${section.label}`;
  return link;
}

/** Fade/slide content in as it scrolls into view, staggered within each group. */
function setupReveal(container, scroller) {
  const targets = container.querySelectorAll(
    '.section-heading, .lead, .timeline-row, .reflection, .featured-project, .process-strip article, .project-gallery figure, .project-card, .skill-card, .method-list span, .note-card, .education-card, .coursework, .philosophy, .principle-grid article, .contact-intro, .contact-email, .contact-links, .disclosure, .subheading, .section-footer, .sketch-gallery figure, .contrib',
  );

  const seen = new Map();
  const observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add('in');
              observer.unobserve(entry.target);
            });
          },
          { root: scroller, threshold: 0.08 },
        )
      : null;

  targets.forEach((element) => {
    const parent = element.parentElement;
    const index = seen.get(parent) || 0;

    seen.set(parent, index + 1);
    element.classList.add('reveal');
    element.style.setProperty('--i', Math.min(index, 8));

    if (observer) {
      observer.observe(element);
    } else {
      element.classList.add('in');
    }
  });
}

function makeSectionFragment(markup) {
  const template = document.createElement('template');
  template.innerHTML = markup;
  return template.content;
}

/** Builds navigation and handles the section overlay and classic reading view. */
export function createNavigation({ sections, controls, audio }) {
  const view = document.getElementById('contentView');
  const viewInner = document.getElementById('viewInner');
  const classic = document.getElementById('classicSite');
  const classicContent = document.getElementById('classicContent');
  const nav = document.getElementById('siteNav');
  const menuButton = document.getElementById('menuButton');

  const backgroundControls = [
    document.querySelector('.topbar'),
    document.getElementById('world'),
    document.getElementById('boostEffect'),
    document.querySelector('.hero'),
    document.querySelector('.world-coordinate'),
    document.querySelector('.scene-hint'),
    document.getElementById('mobileControls'),
    document.getElementById('mapWidget'),
    document.getElementById('proximityPrompt'),
  ];

  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');

  let lightboxReturn = null;
  let returnFocus = null;
  let openRequest = 0;

  const contentCache = new Map();

  function openLightbox(button) {
    lightboxReturn = button;
    lightboxImage.src = button.dataset.zoom;
    lightboxImage.alt = button.querySelector('img')?.alt || '';
    lightboxCaption.textContent = button.dataset.caption || '';
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');

    requestAnimationFrame(() => lightbox.classList.add('open'));

    document.getElementById('lightboxClose').focus({ preventScroll: true });
    audio?.play('open');
  }

  function closeLightbox() {
    if (lightbox.hidden) return false;

    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    lightbox.hidden = true;
    lightboxReturn?.focus?.({ preventScroll: true });
    audio?.play('close');

    return true;
  }

  function setBackgroundInert(value) {
    backgroundControls.forEach((element) => {
      if (element) element.inert = value;
    });
  }

  function loadSection(section) {
    if (!contentCache.has(section.id)) {
      contentCache.set(
        section.id,
        fetch(section.file).then((response) => {
          if (!response.ok) {
            throw new Error(`Could not load ${section.file}`);
          }

          return response.text();
        }),
      );
    }

    return contentCache.get(section.id);
  }

  async function openArea(id) {
    const section = sections.find((item) => item.id === id);
    if (!section) return;

    const wasOpen = view.classList.contains('open');
    const request = ++openRequest;

    if (!wasOpen) {
      returnFocus = document.activeElement;
    }

    controls.reset();
    audio?.setDrivingActive(false);

    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.textContent = 'Menu';
    nav.classList.remove('open');

    try {
      const markup = await loadSection(section);

      if (request !== openRequest) return;

      viewInner.replaceChildren(makeSectionFragment(markup));
      setupReveal(viewInner, view);
    } catch (error) {
      console.error(error);

      if (request !== openRequest) return;

      viewInner.innerHTML =
        '<p class="load-message">This section could not be loaded. Please refresh the page and try again.</p>';
    }

    document.getElementById('viewNumber').textContent = section.number;
    document.getElementById('viewName').textContent = section.label;

    document.querySelectorAll('[data-view-area]').forEach((button) => {
      button.classList.toggle('active', button.dataset.viewArea === id);
    });

    view.style.setProperty('--accent', section.color);
    view.classList.remove('open');

    // Re-trigger the entrance animation each time a section opens or switches.
    void view.offsetWidth;

    view.classList.add('open');
    view.setAttribute('aria-hidden', 'false');
    audio?.play(wasOpen ? 'switch' : 'open');

    classic.classList.remove('open');
    setBackgroundInert(true);
    view.scrollTop = 0;

    if (!wasOpen) {
      document.getElementById('backWorld').focus({ preventScroll: true });
    }
  }

  function closeArea() {
    const wasOpen = view.classList.contains('open');

    ++openRequest;

    if (wasOpen) {
      audio?.play('close');
    }

    view.classList.remove('open');
    view.setAttribute('aria-hidden', 'true');
    setBackgroundInert(classic.classList.contains('open'));
    controls.reset();
    audio?.setDrivingActive(!classic.classList.contains('open'));

    if (wasOpen && returnFocus?.isConnected) {
      returnFocus.focus({ preventScroll: true });
    }
  }

  async function openClassic() {
    classic.classList.add('open');
    closeArea();
    setBackgroundInert(true);
    nav.classList.remove('open');

    const results = await Promise.allSettled(sections.map(loadSection));

    classicContent.replaceChildren();

    results.forEach((result, index) => {
      const section = sections[index];
      const wrapper = document.createElement('section');

      wrapper.className = 'classic-section';
      wrapper.id = `classic-${section.id}`;
      wrapper.style.setProperty('--accent', section.color);

      if (result.status === 'fulfilled') {
        wrapper.append(makeSectionFragment(result.value));
      } else {
        const message = document.createElement('p');
        message.className = 'load-message';
        message.textContent = `Could not load ${section.label}.`;
        wrapper.append(message);
      }

      classicContent.append(wrapper);
      setupReveal(wrapper, classic);
    });

    classic.scrollTop = 0;
  }

  function closeClassic() {
    classic.classList.remove('open');
    audio?.setDrivingActive(true);
    setBackgroundInert(false);
  }

  function activateNav(event) {
    const target = event.target.closest('[data-area]');
    if (!target) return;

    event.preventDefault();
    openArea(target.dataset.area);
  }

  sections.forEach((section) => {
    nav.insertBefore(
      createNavLink(section),
      document.getElementById('classicToggle'),
    );

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.dataset.viewArea = section.id;
    tab.setAttribute('aria-label', section.label);
    tab.innerHTML =
      `<span class="tab-num">${section.number}</span>` +
      `<span class="tab-name">${section.label}</span>`;
    document.getElementById('viewTabs').append(tab);

    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'map-marker';
    marker.dataset.area = section.id;
    marker.textContent = section.number;
    marker.setAttribute('aria-label', `Open ${section.label}`);
    marker.title = `${section.number} · ${section.label}`;
    marker.dataset.name = section.label;
    document.getElementById('mapMarkers').append(marker);
  });

  document.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;

    if (event.target.closest('button:not(:disabled), a[href]')) {
      audio?.play('hover');
    }
  });

  document.addEventListener('click', (event) => {
    const control = event.target.closest('button:not(:disabled), a[href]');

    if (
      control &&
      !control.closest('[data-area]') &&
      !control.closest('#viewTabs') &&
      control.id !== 'soundToggle'
    ) {
      audio?.play('click');
    }
  });

  document.addEventListener('click', (event) => {
    const zoom = event.target.closest('.zoomable');

    if (zoom) {
      openLightbox(zoom);
    } else if (
      event.target.closest('#lightbox') &&
      !event.target.closest('figure')
    ) {
      closeLightbox();
    }
  });

  document
    .getElementById('lightboxClose')
    .addEventListener('click', closeLightbox);

  lightbox.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;

    event.preventDefault();
    document.getElementById('lightboxClose').focus();
  });

  document.addEventListener('click', activateNav);

  document.getElementById('viewTabs').addEventListener('click', (event) => {
    const tab = event.target.closest('[data-view-area]');
    if (tab) openArea(tab.dataset.viewArea);
  });

  document.getElementById('backWorld').addEventListener('click', closeArea);
  document.getElementById('classicToggle').addEventListener('click', openClassic);
  document.getElementById('worldToggle').addEventListener('click', closeClassic);

  document.getElementById('errorClassic').addEventListener('click', () => {
    document.getElementById('loadError').hidden = true;
    openClassic();
  });

  document.getElementById('openNear').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('portfolio:open-nearest'));
  });

  menuButton.addEventListener('click', () => {
    const open = nav.classList.toggle('open');

    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.textContent = open ? 'Close' : 'Menu';
  });

  document.querySelector('.brand').addEventListener('click', (event) => {
    event.preventDefault();
    closeArea();
    closeClassic();
    window.scrollTo(0, 0);
  });

  view.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;

    const focusable = [
      ...view.querySelectorAll(
        'button:not(:disabled), a[href], video[controls]',
      ),
    ].filter(
      (element) =>
        !element.hidden && element.getAttribute('tabindex') !== '-1',
    );

    if (!focusable.length) {
      event.preventDefault();
      document.getElementById('backWorld').focus();
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1);

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.code !== 'Escape') return;
    if (closeLightbox()) return;

    closeArea();
    closeClassic();
    nav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.textContent = 'Menu';
  });

  return {
    openArea,
    closeArea,
    openClassic,
    closeClassic,
  };
}