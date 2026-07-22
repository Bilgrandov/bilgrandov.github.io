/**
 * bilgrandov.lab — Client Application Controller
 * 
 * Main JavaScript controller handling dynamic routing, Supabase data fetching,
 * theme persistence, project archiving, interactive skill matrix, and guestbook state.
 *
 * @author Bilgrandov
 * @license MIT
 */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initHeaderDate();
  initClock();
  initStatCounters();
  initPosts();
  initLatestPostsTeaser();
  initThemeSwitcher();
  initSkills();
  initGuestbook();
});

/**
 * Escapes special HTML characters in a string to prevent XSS attacks.
 *
 * @param {string} str - Raw input string to escape
 * @returns {string} Escaped HTML string
 */
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/**
 * Formats the current local date and time as "YYYY-MM-DD HH:MM".
 *
 * @returns {string} Formatted timestamp string
 */
function formatNow() {
  const now = new Date();
  return now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, '0') + "-" +
    String(now.getDate()).padStart(2, '0') + " " +
    String(now.getHours()).padStart(2, '0') + ":" +
    String(now.getMinutes()).padStart(2, '0');
}

/**
 * Initializes mobile navigation drawer and hamburger toggle states.
 */
function initNav() {
  const hamburger = document.getElementById('nav-hamburger');
  const sideNav = document.getElementById('side-nav');
  const overlay = document.getElementById('nav-overlay');
  if (!hamburger || !sideNav) return;

  function openNav() {
    sideNav.classList.add('open');
    if (overlay) overlay.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
  }

  function closeNav() {
    sideNav.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }

  hamburger.addEventListener('click', () => {
    sideNav.classList.contains('open') ? closeNav() : openNav();
  });

  if (overlay) overlay.addEventListener('click', closeNav);

  // Auto-close mobile drawer upon navigation link click
  sideNav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeNav();
    });
  });
}

/**
 * Renders formatted current date into designated header elements.
 */
function initHeaderDate() {
  const els = document.querySelectorAll('#header-date');
  const now = new Date();
  const formatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ');
  els.forEach(el => el.textContent = formatted);
}

/**
 * Initializes taskbar clock widget with periodic interval updates.
 */
function initClock() {
  const el = document.getElementById('taskbar-clock');
  if (!el) return;
  function update() {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    el.textContent = h + ':' + m;
  }
  update();
  setInterval(update, 10000);
}

/* Global state for cached datasets */
let allProjectsData = null;

/**
 * Ensures project database records are loaded, prioritizing sessionStorage cache.
 *
 * @returns {Promise<Array>} Resolved array of project objects
 */
async function ensureProjectsFetched() {
  if (allProjectsData) return allProjectsData;
  const cached = sessionStorage.getItem('techcorner_projects_cache');
  if (cached) {
    try {
      allProjectsData = JSON.parse(cached);
      return allProjectsData;
    } catch (e) {
      console.warn('Failed to parse cached projects, fetching fresh data.');
    }
  }

  try {
    const response = await fetch('data/projects.json');
    if (response.ok) {
      allProjectsData = await response.json();
      sessionStorage.setItem('techcorner_projects_cache', JSON.stringify(allProjectsData));
    }
  } catch (err) {
    console.error('Failed to fetch projects database:', err);
    allProjectsData = [];
  }
  return allProjectsData || [];
}

/**
 * Animates key numerical statistics when scrolled into the viewport.
 */
