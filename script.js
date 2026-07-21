/* ========================================
   Engineer's Field Notes — Portfolio JS
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initHeaderDate();
  initClock();
  initStatCounters();
  initPosts();
  initLatestPostsTeaser();
  initAdminMode();
  initThemeSwitcher();
  initSkills();
  initGuestbook();
});

/**
 * Initializes the mobile hamburger navigation.
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

  // Close nav when a link is clicked on mobile
  sideNav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeNav();
    });
  });
}

/**
 * Sets the header date to today's formatted date.
 */
function initHeaderDate() {
  const els = document.querySelectorAll('#header-date');
  const now = new Date();
  const formatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ');
  els.forEach(el => el.textContent = formatted);
}

/**
 * Initializes the nav clock.
 * Updates the time every 30 seconds.
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
  setInterval(update, 30000);
}

/**
 * Initializes the stat counter animation on the homepage.
 * Uses IntersectionObserver to trigger animation when scrolled into view.
 */
async function initStatCounters() {
  const stats = document.querySelectorAll('.stat-num[data-count]');
  if (!stats.length) return;

  // Dynamically fetch projects count from JSON database
  try {
    const response = await fetch('data/projects.json');
    if (response.ok) {
      const projects = await response.json();
      // Update by data-count attribute on Projects labels
      stats.forEach(el => {
        const label = el.closest('.stat-item')?.querySelector('.stat-label')?.textContent?.trim().toLowerCase();
        if (label && label.includes('project')) {
          el.setAttribute('data-count', projects.length);
        }
      });
      // Also update stat-projects by ID if present
      const statProjects = document.getElementById('stat-projects');
      if (statProjects) {
        statProjects.setAttribute('data-count', projects.length);
      }
    }
  } catch (err) {
    console.warn('Failed to fetch dynamic projects count for homepage:', err);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.dataset.count);
        animateCount(entry.target, target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  stats.forEach(s => observer.observe(s));
  // Also observe stat-projects by ID
  const statProjects = document.getElementById('stat-projects');
  if (statProjects && !statProjects.dataset.count) {
    observer.observe(statProjects);
  }
}

function animateCount(el, target) {
  let current = 0;
  const inc = Math.max(1, Math.floor(target / 50));
  const timer = setInterval(() => {
    current += inc;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = current;
  }, 30);
}

/* --- Journaling & Blog --- */
let allPostsData = [];

/**
 * Fetches blog posts from Supabase database.
 * Sorts them in descending order by creation date.
 * Implements SessionStorage caching and handles database connection errors with an XP style modal.
 */
async function ensurePostsFetched() {
  if (allPostsData.length > 0) return;

  // Caching: Coba baca dari sessionStorage
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

    // Map Supabase schema ke format yang dipakai portfolio
    allPostsData = data.map(post => ({
      id:      post.id,
      type:    post.type,
      title:   post.title,
      content: post.content || '',
      // Format created_at (ISO) → "2026-07-05 10:30"
      date:    post.created_at
                 ? post.created_at.slice(0, 16).replace('T', ' ')
                 : ''
    }));

    // Simpan ke cache sessionStorage
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
 * Renders a clean error dialog when Supabase connection fails.
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
        <strong>${title}</strong>
        <p>${message}</p>
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
 * Initializes the post explorer interface on the posts.html page.
 * Handles the rendering of the category tree and individual content panes.
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
          li.className = 'posts-tree-item'; // ← apply CSS cursor:pointer
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

    // Tampilkan pesan jika hasil kosong
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

    // Render index list
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
            // Use CSS class — no hardcoded color so dark mode works
            item.className = 'post-index-item';
            item.setAttribute('tabindex', '0');
            item.setAttribute('role', 'button');
            item.innerHTML = `
              <div>
                <span class="post-cat-badge post-cat-${p.type.toUpperCase()}">${p.type.toUpperCase()}</span>
                <div class="post-index-title">${p.title}</div>
              </div>
              <div class="post-index-meta">${p.date}</div>`;
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

    // Highlight selected tree node
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

      // Fix #1: Reset scroll ke atas setiap kali buka post baru
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
        // Fix #2: renderText dengan retry — tunggu marked siap sebelum fallback ke plain text
        const renderText = (text) => {
          if (typeof marked !== 'undefined') {
            contentEl.innerHTML = marked.parse(text);
          } else {
            // marked dari CDN belum ready — coba lagi setelah 300ms
            setTimeout(() => {
              if (typeof marked !== 'undefined') {
                contentEl.innerHTML = marked.parse(text);
              } else {
                // CDN gagal total — tampil sebagai plain text
                contentEl.innerText = text;
              }
            }, 300);
          }
        };

        // Check if the post utilizes an external .md file
        if (post.file) {
          contentEl.innerHTML = '<p class="loading-text">Loading article...</p>';

          fetch(post.file) // Fetch the external markdown file
            .then(response => response.text())
            .then(text => renderText(text))
            .catch(err => {
              contentEl.innerHTML = '<p class="loading-text">Failed to load article 😢</p>';
            });
        } else {
          // Fallback to legacy system (inline content from posts.json)
          renderText(post.content);
        }
      }

    }
  }
  // Setup Navigation Buttons
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
    if (btnPrev) btnPrev.addEventListener('click', () => navigate(1)); // +1 is older post because sorted by date desc
    if (btnNext) btnNext.addEventListener('click', () => navigate(-1)); // -1 is newer post
  }

  renderTree();
  renderContentpane();
  window.addEventListener('hashchange', renderContentpane);

  // Search handler
  const searchInput = document.getElementById('post-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderTree(searchInput.value.trim());
    });
  }
}

