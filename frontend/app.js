// State variables
let currentUser = null;
let currentView = 'feed'; // 'feed' or 'profile'
let viewingUsername = null; // username of profile being viewed
let activeCommentsPostId = null;

// DOM Elements
const authView = document.getElementById('auth-view');
const appShell = document.getElementById('app-shell');

// Auth Form Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const loginError = document.getElementById('login-error');
const regError = document.getElementById('reg-error');

// Nav Labels & Avatars
const navAvatarImg = document.getElementById('nav-avatar-img');
const mobAvatarImg = document.getElementById('mob-avatar-img');
const navUsernameLabel = document.getElementById('nav-username-label');

// Main Content Section Views
const viewFeed = document.getElementById('view-feed');
const viewProfile = document.getElementById('view-profile');
const feedPostsList = document.getElementById('feed-posts-list');

// Dialog Elements
const createPostDialog = document.getElementById('create-post-modal');
const commentDialog = document.getElementById('comment-modal');

// Init application
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkAuthStatus();
});

// Setup Event Listeners
function setupEventListeners() {
  // Authentication tab toggles
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    loginError.classList.add('hidden');
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    regError.classList.add('hidden');
  });

  // Login form submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');

      currentUser = data;
      showAppShell();
      navigateToFeed();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.remove('hidden');
    }
  });

  // Register form submit
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    regError.classList.add('hidden');
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const display_name = document.getElementById('reg-display-name').value;
    const password = document.getElementById('reg-password').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, display_name, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');

      currentUser = data;
      showAppShell();
      navigateToFeed();
    } catch (err) {
      regError.textContent = err.message;
      regError.classList.remove('hidden');
    }
  });

  // Demo account quick login helper
  document.querySelectorAll('.demo-chip-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const username = btn.getAttribute('data-user');
      document.getElementById('login-identifier').value = username;
      document.getElementById('login-password').value = 'password123';
      loginForm.dispatchEvent(new Event('submit'));
    });
  });

  // Logout Click
  document.getElementById('btn-logout').addEventListener('click', logoutUser);

  // View navigation links (Desktop + Mobile)
  document.getElementById('nav-feed').addEventListener('click', navigateToFeed);
  document.getElementById('mob-nav-feed').addEventListener('click', navigateToFeed);

  document.getElementById('nav-profile').addEventListener('click', () => navigateToProfile(currentUser.username));
  document.getElementById('mob-nav-profile').addEventListener('click', () => navigateToProfile(currentUser.username));

  // Create post modal triggers
  const btnCreatePost = document.getElementById('nav-create-post');
  const mobBtnCreatePost = document.getElementById('mob-nav-create-post');
  const btnCloseCreatePost = document.getElementById('btn-close-create-post');
  const btnCancelCreatePost = document.getElementById('btn-cancel-create-post');

  const openCreateModal = () => {
    createPostDialog.showModal();
    resetCreateForm();
  };

  btnCreatePost.addEventListener('click', openCreateModal);
  mobBtnCreatePost.addEventListener('click', openCreateModal);
  btnCloseCreatePost.addEventListener('click', () => createPostDialog.close());
  btnCancelCreatePost.addEventListener('click', () => createPostDialog.close());

  // Create post drag and drop setup
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('post-image-file');
  const btnRemovePreview = document.getElementById('btn-remove-preview');
  const previewContainer = document.getElementById('dropzone-preview');
  const promptContainer = document.getElementById('dropzone-prompt');
  const previewImage = document.getElementById('image-preview');

  dropzone.addEventListener('click', (e) => {
    if (e.target !== btnRemovePreview) {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImage.src = e.target.result;
        previewContainer.classList.remove('hidden');
        promptContainer.classList.add('hidden');
      };
      reader.readAsDataURL(file);
    }
  });

  btnRemovePreview.addEventListener('click', (e) => {
    e.stopPropagation();
    resetDropzone();
  });

  // Create Post Submit
  const createPostForm = document.getElementById('create-post-form');
  createPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('btn-submit-post');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing...';

    const formData = new FormData(createPostForm);

    try {
      const res = await fetch('/api/posts/create', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create post.');

      createPostDialog.close();
      resetCreateForm();
      if (currentView === 'feed') {
        loadFeed();
      } else if (currentView === 'profile' && viewingUsername === currentUser.username) {
        loadProfile(currentUser.username);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Publish';
    }
  });

  // Comments Actions
  document.getElementById('btn-close-comments').addEventListener('click', () => commentDialog.close());

  const commentForm = document.getElementById('comment-form');
  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const commentInput = document.getElementById('comment-input');
    const content = commentInput.value;
    if (!content.trim() || !activeCommentsPostId) return;

    try {
      const res = await fetch(`/api/comments/post/${activeCommentsPostId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send comment.');

      commentInput.value = '';
      loadComments(activeCommentsPostId);
      // Update comments counter on feed card if visible
      const commentBtn = document.querySelector(`.post-card[data-id="${activeCommentsPostId}"] .btn-show-comments`);
      if (commentBtn) {
        const text = commentBtn.textContent;
        const currentCount = parseInt(text.replace(/\D/g, ''), 10) || 0;
        commentBtn.textContent = `View all ${currentCount + 1} comments`;
      }
    } catch (err) {
      alert(err.message);
    }
  });

  // Follow & Unfollow on Profile page
  const btnFollow = document.getElementById('btn-profile-follow');
  const btnUnfollow = document.getElementById('btn-profile-unfollow');
  const btnEditProfile = document.getElementById('btn-profile-edit');
  const editProfileCard = document.getElementById('edit-profile-card');

  btnFollow.addEventListener('click', async () => {
    if (!viewingUsername) return;
    try {
      // Find the ID of the user being viewed
      const profileRes = await fetch(`/api/users/${viewingUsername}`);
      const profileData = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileData.error);

      const res = await fetch(`/api/users/${profileData.user.id}/follow`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      loadProfile(viewingUsername);
    } catch (err) {
      alert(err.message);
    }
  });

  btnUnfollow.addEventListener('click', async () => {
    if (!viewingUsername) return;
    try {
      const profileRes = await fetch(`/api/users/${viewingUsername}`);
      const profileData = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileData.error);

      const res = await fetch(`/api/users/${profileData.user.id}/unfollow`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      loadProfile(viewingUsername);
    } catch (err) {
      alert(err.message);
    }
  });

  // Profile Edit Mode toggles
  btnEditProfile.addEventListener('click', () => {
    editProfileCard.classList.remove('hidden');
    document.getElementById('edit-display-name').value = currentUser.display_name;
    document.getElementById('edit-bio').value = currentUser.bio;
  });

  document.getElementById('btn-edit-cancel').addEventListener('click', () => {
    editProfileCard.classList.add('hidden');
  });

  document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const display_name = document.getElementById('edit-display-name').value;
    const bio = document.getElementById('edit-bio').value;

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name, bio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile.');

      currentUser.display_name = data.display_name;
      currentUser.bio = data.bio;
      editProfileCard.classList.add('hidden');
      loadProfile(currentUser.username);
      updateNavLabels();
    } catch (err) {
      alert(err.message);
    }
  });
}

// Check if user is currently logged in on startup
async function checkAuthStatus() {
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    if (data.user) {
      currentUser = data.user;
      showAppShell();
      navigateToFeed();
    } else {
      showAuthView();
    }
  } catch (err) {
    showAuthView();
  }
}

// UI State Switchers
function showAuthView() {
  authView.classList.remove('hidden');
  appShell.classList.add('hidden');
  currentUser = null;
}

function showAppShell() {
  authView.classList.add('hidden');
  appShell.classList.remove('hidden');
  updateNavLabels();
}

function updateNavLabels() {
  if (!currentUser) return;
  // Fill avatars
  navAvatarImg.style.backgroundImage = `url('${currentUser.avatar_url}')`;
  mobAvatarImg.style.backgroundImage = `url('${currentUser.avatar_url}')`;
  navUsernameLabel.textContent = currentUser.display_name;
}

function navigateToFeed() {
  currentView = 'feed';
  viewingUsername = null;
  document.getElementById('nav-feed').classList.add('active');
  document.getElementById('mob-nav-feed').classList.add('active');
  document.getElementById('nav-profile').classList.remove('active');
  document.getElementById('mob-nav-profile').classList.remove('active');

  viewFeed.classList.remove('hidden');
  viewProfile.classList.add('hidden');

  loadFeed();
}

function navigateToProfile(username) {
  currentView = 'profile';
  viewingUsername = username;
  document.getElementById('nav-feed').classList.remove('active');
  document.getElementById('mob-nav-feed').classList.remove('active');
  
  if (username === currentUser.username) {
    document.getElementById('nav-profile').classList.add('active');
    document.getElementById('mob-nav-profile').classList.add('active');
  } else {
    document.getElementById('nav-profile').classList.remove('active');
    document.getElementById('mob-nav-profile').classList.remove('active');
  }

  viewFeed.classList.add('hidden');
  viewProfile.classList.remove('hidden');
  document.getElementById('edit-profile-card').classList.add('hidden');

  loadProfile(username);
}

// Log Out Request
async function logoutUser() {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) {
      showAuthView();
    }
  } catch (err) {
    console.error('Logout error:', err);
  }
}

// Load Feed Data
async function loadFeed() {
  feedPostsList.innerHTML = '<div class="empty-gallery">Loading feed...</div>';
  try {
    const res = await fetch('/api/posts/feed');
    const posts = await res.json();
    if (!res.ok) throw new Error(posts.error);

    feedPostsList.innerHTML = '';
    if (posts.length === 0) {
      feedPostsList.innerHTML = `
        <div class="empty-gallery">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-gallery-icon">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>
          <p>No posts published yet.</p>
        </div>
      `;
      return;
    }

    posts.forEach((post) => {
      const card = document.createElement('div');
      card.className = 'post-card';
      card.setAttribute('data-id', post.id);

      const isPostOwner = post.user_id === currentUser.id;
      const formattedDate = formatDate(post.created_at);

      card.innerHTML = `
        <div class="post-header">
          <div class="post-user-info" data-username="${post.username}">
            <img src="${post.avatar_url}" alt="${post.display_name}" class="post-avatar">
            <div class="post-username-details">
              <span class="post-display-name">${escapeHTML(post.display_name)}</span>
              <span class="post-username">@${escapeHTML(post.username)}</span>
            </div>
          </div>
          ${
            isPostOwner
              ? `<button class="post-action-btn btn-delete-post" title="Delete Post">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                 </button>`
              : ''
          }
        </div>
        <div class="post-media-container">
          <img src="${post.image_url}" alt="Post Media" class="post-media" loading="lazy">
        </div>
        <div class="post-actions">
          <div class="actions-left">
            <button class="post-action-btn btn-like ${post.has_liked ? 'liked' : ''}" title="Like">
              <svg viewBox="0 0 24 24" fill="${post.has_liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="22" height="22">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            <button class="post-action-btn btn-comment" title="Comment">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="post-card-body">
          <span class="likes-count">${post.likes_count} likes</span>
          <p class="post-caption-row">
            <span class="caption-username" data-username="${post.username}">@${escapeHTML(post.username)}</span>
            <span>${escapeHTML(post.caption || '')}</span>
          </p>
          <button class="btn-show-comments">
            ${post.comments_count > 0 ? `View all ${post.comments_count} comments` : 'Add a comment'}
          </button>
          <span class="post-date">${formattedDate}</span>
        </div>
      `;

      // Attach click events to usernames/avatars for profile routing
      card.querySelectorAll('[data-username]').forEach((elem) => {
        elem.addEventListener('click', (e) => {
          e.stopPropagation();
          navigateToProfile(elem.getAttribute('data-username'));
        });
      });

      // Like functionality
      const likeBtn = card.querySelector('.btn-like');
      const likesCountSpan = card.querySelector('.likes-count');
      likeBtn.addEventListener('click', () => toggleLike(post.id, likeBtn, likesCountSpan));

      // Comment button triggers modal
      card.querySelector('.btn-comment').addEventListener('click', () => openCommentsDrawer(post.id));
      card.querySelector('.btn-show-comments').addEventListener('click', () => openCommentsDrawer(post.id));

      // Delete post functionality
      if (isPostOwner) {
        card.querySelector('.btn-delete-post').addEventListener('click', () => deletePost(post.id, card));
      }

      feedPostsList.appendChild(card);
    });
  } catch (err) {
    feedPostsList.innerHTML = `<div class="empty-gallery">Error loading feed: ${err.message}</div>`;
  }
}

// Load profile data
async function loadProfile(username) {
  const profileContainer = document.querySelector('.profile-container');
  try {
    const res = await fetch(`/api/users/${username}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const { user, posts } = data;

    // Fill profile card details
    document.getElementById('profile-avatar').src = user.avatar_url;
    document.getElementById('profile-display-name').textContent = user.display_name;
    document.getElementById('profile-username').textContent = `@${user.username}`;
    document.getElementById('profile-bio').textContent = user.bio || 'No bio written yet.';
    document.getElementById('profile-posts-count').textContent = posts.length;
    document.getElementById('profile-followers-count').textContent = user.followers_count;
    document.getElementById('profile-following-count').textContent = user.following_count;

    // Setup action buttons based on owner vs viewer
    const btnFollow = document.getElementById('btn-profile-follow');
    const btnUnfollow = document.getElementById('btn-profile-unfollow');
    const btnEditProfile = document.getElementById('btn-profile-edit');

    btnFollow.classList.add('hidden');
    btnUnfollow.classList.add('hidden');
    btnEditProfile.classList.add('hidden');

    if (user.id === currentUser.id) {
      btnEditProfile.classList.remove('hidden');
    } else {
      if (user.is_following) {
        btnUnfollow.classList.remove('hidden');
      } else {
        btnFollow.classList.remove('hidden');
      }
    }

    // Render posts grid
    const postsGrid = document.getElementById('profile-posts-grid');
    postsGrid.innerHTML = '';

    if (posts.length === 0) {
      postsGrid.innerHTML = `
        <div class="empty-gallery">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-gallery-icon">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>
          <p>No creations shared yet.</p>
        </div>
      `;
      return;
    }

    posts.forEach((post) => {
      const gridItem = document.createElement('div');
      gridItem.className = 'grid-post-item';

      gridItem.innerHTML = `
        <img src="${post.image_url}" alt="Creations Grid Item" class="grid-post-image" loading="lazy">
        <div class="grid-post-overlay">
          <div class="overlay-metric">
            <svg viewBox="0 0 24 24" fill="currentColor" class="overlay-icon"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span>${post.likes_count}</span>
          </div>
          <div class="overlay-metric">
            <svg viewBox="0 0 24 24" fill="currentColor" class="overlay-icon"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
            <span>${post.comments_count}</span>
          </div>
        </div>
      `;

      gridItem.addEventListener('click', () => {
        // Simple navigation to feed or show post details by scrolling / opening post modal.
        // For visual impact, we will route to Feed and highlight/focus the selected post card
        navigateToFeed();
        setTimeout(() => {
          const postCard = document.querySelector(`.post-card[data-id="${post.id}"]`);
          if (postCard) {
            postCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            postCard.style.outline = '1px solid var(--color-primary)';
            setTimeout(() => {
              postCard.style.outline = 'none';
            }, 2000);
          }
        }, 100);
      });

      postsGrid.appendChild(gridItem);
    });
  } catch (err) {
    profileContainer.innerHTML = `<div class="empty-gallery">Error loading profile: ${err.message}</div>`;
  }
}