async function initStatCounters() {
  const stats = document.querySelectorAll('.stat-num[data-count]');
  if (!stats.length) return;

  try {
    const projects = await ensureProjectsFetched();
    stats.forEach(el => {
      const label = el.closest('.stat-item')?.querySelector('.stat-label')?.textContent?.trim().toLowerCase();
      if (label && label.includes('project')) {
        el.setAttribute('data-count', projects.length);
      }
    });

    const statProjects = document.getElementById('stat-projects');
    if (statProjects) {
      statProjects.setAttribute('data-count', projects.length);
    }
  } catch (err) {
    console.warn('Failed to fetch dynamic projects count for homepage:', err);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.dataset.count, 10);
        animateCount(entry.target, target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  stats.forEach(s => observer.observe(s));
  const statProjects = document.getElementById('stat-projects');
  if (statProjects && !statProjects.dataset.count) {
    observer.observe(statProjects);
  }
}

/**
 * Incrementally animates an element's text content up to a target number.
 *
 * @param {HTMLElement} el - Target element to update
 * @param {number} target - Final numerical value
 */
function animateCount(el, target) {
  let current = 0;
  const inc = Math.max(1, Math.floor(target / 50));
  const timer = setInterval(() => {
    current += inc;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = current;
  }, 30);
}

/* Global state for blog posts */
let allPostsData = [];

/**
 * Fetches blog posts from the Supabase REST API in descending date order.
 * Implements sessionStorage caching and error dialog handling on failure.
 *
 * @returns {Promise<void>}
 */
async function ensurePostsFetched() {
  if (allPostsData.length > 0) return;

  const cached = sessionStorage.getItem('techcorner_posts_cache');
  if (cached) {
    try {
      allPostsData = JSON.parse(cached);
      return;
    } catch (e) {
      console.warn('Failed to parse cached posts, fetching fresh data.');
    }
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );

    if (!response.ok) throw new Error(`Supabase error: ${response.status}`);

    const data = await response.json();

    // Map database schema to internal client model
    allPostsData = data.map(post => ({
      id:      post.id,
      type:    post.type,
      title:   post.title,
      content: post.content || '',
      date:    post.created_at
                 ? post.created_at.slice(0, 16).replace('T', ' ')
                 : ''
    }));

    sessionStorage.setItem('techcorner_posts_cache', JSON.stringify(allPostsData));

  } catch (err) {
    console.error('Failed to fetch from Supabase:', err);
    allPostsData = [];
    showXPErrorDialog(
      "Database Connection Failed",
      "Could not retrieve articles from Supabase. The database server might be sleeping or offline. Please check your internet connection."
    );
  }
}

/**
 * Displays a styled modal dialog for unexpected database connectivity failures.
 *
 * @param {string} title - Error modal header title
 * @param {string} message - Descriptive error body message
 */
function showXPErrorDialog(title, message) {
  if (document.getElementById('xp-error-modal')) return;

  const overlay = document.createElement('div');
  overlay.id = 'xp-error-modal';
  overlay.className = 'error-dialog-overlay';

  overlay.innerHTML = `
    <div class="error-dialog">
      <div class="error-dialog-icon">⚠️</div>
      <div class="error-dialog-text">
        <strong>${escapeHTML(title)}</strong>
        <p>${escapeHTML(message)}</p>
      </div>
      <button class="btn btn-outline btn-sm error-ok-btn">OK</button>
    </div>
  `;

  const closeDialog = () => overlay.remove();
  overlay.querySelector('.error-ok-btn').addEventListener('click', closeDialog);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDialog(); });

  document.body.appendChild(overlay);
}

/**
 * Initializes the post explorer interface, search filtering, and single post markdown viewer.
 */