/**
 * Initializes the latest posts teaser widget on the homepage.
 * Displays the two most recent posts fetched from the JSON database.
 */
async function initLatestPostsTeaser() {
  const container = document.getElementById('latest-posts-container');
  if (!container) return;

  await ensurePostsFetched();

  // Update "Posts Written" stat counter on homepage
  const statPosts = document.getElementById('stat-posts');
  if (statPosts) {
    animateCount(statPosts, allPostsData.length);
  }

  // Update header post count (posts.html)
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
        <div class="latest-post-title">${p.title}</div>
      </div>
      <div class="latest-post-meta">${p.date}</div>
    `;
    div.style.cursor = 'pointer';
    div.onclick = () => { window.location.href = `posts.html#post-${p.id}`; };
    container.appendChild(div);
  });
  // Also update footer count
  const footerCount = document.getElementById('post-count-footer');
  if (footerCount) footerCount.textContent = allPostsData.length;
}

/**
 * Initializes the hidden Admin Mode.
 * Unlocks the post composer via keyboard shortcut (Ctrl + Shift + L) and password validation.
 */
function initAdminMode() {
  const PASS_HASH = '87fd4d3bdc50aaf7435056df8f56d21efcfeb9da7305090ed09d1ff62f66aa6c';
  async function sha256(message) {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Session check on load
  const isAdmin = sessionStorage.getItem('admin_session') === 'true';
  const compose = document.getElementById('admin-compose-window');

  if (isAdmin && compose) {
    compose.classList.remove('hidden');
    compose.removeAttribute('hidden');
    compose.style.display = 'block'; // Fallback if hidden class isn't enough
  }

  // Hidden Keyboard Shortcut (Ctrl + Shift + L)
  const loginModal = document.getElementById('login-modal');
  const loginPass = document.getElementById('admin-password');
  const loginError = document.getElementById('login-error');

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
      if (loginModal) {
        loginModal.classList.remove('hidden');
        if (loginPass) {
          loginPass.value = '';
          setTimeout(() => loginPass.focus(), 50);
        }
        if (loginError) loginError.classList.add('hidden');
      }
    }
  });

  const closeLogin = () => {
    if (loginModal) loginModal.classList.add('hidden');
    if (loginPass) loginPass.value = '';
    if (loginError) loginError.classList.add('hidden');
  };

  const submitLogin = async () => {
    if (!loginPass) return;
    const hash = await sha256(loginPass.value);
    if (hash === PASS_HASH) {
      sessionStorage.setItem('admin_session', 'true');
      closeLogin();
      alert("Access Granted: Admin Mode Activated");
      if (compose) {
        compose.classList.remove('hidden');
        compose.removeAttribute('hidden');
        compose.style.display = 'block';
      }
    } else {
      if (loginError) loginError.classList.remove('hidden');
    }
  };

  const btnCloseLogin = document.getElementById('close-login');
  const btnCancelLogin = document.getElementById('login-cancel');
  const btnSubmitLogin = document.getElementById('login-submit');

  if (btnCloseLogin) btnCloseLogin.addEventListener('click', closeLogin);
  if (btnCancelLogin) btnCancelLogin.addEventListener('click', closeLogin);
  if (btnSubmitLogin) btnSubmitLogin.addEventListener('click', submitLogin);
  if (loginPass) {
    loginPass.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submitLogin();
    });
  }

  // Post Composer Logic
  const btnSubmit = document.getElementById('post-submit');
  const btnClear = document.getElementById('post-clear');
  const btnCopy = document.getElementById('copy-json-btn');
  const jsonContainer = document.getElementById('json-output-container');
  const jsonOutput = document.getElementById('json-output');

  if (btnSubmit) {
    btnSubmit.addEventListener('click', () => {
      const title = document.getElementById('post-title').value;
      const content = document.getElementById('post-content').value;
      if (!title || !content) return alert("Error: Title and Content are required.");

      const now = new Date();
      const dateStr = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, '0') + "-" +
        String(now.getDate()).padStart(2, '0') + " " +
        String(now.getHours()).padStart(2, '0') + ":" +
        String(now.getMinutes()).padStart(2, '0');

      const postObj = {
        id: Date.now(), // Generate unique ID
        type: "blog",
        title: title,
        date: dateStr,
        content: content
      };

      jsonOutput.value = "  " + JSON.stringify(postObj, null, 2).replace(/\n/g, "\n  ") + ",\n";
      if (jsonContainer) jsonContainer.classList.remove('hidden');
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      document.getElementById('post-title').value = '';
      document.getElementById('post-content').value = '';
      if (jsonOutput) jsonOutput.value = '';
      if (jsonContainer) jsonContainer.classList.add('hidden');
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(jsonOutput.value).then(() => {
          alert("JSON array item copied correctly! Paste it at the top of your data/posts.json array.");
        });
      } else {
        jsonOutput.select();
        document.execCommand('copy');
        alert("JSON array item copied correctly! Paste it at the top of your data/posts.json array.");
      }
    });
  }
}

