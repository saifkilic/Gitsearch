
// ============================================================================
// State Management
// ============================================================================
const appState = {
  _currentUser: null,
  _currentRepos: [],
  _bookmarks: JSON.parse(localStorage.getItem('gitSearchBookmarks')) || [],
  _activeView: 'search',

  // Getters
  get currentUser() { return this._currentUser; },
  get currentRepos() { return this._currentRepos; },
  get bookmarks() { return this._bookmarks; },
  get activeView() { return this._activeView; },

  // Setters with automatic side-effects (Reactivity)
  set activeView(viewName) {
    this._activeView = viewName;
    updateNavigationView(viewName);
  },

  setUserData(user, repos) {
    this._currentUser = user;
    this._currentRepos = repos;
    renderSearchProfile();
  },

  toggleBookmark(username) {
    const index = this._bookmarks.findIndex(b => b.login.toLowerCase() === username.toLowerCase());
    if (index > -1) {
      this._bookmarks.splice(index, 1);
      showToast('Bookmark removed', 'info');
    } else {
      this._bookmarks.push({ login: username, savedAt: Date.now() });
      showToast('Added to bookmarks', 'success');
    }
    localStorage.setItem('gitSearchBookmarks', JSON.stringify(this._bookmarks));
    
    // Sync all dependent UI modules instantly
    updateBookmarkCount();
    renderBookmarkToggleState(username);
    if (this._activeView === 'bookmarks') renderBookmarks();
  }
};

// ============================================================================
// DOM Elements
// ============================================================================
const searchInput = document.getElementById('searchInput');
const searchButton = document.querySelector('.search-button');
const searchContent = document.getElementById('searchContent');
const loadingContainer = document.getElementById('loadingContainer');
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const toastContainer = document.getElementById('toastContainer');
const bookmarkCount = document.getElementById('bookmarkCount');

const compareUser1 = document.getElementById('compareUser1');
const compareUser2 = document.getElementById('compareUser2');
const compareBtn = document.getElementById('compareBtn');
const compareSetup = document.getElementById('compareSetup');
const compareResults = document.getElementById('compareResults');

const bookmarksContainer = document.getElementById('bookmarksContainer');
const trendingContainer = document.getElementById('trendingContainer');

// ============================================================================
// Initialization & Event Binding
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateBookmarkCount();
});

function setupEventListeners() {
  // Main Search actions
  searchButton.addEventListener('click', () => handleSearch(searchInput.value));
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch(searchInput.value);
  });

  // Structural view navigation switching
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      appState.activeView = item.dataset.view;
    });
  });

  // Compare Profiles Execution
  compareBtn.addEventListener('click', () => {
    const u1 = compareUser1.value.trim();
    const u2 = compareUser2.value.trim();
    if (u1 && u2) {
      executeProfileComparison(u1, u2);
    } else {
      showToast('Please enter both usernames', 'error');
    }
  });
}

// ============================================================================
// View Orchestration
// ============================================================================
function updateNavigationView(viewName) {
  views.forEach(v => v.classList.remove('active'));
  navItems.forEach(item => item.classList.remove('active'));

  const targetView = document.getElementById(`${viewName}View`);
  const targetNavItem = document.querySelector(`[data-view="${viewName}"]`);

  if (targetView) targetView.classList.add('active');
  if (targetNavItem) targetNavItem.classList.add('active');

  // Lazy execution based on view visibility
  if (viewName === 'trending') fetchTrendingDevelopers();
  if (viewName === 'bookmarks') renderBookmarks();
}

// ============================================================================
// Core Search Logic & Profile Rendering
// ============================================================================
async function handleSearch(username) {
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    showToast('Please enter a username', 'error');
    return;
  }

  loadingContainer.classList.remove('hidden');
  searchContent.innerHTML = '';

  try {
    const baseEndpoint = 'https://api.github.com/users/';
    const userResponse = await fetch(`${baseEndpoint}${cleanUsername}`);
    
    if (!userResponse.ok) throw new Error('Developer profile not found');
    const userData = await userResponse.json();

    const reposResponse = await fetch(`${baseEndpoint}${cleanUsername}/repos?sort=updated&per_page=12`);
    const reposData = reposResponse.ok ? await reposResponse.json() : [];

    appState.setUserData(userData, reposData);
    showToast(`Profile loaded for ${userData.login}`, 'success');
  } catch (error) {
    showToast(error.message || 'Failed to communicate with GitHub', 'error');
    renderSearchEmptyState();
  } finally {
    loadingContainer.classList.add('hidden');
  }
}

