/* =========================================
   INDIEMANU — Main JS
   ========================================= */

'use strict';

// ── State ──
let PROJECTS = [];
let CATEGORIES = [];
let CONTENT = {};
let currentProjectIndex = 0;
let carouselIndex = 0;
let galleryIndex = 0;

// ── Init ──
async function init() {
  await Promise.all([loadProjects(), loadContent()]);
  initCursor();
  initNav();
  initMobileNav();
  initToast();
  initMinigame();
  initScrollEffects();
  router();
  window.addEventListener('hashchange', router);
}

// ── Load Projects ──
async function loadProjects() {
  try {
    const res = await fetch('js/projects.json');
    const data = await res.json();
    PROJECTS = data.projects;
    CATEGORIES = data.categories;
  } catch (e) {
    console.error('Failed to load projects', e);
    PROJECTS = [];
    CATEGORIES = [];
  }
}

// ── Load Content ──
async function loadContent() {
  try {
    const res = await fetch('js/content.json');
    CONTENT = await res.json();
  } catch (e) {
    console.warn('Failed to load content.json, using empty defaults', e);
    CONTENT = {};
  }
}

// ── Router ──
function router() {
  const hash = window.location.hash || '#home';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

  if (hash === '#home' || hash === '') {
    showPage('page-home');
    document.querySelector('[href="#home"]')?.classList.add('active');
    renderHome();
  } else if (hash === '#projects') {
    showPage('page-projects-list');
    document.querySelector('[href="#projects"]')?.classList.add('active');
    renderProjectsList();
  } else if (hash === '#about') {
    showPage('page-about');
    document.querySelector('[href="#about"]')?.classList.add('active');
    renderAbout();
  } else if (hash === '#contact') {
    showPage('page-contact');
    document.querySelector('[href="#contact"]')?.classList.add('active');
    renderContact();
  } else if (hash.startsWith('#project/')) {
    const slug = hash.replace('#project/', '');
    showPage('page-project');
    renderProject(slug);
  }
  window.scrollTo(0, 0);
}

function showPage(id) {
  const page = document.getElementById(id);
  if (!page) return;
  page.classList.add('active', 'page-enter');
  setTimeout(() => page.classList.remove('page-enter'), 500);
}

// =========================================
// HOME PAGE
// =========================================
function renderHome() {
  renderHeroParticles();
  renderCarousel();
  renderAboutMini();
  renderSkills();
  renderHomeExperience();
}

function renderHeroParticles() {
  const container = document.getElementById('hero-particles');
  if (!container || container.children.length > 0) return;
  for (let i = 0; i < 30; i++) {
    const s = document.createElement('span');
    s.style.left = Math.random() * 100 + '%';
    s.style.setProperty('--dur', (6 + Math.random() * 10) + 's');
    s.style.setProperty('--delay', (Math.random() * 8) + 's');
    s.style.setProperty('--drift', ((Math.random() - 0.5) * 80) + 'px');
    container.appendChild(s);
  }
}

// ── Carousel ──
function renderCarousel() {
  const track = document.getElementById('carousel-track');
  const dotsContainer = document.getElementById('carousel-dots');
  if (!track) return;

  track.innerHTML = PROJECTS.map(p => `
    <div class="project-card" onclick="navigate('project/${p.slug}')" role="button" tabindex="0">
      <div style="overflow:hidden;aspect-ratio:16/9">
        <img class="project-card-thumb" src="${p.coverImage}" alt="${p.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/640x360/1e1e26/7a7a8c?text=${encodeURIComponent(p.title)}'">
      </div>
      <div class="project-card-overlay">
        <div class="project-card-play">VIEW PROJECT</div>
      </div>
      <div class="project-card-body">
        <div class="project-card-cat">${p.categoryLabel}</div>
        <div class="project-card-title">${p.title}</div>
        <div class="project-card-role">${p.role}</div>
        <div class="project-card-meta">
          <span>📅 ${p.year}</span>
          <span>👥 ${p.teamSize}</span>
          <span>⏱ ${p.duration}</span>
        </div>
      </div>
    </div>
  `).join('');

  // dots
  if (dotsContainer) {
    dotsContainer.innerHTML = PROJECTS.map((_, i) =>
      `<div class="carousel-dot ${i===0?'active':''}" onclick="goToSlide(${i})"></div>`
    ).join('');
  }

  startCarouselAuto();
}

