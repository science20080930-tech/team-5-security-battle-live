const config = window.SITE_CONFIG;
const sessionKey = `blog-team-session:${config.teamId}`;
const authorLoginPath = ['weak', 'login'].join('-');
const siteSyncPath = atob('YmFja2VuZC1mbGFn');

function writeResult(id, message) {
  const target = document.getElementById(id);
  if (target) target.textContent = message;
}

function requireSupabase(targetId) {
  if (!config.supabase.url || !config.supabase.anonKey) {
    writeResult(targetId, '目前無法連線，請稍後再試。');
    return false;
  }
  return true;
}

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
  } catch {
    return null;
  }
}

function setSession(session) {
  sessionStorage.setItem(sessionKey, JSON.stringify(session));
  renderTeamConsole();
}

function clearSession() {
  sessionStorage.removeItem(sessionKey);
  renderTeamConsole();
}

function renderTeamConsole() {
  const session = getSession();
  const consoleEl = document.getElementById('team-console');
  const label = document.getElementById('team-session-label');

  if (!consoleEl || !label) return;

  if (!session) {
    consoleEl.hidden = true;
    label.textContent = '';
    return;
  }

  consoleEl.hidden = false;
  label.textContent = `已連線站台：${session.team_id}`;
}

function sessionHeaders() {
  const session = getSession();
  return {
    Authorization: `Bearer ${config.supabase.anonKey}`,
    'X-Team-Id': session?.team_id || '',
    'X-Team-Token': session?.session_token || ''
  };
}

function formatPayload(payload) {
  return JSON.stringify(payload, null, 2);
}

function filterPosts() {
  const activeTopic = document.querySelector('[data-topic].is-active')?.dataset.topic || 'all';
  const query = document.getElementById('post-search')?.value.trim().toLowerCase() || '';

  document.querySelectorAll('.post-card[data-topic]').forEach((card) => {
    const topicMatch = activeTopic === 'all' || card.dataset.topic.includes(activeTopic);
    const textMatch = !query || card.textContent.toLowerCase().includes(query);
    card.hidden = !(topicMatch && textMatch);
  });
}

function postTemplate(post) {
  const topic = post.category || '社課';
  const date = post.published_at ? new Date(post.published_at).toLocaleDateString('zh-TW') : '';
  return `
    <article class="post-card" data-topic="${escapeHtml(topic)}">
      <span class="category">${escapeHtml(topic)}</span>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.summary || '')}</p>
      <div class="post-meta">
        <span>${escapeHtml(post.author || '社團編輯小組')}</span>
        <span>${escapeHtml(date)}</span>
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function loadRemotePosts() {
  if (!config.supabase.url || !config.supabase.anonKey || !config.postsTable) return;

  const endpoint = new URL(`${config.supabase.url}/rest/v1/${config.postsTable}`);
  endpoint.searchParams.set('team_id', `eq.${config.teamId}`);
  endpoint.searchParams.set('published', 'eq.true');
  endpoint.searchParams.set('select', 'title,summary,category,author,published_at');
  endpoint.searchParams.set('order', 'published_at.desc');

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: config.supabase.anonKey,
        Authorization: `Bearer ${config.supabase.anonKey}`
      }
    });
    if (!response.ok) return;

    const posts = await response.json();
    const target = document.getElementById('notes');
    if (!target || !Array.isArray(posts) || posts.length === 0) return;

    target.innerHTML = posts.map(postTemplate).join('');
    filterPosts();
  } catch {
    // Keep bundled articles when the optional Supabase table is not available.
  }
}

document.querySelectorAll('[data-topic]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-topic]').forEach((item) => item.classList.remove('is-active'));
    button.classList.add('is-active');
    filterPosts();
  });
});

document.getElementById('post-search')?.addEventListener('input', filterPosts);

document.getElementById('author-login-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!requireSupabase('author-login-result')) return;

  const data = new FormData(event.currentTarget);
  const username = String(data.get('username') || '').trim();
  const password = String(data.get('password') || '');

  const response = await fetch(`${config.supabase.url}/functions/v1/${authorLoginPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.supabase.anonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      team_id: config.teamId,
      username,
      password
    })
  });

  const payload = await response.json();
  writeResult('author-login-result', formatPayload(payload));
});

document.getElementById('team-login-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!requireSupabase('team-login-result')) return;

  const data = new FormData(event.currentTarget);
  const teamId = String(data.get('team_id') || '').trim();
  const password = String(data.get('password') || '');

  const response = await fetch(`${config.supabase.url}/functions/v1/team-login`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.supabase.anonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      team_id: teamId,
      password
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    writeResult('team-login-result', formatPayload(payload));
    return;
  }

  setSession(payload);
  writeResult('team-login-result', '站台同步已連線。');
});

document.querySelector('[data-action="sync-site"]')?.addEventListener('click', async () => {
  if (!requireSupabase('team-login-result')) return;
  if (!getSession()) {
    writeResult('team-login-result', '請先連線站台同步。');
    return;
  }

  const endpoint = `${config.supabase.url}/functions/v1/${siteSyncPath}?team_id=${encodeURIComponent(config.teamId)}`;
  const response = await fetch(endpoint, { headers: sessionHeaders() });
  const payload = await response.json();
  writeResult('team-login-result', formatPayload(payload));
});

document.querySelector('[data-action="draft-preview"]')?.addEventListener('click', async () => {
  if (!requireSupabase('team-login-result')) return;
  if (!getSession()) {
    writeResult('team-login-result', '請先連線站台同步。');
    return;
  }

  const endpoint = `${config.supabase.url}/functions/v1/draft-preview?team_id=${encodeURIComponent(
    config.teamId
  )}&slug=${encodeURIComponent(config.draftSlug)}`;
  const response = await fetch(endpoint, { headers: sessionHeaders() });
  const payload = await response.json();
  writeResult('team-login-result', formatPayload(payload));
});

document.querySelector('[data-action="logout-team"]')?.addEventListener('click', () => {
  clearSession();
  writeResult('team-login-result', '已登出。');
});

renderTeamConsole();
loadRemotePosts();
