async function main() {
  const loginScreen = document.getElementById('login-screen');
  const dashboardScreen = document.getElementById('dashboard-screen');
  const userInfo = document.getElementById('user-info');

  // Check auth
  let me = null;
  try {
    const res = await fetch('/api/admin/me');
    if (res.ok) me = (await res.json()).user;
  } catch (e) {}

  if (!me) {
    loginScreen.classList.remove('hidden');
    dashboardScreen.classList.add('hidden');
    return;
  }

  loginScreen.classList.add('hidden');
  dashboardScreen.classList.remove('hidden');
  userInfo.textContent = `👤 ${me.username}`;

  // Navigation
  const navLinks = document.querySelectorAll('.nav-link');
  const views = document.querySelectorAll('.view');
  const pageTitle = document.getElementById('page-title');

  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const viewName = link.dataset.view;
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      views.forEach(v => v.classList.add('hidden'));
      document.getElementById(`view-${viewName}`).classList.remove('hidden');
      pageTitle.textContent = link.textContent.trim();
      if (viewName === 'users') loadUsers();
      if (viewName === 'matches') loadMatches();
      if (viewName === 'leaderboard') loadLeaderboard();
      if (viewName === 'stats') {
        const resultContainer = document.getElementById('stats-result-container');
        if (resultContainer) resultContainer.classList.add('hidden');
      }
      if (viewName === 'overview') { loadStats(); loadStatus(); }
      if (viewName === 'config') loadConfig();
      if (viewName === 'features') loadFeatures();
      if (viewName === 'logs') { loadLogs(); startLogPolling(); }
      else { stopLogPolling(); }
    });
  });

  // Initial load
  loadStats();
  loadStatus();
  loadFeatures();

  // Auto-refresh stats every 30s
  setInterval(() => {
    if (!document.getElementById('view-overview').classList.contains('hidden')) {
      loadStats();
      loadStatus();
    }
  }, 30000);

  async function loadStats() {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      document.getElementById('stat-users').textContent = data.totalUsers;
      document.getElementById('stat-matches').textContent = data.totalMatches;

      const featureOverview = document.getElementById('feature-overview');
      if (data.features && featureOverview) {
        const labels = {
          autoWelcomeDm: 'Welcome DM',
          autoRoleSync: 'Role Sync',
          autoVoiceChannels: 'Voice Channels',
          autoMovePlayers: 'Auto Move',
          matchAnnouncements: 'Matches',
          liveMatchPanel: 'Live Panel',
        };
        featureOverview.innerHTML = Object.entries(data.features).map(([k, v]) => {
          const cls = v ? 'on' : 'off';
          const icon = v ? '🟢' : '🔴';
          return `<div class="feature-pill ${cls}"><span>${labels[k] || k}</span><span>${icon}</span></div>`;
        }).join('');
      }
    } catch (e) { console.error('Error cargando stats:', e); }
  }

  async function loadStatus() {
    try {
      const res = await fetch('/api/admin/status');
      const data = await res.json();
      const badge = document.getElementById('bot-status');
      badge.textContent = data.discordConnected ? '🟢 Online' : '🔴 Offline';
      document.getElementById('stat-uptime').textContent = fmtDuration(data.uptime);
      document.getElementById('stat-guild').textContent = data.guildName || 'N/D';
    } catch (e) { console.error('Error cargando status:', e); }
  }

  async function loadUsers() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '<tr><td colspan="5" class="muted">Cargando...</td></tr>';
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      const users = data.users || [];
      const search = document.getElementById('user-search');
      const render = (filter = '') => {
        const filtered = users.filter(u => (u.faceit_nickname || '').toLowerCase().includes(filter.toLowerCase()));
        if (filtered.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="muted">No hay usuarios.</td></tr>';
          return;
        }
        tbody.innerHTML = filtered.map(u => {
          const linked = u.linkedAt ? new Date(u.linkedAt._seconds * 1000).toLocaleDateString() : '-';
          return `<tr>
            <td><code>${u.discordId}</code></td>
            <td>${u.faceit_nickname || '-'}</td>
            <td><code>${(u.faceit_player_id || '').slice(0, 12)}...</code></td>
            <td>${linked}</td>
            <td>
              <button class="btn-action info" onclick="openRoleModal('${u.discordId}')">Rol</button>
              <button class="btn-action" onclick="unlinkUser('${u.discordId}')">Desvincular</button>
            </td>
          </tr>`;
        }).join('');
      };
      render();
      search.oninput = () => render(search.value);
    } catch (e) { tbody.innerHTML = '<tr><td colspan="5" class="muted">Error al cargar.</td></tr>'; }
  }

  async function loadMatches() {
    const tbody = document.getElementById('matches-table-body');
    tbody.innerHTML = '<tr><td colspan="7" class="muted">Cargando...</td></tr>';
    try {
      const res = await fetch('/api/admin/matches');
      const data = await res.json();
      const matches = data.matches || [];
      if (matches.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="muted">No hay partidas activas.</td></tr>'; return; }
      tbody.innerHTML = matches.map(m => `<tr>
        <td><code>${m.id.slice(0, 10)}...</code></td>
        <td>${m.faction1_name}</td>
        <td>${m.faction2_name}</td>
        <td>${m.map}</td>
        <td>${m.location}</td>
        <td>${m.startedAt ? new Date(m.startedAt).toLocaleTimeString() : '-'}</td>
        <td>
          <button class="btn-action secondary" onclick="cleanupMatch('${m.id}')">Forzar Cleanup</button>
        </td>
      </tr>`).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="7" class="muted">Error al cargar.</td></tr>'; }
  }

  window.loadLeaderboard = async function() {
    const tbody = document.getElementById('leaderboard-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="muted">Cargando...</td></tr>';
    try {
      const res = await fetch('/api/admin/leaderboard');
      const data = await res.json();
      const entries = data.leaderboard || [];
      if (entries.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="muted">No hay jugadores vinculados.</td></tr>'; return; }
      tbody.innerHTML = entries.map((m, i) => `<tr>
        <td>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.'}</td>
        <td><code>${m.discordId}</code></td>
        <td>${m.nickname}</td>
        <td>Nivel ${m.level}</td>
        <td>${m.elo}</td>
      </tr>`).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="5" class="muted">Error al cargar.</td></tr>'; }
  };

  window.searchStats = async function() {
    const input = document.getElementById('stats-search-input');
    const container = document.getElementById('stats-result-container');
    if (!input || !container) return;
    
    const nickname = input.value.trim();
    if (!nickname) { toast('Introduce un nickname', true); return; }

    container.innerHTML = '<p class="muted">Buscando estadísticas...</p>';
    container.classList.remove('hidden');

    try {
      const res = await fetch(`/api/admin/stats/${encodeURIComponent(nickname)}`);
      const data = await res.json();
      if (!res.ok) {
        container.innerHTML = `<p style="color:var(--danger)">${data.error || 'Error al buscar'}</p>`;
        return;
      }

      const { player, stats, history } = data;
      let historyHtml = '<span class="muted">N/D</span>';
      if (history && history.items) {
        historyHtml = history.items.slice(0, 5).map(m => {
          const won = m.results?.winner === m.teams?.faction1?.team_id ? 'W' : 'L';
          return won === 'W' ? '🟢' : '🔴';
        }).join(' ');
      }

      container.innerHTML = `
        <div class="stat-card" style="margin-bottom:1rem;">
          <div style="display:flex; align-items:center; gap: 1rem;">
            ${player.avatar ? `<img src="${player.avatar}" alt="avatar" style="width:64px;height:64px;border-radius:50%;">` : '👤'}
            <div>
              <h2 style="margin:0">${player.nickname} <img src="https://flagcdn.com/24x18/${(player.country||'').toLowerCase()}.png" alt="${player.country}"></h2>
              <span class="muted">Faceit ID: <code>${player.player_id}</code></span>
            </div>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${player.level || '?'}</div>
            <div class="stat-label">Nivel Faceit</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${player.elo || '0'}</div>
            <div class="stat-label">ELO</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats?.lifetime?.['Average K/D Ratio'] || 'N/D'}</div>
            <div class="stat-label">K/D Ratio</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats?.lifetime?.['Win Rate %'] || 'N/D'}%</div>
            <div class="stat-label">Win Rate</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats?.lifetime?.['Matches'] || '0'}</div>
            <div class="stat-label">Partidas Jugadas</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="font-size:1.2rem;">${historyHtml}</div>
            <div class="stat-label">Últimas 5 Partidas</div>
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = '<p style="color:var(--danger)">Error de conexión.</p>';
    }
  };

  async function loadConfig() {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      const s = data.settings || {};
      const form = document.getElementById('config-form');
      form.querySelectorAll('input').forEach(input => {
        if (s[input.name] !== undefined && s[input.name] !== null) input.value = s[input.name];
      });
    } catch (e) { console.error('Error cargando config:', e); }
  }

  async function loadFeatures() {
    const container = document.getElementById('feature-list');
    if (!container) return;
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      const s = data.settings || {};
      const features = [
        { key: 'autoWelcomeDm', name: 'Welcome DM', desc: 'Enviar mensaje de bienvenida por DM a nuevos miembros' },
        { key: 'autoRoleSync', name: 'Role Sync', desc: 'Sincronizar roles de nivel y club automáticamente' },
        { key: 'autoVoiceChannels', name: 'Voice Channels', desc: 'Crear canales de voz temporales para partidas' },
        { key: 'autoMovePlayers', name: 'Auto Move', desc: 'Mover jugadores a sus canales de voz al iniciar partida' },
        { key: 'matchAnnouncements', name: 'Match Announcements', desc: 'Anunciar partidas en Discord' },
        { key: 'serverStatusAnnouncements', name: 'Server Status', desc: 'Anunciar estado de servidores LATAM' },
        { key: 'liveMatchPanel', name: 'Live Panel', desc: 'Panel de partidas en vivo fijado' },
        { key: 'webhookValidation', name: 'Webhook Validation', desc: 'Validar firma de webhooks de Faceit' },
      ];
      
      const commands = [
        { key: 'command_verificar', name: 'Cmd /verificar_fc', desc: 'Permite a los usuarios vincular su cuenta' },
        { key: 'command_desvincular', name: 'Cmd /desvincular_fc', desc: 'Permite a los admins desvincular a un usuario' },
        { key: 'command_leaderboard', name: 'Cmd /leaderboard', desc: 'Muestra el ranking del servidor' },
        { key: 'command_stats', name: 'Cmd /stats', desc: 'Muestra las estadísticas de un jugador' },
        { key: 'command_info', name: 'Cmd /info', desc: 'Muestra información general del servidor' },
      ];

      const renderFeatures = (list) => list.map(f => {
        const checked = s[f.key] !== false ? 'checked' : ''; // Default true for commands if not set
        return `<div class="feature-item">
          <div class="feature-info">
            <div class="feature-name">${f.name}</div>
            <div class="feature-desc">${f.desc}</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" ${checked} onchange="toggleFeature('${f.key}', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>`;
      }).join('');

      container.innerHTML = `
        <h4 style="margin-top:0;">🤖 Bot Features</h4>
        ${renderFeatures(features)}
        <h4 style="margin-top:1.5rem;">⌨️ Comandos Discord</h4>
        ${renderFeatures(commands)}
      `;
    } catch (e) { console.error('Error cargando features:', e); }
  }

  let logPolling = null;
  let currentLogFilter = 'all';

  async function loadLogs() {
    const tbody = document.getElementById('logs-table-body');
    try {
      const res = await fetch('/api/admin/logs?limit=100');
      const data = await res.json();
      let logs = data.logs || [];
      if (currentLogFilter !== 'all') {
        logs = logs.filter(l => (l.level || '').toLowerCase() === currentLogFilter);
      }
      if (logs.length === 0) { tbody.innerHTML = '<tr><td colspan="3" class="muted">No hay logs.</td></tr>'; return; }
      tbody.innerHTML = logs.map(l => {
        const level = (l.level || 'info').toLowerCase();
        const time = l.createdAt ? new Date(l.createdAt._seconds * 1000).toLocaleString() : '-';
        return `<tr>
          <td><span class="log-level ${level}">${level}</span></td>
          <td>${escapeHtml(l.message || '')}</td>
          <td style="white-space:nowrap">${time}</td>
        </tr>`;
      }).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="3" class="muted">Error al cargar.</td></tr>'; }
  }

  function startLogPolling() {
    if (logPolling) return;
    logPolling = setInterval(loadLogs, 5000);
  }
  function stopLogPolling() {
    if (logPolling) { clearInterval(logPolling); logPolling = null; }
  }

  document.querySelectorAll('.btn-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLogFilter = btn.dataset.filter;
      loadLogs();
    });
  });

  // Expose functions to window
  window.unlinkUser = async function(discordId) {
    if (!confirm('¿Seguro que deseas desvincular este usuario?')) return;
    try {
      const res = await fetch(`/api/admin/users/${discordId}/unlink`, { method: 'POST' });
      if (res.ok) { toast('Usuario desvinculado correctamente.'); loadUsers(); loadStats(); }
      else toast('Error al desvincular.', true);
    } catch (e) { toast('Error de red.', true); }
  };

  window.cleanupMatch = async function(matchId) {
    if (!confirm('¿Seguro que deseas forzar el cleanup de esta partida?')) return;
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/cleanup`, { method: 'POST' });
      if (res.ok) { toast('Cleanup realizado.'); loadMatches(); loadStats(); }
      else toast('Error al hacer cleanup.', true);
    } catch (e) { toast('Error de red.', true); }
  };

  window.refreshPanel = async function() {
    try {
      const res = await fetch('/api/admin/panel/refresh', { method: 'POST' });
      if (res.ok) toast('Panel actualizado.');
      else toast('Error al actualizar panel.', true);
    } catch (e) { toast('Error de red.', true); }
  };

  window.toggleFeature = async function(key, enabled) {
    try {
      const res = await fetch(`/api/admin/features/${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (res.ok) { toast(`Feature ${key} ${enabled ? 'activado' : 'desactivado'}.`); loadStats(); }
      else toast('Error al actualizar feature.', true);
    } catch (e) { toast('Error de red.', true); }
  };

  window.saveConfig = async function() {
    const form = document.getElementById('config-form');
    const settings = {};
    form.querySelectorAll('input').forEach(input => {
      if (input.type === 'number') settings[input.name] = parseInt(input.value, 10) || input.value;
      else settings[input.name] = input.value;
    });
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) toast('Configuración guardada.');
      else toast('Error al guardar.', true);
    } catch (e) { toast('Error de red.', true); }
  };

  window.showVerifyModal = function() {
    document.getElementById('verify-modal').classList.remove('hidden');
  };
  window.closeVerifyModal = function() {
    document.getElementById('verify-modal').classList.add('hidden');
  };
  window.submitVerify = async function() {
    const discordId = document.getElementById('verify-discord-id').value.trim();
    const nickname = document.getElementById('verify-nickname').value.trim();
    if (!discordId || !nickname) { toast('Completa todos los campos.', true); return; }
    try {
      const res = await fetch('/api/admin/users/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId, faceitNickname: nickname })
      });
      if (res.ok) { toast('Usuario verificado correctamente.'); closeVerifyModal(); loadUsers(); loadStats(); }
      else { const err = await res.json(); toast(err.error || 'Error', true); }
    } catch (e) { toast('Error de red.', true); }
  };

  window.openRoleModal = function(discordId) {
    document.getElementById('role-discord-id').value = discordId;
    document.getElementById('role-modal').classList.remove('hidden');
  };
  window.closeRoleModal = function() {
    document.getElementById('role-modal').classList.add('hidden');
  };
  window.submitRole = async function() {
    const discordId = document.getElementById('role-discord-id').value;
    const roleType = document.getElementById('role-type').value;
    const roleValue = document.getElementById('role-value').value.trim();
    if (!roleValue) { toast('Introduce un valor.', true); return; }
    try {
      const res = await fetch(`/api/admin/users/${discordId}/roles`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleType, roleValue })
      });
      if (res.ok) { toast('Rol asignado correctamente.'); closeRoleModal(); }
      else toast('Error al asignar rol.', true);
    } catch (e) { toast('Error de red.', true); }
  };
}

function toast(message, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.style.borderColor = isError ? 'var(--danger)' : 'var(--success)';
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

function fmtDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

main();