async function initPosts() {
  const treeEl = document.getElementById('posts-tree');
  if (!treeEl) return;

  await ensurePostsFetched();

  function renderTree(query = '') {
    treeEl.innerHTML = '';

    const filtered = query
      ? allPostsData.filter(p => p.title.toLowerCase().includes(query.toLowerCase()))
      : allPostsData;

    const cats = ['JOURNAL', 'BLOG', 'CP'];
    cats.forEach(cat => {
      const posts = filtered.filter(p => p.type.toUpperCase() === cat);
      if (posts.length) {
        const folder = document.createElement('li');
        folder.className = 'folder';
        folder.textContent = `📁 ${cat}`;
        folder.setAttribute('tabindex', '0');
        treeEl.appendChild(folder);
        posts.forEach(p => {
          const li = document.createElement('li');
          li.className = 'posts-tree-item';
          li.textContent = `📄 ${p.title}`;
          li.setAttribute('data-post-id', p.id);
          li.setAttribute('tabindex', '0');
          li.setAttribute('role', 'button');
          li.onclick = () => window.location.hash = `post-${p.id}`;
          li.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              window.location.hash = `post-${p.id}`;
            }
          };
          treeEl.appendChild(li);
        });
      }
    });

    // Display fallback indicator when search returns empty
    if (filtered.length === 0 && query) {
      const li = document.createElement('li');
      li.style.color = 'var(--text-muted, #888)';
      li.style.fontStyle = 'italic';
      li.style.padding = '4px 0';
      li.textContent = 'No results found.';
      treeEl.appendChild(li);
    }

    const postCount = document.getElementById('post-count');
    if (postCount) postCount.textContent = allPostsData.length;
  }

  function renderContentpane() {
    const hash = window.location.hash;
    const indexView = document.getElementById('explorer-index');
    const singleView = document.getElementById('single-post-view');
    const idxList = document.getElementById('index-posts-list');

    // Populate index view list if empty
    if (idxList && idxList.children.length === 0) {
      idxList.innerHTML = '';
      const cats = ['JOURNAL', 'BLOG', 'CP'];
      cats.forEach(cat => {
        const posts = allPostsData.filter(p => p.type.toUpperCase() === cat);
        if (posts.length) {
          const catHeader = document.createElement('div');
          catHeader.className = 'posts-index-cat-header';
          catHeader.innerHTML = `📁 ${cat}`;
          idxList.appendChild(catHeader);

          posts.forEach(p => {
            const item = document.createElement('div');
            item.className = 'post-index-item';
            item.setAttribute('tabindex', '0');
            item.setAttribute('role', 'button');
            item.innerHTML = `
              <div>
                <span class="post-cat-badge post-cat-${p.type.toUpperCase()}">${p.type.toUpperCase()}</span>
                <div class="post-index-title">${escapeHTML(p.title)}</div>
              </div>
              <div class="post-index-meta">${escapeHTML(p.date)}</div>`;
            item.onclick = () => window.location.hash = `post-${p.id}`;
            item.onkeydown = (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                window.location.hash = `post-${p.id}`;
              }
            };
            idxList.appendChild(item);
          });
        }
      });
    }

    // Highlight active tree item
    if (treeEl) {
      treeEl.querySelectorAll('li').forEach(item => {
        const postId = item.getAttribute('data-post-id');
        if (hash && hash.startsWith('#post-') && postId === hash.replace('#post-', '')) {
          item.classList.add('selected-item');
        } else {
          item.classList.remove('selected-item');
        }
      });
    }

    const containerEl = document.querySelector('.explorer-container');

    if (!hash || !hash.startsWith('#post-')) {
      if (containerEl) containerEl.classList.remove('view-details');
      if (indexView) {
        indexView.classList.remove('hidden');
        indexView.style.opacity = '0';
        indexView.style.transition = 'opacity 0.2s ease-in-out';
        setTimeout(() => { indexView.style.opacity = '1'; }, 10);
      }
      if (singleView) singleView.classList.add('hidden');
      return;
    }

    const id = parseInt(hash.replace('#post-', ''), 10);
    const post = allPostsData.find(p => p.id === id);

    if (post) {
      if (containerEl) containerEl.classList.add('view-details');
      if (indexView) indexView.classList.add('hidden');
      if (singleView) {
        singleView.classList.remove('hidden');
        singleView.style.opacity = '0';
        singleView.style.transition = 'opacity 0.2s ease-in-out';
        setTimeout(() => { singleView.style.opacity = '1'; }, 10);
      }

      // Reset scroll position to top on post change
      const explorerContent = document.getElementById('post-viewer');
      if (explorerContent) explorerContent.scrollTop = 0;

      const titleEl = document.getElementById('view-title');
      const dateEl = document.getElementById('view-date');
      const catEl = document.getElementById('view-category');
      const contentEl = document.getElementById('view-content');

      if (titleEl) titleEl.textContent = post.title;
      if (dateEl) dateEl.textContent = post.date;
      if (catEl) catEl.textContent = post.type.toUpperCase();

      if (contentEl) {
        const renderText = (text) => {
          if (typeof marked !== 'undefined') {
            contentEl.innerHTML = marked.parse(text);
          } else {
            // Retry marked parsing if CDN script is still initializing
            setTimeout(() => {
              if (typeof marked !== 'undefined') {
                contentEl.innerHTML = marked.parse(text);
              } else {
                contentEl.innerText = text;
              }
            }, 300);
          }
        };

        if (post.file) {
          contentEl.innerHTML = '<p class="loading-text">Loading article...</p>';
          fetch(post.file)
            .then(response => response.text())
            .then(text => renderText(text))
            .catch(() => {
              contentEl.innerHTML = '<p class="loading-text">Failed to load article 😢</p>';
            });
        } else {
          renderText(post.content);
        }
      }
    }
  }

  // Bind pagination controls
  const btnHome = document.getElementById('nav-home');
  const btnPrev = document.getElementById('nav-prev');
  const btnNext = document.getElementById('nav-next');

  if (btnHome) btnHome.addEventListener('click', () => window.location.hash = '');

  if (btnPrev || btnNext) {
    const navigate = (direction) => {
      const hash = window.location.hash;
      if (!hash.startsWith('#post-')) return;
      const id = parseInt(hash.replace('#post-', ''), 10);
      const currIdx = allPostsData.findIndex(p => p.id === id);
      if (currIdx === -1) return;

      const newIdx = currIdx + direction;
      if (newIdx >= 0 && newIdx < allPostsData.length) {
        window.location.hash = `post-${allPostsData[newIdx].id}`;
      }
    };
    if (btnPrev) btnPrev.addEventListener('click', () => navigate(1));
    if (btnNext) btnNext.addEventListener('click', () => navigate(-1));
  }

  renderTree();
  renderContentpane();
  window.addEventListener('hashchange', renderContentpane);

  const searchInput = document.getElementById('post-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderTree(searchInput.value.trim());
    });
  }
}