let carouselTimer = null;
function startCarouselAuto() {
  clearInterval(carouselTimer);
  carouselTimer = setInterval(() => moveCarousel(1), 4000);
}
function stopCarouselAuto() { clearInterval(carouselTimer); }

function moveCarousel(dir) {
  const track = document.getElementById('carousel-track');
  const cards = track?.querySelectorAll('.project-card');
  if (!cards || cards.length === 0) return;

  const visibleCount = window.innerWidth < 700 ? 1 : window.innerWidth < 1100 ? 2 : 3;
  const maxIndex = Math.max(0, cards.length - visibleCount);
  carouselIndex = Math.max(0, Math.min(carouselIndex + dir, maxIndex));

  const cardW = cards[0].offsetWidth + 24; // gap
  track.style.transform = `translateX(-${carouselIndex * cardW}px)`;
  updateCarouselDots();
}

function goToSlide(i) {
  carouselIndex = i;
  const track = document.getElementById('carousel-track');
  const cards = track?.querySelectorAll('.project-card');
  if (!cards || cards.length === 0) return;
  const cardW = cards[0].offsetWidth + 24;
  track.style.transform = `translateX(-${carouselIndex * cardW}px)`;
  updateCarouselDots();
  stopCarouselAuto();
  startCarouselAuto();
}

function updateCarouselDots() {
  document.querySelectorAll('#carousel-dots .carousel-dot').forEach((d, i) => {
    d.classList.toggle('active', i === carouselIndex);
  });
}

// ── About mini ──
function renderAboutMini() {
  // static content in HTML; just animate stats
  const statNums = document.querySelectorAll('.stat-num');
  statNums.forEach(el => {
    const target = parseInt(el.dataset.target || '0');
    let cur = 0;
    const step = Math.ceil(target / 30);
    const interval = setInterval(() => {
      cur = Math.min(cur + step, target);
      el.textContent = cur + (el.dataset.suffix || '');
      if (cur >= target) clearInterval(interval);
    }, 40);
  });
}

// ── Skills (home) ──
function renderSkills() {
  const grid = document.getElementById('skills-grid');
  if (!grid) return;
  const skills = CONTENT.homeSkills || [];
  grid.innerHTML = skills.map(s => `
    <div class="skill-pill">
      <span class="skill-pill-icon">${s.icon}</span>
      <span class="skill-pill-name">${s.name}</span>
      <span class="skill-pill-lvl">${s.lvl}</span>
    </div>
  `).join('');
}

// ── Home experience log ──
function renderHomeExperience() {
  const container = document.getElementById('home-experience-log');
  if (!container) return;
  const items = CONTENT.homeExperience || [];
  container.innerHTML = items.map(e => `
    <div class="cv-entry">
      <div class="cv-year">${e.year}</div>
      <div class="cv-role">${e.role}</div>
      <div class="cv-org">${e.org}</div>
    </div>
  `).join('');
}

