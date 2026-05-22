const config = window.SITE_CONFIG;
const sessionKey = `blog-team-session:${config.teamId}`;
const authorLoginPath = ['weak', 'login'].join('-');
const siteSyncPath = atob('YmFja2VuZC1mbGFn');

function writeResult(id, message) {
  const target = document.getElementById(id);
  if (!target) return;
  target.textContent = typeof message === 'string' ? message : formatPayload(message);
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

function apiHeaders() {
  return {
    apikey: config.supabase.anonKey,
    Authorization: `Bearer ${config.supabase.anonKey}`,
    'Content-Type': 'application/json'
  };
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

async function loadScoreboard() {
  if (!config.supabase.url || !config.supabase.anonKey) return;
  const endpoint = new URL(`${config.supabase.url}/rest/v1/ctf_scoreboard`);
  endpoint.searchParams.set('select', 'team_id,display_name,score,captures,stolen_count');
  endpoint.searchParams.set('order', 'score.desc');

  try {
    const response = await fetch(endpoint, { headers: apiHeaders() });
    if (!response.ok) return;
    const rows = await response.json();
    const target = document.getElementById('scoreboard');
    if (!target) return;
    target.innerHTML = rows
      .map(
        (row) => `
          <div class="score-row ${row.team_id === config.teamId ? 'is-home-team' : ''}">
            <strong>${escapeHtml(row.display_name)}</strong>
            <span>${escapeHtml(row.score)} 分</span>
            <small>成功 ${escapeHtml(row.captures)} / 被偷 ${escapeHtml(row.stolen_count)}</small>
          </div>
        `
      )
      .join('');
  } catch {
    // Scoreboard is a live add-on; keep the team blog usable if it is unavailable.
  }
}

async function loadRecentCaptures() {
  if (!config.supabase.url || !config.supabase.anonKey) return;
  const endpoint = new URL(`${config.supabase.url}/rest/v1/ctf_recent_captures`);
  endpoint.searchParams.set('select', 'attacking_team_id,target_team_id,flag_number,cooldown_expires_at,created_at');
  endpoint.searchParams.set('limit', '8');

  try {
    const response = await fetch(endpoint, { headers: apiHeaders() });
    if (!response.ok) return;
    const rows = await response.json();
    const target = document.getElementById('recent-captures');
    if (!target) return;
    target.innerHTML =
      rows
        .map((row) => {
          const created = row.created_at ? new Date(row.created_at).toLocaleString('zh-TW') : '';
          const cooldown = row.cooldown_expires_at ? new Date(row.cooldown_expires_at).toLocaleTimeString('zh-TW') : '';
          return `
            <div class="event-row">
              <strong>${escapeHtml(row.attacking_team_id)} 攻下 ${escapeHtml(row.target_team_id)} 第 ${escapeHtml(
                row.flag_number
              )} 個 flag</strong>
              <span>${escapeHtml(created)}，冷卻到 ${escapeHtml(cooldown)}</span>
            </div>
          `;
        })
        .join('') || '<p>目前還沒有成功提交。</p>';
  } catch {
    // Recent events are non-blocking.
  }
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

function alertTemplate(alert) {
  const stolenAt = alert.stolen_at ? new Date(alert.stolen_at).toLocaleString('zh-TW') : '';
  const cooldownMinutes = Math.ceil(Number(alert.seconds_until_rescore || 0) / 60);
  const cooldownCopy = cooldownMinutes > 0 ? `${cooldownMinutes} 分鐘內重複提交不計分` : '目前可再次被計分';
  return `
    <article class="defense-alert">
      <strong>第 ${escapeHtml(alert.flag_number)} 個 flag 已被偷取，請去做防護。</strong>
      <span>提交隊伍：${escapeHtml(alert.attacking_team_id)}</span>
      <span>時間：${escapeHtml(stolenAt)}</span>
      <span>${escapeHtml(cooldownCopy)}</span>
    </article>
  `;
}

async function loadDefenseAlerts() {
  if (!config.supabase.url || !config.supabase.anonKey) return;

  const endpoint = new URL(`${config.supabase.url}/rest/v1/ctf_team_compromise_status`);
  endpoint.searchParams.set('target_team_id', `eq.${config.teamId}`);
  endpoint.searchParams.set('select', 'flag_number,attacking_team_id,stolen_at,cooldown_expires_at,seconds_until_rescore');
  endpoint.searchParams.set('order', 'flag_number.asc');

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: config.supabase.anonKey,
        Authorization: `Bearer ${config.supabase.anonKey}`
      }
    });
    if (!response.ok) return;

    const alerts = await response.json();
    const section = document.getElementById('defense-alerts');
    const list = document.getElementById('defense-alert-list');
    if (!section || !list || !Array.isArray(alerts) || alerts.length === 0) return;

    section.hidden = false;
    list.innerHTML = alerts.map(alertTemplate).join('');
  } catch {
    // Public reading should not block the blog if the scoring view is unavailable.
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

document.getElementById('flag-submit-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!config.supabase.url || !config.supabase.anonKey) {
    writeResult('submit-result', 'Supabase 尚未設定。');
    return;
  }

  const data = new FormData(event.currentTarget);
  const response = await fetch(`${config.supabase.url}/functions/v1/submit-flag`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({
      attacking_team_id: String(data.get('attacking_team_id') || ''),
      submitted_flag: String(data.get('submitted_flag') || ''),
      ai_assist_note: String(data.get('ai_assist_note') || ''),
      defense_suggestion: String(data.get('defense_suggestion') || '')
    })
  });
  const payload = await response.json();
  writeResult('submit-result', payload);
  await Promise.all([loadScoreboard(), loadRecentCaptures(), loadDefenseAlerts()]);
});

document.getElementById('member-login-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!requireSupabase('member-login-result')) return;

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
  writeResult('member-login-result', formatPayload(payload));
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
loadDefenseAlerts();
loadScoreboard();
loadRecentCaptures();