// Like / Unlike Toggle
async function toggleLike(postId, btn, likesCountSpan) {
  const isLiked = btn.classList.contains('liked');
  
  // Optimistic UI updates
  const currentLikes = parseInt(likesCountSpan.textContent, 10) || 0;
  if (isLiked) {
    btn.classList.remove('liked');
    btn.querySelector('svg').setAttribute('fill', 'none');
    likesCountSpan.textContent = `${Math.max(0, currentLikes - 1)} likes`;
  } else {
    btn.classList.add('liked');
    btn.querySelector('svg').setAttribute('fill', 'currentColor');
    likesCountSpan.textContent = `${currentLikes + 1} likes`;
  }

  const endpoint = `/api/posts/${postId}/${isLiked ? 'unlike' : 'like'}`;
  try {
    const res = await fetch(endpoint, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    // Correct counts to server realities
    likesCountSpan.textContent = `${data.likes_count} likes`;
  } catch (err) {
    console.error('Like toggle error:', err);
    // Revert on error
    if (isLiked) {
      btn.classList.add('liked');
      btn.querySelector('svg').setAttribute('fill', 'currentColor');
      likesCountSpan.textContent = `${currentLikes} likes`;
    } else {
      btn.classList.remove('liked');
      btn.querySelector('svg').setAttribute('fill', 'none');
      likesCountSpan.textContent = `${currentLikes} likes`;
    }
  }
}

// Delete Post
async function deletePost(postId, cardElement) {
  if (!confirm('Are you sure you want to delete this creation? This action is permanent.')) return;

  try {
    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    cardElement.remove();
  } catch (err) {
    alert(err.message);
  }
}

// Comments drawer loading and rendering
async function openCommentsDrawer(postId) {
  activeCommentsPostId = postId;
  commentDialog.showModal();
  loadComments(postId);
}

async function loadComments(postId) {
  const container = document.getElementById('comments-list-container');
  container.innerHTML = '<div class="empty-comments">Loading comments...</div>';

  try {
    const res = await fetch(`/api/comments/post/${postId}`);
    const comments = await res.json();
    if (!res.ok) throw new Error(comments.error);

    container.innerHTML = '';
    if (comments.length === 0) {
      container.innerHTML = '<div class="empty-comments">No comments yet. Start the conversation!</div>';
      return;
    }

    comments.forEach((c) => {
      const item = document.createElement('div');
      item.className = 'comment-item';

      const formattedDate = formatDate(c.created_at);

      item.innerHTML = `
        <img src="${c.avatar_url}" alt="${c.display_name}" class="comment-avatar" data-username="${c.username}">
        <div class="comment-text-block">
          <div class="comment-author-row">
            <span class="comment-author-name" data-username="${c.username}">@${escapeHTML(c.username)}</span>
            <span class="comment-time">${formattedDate}</span>
          </div>
          <p class="comment-content">${escapeHTML(c.content)}</p>
        </div>
      `;

      item.querySelectorAll('[data-username]').forEach((elem) => {
        elem.addEventListener('click', () => {
          commentDialog.close();
          navigateToProfile(elem.getAttribute('data-username'));
        });
      });

      container.appendChild(item);
    });

    // Auto scroll comments to the bottom
    container.scrollTop = container.scrollHeight;
  } catch (err) {
    container.innerHTML = `<div class="empty-comments">Error: ${err.message}</div>`;
  }
}

// Reset functions
function resetCreateForm() {
  document.getElementById('create-post-form').reset();
  resetDropzone();
}

function resetDropzone() {
  document.getElementById('post-image-file').value = '';
  document.getElementById('dropzone-preview').classList.add('hidden');
  document.getElementById('dropzone-prompt').classList.remove('hidden');
  document.getElementById('image-preview').src = '';
}

// Utility Helpers
function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHrs < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
  }
  if (diffHrs < 24) {
    return `${diffHrs}h ago`;
  }
  
  // Format options: "JUN 21"
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