// =========================================
// ALL PROJECTS PAGE
// =========================================
function renderProjectsList() {
  const container = document.getElementById('projects-list-container');
  if (!container) return;

  // Projects require fetch() which needs a real HTTP server (not file://)
  if (PROJECTS.length === 0) {
    const isFile = window.location.protocol === 'file:';
    document.getElementById('projects-count').textContent = '// 0 projects found';
    container.innerHTML = `
      <div class="no-results" style="padding:3rem 0;text-align:center;line-height:2">
        ${isFile
          ? `<div style="color:var(--accent);margin-bottom:1rem">// ERROR: FILE:// PROTOCOL</div>
             <div style="font-size:11px;color:var(--text-muted)">
               Projects require a local HTTP server.<br>
               Run: <code style="color:var(--accent)">npx serve .</code> or <code style="color:var(--accent)">python3 -m http.server 8080</code><br>
               then open <code style="color:var(--accent)">http://localhost:8080</code>
             </div>`
          : `<div style="color:var(--accent)">// FAILED TO LOAD PROJECTS</div>
             <div style="font-size:11px;color:var(--text-muted);margin-top:1rem">Check the browser console for details.</div>`
        }
      </div>`;
    return;
  }

  const searchInput = document.getElementById('projects-search');
  const filterTabs = document.getElementById('filter-tabs');

  if (filterTabs && filterTabs.innerHTML === '') {
    filterTabs.innerHTML = CATEGORIES.map(c =>
      `<button class="filter-tab ${c.id === 'all' ? 'active' : ''}" onclick="filterProjects('${c.id}', this)">${c.label}</button>`
    ).join('');
  }

  if (searchInput) {
    searchInput.oninput = () => renderProjectsFiltered();
  }

  renderProjectsFiltered();
}

function filterProjects(catId, btn) {
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderProjectsFiltered();
}

function renderProjectsFiltered() {
  const container = document.getElementById('projects-list-container');
  const searchVal = (document.getElementById('projects-search')?.value || '').toLowerCase().trim();
  const activeTab = document.querySelector('.filter-tab.active')?.textContent.trim();
  const activeCatId = CATEGORIES.find(c => c.label === activeTab)?.id || 'all';

  let filtered = PROJECTS.filter(p => {
    const matchCat = activeCatId === 'all' || p.category === activeCatId;
    const matchSearch = !searchVal ||
      p.title.toLowerCase().includes(searchVal) ||
      p.tags.some(t => t.toLowerCase().includes(searchVal)) ||
      p.role.toLowerCase().includes(searchVal) ||
      p.description.toLowerCase().includes(searchVal);
    return matchCat && matchSearch;
  });

  document.getElementById('projects-count').textContent =
    `// ${filtered.length} project${filtered.length !== 1 ? 's' : ''} found`;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="no-results">// NO PROJECTS FOUND</div>';
    return;
  }

  if (activeCatId === 'all') {
    // Group by category
    const groups = {};
    CATEGORIES.filter(c => c.id !== 'all').forEach(c => {
      const items = filtered.filter(p => p.category === c.id);
      if (items.length > 0) groups[c.id] = { label: c.label, items };
    });

    container.innerHTML = Object.entries(groups).map(([, group]) => `
      <div class="projects-group">
        <div class="projects-group-title" data-count="${group.items.length} games">${group.label}</div>
        <div class="projects-list-grid">
          ${group.items.map(p => projectListCard(p)).join('')}
        </div>
      </div>
    `).join('');
  } else {
    container.innerHTML = `<div class="projects-list-grid">${filtered.map(p => projectListCard(p)).join('')}</div>`;
  }
}

