const config = window.CLASSROOM_CONFIG;
const sessionKey = `blog-team-session:${config.teamId}`;

function writeResult(id, message) {
  document.getElementById(id).textContent = message;
}

function requireSupabase(targetId) {
  if (!config.supabase.url || !config.supabase.anonKey) {
    writeResult(targetId, 'Supabase 尚未設定，請老師先部署後端。');
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
  const repoLink = document.getElementById('repo-link');

  if (!session) {
    consoleEl.hidden = true;
    label.textContent = '';
    return;
  }

  consoleEl.hidden = false;
  label.textContent = `目前登入身分：${session.team_id}`;
  repoLink.href = `https://github.com/science20080930-tech/${session.team_id}-site`;
}

function sessionHeaders() {
  const session = getSession();
  return {
    Authorization: `Bearer ${config.supabase.anonKey}`,
    'X-Team-Id': session?.team_id || '',
    'X-Team-Token': session?.session_token || ''
  };
}

document.querySelector('[data-action="load-public-update"]').addEventListener('click', async () => {
  try {
    const response = await fetch(config.updateDocPath, { cache: 'no-store' });
    const payload = await response.json();
    writeResult(
      'update-result',
      JSON.stringify(
        {
          document: payload.document,
          teamId: payload.teamId,
          generatedAt: payload.generatedAt,
          entryCount: Array.isArray(payload.entries) ? payload.entries.length : 0
        },
        null,
        2
      )
    );
  } catch (error) {
    writeResult('update-result', `讀取失敗：${error.message}`);
  }
});

document.getElementById('author-login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!requireSupabase('author-login-result')) return;

  const data = new FormData(event.currentTarget);
  const username = String(data.get('username') || '').trim();
  const password = String(data.get('password') || '');

  const response = await fetch(`${config.supabase.url}/functions/v1/weak-login`, {
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
  writeResult('author-login-result', JSON.stringify(payload, null, 2));
});

document.getElementById('team-login-form').addEventListener('submit', async (event) => {
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
    writeResult('team-login-result', JSON.stringify(payload, null, 2));
    return;
  }

  setSession(payload);
  writeResult('team-login-result', '隊伍後台登入成功。');
});

document.querySelector('[data-action="backend-flag"]').addEventListener('click', async () => {
  if (!requireSupabase('team-login-result')) return;
  if (!getSession()) {
    writeResult('team-login-result', '請先登入隊伍後台。');
    return;
  }

  const endpoint = `${config.supabase.url}/functions/v1/backend-flag?team_id=${encodeURIComponent(config.teamId)}`;
  const response = await fetch(endpoint, { headers: sessionHeaders() });
  const payload = await response.json();
  writeResult('team-login-result', JSON.stringify(payload, null, 2));
});

document.querySelector('[data-action="draft-preview"]').addEventListener('click', async () => {
  if (!requireSupabase('team-login-result')) return;
  if (!getSession()) {
    writeResult('team-login-result', '請先登入隊伍後台。');
    return;
  }

  const endpoint = `${config.supabase.url}/functions/v1/draft-preview?team_id=${encodeURIComponent(
    config.teamId
  )}&slug=${encodeURIComponent(config.draftSlug)}`;
  const response = await fetch(endpoint, { headers: sessionHeaders() });
  const payload = await response.json();
  writeResult('team-login-result', JSON.stringify(payload, null, 2));
});

document.querySelector('[data-action="logout-team"]').addEventListener('click', () => {
  clearSession();
  writeResult('team-login-result', '已登出。');
});

renderTeamConsole();
