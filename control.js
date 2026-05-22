const config = window.SITE_CONFIG;

function apiHeaders() {
  return {
    apikey: config.supabase.anonKey,
    Authorization: `Bearer ${config.supabase.anonKey}`,
    'Content-Type': 'application/json'
  };
}

function writeResult(id, value) {
  document.getElementById(id).textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function loadScoreboard() {
  if (!config.supabase.url || !config.supabase.anonKey) return;
  const endpoint = new URL(`${config.supabase.url}/rest/v1/ctf_scoreboard`);
  endpoint.searchParams.set('select', 'team_id,display_name,score,captures,stolen_count');
  endpoint.searchParams.set('order', 'score.desc');

  const response = await fetch(endpoint, { headers: apiHeaders() });
  if (!response.ok) return;
  const rows = await response.json();
  document.getElementById('scoreboard').innerHTML = rows
    .map(
      (row) => `
        <div class="score-row">
          <strong>${escapeHtml(row.display_name)}</strong>
          <span>${escapeHtml(row.score)} 分</span>
          <small>成功 ${escapeHtml(row.captures)} / 被偷 ${escapeHtml(row.stolen_count)}</small>
        </div>
      `
    )
    .join('');
}

async function loadRecentCaptures() {
  if (!config.supabase.url || !config.supabase.anonKey) return;
  const endpoint = new URL(`${config.supabase.url}/rest/v1/ctf_recent_captures`);
  endpoint.searchParams.set('select', 'attacking_team_id,target_team_id,flag_number,cooldown_expires_at,created_at');
  endpoint.searchParams.set('limit', '10');

  const response = await fetch(endpoint, { headers: apiHeaders() });
  if (!response.ok) return;
  const rows = await response.json();
  document.getElementById('recent-captures').innerHTML =
    rows
      .map((row) => {
        const created = row.created_at ? new Date(row.created_at).toLocaleString('zh-TW') : '';
        const cooldown = row.cooldown_expires_at ? new Date(row.cooldown_expires_at).toLocaleTimeString('zh-TW') : '';
        return `
          <div class="event-row">
            <strong>${escapeHtml(row.attacking_team_id)} 取得 ${escapeHtml(row.target_team_id)} 第 ${escapeHtml(
              row.flag_number
            )} 個 flag</strong>
            <span>${escapeHtml(created)}，冷卻到 ${escapeHtml(cooldown)}</span>
          </div>
        `;
      })
      .join('') || '<p>尚無有效提交。</p>';
}

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
  await Promise.all([loadScoreboard(), loadRecentCaptures()]);
});

loadScoreboard();
loadRecentCaptures();