/**
 * Initializes the theme switcher toggle (Light/Dark mode).
 * Persists the user's preference in localStorage.
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

/* CRT config removed — not used in new design */

const skillCategories = [
  {
    name: "Front-End",
    icon: "🎨",
    skills: [
      { id: "skill-html", name: "HTML5", icon: '<i class="devicon-html5-plain colored" style="font-size: 32px;"></i>', level: 90, desc: "The foundational markup language of the web. I use semantic HTML5 elements to structure code clearly for SEO, accessibility (screen readers), and long-term maintainability." },
      { id: "skill-css", name: "CSS3", icon: '<i class="devicon-css3-plain colored" style="font-size: 32px;"></i>', level: 85, desc: "Advanced CSS styling including Custom Properties (CSS variables) for dynamic dark modes, complex animations, transitions, and writing clean, scalable responsive layouts." },
      { id: "skill-javascript", name: "JavaScript", icon: '<i class="devicon-javascript-plain colored" style="font-size: 32px;"></i>', level: 85, desc: "Deep knowledge of modern ES6+ vanilla JavaScript. Experienced in asynchronous flow control (Promises, Async/Await), DOM manipulation, dynamic page rendering, and state storage." },
      { id: "skill-flexbox", name: "Flexbox", icon: "<span style='font-size: 28px;'>📦</span>", level: 90, desc: "One-dimensional layout model. Used extensively to align elements dynamically, manage flexible items within headers, cards, and taskbar navigation panels." },
      { id: "skill-grid", name: "Grid Layout", icon: "<span style='font-size: 28px;'>🏁</span>", level: 80, desc: "Two-dimensional layout grid. Excellent for building clean, tabular, or masonry layouts like photo galleries and document explorer panes." },
      { id: "skill-semantic", name: "Semantic HTML", icon: "<span style='font-size: 28px;'>📑</span>", level: 90, desc: "Adhering to correct semantic structures (main, section, article, nav, header, footer) rather than nested divs. Ensures optimized browser parsing, accessibility, and SEO." },
      { id: "skill-responsive", name: "Responsive Design", icon: "<span style='font-size: 28px;'>📱</span>", level: 90, desc: "Designing pages that fluidly scale from massive 4K monitors down to small mobile phones using fluid grids, flexible images, and media query breakpoints." },
      { id: "skill-bootstrap", name: "Bootstrap", icon: '<i class="devicon-bootstrap-plain colored" style="font-size: 32px;"></i>', level: 75, desc: "Rapid prototyping framework. Experienced with using its predefined grid layouts and components for corporate projects and quick dashboard applications." },
      { id: "skill-tailwind", name: "Tailwind CSS", icon: '<i class="devicon-tailwindcss-original colored" style="font-size: 32px;"></i>', level: 80, desc: "Utility-first CSS framework. Used to quickly style responsive modern designs using direct inline class configurations without bloated stylesheets." }
    ]
  },
  {
    name: "Back-End & Database",
    icon: "⚙️",
    skills: [
      { id: "skill-php", name: "PHP", icon: '<i class="devicon-php-plain colored" style="font-size: 32px;"></i>', level: 80, desc: "Server-side scripting language. Comfortable building backend dynamic routing, form submissions, session tracking, and RESTful API structures." },
      { id: "skill-laravel", name: "Laravel", icon: '<i class="devicon-laravel-original colored" style="font-size: 32px;"></i>', level: 85, desc: "My favorite backend framework. Strong familiarity with MVC architecture, routing, migrations, Eloquent ORM, authentication, and middleware systems." },
      { id: "skill-mysql", name: "MySQL", icon: '<i class="devicon-mysql-plain colored" style="font-size: 32px;"></i>', level: 80, desc: "Relational database management. Writing efficient SQL queries, indexing, setting up primary/foreign key constraints, and designing clean database schemas." }
    ]
  },
  {
    name: "Design & Methodology",
    icon: "🛠️",
    skills: [
      { id: "skill-uml", name: "UML Design", icon: "<span style='font-size: 28px;'>📐</span>", level: 75, desc: "Unified Modeling Language. Creating flowcharts, use case diagrams, and database relational schemas before writing code to ensure correct software architecture." },
      { id: "skill-git", name: "Git & Version Control", icon: '<i class="devicon-git-plain colored" style="font-size: 32px;"></i>', level: 80, desc: "Daily use of Git for source control: branching strategies, commits, merges, and pull requests via GitHub. Comfortable working in collaborative repositories and managing project history." }
    ]
  }
];