function projectListCard(p) {
  return `
    <div class="project-list-item" onclick="navigate('project/${p.slug}')" role="button" tabindex="0">
      <div style="overflow:hidden">
        <img class="project-list-item-thumb" src="${p.coverImage}" alt="${p.title}" loading="lazy"
          onerror="this.src='https://via.placeholder.com/640x360/1e1e26/7a7a8c?text=${encodeURIComponent(p.title)}'">
      </div>
      <div class="project-list-item-body">
        <div class="project-list-item-cat">${p.categoryLabel}</div>
        <div class="project-list-item-title">${p.title}</div>
        <div class="project-list-item-role">${p.role} · ${p.year}</div>
        <div class="project-list-item-tags">
          ${p.tags.slice(0, 4).map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

// =========================================
// SINGLE PROJECT PAGE
// =========================================
function renderProject(slug) {
  const idx = PROJECTS.findIndex(p => p.slug === slug);
  if (idx === -1) { navigate('home'); return; }
  currentProjectIndex = idx;
  const p = PROJECTS[idx];

  document.getElementById('project-hero-img').src = p.heroImage || p.coverImage;
  document.getElementById('project-hero-img').alt = p.title;
  document.getElementById('project-cat').textContent = p.categoryLabel;
  document.getElementById('project-title').textContent = p.title;
  document.getElementById('project-sub').textContent = p.subtitle;
  const bc = document.getElementById('project-title-bc');
  if (bc) bc.textContent = p.title.toUpperCase();

  // Meta
  const metaBody = document.getElementById('project-meta-body');
  metaBody.innerHTML = [
    { k: 'ROLE', v: p.role },
    { k: 'YEAR', v: p.year },
    { k: 'DURATION', v: p.duration },
    { k: 'TEAM', v: p.teamSize },
    { k: 'ENGINE', v: p.engine },
    { k: 'PLATFORM', v: p.platform.join(', ') },
  ].map(r => `
    <div class="meta-row">
      <span class="meta-key">${r.k}</span>
      <span class="meta-val">${r.v}</span>
    </div>
  `).join('');

  // Description
  document.getElementById('project-description').innerHTML = `<p>${p.longDescription}</p>`;

  // Tags
  document.getElementById('project-tags').innerHTML = p.tags.map(t => `<span class="tag">${t}</span>`).join('');

  // Links
  const linksContainer = document.getElementById('project-links');
  linksContainer.innerHTML = p.links.map(l => `
    <a href="${l.url}" target="_blank" rel="noopener" class="project-link-btn ${l.icon === 'steam' || l.icon === 'itch' ? 'primary' : ''}">
      <span>${linkIcon(l.icon)}</span>
      <span>${l.label}</span>
    </a>
  `).join('') || '<div style="color:var(--text-dim);font-size:11px">No links available yet</div>';

  // Gallery — pass folder path; renderGallery probes for images
  renderGallery(p.galleryFolder || null, p.gallery || []);

  // Prev/Next
  const prev = idx > 0 ? PROJECTS[idx - 1] : null;
  const next = idx < PROJECTS.length - 1 ? PROJECTS[idx + 1] : null;

  const prevBtn = document.getElementById('btn-prev-project');
  const nextBtn = document.getElementById('btn-next-project');

  if (prevBtn) {
    if (prev) {
      prevBtn.style.display = 'flex';
      prevBtn.querySelector('.pnb-title').textContent = prev.title;
      prevBtn.onclick = () => navigate('project/' + prev.slug);
    } else { prevBtn.style.display = 'none'; }
  }
  if (nextBtn) {
    if (next) {
      nextBtn.style.display = 'flex';
      nextBtn.querySelector('.pnb-title').textContent = next.title;
      nextBtn.onclick = () => navigate('project/' + next.slug);
    } else { nextBtn.style.display = 'none'; }
  }

  document.documentElement.style.setProperty('--accent', p.color || '#ff4655');
  setTimeout(() => document.documentElement.style.removeProperty('--accent'), 3000);
}

function linkIcon(type) {
  const icons = { steam: '🎮', itch: '🕹️', download: '⬇️', github: '💻', url: '🔗' };
  return icons[type] || '🔗';
}

// ── renderGallery ──────────────────────────────────────────────────────
// galleryFolder: path like "/files/images/gallery/ride6"
// fallbackImages: old-style array of explicit paths (backwards compat)
//
// Strategy: try loading images 1.png, 2.png … up to MAX_GALLERY from the
// folder. Images that 404 are silently skipped via onerror.
// On hover shows a semi-transparent overlay with the filename.
// ──────────────────────────────────────────────────────────────────────
const MAX_GALLERY = 20; // probe up to this many numbered images

function renderGallery(galleryFolder, fallbackImages) {
  const track = document.getElementById('gallery-track');
  if (!track) return;
  galleryIndex = 0;
  track.innerHTML = '';

  // Build candidate list
  let candidates = [];
  if (galleryFolder) {
    // Normalise trailing slash
    const folder = galleryFolder.replace(/\/$/, '');
    for (let i = 1; i <= MAX_GALLERY; i++) {
      candidates.push(`${folder}/${i}.png`);
    }
    // Also probe common named variants just in case
    // (they'll silently fail if absent)
  } else if (fallbackImages && fallbackImages.length) {
    candidates = fallbackImages;
  }

  if (candidates.length === 0) {
    track.parentElement.style.display = 'none';
    return;
  }
  track.parentElement.style.display = 'block';

  // We must probe each image — insert all, hide on error
  candidates.forEach(src => {
    const filename = src.split('/').pop(); // e.g. "1.png" or "boss_arena.png"
    const baseName = filename.replace(/\.[^.]+$/, ''); // strip extension

    const wrapper = document.createElement('div');
    wrapper.className = 'gallery-item-wrapper';
    wrapper.innerHTML = `
      <img class="gallery-item" src="${src}" alt="${baseName}" loading="lazy"
           onerror="this.closest('.gallery-item-wrapper').remove(); updateGalleryVisibility();">
      <div class="gallery-item-label">${baseName}</div>
    `;
    wrapper.querySelector('img').addEventListener('click', () => openLightbox(src, baseName));
    track.appendChild(wrapper);
  });
}

function updateGalleryVisibility() {
  const track = document.getElementById('gallery-track');
  if (!track) return;
  const remaining = track.querySelectorAll('.gallery-item-wrapper').length;
  track.parentElement.style.display = remaining === 0 ? 'none' : 'block';
}

function moveGallery(dir) {
  const track = document.getElementById('gallery-track');
  const items = track?.querySelectorAll('.gallery-item-wrapper');
  if (!items || items.length === 0) return;
  const max = Math.max(0, items.length - 2);
  galleryIndex = Math.max(0, Math.min(galleryIndex + dir, max));
  const itemW = items[0].offsetWidth + 16;
  track.style.transform = `translateX(-${galleryIndex * itemW}px)`;
}

function openLightbox(src, name) {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.querySelector('img').src = src;
  const caption = lb.querySelector('.lightbox-caption');
  if (caption) caption.textContent = name || src.split('/').pop().replace(/\.[^.]+$/, '');
  lb.classList.add('open');
}
function closeLightbox() {
  document.getElementById('lightbox')?.classList.remove('open');
}

// =========================================
// ABOUT PAGE
// =========================================
function renderAbout() {
  _renderAboutTimeline('about-work-timeline',    CONTENT.aboutWork       || []);
  _renderAboutTimeline('about-edu-timeline',     CONTENT.aboutEducation  || []);
  _renderSkillBars(    'about-skill-bars',       CONTENT.aboutSkillBars  || []);
  _renderTools(        'about-tools',            CONTENT.aboutTools      || []);
  _renderSkillBars(    'about-languages',        CONTENT.aboutLanguages  || [], true);
  setTimeout(() => {
    document.querySelectorAll('.skill-bar-fill').forEach(bar => bar.classList.add('animated'));
  }, 200);
}

function _renderAboutTimeline(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = items.map(e => `
    <div class="cv-item">
      <div class="cv-item-year">${e.year}</div>
      <div class="cv-item-role">${e.role}</div>
      <div class="cv-item-org">${e.org}</div>
      ${e.desc ? `<div class="cv-item-desc">${e.desc}</div>` : ''}
    </div>
  `).join('');
}

function _renderSkillBars(id, items, isLang) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = items.map(s => `
    <div class="skill-bar-item">
      <div class="skill-bar-label">
        <span>${s.name}</span>
        <span>${isLang ? s.label : s.pct + '%'}</span>
      </div>
      <div class="skill-bar-track">
        <div class="skill-bar-fill" style="width:${s.pct}%"></div>
      </div>
    </div>
  `).join('');
}

function _renderTools(id, tools) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = tools.map(t => `<span class="tag">${t}</span>`).join('');
}

// =========================================
// CONTACT PAGE
// =========================================
function renderContact() {
  const grid = document.getElementById('contact-grid');
  if (!grid) return;
  const contacts = CONTENT.contacts || [];
  grid.innerHTML = contacts.map(c => {
    if (c.copyValue) {
      return `
        <div class="contact-card" onclick="navigator.clipboard.writeText('${c.copyValue}').then(()=>showToast('${c.copyToast}'))" style="cursor:pointer">
          <span class="contact-card-icon">${c.icon}</span>
          <span class="contact-card-platform">${c.platform}</span>
          <span class="contact-card-handle">${c.handle}</span>
          <span class="contact-card-desc">${c.desc}</span>
          <span class="contact-card-arrow">${c.arrow}</span>
        </div>`;
    }
    if (c.static) {
      return `
        <div class="contact-card" style="cursor:default;border-style:dashed">
          <span class="contact-card-icon">${c.icon}</span>
          <span class="contact-card-platform">${c.platform}</span>
          <span class="contact-card-handle">${c.handle}</span>
          <span class="contact-card-desc">${c.desc}</span>
          <span class="contact-card-arrow" style="color:var(--text-dim)">${c.arrow}</span>
        </div>`;
    }
    const attrs = c.external ? 'target="_blank" rel="noopener"' : '';
    return `
      <a href="${c.href}" class="contact-card" ${attrs}>
        <span class="contact-card-icon">${c.icon}</span>
        <span class="contact-card-platform">${c.platform}</span>
        <span class="contact-card-handle">${c.handle}</span>
        <span class="contact-card-desc">${c.desc}</span>
        <span class="contact-card-arrow">${c.arrow}</span>
      </a>`;
  }).join('');
}

// =========================================
// NAVIGATION
// =========================================
function navigate(path) {
  window.location.hash = path;
}

function initNav() {
  document.addEventListener('scroll', () => {
    const nav = document.getElementById('nav');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 30);
  });
}

function initMobileNav() {
  const ham = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  if (ham && mobileNav) {
    ham.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
    });
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobileNav.classList.remove('open'));
    });
  }
}

// =========================================
// CUSTOM CURSOR
// =========================================
function initCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor) return;
  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });
  document.addEventListener('mouseover', e => {
    const target = e.target;
    const hoverable = target.closest('a, button, [role="button"], .project-card, .project-list-item, .contact-card');
    cursor.classList.toggle('hovering', !!hoverable);
  });
}

// =========================================
// TOAST
// =========================================
let toastTimer = null;
function initToast() { /* ready */ }
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// =========================================
// SCROLL EFFECTS
// =========================================
function initScrollEffects() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  const observe = () => {
    document.querySelectorAll('.project-card, .project-list-item, .stat-box, .skill-pill, .cv-item, .contact-card').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(el);
    });
  };

  // Re-observe on page change
  const hashObs = new MutationObserver(observe);
  hashObs.observe(document.getElementById('app'), { childList: true, subtree: true });
  observe();
}

// =========================================
// MINIGAME — NieR:Automata Credits Battle
// =========================================
function initMinigame() {
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let konamiIdx = 0;
  document.addEventListener('keydown', e => {
    if (e.key === KONAMI[konamiIdx]) {
      konamiIdx++;
      if (konamiIdx === KONAMI.length) {
        konamiIdx = 0;
        openMinigame();
      }
    } else {
      konamiIdx = 0;
    }
  });
}

function openMinigame() {
  showToast('// [REDACTED] — SYSTEM OVERRIDE INITIATED');
  setTimeout(() => {
    showToast('// ALL ENEMIES OF THIS PORTFOLIO HAVE BEEN IDENTIFIED');
  }, 1800);
  setTimeout(() => {
    if (typeof startNierBattle === 'function') startNierBattle();
  }, 3200);
}

function closeMinigame() {
  if (typeof stopNierBattle === 'function') stopNierBattle(true);
}

// =========================================
// KONAMI HINT on contact page
// =========================================
function initKonamiHint() {
  const el = document.getElementById('konami-hint');
  if (el) el.textContent = '↑ ↑ ↓ ↓ ← → ← → B A';
}

// =========================================
// EXPOSE GLOBALS
// =========================================
window.navigate = navigate;
window.moveCarousel = moveCarousel;
window.goToSlide = goToSlide;
window.filterProjects = filterProjects;
window.moveGallery = moveGallery;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.closeMinigame = closeMinigame;

// ── Boot ──
document.addEventListener('DOMContentLoaded', init);