function renderSearchProfile() {
  const user = appState.currentUser;
  const repos = appState.currentRepos;
  if (!user) return;

  const isBookmarked = appState.bookmarks.some(b => b.login.toLowerCase() === user.login.toLowerCase());

  searchContent.innerHTML = `
    <div class="user-card">
      <div class="user-header">
        <div class="user-avatar">
          <img src="${user.avatar_url}" alt="${user.login}">
        </div>
        <div class="user-main-info">
          <h1>${user.name || user.login}</h1>
          <a href="${user.html_url}" target="_blank" class="username-link">@${user.login}</a>
          ${user.bio ? `<p class="bio">${user.bio}</p>` : ''}
          
          <div class="user-meta">
            ${user.location ? `<span>📍 ${user.location}</span>` : ''}
            ${user.company ? `<span>🏢 ${user.company}</span>` : ''}
            ${user.created_at ? `<span>Joined ${new Date(user.created_at).getFullYear()}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${user.public_repos}</div>
          <div class="stat-label">Repositories</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${user.followers}</div>
          <div class="stat-label">Followers</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${user.following}</div>
          <div class="stat-label">Following</div>
        </div>
      </div>

      <button id="profileBookmarkBtn" class="btn-primary ${isBookmarked ? 'bookmarked' : ''}">
        ${isBookmarked ? '★ Remove Bookmark' : '☆ Bookmark'}
      </button>
    </div>

    <div class="repos-section">
      <h2>Recent Repositories</h2>
      <div class="repos-grid">
        ${repos.length ? repos.map(repo => `
          <a href="${repo.html_url}" target="_blank" class="repo-card">
            <div class="repo-header">
              <h3>${repo.name}</h3>
            </div>
            <p class="repo-desc">${repo.description || 'No descriptive overview provided for this repository.'}</p>
            <div class="repo-footer">
              ${repo.language ? `<span>⚡ ${repo.language}</span>` : '<span>⚡ Plain Text</span>'}
              <span>★ ${repo.stargazers_count}</span>
            </div>
          </a>
        `).join('') : '<div class="empty-state"><p>No public repositories found.</p></div>'}
      </div>
    </div>
  `;

  // Attach event handler programmatic instead of using an inline string template attribute
  document.getElementById('profileBookmarkBtn').addEventListener('click', () => {
    appState.toggleBookmark(user.login);
  });
}

function renderSearchEmptyState() {
  searchContent.innerHTML = `
    <div class="empty-state">
      <h2>Start discovering</h2>
      <p>Search for a GitHub profile to begin.</p>
    </div>
  `;
}

// ============================================================================
// Bookmarks Module
// ============================================================================
function updateBookmarkCount() {
  bookmarkCount.textContent = appState.bookmarks.length;
}

function renderBookmarkToggleState(username) {
  const btn = document.getElementById('profileBookmarkBtn');
  if (!btn || !appState.currentUser || appState.currentUser.login.toLowerCase() !== username.toLowerCase()) return;
  
  const isBookmarked = appState.bookmarks.some(b => b.login.toLowerCase() === username.toLowerCase());
  btn.className = `btn-primary ${isBookmarked ? 'bookmarked' : ''}`;
  btn.textContent = isBookmarked ? '★ Remove Bookmark' : '☆ Bookmark';
}

function renderBookmarks() {
  if (!appState.bookmarks.length) {
    bookmarksContainer.innerHTML = `
      <div class="empty-state">
        <h2>Your collection</h2>
        <p>Saved developers will appear here.</p>
      </div>
    `;
    return;
  }

  bookmarksContainer.innerHTML = `
    <div class="bookmarks-grid">
      ${appState.bookmarks.map(b => `
        <div class="bookmark-card">
          <h3>${b.login}</h3>
          <button class="btn-primary view-profile-btn" data-username="${b.login}">View Profile</button>
          <button class="primary-btn remove-bookmark-btn" data-username="${b.login}">Remove</button>
        </div>
      `).join('')}
    </div>
  `;

  // Explicit dynamic delegation of handlers without inline styling scripts
  bookmarksContainer.querySelectorAll('.view-profile-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      appState.activeView = 'search';
      searchInput.value = btn.dataset.username;
      handleSearch(btn.dataset.username);
    });
  });

  bookmarksContainer.querySelectorAll('.remove-bookmark-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      appState.toggleBookmark(btn.dataset.username);
    });
  });
}

// ============================================================================
// Profile Compare Module
// ============================================================================
async function executeProfileComparison(u1, u2) {
  compareSetup.classList.add('hidden');
  compareResults.classList.remove('hidden');
  compareResults.innerHTML = '<div class="empty-state"><p>Loading and analyzing metrics...</p></div>';

  try {
    const base = 'https://api.github.com/users/';
    const [user1, user2] = await Promise.all([
      fetch(`${base}${u1}`).then(r => { if (!r.ok) throw new Error(`User ${u1} not found`); return r.json(); }),
      fetch(`${base}${u2}`).then(r => { if (!r.ok) throw new Error(`User ${u2} not found`); return r.json(); })
    ]);

    compareResults.innerHTML = `
      <div class="trending-grid">
        <div class="compare-profile">
          <img src="${user1.avatar_url}" alt="${user1.login}" />
          <h3>${user1.name || user1.login}</h3>
          <p class="username-link">@${user1.login}</p>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${user1.followers}</div>
              <div class="stat-label">Followers</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${user1.public_repos}</div>
              <div class="stat-label">Repos</div>
            </div>
          </div>
        </div>
        <div class="compare-profile">
          <img src="${user2.avatar_url}" alt="${user2.login}" />
          <h3>${user2.name || user2.login}</h3>
          <p class="username-link">@${user2.login}</p>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${user2.followers}</div>
              <div class="stat-label">Followers</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${user2.public_repos}</div>
              <div class="stat-label">Repos</div>
            </div>
          </div>
        </div>
      </div>
      <div class="empty-state">
        <button id="resetCompareBtn" class="btn-primary">Compare New Profiles</button>
      </div>
    `;

    document.getElementById('resetCompareBtn').addEventListener('click', resetCompareView);
  } catch (err) {
    showToast(err.message || 'Comparison processing failed', 'error');
    resetCompareView();
  }
}

function resetCompareView() {
  compareSetup.classList.remove('hidden');
  compareResults.classList.add('hidden');
  compareResults.innerHTML = '';
  compareUser1.value = '';
  compareUser2.value = '';
}

// ============================================================================
// Trending Generation Module
// ============================================================================
async function fetchTrendingDevelopers() {
  trendingContainer.innerHTML = '<div class="empty-state"><p>Curating global trending engines...</p></div>';

  try {
    const response = await fetch('https://api.github.com/search/repositories?q=stars:>500+created:>2025-01-01&sort=stars&order=desc&per_page=25');
    if (!response.ok) throw new Error();
    const data = await response.json();
    
    // De-duplicate items based on distinct owners
    const structuralMap = new Map(data.items.map(item => [item.owner.login, item.owner]));
    const uniqueUsers = [...structuralMap.values()].slice(0, 8);

    trendingContainer.innerHTML = `
      <div class="trending-grid">
        ${uniqueUsers.map(user => `
          <div class="trending-card" data-username="${user.login}">
            <img src="${user.avatar_url}" alt="${user.login}" />
            <h3>${user.login}</h3>
            <p class="username-link" style="margin-top: 8px; display: inline-block;">View Profile</p>
          </div>
        `).join('')}
      </div>
    `;

    trendingContainer.querySelectorAll('.trending-card').forEach(card => {
      card.addEventListener('click', () => {
        appState.activeView = 'search';
        searchInput.value = card.dataset.username;
        handleSearch(card.dataset.username);
      });
    });
  } catch (e) {
    trendingContainer.innerHTML = '<div class="empty-state"><h2>Error</h2><p>Could not safely load trending developers.</p></div>';
  }
}

// ============================================================================
// Toast Communications Engine
// ============================================================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Layout presentation paint cycle delay trigger
  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  }, 3000);
}