/**
 * Renders the Skills page with the new card-grid design.
 * Each skill is a clickable card that reveals a detail panel.
 */
function initSkills() {
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

  function renderCategorySkills() {
    gridContainer.innerHTML = '';
    const category = skillCategories[activeCategoryIndex];

    category.skills.forEach(skill => {
      const card = document.createElement('div');
      card.className = 'skill-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.innerHTML = `
        <div class="skill-card-icon">${skill.icon}</div>
        <div class="skill-card-name">${skill.name}</div>
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

    // Reset detail panel
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
 * Handles guestbook message logic, persistence using localStorage.
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
      { name: "Anonymous Recruiter", text: "Love the Windows XP theme! Super nostalgic and clean.", date: "2026-06-12 10:15" },
      { name: "Fellow Dev", text: "Nice vanilla JS details. Good luck with the job search! 🚀", date: "2026-06-15 14:02" }
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
    // Render newest first
    messages.slice().reverse().forEach(msg => {
      const card = document.createElement('div');
      card.className = 'guestbook-msg';
      card.innerHTML = `
        <div class="guestbook-msg-meta">
          <strong>${msg.name}</strong> — <small>${msg.date}</small>
        </div>
        <div class="guestbook-msg-text">${msg.text}</div>
      `;
      messagesEl.appendChild(card);
    });
  }

  submitBtn.onclick = () => {
    const text = inputEl.value.trim();
    if (!text) return alert("Please write a message before signing!");
    
    const now = new Date();
    const dateStr = now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, '0') + "-" +
      String(now.getDate()).padStart(2, '0') + " " +
      String(now.getHours()).padStart(2, '0') + ":" +
      String(now.getMinutes()).padStart(2, '0');

    const names = ["Vibe Checker", "Tech Enthusiast", "Cool Recruiter", "Retro Lover", "Internet Explorer Fan", "Coffee Addict"];
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