/**
 * Initializes the homepage latest posts teaser widget.
 */
async function initLatestPostsTeaser() {
  const container = document.getElementById('latest-posts-container');
  if (!container) return;

  await ensurePostsFetched();

  const statPosts = document.getElementById('stat-posts');
  if (statPosts) {
    animateCount(statPosts, allPostsData.length);
  }

  const headerPostCount = document.getElementById('post-count');
  if (headerPostCount) headerPostCount.textContent = allPostsData.length;

  const posts = allPostsData.length ? allPostsData : [];
  const latest = posts.slice(0, 3);
  if (latest.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML = '';
  latest.forEach(p => {
    const div = document.createElement('div');
    div.className = 'latest-post-item';
    div.innerHTML = `
      <div>
        <span class="post-cat-badge post-cat-${p.type.toUpperCase()}">${p.type.toUpperCase()}</span>
        <div class="latest-post-title">${escapeHTML(p.title)}</div>
      </div>
      <div class="latest-post-meta">${escapeHTML(p.date)}</div>
    `;
    div.style.cursor = 'pointer';
    div.onclick = () => { window.location.href = `posts.html#post-${p.id}`; };
    container.appendChild(div);
  });

  const footerCount = document.getElementById('post-count-footer');
  if (footerCount) footerCount.textContent = allPostsData.length;
}

/**
 * Initializes Light/Dark theme switcher with localStorage persistence.
 */
function initThemeSwitcher() {
  const themes = ['default', 'dark'];
  let currentThemeIdx = themes.indexOf(localStorage.getItem('portfolio-theme') || 'default');
  if (currentThemeIdx === -1) currentThemeIdx = 0;

  document.documentElement.setAttribute('data-theme', themes[currentThemeIdx]);

  const switcherBtn = document.getElementById('theme-switcher');
  if (!switcherBtn) return;

  const labels = ['☀ Light', '☾ Dark'];

  const updateLabel = () => {
    switcherBtn.textContent = labels[currentThemeIdx];
  };

  updateLabel();

  switcherBtn.addEventListener('click', () => {
    currentThemeIdx = (currentThemeIdx + 1) % themes.length;
    const newTheme = themes[currentThemeIdx];
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('portfolio-theme', newTheme);
    updateLabel();
  });
}

/* Global state for skills dataset */
let allSkillsData = null;

/**
 * Initializes the skills tab switcher and dynamic grid card renderer.
 */
async function initSkills() {
  const gridContainer = document.getElementById('device-list');
  if (!gridContainer) return;

  const tabBtnFrontend    = document.getElementById('tab-btn-frontend');
  const tabBtnBackend     = document.getElementById('tab-btn-backend');
  const tabBtnMethodology = document.getElementById('tab-btn-methodology');

  const detailsTitle = document.getElementById('skill-details-title');
  const detailsIcon  = document.getElementById('skill-details-icon');
  const detailsDesc  = document.getElementById('skill-details-desc');
  const levelFill    = document.getElementById('skill-level-fill');

  let activeCategoryIndex = 0;

  const cached = sessionStorage.getItem('techcorner_skills_cache');
  if (cached) {
    try {
      allSkillsData = JSON.parse(cached);
    } catch (e) {
      console.warn('Failed to parse cached skills.');
    }
  }

  if (!allSkillsData) {
    try {
      const response = await fetch('data/skills.json');
      if (response.ok) {
        allSkillsData = await response.json();
        sessionStorage.setItem('techcorner_skills_cache', JSON.stringify(allSkillsData));
      } else {
        throw new Error('Skills fetch response not OK');
      }
    } catch (err) {
      console.error('Failed to load skills:', err);
      allSkillsData = [];
    }
  }

  function renderCategorySkills() {
    gridContainer.innerHTML = '';
    if (!allSkillsData || !allSkillsData.length) return;
    const category = allSkillsData[activeCategoryIndex];
    if (!category || !category.skills) return;

    category.skills.forEach(skill => {
      const card = document.createElement('div');
      card.className = 'skill-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.innerHTML = `
        <div class="skill-card-icon">${skill.icon}</div>
        <div class="skill-card-name">${escapeHTML(skill.name)}</div>
      `;

      const selectSkill = () => {
        gridContainer.querySelectorAll('.skill-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        if (detailsTitle) detailsTitle.textContent = skill.name;
        if (detailsIcon)  detailsIcon.innerHTML    = skill.icon;
        if (detailsDesc)  detailsDesc.textContent  = skill.desc;
        if (levelFill) {
          levelFill.style.width = '0%';
          setTimeout(() => { levelFill.style.width = skill.level + '%'; }, 50);
        }
      };

      card.onclick = selectSkill;
      card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectSkill(); } };
      gridContainer.appendChild(card);
    });

    // Reset detail pane selection state
    if (detailsTitle) detailsTitle.textContent = 'Select a skill';
    if (detailsIcon)  detailsIcon.innerHTML    = '◎';
    if (detailsDesc)  detailsDesc.textContent  = 'Choose a skill from the grid above to see a detailed description and proficiency level.';
    if (levelFill)    levelFill.style.width     = '0%';
  }

  function setActiveTab(index, clickedBtn) {
    activeCategoryIndex = index;
    [tabBtnFrontend, tabBtnBackend, tabBtnMethodology].forEach(btn => {
      if (btn) btn.setAttribute('aria-selected', 'false');
    });
    if (clickedBtn) clickedBtn.setAttribute('aria-selected', 'true');
    renderCategorySkills();
  }

  if (tabBtnFrontend)    tabBtnFrontend.onclick    = () => setActiveTab(0, tabBtnFrontend);
  if (tabBtnBackend)     tabBtnBackend.onclick     = () => setActiveTab(1, tabBtnBackend);
  if (tabBtnMethodology) tabBtnMethodology.onclick = () => setActiveTab(2, tabBtnMethodology);

  renderCategorySkills();
}

/**
 * Handles guestbook submission and client-side localStorage persistence.
 */
function initGuestbook() {
  const submitBtn = document.getElementById('guestbook-submit');
  const inputEl = document.getElementById('guestbook-input');
  const messagesEl = document.getElementById('guestbook-messages');
  if (!submitBtn || !inputEl || !messagesEl) return;

  const STORAGE_KEY = 'portfolio-guestbook';
  let messages = [];

  try {
    messages = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [
      { name: "Anonymous Recruiter", text: "Love the clean design & vanilla JS details! Super clean.", date: "2026-06-12 10:15" },
      { name: "Fellow Dev", text: "Nice portfolio architecture. Good luck with the job search! 🚀", date: "2026-06-15 14:02" }
    ];
  } catch (e) {
    messages = [];
  }

  function renderMessages() {
    messagesEl.innerHTML = '';
    if (messages.length === 0) {
      messagesEl.innerHTML = '<p style="font-size: 11px; color: #888; text-align: center; margin-top: 20px;">No messages yet. Be the first to sign! ✒️</p>';
      return;
    }

    messages.slice().reverse().forEach(msg => {
      const card = document.createElement('div');
      card.className = 'guestbook-msg';
      card.innerHTML = `
        <div class="guestbook-msg-meta">
          <strong>${escapeHTML(msg.name)}</strong> — <small>${escapeHTML(msg.date)}</small>
        </div>
        <div class="guestbook-msg-text">${escapeHTML(msg.text)}</div>
      `;
      messagesEl.appendChild(card);
    });
  }

  submitBtn.onclick = () => {
    const text = inputEl.value.trim();
    if (!text) return alert("Please write a message before signing!");
    
    const dateStr = formatNow();
    const names = ["Vibe Checker", "Tech Enthusiast", "Cool Recruiter", "Retro Lover", "Coffee Addict"];
    const randomName = names[Math.floor(Math.random() * names.length)];

    messages.push({
      name: randomName,
      text: text,
      date: dateStr
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    inputEl.value = '';
    renderMessages();
  };

  renderMessages();
}
