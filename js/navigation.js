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
    '.section-heading, .lead, .timeline-row, .reflection, .project-card, .skill-card, .method-list span, .note-card, .education-card, .coursework, .philosophy, .principle-grid article, .contact-intro, .contact-email, .contact-links, .subheading, .section-footer, .contrib-block, .story-step, .growth, .learn-card, .method-matrix, .tool-table, .approach-steps li, .log-list li',
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
  const portfolioNav = document.getElementById('portfolioNav');
  const portfolioMenuButton = document.getElementById('portfolioMenuButton');

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
    document.getElementById('worldHome'),
    document.getElementById('worldReward'),
  ];

  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');

  let lightboxReturn = null;
  let returnFocus = null;
  let openRequest = 0;
  let classicLoad;
  let portfolioScroll = 0;

  const contentCache = new Map();

  function openLightbox(button) {
    lightboxReturn = button;
    lightboxImage.src = button.dataset.zoom;
    lightboxImage.alt = button.querySelector('img')?.alt || '';
    lightboxCaption.textContent = button.dataset.caption || '';
    // Paper sketches sit on paper; screenshots sit on the dark stage.
    lightbox.classList.toggle('is-paper', button.classList.contains('zoomable--paper'));
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    classic.inert = true;
    view.inert = true;
    document.body.classList.add('lightbox-open');

    requestAnimationFrame(() => lightbox.classList.add('open'));

    document.getElementById('lightboxClose').focus({ preventScroll: true });
    if (!classic.classList.contains('open')) audio?.play('open');
  }

  function closeLightbox() {
    if (lightbox.hidden) return false;

    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    lightbox.hidden = true;
    classic.inert = !classic.classList.contains('open');
    view.inert = !view.classList.contains('open');
    document.body.classList.remove('lightbox-open');
    lightboxReturn?.focus?.({ preventScroll: true });
    if (!classic.classList.contains('open')) audio?.play('close');

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
        }).catch((error) => {
          contentCache.delete(section.id);
          throw error;
        }),
      );
    }

    return contentCache.get(section.id);
  }

  async function openArea(id, projectId) {
    const section = sections.find((item) => item.id === id);
    if (!section) return;
    if (classic.classList.contains('open')) return openClassic(projectId || id);

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

      viewInner.querySelectorAll('video').forEach((video) => video.pause());
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
    view.inert = false;
    document.dispatchEvent(new CustomEvent('portfolio:section-opened', { detail: { id } }));
    view.setAttribute('aria-hidden', 'false');
    audio?.play(wasOpen ? 'switch' : 'open');

    classic.classList.remove('open');
    classic.inert = true;
    setBackgroundInert(true);
    view.scrollTop = 0;

    if (!wasOpen) {
      document.getElementById('backWorld').focus({ preventScroll: true });
    }

    const project = projectId && viewInner.querySelector(`[data-project-id="${CSS.escape(projectId)}"]`);
    project?.scrollIntoView({ block: 'start' });
  }

  function closeArea() {
    const wasOpen = view.classList.contains('open');

    ++openRequest;

    if (wasOpen) {
      audio?.play('close');
    }

    view.classList.remove('open');
    view.querySelectorAll('video').forEach((video) => video.pause());
    view.inert = true;
    view.setAttribute('aria-hidden', 'true');
    setBackgroundInert(classic.classList.contains('open'));
    controls.reset();
    audio?.setDrivingActive(!classic.classList.contains('open'));

    if (wasOpen && returnFocus?.isConnected) {
      returnFocus.focus({ preventScroll: true });
    }
  }

  function closePortfolioMenu() {
    portfolioNav.classList.remove('open');
    portfolioMenuButton.setAttribute('aria-expanded', 'false');
    portfolioMenuButton.innerHTML = 'Menu <span aria-hidden="true">+</span>';
  }

  function loadClassic() {
    if (classicLoad) return classicLoad;
    const ordered = sections;
    classicLoad = Promise.allSettled(ordered.map(loadSection)).then((results) => {
      classicContent.replaceChildren();
      results.forEach((result, index) => {
        const section = ordered[index];
        const wrapper = document.createElement('section');
        wrapper.className = 'classic-section';
        wrapper.id = `classic-${section.id}`;
        wrapper.dataset.section = section.id;
        wrapper.style.setProperty('--accent', section.color);
        wrapper.setAttribute('aria-label', section.label);
        if (result.status === 'fulfilled') {
          wrapper.append(makeSectionFragment(result.value));
        } else {
          const message = document.createElement('p');
          message.className = 'load-message';
          message.append(`Could not load ${section.label}. `);
          const retry = document.createElement('button');
          retry.type = 'button';
          retry.textContent = 'Try again';
          retry.addEventListener('click', () => {
            classicLoad = null;
            openClassic(section.id);
          });
          message.append(retry);
          wrapper.append(message);
        }
        classicContent.append(wrapper);
        setupReveal(wrapper, null);
      });
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            portfolioNav.querySelectorAll('[data-area]').forEach((link) => {
              if (link.dataset.area === entry.target.dataset.section) link.setAttribute('aria-current', 'location');
              else link.removeAttribute('aria-current');
            });
          });
        }, { rootMargin: '-15% 0px -65% 0px' });
        classicContent.querySelectorAll('.classic-section').forEach((section) => observer.observe(section));

        const projectLinks = classicContent.querySelectorAll('.project-jump [data-project]');
        const projectObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            projectLinks.forEach((link) => {
              if (link.dataset.project === entry.target.dataset.projectId) link.setAttribute('aria-current', 'true');
              else link.removeAttribute('aria-current');
            });
          });
        }, { rootMargin: '-30% 0px -60% 0px' });
        classicContent.querySelectorAll('[data-project-id]').forEach((project) => projectObserver.observe(project));
      }
    });
    return classicLoad;
  }

  async function openClassic(target) {
    const returning = !classic.classList.contains('open');
    classic.classList.add('open');
    classic.inert = false;
    classic.setAttribute('aria-hidden', 'false');
    document.body.classList.add('portfolio-mode');
    closeArea();
    setBackgroundInert(true);
    audio?.setDrivingActive(false);
    nav.classList.remove('open');
    closePortfolioMenu();
    await loadClassic();
    // Move focus only when switching from the world (on first load the page has no focus yet).
    if (returning && document.activeElement !== document.body) document.querySelector('.portfolio-brand').focus({ preventScroll: true });
    const id = typeof target === 'string' ? target : '';
    const destination = document.getElementById(`classic-${id}`) || classicContent.querySelector(`[data-project-id="${CSS.escape(id)}"]`);
    if (destination && id) {
      history.replaceState(null, '', `#${id}`);
      destination.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    } else if (id === 'home') {
      history.replaceState(null, '', '#home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo(0, portfolioScroll);
    }
  }

  function closeClassic() {
    portfolioScroll = window.scrollY;
    classic.querySelectorAll('video').forEach((video) => video.pause());
    classic.classList.remove('open');
    classic.inert = true;
    classic.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('portfolio-mode');
    document.body.classList.remove('is-driving');
    closePortfolioMenu();
    window.scrollTo(0, 0);
    audio?.setDrivingActive(true);
    setBackgroundInert(false);
    document.dispatchEvent(new CustomEvent('portfolio:enter-world'));
  }

  /** Scroll to a project or piece of evidence, in whichever view is showing. */
  function showProject(projectId, sectionId) {
    if (classic.classList.contains('open')) return openClassic(projectId);
    const inView = view.classList.contains('open')
      && viewInner.querySelector(`[data-project-id="${CSS.escape(projectId)}"]`);
    if (inView) {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      inView.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      return undefined;
    }
    return openArea(sectionId, projectId);
  }

  function activateNav(event) {
    const target = event.target.closest('[data-area]');
    if (!target) return;

    event.preventDefault();
    const navigation = openArea(target.dataset.area);
    if (target.classList.contains('skip-link')) {
      navigation.then(() => classicContent.focus({ preventScroll: true }));
    }
  }

  const toc = document.querySelector('.portfolio-toc');
  sections.forEach((section) => {
    const link = document.createElement('a');
    link.href = `#${section.id}`;
    link.dataset.area = section.id;
    link.textContent = section.label;
    portfolioNav.append(link);

    const item = document.createElement('li');
    item.innerHTML = `<a href="#${section.id}" data-area="${section.id}"><span>${section.number}</span><b>${section.label}</b><small>${section.summary}</small></a>`;
    toc?.append(item);
  });
  const worldButton = document.createElement('button');
  worldButton.id = 'worldToggle';
  worldButton.type = 'button';
  worldButton.textContent = '3D world';
  portfolioNav.append(worldButton);

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
    if (event.pointerType === 'touch' || classic.classList.contains('open')) return;

    if (event.target.closest('button:not(:disabled), a[href]')) {
      audio?.play('hover');
    }
  });

  document.addEventListener('click', (event) => {
    const control = event.target.closest('button:not(:disabled), a[href]');

    if (
      !classic.classList.contains('open') && control &&
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

  portfolioMenuButton.addEventListener('click', () => {
    const open = portfolioNav.classList.toggle('open');
    portfolioMenuButton.setAttribute('aria-expanded', String(open));
    portfolioMenuButton.innerHTML = open ? 'Close <span aria-hidden="true">−</span>' : 'Menu <span aria-hidden="true">+</span>';
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.portfolio-header')) closePortfolioMenu();
    const home = event.target.closest('[data-portfolio-home]');
    const project = event.target.closest('[data-project]');
    if (home) {
      event.preventDefault();
      openClassic('home');
    } else if (project) {
      event.preventDefault();
      showProject(project.dataset.project, project.dataset.in || 'projects');
    }
    if (event.target.closest('[data-open-classic]')) openClassic();
  });
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (!classic.classList.contains('open') && (!id || id === 'home' || id === 'world')) return;
    openClassic(id || 'home');
  });

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
    document.dispatchEvent(new CustomEvent('portfolio:world-home'));
  });

  view.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;

    const focusable = [
      ...view.querySelectorAll(
        'button:not(:disabled), a[href], video[controls], summary',
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
    closePortfolioMenu();
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
