import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  Trophy,
  BarChart3,
  Settings,
  ToggleLeft,
  ToggleRight,
  FileText,
  Search,
  Bell,
  Moon,
  HelpCircle,
  RefreshCw,
  LogOut,
  CheckCircle2,
  XCircle,
  Trash2,
  UserPlus,
  ArrowUpRight,
  Activity,
  Map,
  Clock,
  Lock,
  ArrowUp,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  ShieldAlert
} from 'lucide-react';
import { LinkedUser, LiveMatch, SystemLog, BotConfig, FeatureFlag, PlayerStats } from './types';
import {
  initialUsers,
  initialMatches,
  initialFeatureFlags,
  initialConfig,
  initialLogs,
  proPlayers,
  generateMockPlayer
} from './data';

// Helper para todas las peticiones a la API — siempre envía cookies de sesión
const apiFetch = (url: string, options: RequestInit = {}) => {
  let finalUrl = url;
  const method = (options.method || 'GET').toUpperCase();
  if (method === 'GET') {
    const separator = url.includes('?') ? '&' : '?';
    finalUrl = `${url}${separator}_t=${Date.now()}`;
  }
  return fetch(finalUrl, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
};

export default function App() {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAuthChecked, setIsAuthChecked] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; email?: string; avatar: string; role?: string; servidor?: string } | null>(null);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');

  useEffect(() => {
    apiFetch('/api/admin/me').then(res => {
      if (res.ok) {
        res.json().then(data => {
          if (data.user) {
            const userProfile = {
              username: data.user.username,
              avatar: data.user.avatar ? `https://cdn.discordapp.com/avatars/${data.user.userId}/${data.user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png',
              role: data.user.role,
              servidor: data.user.servidor
            };
            setCurrentUser(userProfile);
            setIsLoggedIn(true);

            // Fetch guilds
            apiFetch('/api/admin/guilds').then(guildsRes => {
              if (guildsRes.ok) {
                guildsRes.json().then(guildsData => {
                  if (guildsData.guilds && guildsData.guilds.length > 0) {
                    setGuilds(guildsData.guilds);
                    const userGuildId = userProfile.role === 'admin' ? userProfile.servidor : (localStorage.getItem('admin_selected_guild') || guildsData.guilds[0].id);
                    setSelectedGuildId(userGuildId || '');
                  }
                });
              }
            });
          }
        });
      }
    }).finally(() => setIsAuthChecked(true));
  }, []);

  // System Core States
  const [users, setUsers] = useState<LinkedUser[]>([]);

  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [matchStats, setMatchStats] = useState<{ serverLoad: number; avgDurationStr: string; failedCleanups: number }>({
    serverLoad: 0,
    avgDurationStr: '0m 0s',
    failedCleanups: 0
  });

  const [logs, setLogs] = useState<SystemLog[]>([]);

  const [systemInfo, setSystemInfo] = useState<{ uptimeSeconds: number; hubRegion: string }>({ uptimeSeconds: 0, hubRegion: 'CARGANDO...' });

  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);

  const [config, setConfig] = useState<BotConfig>(initialConfig);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [supportCalls, setSupportCalls] = useState<any[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<{
    welcomeTitle: string;
    welcomeDescription: string;
    welcomeColor: string;
    supportTitle: string;
    supportDescription: string;
    supportColor: string;
  }>({
    welcomeTitle: '',
    welcomeDescription: '',
    welcomeColor: '',
    supportTitle: '',
    supportDescription: '',
    supportColor: ''
  });

  // UI States
  
  // Helper Toast notifier
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const loadData = async () => {
    if (!isLoggedIn) return;
    const safeFetch = async (url: string) => {
      try {
        const res = await apiFetch(url);
        return res.ok ? res : null;
      } catch (e) {
        console.warn(`Failed to fetch ${url}:`, e);
        return null;
      }
    };

    try {
      const guildQuery = selectedGuildId ? `?guildId=${selectedGuildId}` : '';
      const [usersRes, matchesRes, logsRes, settingsRes, leaderboardRes, systemRes, supportRes, messagesRes, historyRes] = await Promise.all([
        safeFetch(`/api/admin/users${guildQuery}`),
        safeFetch(`/api/admin/matches${guildQuery}`),
        safeFetch(`/api/admin/logs${guildQuery}`),
        safeFetch(`/api/admin/guilds/${selectedGuildId}/settings`),
        safeFetch(`/api/admin/leaderboard${guildQuery}`),
        safeFetch(`/api/admin/system${guildQuery}`),
        safeFetch(`/api/admin/support-calls${guildQuery}`),
        safeFetch(`/api/admin/messages${guildQuery}`),
        safeFetch(`/api/admin/matches/history${guildQuery}`)
      ]);

      if (!usersRes && !matchesRes && !logsRes && !settingsRes && !leaderboardRes && !systemRes) {
        showToast('Error al conectar con la API del bot', 'error');
        return;
      }

      if (usersRes) {
        try {
          const uData = (await usersRes.json()).users || [];
          setUsers(uData.map((u: any) => {
            let parsedDate = new Date().toLocaleString();
            if (u.linkedAt && u.linkedAt._seconds) {
              parsedDate = new Date(u.linkedAt._seconds * 1000).toLocaleString('es-ES');
            } else if (typeof u.linkedAt === 'string') {
              parsedDate = u.linkedAt;
            } else if (u.linked_at) {
              parsedDate = u.linked_at;
            }
            
            return {
              discordId: u.discordId || u.discord_id || '',
              faceitNickname: u.faceitNickname || u.faceit_nickname || '',
              faceitPlayerId: u.faceitPlayerId || u.faceit_id || u.faceit_player_id || '',
              status: u.status || 'Verificado',
              linkedAt: parsedDate,
              roleType: u.roleType || u.role_type,
              roleValue: u.roleValue || u.role_value
            };
          }));
        } catch (err) {
          console.error('Error parsing users data:', err);
        }
      }

      if (matchesRes) {
        try {
          const data = await matchesRes.json();
          const mData = data.matches || [];
          setMatches(mData.map((m: any) => ({
            id: m.id || m.match_id || '',
            teamAName: m.teamAName || m.teamA?.name || 'Equipo A',
            teamALogo: m.teamALogo || m.teamA?.avatar || '',
            teamBName: m.teamBName || m.teamB?.name || 'Equipo B',
            teamBLogo: m.teamBLogo || m.teamB?.avatar || '',
            map: m.map || 'TBD',
            location: m.location || 'EU',
            startedAtMinutesAgo: m.startedAtMinutesAgo || (m.startedAt ? Math.round((Date.now() - m.startedAt) / 60000) : 0),
            startedAt: m.startedAt
          })));
          if (data.stats) {
            setMatchStats(data.stats);
          }
        } catch (err) {
          console.error('Error parsing matches data:', err);
        }
      }

      if (logsRes) {
        try {
          setLogs((await logsRes.json()).logs || []);
        } catch (err) {
          console.error('Error parsing logs data:', err);
        }
      }

      if (settingsRes) {
        try {
          const s = (await settingsRes.json()).settings || {};
          setConfig(s);
          const features = [
            { key: 'autoWelcomeDm', name: 'Welcome DM', desc: 'Enviar mensaje de bienvenida', enabled: s.autoWelcomeDm === true },
            { key: 'autoRoleSync', name: 'Role Sync', desc: 'Sincronizar roles', enabled: s.autoRoleSync === true },
            { key: 'autoVoiceChannels', name: 'Voice Channels', desc: 'Crear canales de voz', enabled: s.autoVoiceChannels === true },
            { key: 'autoMovePlayers', name: 'Auto Move', desc: 'Mover jugadores', enabled: s.autoMovePlayers === true },
            { key: 'matchAnnouncements', name: 'Match Announcements', desc: 'Anunciar partidas', enabled: s.matchAnnouncements === true },
            { key: 'liveMatchPanel', name: 'Live Panel', desc: 'Panel en vivo', enabled: s.liveMatchPanel === true },
            { key: 'command_verificar', name: 'Cmd /verificar_fc', desc: 'Comando verificar', enabled: s.command_verificar !== false },
            { key: 'command_desvincular', name: 'Cmd /desvincular_fc', desc: 'Comando desvincular', enabled: s.command_desvincular !== false },
            { key: 'command_leaderboard', name: 'Cmd /leaderboard', desc: 'Comando leaderboard', enabled: s.command_leaderboard !== false },
            { key: 'command_stats', name: 'Cmd /stats', desc: 'Comando stats', enabled: s.command_stats !== false },
            { key: 'command_info', name: 'Cmd /info', desc: 'Comando info', enabled: s.command_info !== false },
            { key: 'command_sincronizar', name: 'Cmd /sincronizar_fc', desc: 'Comando sincronizar', enabled: s.command_sincronizar !== false },
            { key: 'command_partidas', name: 'Cmd /partidas', desc: 'Comando partidas', enabled: s.command_partidas !== false }
          ];
          setFeatureFlags(features);
        } catch (err) {
          console.error('Error parsing settings data:', err);
        }
      }

      if (leaderboardRes) {
        try {
          const lData = await leaderboardRes.json();
          setLeaderboard(lData.leaderboard || []);
        } catch (err) {
          console.error('Error parsing leaderboard data:', err);
        }
      }

      if (systemRes) {
        try {
          const sData = await systemRes.json();
          setSystemInfo(sData);
        } catch (err) {
          console.error('Error parsing system data:', err);
        }
      }

      if (supportRes) {
        try {
          const sCalls = (await supportRes.json()).calls || [];
          setSupportCalls(sCalls);
        } catch (err) {
          console.error('Error parsing support calls:', err);
        }
      }

      if (messagesRes) {
        try {
          const templates = (await messagesRes.json()).templates || {};
          setMessageTemplates(templates);
        } catch (err) {
          console.error('Error parsing message templates:', err);
        }
      }

      if (historyRes) {
        try {
          const hData = (await historyRes.json()).history || [];
          setMatchHistory(hData);
        } catch (err) {
          console.error('Error parsing match history:', err);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !selectedGuildId) return;
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn, selectedGuildId]);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [syncing, setSyncing] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [liveTime, setLiveTime] = useState<string>('14:24:08');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setLiveTime(now.toTimeString().split(' ')[0]);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter & Search States
  const [usersSearch, setUsersSearch] = useState<string>('');
  const [usersFilter, setUsersFilter] = useState<string>('all');
  const [logsFilter, setLogsFilter] = useState<string>('all');
  const [statsSearch, setStatsSearch] = useState<string>('');
  
  // Pagination & Simulation States
  const [usersPage, setUsersPage] = useState<number>(1);
  const [simulatedEvent, setSimulatedEvent] = useState<string>('match_status_configuring');
  const [simMatchId, setSimMatchId] = useState<string>('sim_match_id_1234');
  const [simMap, setSimMap] = useState<string>('de_mirage');
  const [simTeamA, setSimTeamA] = useState<string>('Los Proscritos');
  const [simTeamB, setSimTeamB] = useState<string>('Los Vengadores');
  const [simWinner, setSimWinner] = useState<string>('faction1');
  const [simScoreA, setSimScoreA] = useState<number>(13);
  const [simScoreB, setSimScoreB] = useState<number>(7);
  const [simulatingWebhook, setSimulatingWebhook] = useState<boolean>(false);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState<string>('');
  const [broadcastTarget, setBroadcastTarget] = useState<{ discordId: string; faceitNickname: string } | null>(null);
  const [broadcastTargetSearch, setBroadcastTargetSearch] = useState<string>('');
  const [broadcastStatus, setBroadcastStatus] = useState<{ status: 'idle' | 'sending' | 'success' | 'error'; msg: string }>({ status: 'idle', msg: '' });
  const [activePlayer, setActivePlayer] = useState<any>(null);

  // Modals States
  const [verifyModalOpen, setVerifyModalOpen] = useState<boolean>(false);
  const [roleModalOpen, setRoleModalOpen] = useState<boolean>(false);
  const [roleTargetDiscordId, setRoleTargetDiscordId] = useState<string>('');

  // Admin web role states
  const [adminRoleModalOpen, setAdminRoleModalOpen] = useState<boolean>(false);
  const [adminRoleTargetUser, setAdminRoleTargetUser] = useState<any>(null);
  const [adminRoleValue, setAdminRoleValue] = useState<'usuario' | 'admin' | 'global_admin'>('usuario');
  const [adminRoleServer, setAdminRoleServer] = useState<string>('');

  // Form States (Manual Verification)
  const [manualDiscordId, setManualDiscordId] = useState<string>('');
  const [manualNickname, setManualNickname] = useState<string>('');

  // Form States (Assign Role)
  const [assignRoleType, setAssignRoleType] = useState<'level' | 'special'>('level');
  const [assignRoleValue, setAssignRoleValue] = useState<string>('');

  // Reset users table pagination to page 1 when search or filters change
  useEffect(() => {
    setUsersPage(1);
  }, [usersSearch, usersFilter]);

  // Poll logs more frequently (every 4 seconds) when activeTab is 'logs'
  useEffect(() => {
    if (!isLoggedIn || activeTab !== 'logs') return;
    const fetchLogs = async () => {
      try {
        const guildQuery = selectedGuildId ? `?guildId=${selectedGuildId}` : '';
        const res = await apiFetch(`/api/admin/logs${guildQuery}`);
        if (res.ok) {
          setLogs((await res.json()).logs || []);
        }
      } catch (e) {
        console.warn('Failed to poll logs:', e);
      }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 4000);
    return () => clearInterval(interval);
  }, [isLoggedIn, activeTab, selectedGuildId]);


  // Handle Login Flow
  const handleLogin = () => {
    window.location.href = '/auth/discord';
  };

  const handleLogout = () => {
    window.location.href = '/auth/logout';
  };



  // Trigger Sincronizar Data Real
  const handleSyncData = async () => {
    if (syncing) return;
    setSyncing(true);
    showToast('Sincronizando todos los usuarios con Faceit y actualizando roles...', 'info');
    try {
      const guildQuery = selectedGuildId ? `?guildId=${selectedGuildId}` : '';
      const res = await apiFetch(`/api/admin/users/sync-all${guildQuery}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Sincronización completada con éxito.', 'success');
        await loadData();
      } else {
        showToast(data.error || 'Error al sincronizar usuarios.', 'error');
      }
    } catch (err) {
      showToast('Error de red al sincronizar.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await apiFetch('/api/admin/users/backup');
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-faceit-users-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Backup exportado correctamente.', 'success');
      } else {
        showToast('Error al exportar backup.', 'error');
      }
    } catch {
      showToast('Error de red al exportar.', 'error');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('¿Estás seguro de importar este backup? Esto podría sobrescribir o añadir usuarios a la base de datos.')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const usersData = JSON.parse(event.target?.result as string);
        if (!Array.isArray(usersData)) {
          showToast('El archivo de backup no tiene el formato correcto.', 'error');
          return;
        }

        const res = await apiFetch('/api/admin/users/restore', {
          method: 'POST',
          body: JSON.stringify({ users: usersData }),
        });
        const result = await res.json();
        if (res.ok && result.success) {
          showToast(result.message || 'Backup importado correctamente.', 'success');
          await loadData();
        } else {
          showToast(result.error || 'Error al importar backup.', 'error');
        }
      } catch (err) {
        showToast('Error al procesar la importación.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Manual User Verification Action
  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDiscordId.trim() || !manualNickname.trim()) {
      showToast('Por favor completa todos los campos.', 'error');
      return;
    }

    showToast('Enviando solicitud de verificación...', 'info');
    try {
      const guildQuery = selectedGuildId ? `?guildId=${selectedGuildId}` : '';
      const res = await apiFetch(`/api/admin/users/verify${guildQuery}`, {
        method: 'POST',
        body: JSON.stringify({
          discordId: manualDiscordId.trim(),
          faceitNickname: manualNickname.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Usuario verificado y vinculado exitosamente.', 'success');
        setVerifyModalOpen(false);
        setManualDiscordId('');
        setManualNickname('');
        await loadData();
      } else {
        showToast(data.error || 'Error al verificar usuario.', 'error');
      }
    } catch (err) {
      showToast('Error de red al verificar usuario.', 'error');
    }
  };

  // Unlink user account
  const handleUnlinkUser = async (discordId: string) => {
    const targetUser = users.find(u => u.discordId === discordId);
    if (!targetUser) return;

    if (window.confirm(`¿Seguro que deseas desvincular al usuario ${targetUser.faceitNickname}?`)) {
      try {
        const guildQuery = selectedGuildId ? `?guildId=${selectedGuildId}` : '';
        const res = await apiFetch(`/api/admin/users/${discordId}/unlink${guildQuery}`, {
          method: 'POST'
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Usuario desvinculado con éxito.', 'success');
          await loadData();
        } else {
          showToast(data.error || 'Error al desvincular usuario.', 'error');
        }
      } catch (err) {
        showToast('Error de red al desvincular.', 'error');
      }
    }
  };

  // Assign custom role type & value
  const handleAssignRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignRoleValue.trim()) {
      showToast('Por favor ingresa un valor para el rol.', 'error');
      return;
    }

    try {
      const guildQuery = selectedGuildId ? `?guildId=${selectedGuildId}` : '';
      const res = await apiFetch(`/api/admin/users/${roleTargetDiscordId}/roles${guildQuery}`, {
        method: 'POST',
        body: JSON.stringify({
          roleType: assignRoleType,
          roleValue: assignRoleValue.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Rol asignado correctamente.', 'success');
        setRoleModalOpen(false);
        setAssignRoleValue('');
        await loadData();
      } else {
        showToast(data.error || 'Error al asignar rol.', 'error');
      }
    } catch (err) {
      showToast('Error de red al asignar rol.', 'error');
    }
  };

  const handleOpenRoleModal = (discordId: string) => {
    setRoleTargetDiscordId(discordId);
    const user = users.find(u => u.discordId === discordId);
    setAssignRoleType(user?.roleType || 'level');
    setAssignRoleValue(user?.roleValue || '');
    setRoleModalOpen(true);
  };

  const handleOpenAdminRoleModal = (user: any) => {
    setAdminRoleTargetUser(user);
    setAdminRoleValue(user.rol || 'usuario');
    setAdminRoleServer(user.servidor || '');
    setAdminRoleModalOpen(true);
  };

  const handleSaveAdminRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminRoleTargetUser) return;
    try {
      const res = await apiFetch(`/api/admin/users/${adminRoleTargetUser.discordId}/admin-role`, {
        method: 'POST',
        body: JSON.stringify({
          role: adminRoleValue,
          guildId: adminRoleValue === 'admin' ? adminRoleServer : null
        })
      });
      if (res.ok) {
        showToast('¡Permisos actualizados correctamente!', 'success');
        setAdminRoleModalOpen(false);
        await loadData();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Error al actualizar permisos.', 'error');
      }
    } catch {
      showToast('Error de conexión al actualizar permisos.', 'error');
    }
  };

  // Cleanup active live match
  const handleCleanupMatch = async (matchId: string) => {
    if (window.confirm(`¿Seguro que deseas forzar la limpieza de la partida ${matchId}?`)) {
      try {
        const res = await apiFetch(`/api/admin/matches/${matchId}/cleanup`, {
          method: 'POST'
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(`Partida ${matchId} limpiada correctamente.`, 'success');
          await loadData();
        } else {
          showToast(data.error || 'Error al limpiar partida.', 'error');
        }
      } catch (err) {
        showToast('Error de red al limpiar partida.', 'error');
      }
    }
  };

  // Update Feature Toggle States
  const handleToggleFeature = async (key: string) => {
    const flag = featureFlags.find(f => f.key === key);
    if (!flag) return;
    const nextState = !flag.enabled;
    try {
      const guildQuery = selectedGuildId ? `?guildId=${selectedGuildId}` : '';
      const res = await apiFetch(`/api/admin/features/${key}${guildQuery}`, {
        method: 'POST',
        body: JSON.stringify({ enabled: nextState }),
      });
      if (res.ok) {
        setFeatureFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: nextState } : f));
        showToast(`Servicio "${flag.name}" ${nextState ? 'activado' : 'desactivado'}.`, 'success');
      } else {
        showToast('Error al cambiar el servicio.', 'error');
      }
    } catch {
      showToast('Error de conexión.', 'error');
    }
  };

  // Handle Save Configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = `/api/admin/guilds/${selectedGuildId}/settings`;
      const res = await apiFetch(url, {
        method: 'POST',
        body: JSON.stringify(config),
      });
      if (res.ok) {
        showToast('¡Configuración guardada correctamente!', 'success');
      } else {
        showToast('Error al guardar la configuración.', 'error');
      }
    } catch {
      showToast('Error de conexión.', 'error');
    }
  };

  // Trigger Simulated Faceit Webhook
  const handleTriggerSimulatedWebhook = async () => {
    if (simulatingWebhook) return;
    setSimulatingWebhook(true);
    showToast('Enviando evento webhook simulado al servidor...', 'info');

    // Usar los usuarios vinculados reales del club para simular los rosters
    const linkedUsers = users.slice(0, 10);
    const rosterA = linkedUsers.slice(0, 5).map(u => ({ id: u.faceitPlayerId, nickname: u.faceitNickname }));
    const rosterB = linkedUsers.slice(5, 10).map(u => ({ id: u.faceitPlayerId, nickname: u.faceitNickname }));

    // Completar con datos ficticios si la lista está incompleta
    while (rosterA.length < 5) {
      const idx = rosterA.length + 1;
      rosterA.push({ id: `mock_player_a_${idx}`, nickname: `PlayerA_${idx}` });
    }
    while (rosterB.length < 5) {
      const idx = rosterB.length + 1;
      rosterB.push({ id: `mock_player_b_${idx}`, nickname: `PlayerB_${idx}` });
    }

    const payload = {
      event: simulatedEvent,
      entity: {
        id: config.faceitHubId || ''
      },
      payload: {
        id: simMatchId,
        game: 'cs2',
        entity_custom_name: 'Club Test',
        voting: {
          map: { pick: [simMap] },
          location: { pick: ['lima'] }
        },
        teams: {
          faction1: {
            name: simTeamA,
            roster: rosterA.map(p => ({ player_id: p.id, nickname: p.nickname }))
          },
          faction2: {
            name: simTeamB,
            roster: rosterB.map(p => ({ player_id: p.id, nickname: p.nickname }))
          }
        },
        results: simulatedEvent === 'match_status_finished' ? {
          winner: simWinner,
          score: {
            faction1: simScoreA,
            faction2: simScoreB
          }
        } : null
      }
    };

    try {
      const res = await apiFetch('/api/admin/simulate-webhook', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Webhook simulado enviado.', 'success');
        await loadData();
      } else {
        showToast(data.error || 'Error al enviar webhook simulado.', 'error');
      }
    } catch (err) {
      showToast('Error de conexión al simular webhook.', 'error');
    } finally {
      setSimulatingWebhook(false);
    }
  };

  // Stats player search simulation
  const handlePlayerSearch = async (e?: React.FormEvent, directSearch?: string) => {
    if (e) e.preventDefault();
    const query = directSearch || statsSearch.trim();
    if (!query) {
      showToast('Por favor introduce un nickname válido.', 'error');
      return;
    }

    try {
      const res = await apiFetch(`/api/admin/stats/${query}`);
      if (res.ok) {
        const data = await res.json();
        setActivePlayer({
          nickname: data.player?.nickname || query,
          country: data.player?.country || 'un',
          avatarUrl: data.player?.avatar || '',
          elo: data.player?.elo || 0,
          level: data.player?.level || 1,
          role: data.player?.role || `LVL ${data.player?.level || 1}`,
          totalMatches: data.stats?.lifetime?.Matches || 0,
          winRate: data.stats?.lifetime?.['Win Rate %'] || 0,
          kdRatio: data.stats?.lifetime?.['Average K/D Ratio'] || 0,
          globalRank: 'NO DISPONIBLE',
          countryRank: 'NO DISPONIBLE',
          recentForm: (data.stats?.lifetime?.['Recent Results'] || []).map((r: string) => r === '1' ? 'W' : 'L'),
          recentPoints: Array(10).fill(25), // Mock points since API doesn't provide them yet
          membership: 'FREE'
        });
        showToast(`Estadísticas de ${query} cargadas.`, 'success');
      } else {
        showToast('Jugador no encontrado', 'error');
        setActivePlayer(null);
      }
    } catch(e) {
      showToast('Error de conexión', 'error');
      setActivePlayer(null);
    }
  };

  // Filter linked users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.faceitNickname.toLowerCase().includes(usersSearch.toLowerCase()) ||
        user.discordId.includes(usersSearch) ||
        user.faceitPlayerId.includes(usersSearch);
      
      if (usersFilter === 'all') return matchesSearch;
      if (usersFilter === 'Verificado') return matchesSearch && user.status === 'Verificado';
      if (usersFilter === 'Pendiente') return matchesSearch && user.status === 'Pendiente';
      if (usersFilter === 'Baneado') return matchesSearch && user.status === 'Baneado';
      return matchesSearch;
    });
  }, [users, usersSearch, usersFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (usersPage - 1) * 15;
    return filteredUsers.slice(start, start + 15);
  }, [filteredUsers, usersPage]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / 15));

  // Enviar mensaje masivo
  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    const isMass = !broadcastTarget;
    if (isMass && !confirm(`¿Estás seguro de enviar este mensaje a TODOS los usuarios verificados? Esta acción no se puede deshacer.`)) return;

    setBroadcastStatus({ status: 'sending', msg: isMass ? 'Iniciando envío masivo en background...' : `Enviando a ${broadcastTarget!.faceitNickname}...` });
    try {
      const body: any = { message: broadcastMessage };
      if (broadcastTarget) body.discordId = broadcastTarget.discordId;

      const res = await apiFetch('/api/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setBroadcastStatus({ status: 'success', msg: data.message || 'Enviado correctamente.' });
        setBroadcastMessage('');
        if (!isMass) setBroadcastTarget(null);
        showToast(isMass ? 'Mensajes masivos iniciados' : `Mensaje enviado a ${broadcastTarget!.faceitNickname}`, 'success');
        setTimeout(() => setBroadcastStatus({ status: 'idle', msg: '' }), 5000);
      } else {
        setBroadcastStatus({ status: 'error', msg: data.error || 'Error al enviar.' });
      }
    } catch (err) {
      setBroadcastStatus({ status: 'error', msg: 'Error de red.' });
    }
  };

  // Filter logs list
  const filteredLogs = useMemo(() => {
    if (logsFilter === 'all') return logs;
    return logs.filter(log => log.level === logsFilter);
  }, [logs, logsFilter]);

  // Stats indicators from current states
  const totalLinkedUsers = users.length;
  const activeMatchesCount = matches.length;

  return (
    <div className="h-screen bg-[#0A0A0A] text-white font-sans overflow-hidden select-none flex flex-col">
      {/* Toast Notifier */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-6 py-4 rounded-none shadow-[20px_20px_0px_rgba(0,0,0,0.8)] flex items-center gap-4 animate-slide-in border-2 transition-all ${
          toast.type === 'success' ? 'bg-[#151515] border-white text-white' :
          toast.type === 'error' ? 'bg-[#151515] border-red-500 text-red-400' :
          'bg-[#151515] border-blue-500 text-blue-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            toast.type === 'success' ? 'bg-white animate-pulse' :
            toast.type === 'error' ? 'bg-red-500 animate-pulse' : 'bg-blue-500 animate-pulse'
          }`} />
          <span className="text-xs font-mono font-bold uppercase tracking-wider">{toast.message}</span>
        </div>
      )}

      {!isLoggedIn ? (
        /* Login Layout */
        <div className="flex-1 flex items-center justify-center p-4 bg-[#0A0A0A] relative overflow-hidden">
          {/* Subtle grid background to match technical/system theme */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

          <div className="w-full max-w-md p-10 bg-[#111] rounded-none border-4 border-[#1A1A1A] shadow-2xl text-center relative z-10">
            <div className="mb-10">
              <div className="w-16 h-16 bg-white text-black mx-auto flex items-center justify-center shadow-lg mb-6 rotate-3">
                <Gamepad2 className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none text-white mb-2">APP<br/>FACEIT-DISCORD</h1>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold font-mono">Panel de Control // Solo Acceso Autenticado</p>
            </div>

            <button
              id="login-button"
              onClick={handleLogin}
              className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-white hover:bg-neutral-200 active:translate-y-[1px] transition-colors rounded-none font-black text-black uppercase tracking-tighter text-sm cursor-pointer border-2 border-white"
            >
              <Lock className="w-4 h-4" /> Iniciar sesión con Discord
            </button>

            <div className="mt-10 pt-6 border-t border-white/10">
              <p className="text-[10px] text-neutral-400 tracking-widest uppercase font-black font-mono">[ ÁREA RESTRINGIDA ]</p>
              <p className="text-[10px] text-neutral-500 uppercase mt-1.5 font-mono">Para solicitar cualquier tipo de acceso al sistema, comuníquese con el creador: Eloiky.</p>
            </div>
          </div>
        </div>
      ) : (
        /* Authenticated Command Center Dashboard Layout */
        <div className="flex-1 flex h-full overflow-hidden">
          
          {/* SideNavBar - Fixed Left */}
          <aside className="w-80 bg-[#111] border-r border-white/10 flex flex-col h-full z-50 overflow-y-auto p-10 justify-between shrink-0">
            <div className="space-y-12">
              <div className="tracking-tighter">
                <h2 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 font-mono">Sistema / Controlador</h2>
                <h1 className="text-3xl font-black italic text-white leading-none">APP<br/>FACEIT-DISCORD</h1>
              </div>

              {/* Menu Links navigation */}
              <nav className="space-y-6 pt-8">
                {[
                  { id: 'dashboard', label: 'PANEL_CONTROL' },
                  { id: 'users', label: 'USUARIOS' },
                  { id: 'matches', label: 'PARTIDAS_VIVO' },
                  { id: 'match-history', label: 'HISTORIAL_PARTIDAS' },
                  { id: 'leaderboard', label: 'CLASIFICACION' },
                  { id: 'stats', label: 'ESTADISTICAS' },
                  { id: 'support', label: 'SOPORTE_ADMIN' },
                  { id: 'templates', label: 'PLANTILLAS_MENSAJES' },
                  { id: 'config', label: 'CONFIGURACIÓN' },
                  { id: 'features', label: 'SERVICIOS' },
                  { id: 'messages', label: 'MENSAJES MASIVOS' },
                  { id: 'simulator', label: 'SIMULADOR_WEBHOOKS' },
                  { id: 'logs', label: 'REGISTROS_SISTEMA' },
                ].filter(tab => {
                  if (currentUser?.role === 'admin') {
                    return !['messages', 'simulator'].includes(tab.id);
                  }
                  return true;
                }).map((tab) => (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group cursor-pointer transition-all ${
                      activeTab === tab.id ? 'opacity-100' : 'opacity-30 hover:opacity-100'
                    }`}
                  >

                    <span className={`text-xl font-black uppercase tracking-tighter ${
                      activeTab === tab.id ? 'border-b-2 border-white pb-1 text-white' : 'text-neutral-400'
                    }`}>
                      {tab.label}
                    </span>
                  </div>
                ))}
              </nav>
            </div>

            {/* SideNavBar Support & Admin User Footer */}
            <div className="pt-8 border-t border-white/10 mt-12">
              <div className="flex items-center gap-3 mb-4 bg-[#151515] p-3 border border-white/5">
                <img
                  src={currentUser?.avatar}
                  alt={currentUser?.username}
                  className="w-8 h-8 rounded-none border border-white/20 object-cover"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black uppercase tracking-tighter text-white truncate">{currentUser?.username}</span>
                  <span className="text-[9px] font-mono text-neutral-500 truncate uppercase">
                    {currentUser?.role === 'global_admin' ? 'Global Admin' : 'Admin Servidor'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleLogout}
                  className="w-full py-2 px-3 text-[10px] font-black bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-500/10 rounded-none flex items-center justify-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Salir del Sistema</span>
                </button>
                <div className="text-center mt-2">
                  <span className="text-[9px] font-mono font-bold text-neutral-600 tracking-widest uppercase">Desarrollado por Eloiky</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
            
            {/* Top AppBar */}
            <header className="h-16 border-b border-white/10 bg-[#0A0A0A] sticky top-0 z-40 px-10 flex items-center justify-between">
              
              {/* Context Title Header */}
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-black text-white tracking-widest uppercase font-mono">
                  {activeTab === 'dashboard' ? 'PANEL DE CONTROL' :
                   activeTab === 'users' ? 'LISTA DE USUARIOS' :
                   activeTab === 'matches' ? 'PARTIDAS EN VIVO' :
                   activeTab === 'match-history' ? 'HISTORIAL DE PARTIDAS' :
                   activeTab === 'leaderboard' ? 'CLASIFICACIÓN DE JUGADORES' :
                   activeTab === 'stats' ? 'ANÁLISIS DE ESTADÍSTICAS' :
                   activeTab === 'support' ? 'SOLICITUDES DE SOPORTE' :
                   activeTab === 'templates' ? 'PLANTILLAS DE MENSAJES' :
                   activeTab === 'config' ? 'CONFIGURACIÓN DEL BOT' :
                   activeTab === 'features' ? 'GESTIÓN DE SERVICIOS' :
                   activeTab === 'messages' ? 'MENSAJES MASIVOS' :
                   activeTab === 'simulator' ? 'SIMULADOR DE WEBHOOKS' :
                   'REGISTROS DE CONSOLA'}
                </h2>
                <div className="h-4 w-px bg-white/20" />

                {/* Guild Selector / Status Label */}
                {currentUser?.role === 'global_admin' ? (
                  guilds.length > 0 && (
                    <select
                      value={selectedGuildId}
                      onChange={(e) => {
                        setSelectedGuildId(e.target.value);
                        localStorage.setItem('admin_selected_guild', e.target.value);
                      }}
                      className="bg-[#0A0A0A] text-xs font-mono font-bold text-white border border-white/20 rounded-none px-3 py-1.5 outline-none cursor-pointer hover:border-white focus:border-white transition-colors uppercase"
                    >
                      {guilds.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  )
                ) : (
                  selectedGuildId && guilds.length > 0 && (
                    <span className="text-xs font-mono font-bold text-neutral-400 uppercase">
                      SERVIDOR: {guilds.find(g => g.id === selectedGuildId)?.name}
                    </span>
                  )
                )}

                <div className="h-4 w-px bg-white/20" />
                <span className="text-[10px] font-mono tracking-widest font-bold text-[#FF5500] bg-[#FF5500]/10 border border-[#FF5500]/20 px-2.5 py-0.5 rounded-none flex items-center gap-1.5 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-pulse" /> SISTEMA ACTIVO
                </span>
              </div>

              {/* Actions Right Side */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { showToast('No hay notificaciones nuevas.', 'info'); }}
                    className="p-2 text-neutral-400 hover:text-white transition-colors cursor-pointer relative"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-white rounded-none" />
                  </button>
                  <button
                    onClick={() => { showToast('Faceit Bot Admin v2.4.1. Desarrollado para administración del Faceit Hub.', 'info'); }}
                    className="p-2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>

                <div className="h-6 w-px bg-white/10" />

                <button
                  onClick={handleSyncData}
                  className="flex items-center gap-2 px-5 py-2 bg-white hover:bg-neutral-200 text-black font-black uppercase tracking-tighter text-xs transition-all cursor-pointer rounded-none active:translate-y-[1px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>Sincronizar</span>
                </button>
              </div>
            </header>

            {/* Canvas Body Viewports */}
            <main className="p-12 flex-1 overflow-y-auto max-w-[1440px] w-full mx-auto">
              
              {/* Massive Typographic Theme Header */}
              <header className="mb-12 flex justify-between items-end border-b-2 border-white/10 pb-8">
                <div className="max-w-xl">
                  <span className="text-xs font-black bg-[#1A1A1A] px-3 py-1.5 uppercase tracking-widest inline-block mb-3 font-mono text-white">ESTADO // OPERACIONAL</span>
                  <h2 className="text-6xl md:text-8xl font-black leading-[0.85] tracking-tighter uppercase pointer-events-none italic text-white">
                    {activeTab === 'dashboard' && <>APP<br/>FACEIT-DISCORD</>}
                    {activeTab === 'users' && <>CUENTAS<br/>VINCULADAS</>}
                    {activeTab === 'matches' && <>PARTIDAS<br/>EN VIVO</>}
                    {activeTab === 'match-history' && <>HISTORIAL<br/>PARTIDAS</>}
                    {activeTab === 'leaderboard' && <>LIGA<br/>GLOBAL</>}
                    {activeTab === 'stats' && <>ESTADÍSTICAS<br/>JUGADOR</>}
                    {activeTab === 'support' && <>SOLICITUDES<br/>SOPORTE</>}
                    {activeTab === 'templates' && <>PLANTILLAS<br/>MENSAJES</>}
                    {activeTab === 'config' && <>AJUSTES<br/>DEL BOT</>}
                    {activeTab === 'features' && <>CONTROL<br/>SERVICIOS</>}
                    {activeTab === 'messages' && <>DIFUSIÓN<br/>MASIVA</>}
                    {activeTab === 'simulator' && <>SIMULADOR<br/>WEBHOOKS</>}
                    {activeTab === 'logs' && <>REGISTRO<br/>CONSOLA</>}
                  </h2>
                </div>
                <div className="text-right hidden md:block">
                  <div className="text-5xl font-mono font-black text-white/90">{liveTime}</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold font-mono">HORA LOCAL SISTEMA</div>
                </div>
              </header>
              
              {/* VIEW 1: DASHBOARD */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-fade-in">
                  
                  {/* Bento Statistics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    
                    {/* Stat Linked Users */}
                    <div className="bg-[#111] rounded-none border-2 border-white/10 p-6 flex flex-col justify-between hover:border-white/30 transition-all duration-300 relative overflow-hidden">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-10 h-10 bg-neutral-800 flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] font-mono font-black text-white bg-[#1A1A1A] px-2 py-0.5 border border-white/10 flex items-center gap-0.5">
                          <ArrowUp className="w-3 h-3 text-white" /> +12%
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest font-black mb-1">USUARIOS VINCULADOS</p>
                        <h3 className="text-4xl font-black text-white font-mono leading-none">{totalLinkedUsers.toLocaleString('es-ES')}</h3>
                      </div>
                    </div>

                    {/* Stat Active Matches */}
                    <div className="bg-white text-black rounded-none p-6 flex flex-col justify-between hover:scale-[1.01] transition-all duration-300 relative overflow-hidden shadow-[10px_10px_0px_rgba(255,255,255,0.05)]">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-10 h-10 bg-black flex items-center justify-center">
                          <Gamepad2 className="w-5 h-5 text-white animate-pulse" />
                        </div>
                        <span className="text-[10px] font-mono font-black text-white bg-black px-2 py-0.5 flex items-center gap-1">
                          LIVE
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-black/50 uppercase tracking-widest font-black mb-1">PARTIDAS ACTIVAS</p>
                        <h3 className="text-4xl font-black text-black font-mono leading-none italic">{activeMatchesCount}</h3>
                      </div>
                    </div>

                    {/* Stat Uptime */}
                    <div className="bg-[#111] rounded-none border-2 border-white/10 p-6 flex flex-col justify-between hover:border-white/30 transition-all duration-300 relative overflow-hidden">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-10 h-10 bg-neutral-800 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest font-black mb-1">TIME UPTIME</p>
                        <p className="text-2xl font-black italic text-white font-mono">
                        {Math.floor(systemInfo.uptimeSeconds / 3600)}H {Math.floor((systemInfo.uptimeSeconds % 3600) / 60)}M
                      </p>
                      </div>
                    </div>

                    {/* Stat Server Region */}
                    <div className="bg-[#111] rounded-none border-2 border-white/10 p-6 flex flex-col justify-between hover:border-white/30 transition-all duration-300 relative overflow-hidden">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-10 h-10 bg-neutral-800 flex items-center justify-center">
                          <ShieldAlert className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] font-mono text-red-400 font-black bg-red-950/20 border border-red-500/20 px-2 py-0.5">
                          HIGH LOAD
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest font-black mb-1">REGÍON SERVIDOR</p>
                        <h3 className="text-2xl font-black text-white font-mono truncate leading-none">{systemInfo.hubRegion}</h3>
                      </div>
                    </div>

                  </div>

                  {/* Active Features Status Overview Panel */}
                  <div className="bg-[#111] rounded-none border-2 border-white/10 p-8">
                    <div className="flex items-center justify-between mb-8 border-b-2 border-white/5 pb-4">
                      <h3 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tighter italic">
                        <ToggleRight className="w-5 h-5 text-white" />
                        <span>MÓDULOS DE INTEGRACIÓN DE SISTEMA</span>
                      </h3>
                      <button
                        onClick={() => { setActiveTab('features'); }}
                        className="bg-white text-black hover:bg-neutral-200 transition-colors py-1.5 px-4 text-xs uppercase font-black tracking-tighter rounded-none cursor-pointer"
                      >
                        Administrar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {featureFlags.map(flag => (
                        <div
                          key={flag.key}
                          className={`flex items-center justify-between p-4 rounded-none border transition-all ${
                            flag.enabled
                              ? 'bg-[#151515] border-white text-white shadow-[5px_5px_0px_rgba(255,255,255,0.05)]'
                              : 'bg-neutral-900/50 border-white/5 opacity-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-2 h-2 rounded-none ${flag.enabled ? 'bg-white animate-pulse' : 'bg-neutral-600'}`} />
                            <span className="text-xs font-black uppercase tracking-tight text-white truncate">{flag.name}</span>
                          </div>
                          
                          <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 border ${
                            flag.enabled ? 'bg-white text-black border-white' : 'bg-black text-neutral-500 border-white/5'
                          }`}>
                            {flag.enabled ? 'ACTIVO' : 'STANDBY'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>



                </div>
              )}

                 {/* VIEW 2: LINKED USERS */}
              {activeTab === 'users' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Table Actions Header */}
                  <div className="bg-[#111] border-2 border-white/10 p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-none">
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-1">REGISTRO DE ENLACES DE DISCORD</h3>
                      <p className="text-xs text-neutral-400 uppercase tracking-tight font-mono">Filtra y administra las cuentas de Discord vinculadas a Faceit.</p>
                    </div>
 
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Dropdown status filter */}
                      <select
                        value={usersFilter}
                        onChange={(e) => setUsersFilter(e.target.value)}
                        className="bg-[#0A0A0A] text-xs font-black text-white border-2 border-white/20 rounded-none px-4 py-2.5 outline-none focus:border-white transition-colors cursor-pointer uppercase tracking-wider"
                      >
                        <option value="all">TODOS LOS ESTADOS</option>
                        <option value="Verificado">VERIFICADOS</option>
                        <option value="Pendiente">PENDIENTES</option>
                        <option value="Baneado">BANEADOS</option>
                      </select>
 
                      {/* Manual Verification Trigger Button */}
                      <button
                        onClick={() => setVerifyModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-black hover:bg-neutral-200 text-xs font-black uppercase tracking-tighter rounded-none cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Añadir Verificación Manual</span>
                      </button>

                      {/* Export Backup Button */}
                      <button
                        onClick={handleExportBackup}
                        className="flex items-center gap-2 px-5 py-2.5 bg-neutral-800 text-white hover:bg-neutral-700 text-xs font-black uppercase tracking-tighter rounded-none cursor-pointer border border-white/10"
                        title="Exportar backup de vinculaciones como JSON"
                      >
                        <span>Exportar JSON</span>
                      </button>

                      {/* Import Backup Label/Input */}
                      <label
                        className="flex items-center gap-2 px-5 py-2.5 bg-neutral-800 text-white hover:bg-neutral-700 text-xs font-black uppercase tracking-tighter rounded-none cursor-pointer border border-white/10"
                        title="Importar backup de vinculaciones desde JSON"
                      >
                        <span>Importar JSON</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportBackup}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
 
                  {/* Search bar input */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="BUSCAR POR NICKNAME, DISCORD ID, FACEIT ID..."
                      value={usersSearch}
                      onChange={(e) => setUsersSearch(e.target.value)}
                      className="w-full bg-[#111] border-2 border-white/10 text-xs font-mono font-bold text-white placeholder-neutral-500 rounded-none pl-12 pr-4 py-4 outline-none focus:border-white transition-all uppercase tracking-wider"
                    />
                  </div>
 
                  {/* Users Table */}
                  <div className="bg-[#111] border-2 border-white/10 overflow-hidden shadow-[10px_10px_0px_rgba(0,0,0,0.5)] rounded-none">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-neutral-900 border-b border-white/10">
                            <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Discord ID</th>
                            <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Nickname Faceit</th>
                            <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Faceit ID</th>
                            <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Estado</th>
                            <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Rol Asignado</th>
                            <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Permisos Web</th>
                            <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Vinculado</th>
                            <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs font-mono">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-8 text-center text-[#8f8fa0] font-sans">
                                No se encontraron usuarios enlazados que coincidan.
                              </td>
                            </tr>
                          ) : (
                            paginatedUsers.map(user => (
                              <tr key={user.discordId} className="hover:bg-white/[0.02] border-b border-white/5 transition-colors group">
                                <td className="py-4 px-6 font-mono text-xs font-black text-white">{user.discordId}</td>
                                <td className="py-4 px-6 font-black text-white uppercase tracking-tight">{user.faceitNickname}</td>
                                <td className="py-4 px-6 font-mono text-neutral-400">{user.faceitPlayerId}</td>
                                <td className="py-4 px-6">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-none font-mono text-[9px] font-black uppercase border ${
                                    user.status === 'Verificado' ? 'bg-[#151515] text-white border-white' :
                                    user.status === 'Pendiente' ? 'bg-yellow-950/20 text-yellow-500 border-yellow-500/20' :
                                    'bg-red-950/20 text-red-500 border-red-500/20'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-none ${
                                      user.status === 'Verificado' ? 'bg-white animate-pulse' :
                                      user.status === 'Pendiente' ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`} />
                                    {user.status}
                                  </span>
                                </td>
                                <td className="py-4 px-6 font-mono text-neutral-400">
                                  {user.clubRole ? (
                                    <span className="bg-[#1C1C1C] text-[#FF5500] border border-[#FF5500]/20 px-2.5 py-1 rounded-none uppercase text-[9px] font-black tracking-wider">
                                      {user.clubRole}
                                    </span>
                                  ) : (
                                    <span className="text-neutral-600 italic">-</span>
                                  )}
                                </td>
                                <td className="py-4 px-6 font-mono text-neutral-400">
                                  {user.rol === 'global_admin' ? (
                                    <span className="bg-red-950/40 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-none uppercase text-[9px] font-black tracking-wider">
                                      GLOBAL_ADMIN
                                    </span>
                                  ) : user.rol === 'admin' ? (
                                    <span className="bg-blue-950/40 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-none uppercase text-[9px] font-black tracking-wider" title={`Servidor: ${user.servidor || 'N/A'}`}>
                                      ADMIN
                                    </span>
                                  ) : (
                                    <span className="text-neutral-600 italic">Usuario</span>
                                  )}
                                </td>
                                <td className="py-4 px-6 text-neutral-400 font-mono text-xs">{user.linkedAt}</td>
                                <td className="py-4 px-6 text-right">
                                  <div className="flex items-center justify-end gap-2 md:opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => {
                                        setStatsSearch(user.faceitNickname);
                                        setActiveTab('stats');
                                        setTimeout(() => handlePlayerSearch(undefined, user.faceitNickname), 100);
                                      }}
                                      className="px-3 py-1.5 text-[9px] font-mono font-black uppercase tracking-wider bg-[#FF5500]/20 text-[#FF5500] hover:bg-[#FF5500] hover:text-white rounded-none border border-[#FF5500]/30 transition-colors cursor-pointer"
                                    >
                                      Estadísticas
                                    </button>

                                    {(currentUser?.role === 'global_admin' || currentUser?.role === 'admin') && (
                                      <button
                                        onClick={() => handleOpenAdminRoleModal(user)}
                                        className="px-3 py-1.5 text-[9px] font-mono font-black uppercase tracking-wider bg-blue-950/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-none border border-blue-500/20 transition-colors cursor-pointer"
                                        title="Gestionar Permisos Administrativos"
                                      >
                                        Permisos Web
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handleUnlinkUser(user.discordId)}
                                      className="px-3 py-1.5 text-[9px] font-mono font-black uppercase tracking-wider bg-red-950/20 text-red-400 hover:bg-red-600 hover:text-white rounded-none border border-red-500/20 transition-colors cursor-pointer"
                                      title="Desvincular Usuario"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Table Pagination Footer */}
                    <div className="bg-neutral-900 p-6 border-t border-white/10 flex items-center justify-between">
                      <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider font-bold">
                        Mostrando {filteredUsers.length > 0 ? (usersPage - 1) * 15 + 1 : 0} a {Math.min(filteredUsers.length, usersPage * 15)} de {filteredUsers.length} vinculaciones (Total: {users.length})
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-neutral-400">PÁGINA {usersPage} DE {totalPages}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                            disabled={usersPage === 1}
                            className="p-2 text-neutral-500 hover:text-white disabled:opacity-20 cursor-pointer border border-white/5 hover:border-white/20 transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setUsersPage(p => Math.min(totalPages, p + 1))}
                            disabled={usersPage === totalPages}
                            className="p-2 text-neutral-500 hover:text-white disabled:opacity-20 cursor-pointer border border-white/5 hover:border-white/20 transition-colors"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* VIEW 3: LIVE MATCHES */}
              {activeTab === 'matches' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Page header and general state */}
                  <div className="bg-[#111] border-2 border-white/10 p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-none">
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-1">PARTIDAS ACTIVAS EN EL HUB</h3>
                      <p className="text-xs text-neutral-400 uppercase tracking-tight font-mono">Monitoreo en tiempo real de instancias de CS2 hospedadas en servidores.</p>
                    </div>

                    <button
                      onClick={() => {
                        showToast('Refrescando partidas activas...', 'info');
                        loadData();
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white text-black hover:bg-neutral-200 text-xs font-black uppercase tracking-tighter rounded-none cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Actualizar Datos</span>
                    </button>
                  </div>

                  {/* Live match statistics panel */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#111] border-2 border-white/10 p-6 rounded-none relative">
                      <div className="flex justify-between items-start mb-4 text-neutral-400">
                        <span className="text-[10px] font-mono uppercase tracking-widest font-black">CARGA DE SERVIDORES</span>
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-3xl font-black text-white font-mono leading-none">{matchStats.serverLoad}<span className="text-sm text-neutral-500 font-normal">%</span></h4>
                    </div>

                    <div className="bg-[#111] border-2 border-white/10 p-6 rounded-none relative">
                      <div className="flex justify-between items-start mb-4 text-neutral-400">
                        <span className="text-[10px] font-mono uppercase tracking-widest font-black">DURACIÓN PROMEDIO</span>
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-3xl font-black text-white font-mono leading-none">{matchStats.avgDurationStr}</h4>
                    </div>

                    <div className="bg-[#111] border-2 border-red-500 p-6 rounded-none relative">
                      <div className="flex justify-between items-start mb-4 text-red-500">
                        <span className="text-[10px] font-mono uppercase tracking-widest font-black">LIMPIEZAS FALLIDAS</span>
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <h4 className="text-3xl font-black text-red-500 font-mono leading-none">{matchStats.failedCleanups}</h4>
                    </div>
                  </div>

                  {/* Active matches list table */}
                  <div className="bg-[#111] border-2 border-white/10 overflow-hidden shadow-[10px_10px_0px_rgba(0,0,0,0.5)] rounded-none">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-neutral-900 border-b border-white/10">
                            <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">ID Partida</th>
                            <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Equipo A</th>
                            <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Equipo B</th>
                            <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Mapa</th>
                            <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Ubicación</th>
                            <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Iniciada hace</th>
                            <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs font-mono">
                          {matches.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-neutral-500 font-mono uppercase font-bold">
                                No hay ninguna partida en vivo reportada por Faceit API en este momento.
                              </td>
                            </tr>
                          ) : (
                            matches.map(m => {
                              const isLong = m.startedAtMinutesAgo >= 60;
                              return (
                                <tr key={m.id} className={`hover:bg-white/[0.02] border-b border-white/5 transition-colors group ${isLong ? 'bg-red-950/10' : ''}`}>
                                  <td className="py-5 px-6 font-mono font-black text-white">{m.id}</td>
                                  <td className="py-5 px-6">
                                    <div className="flex items-center gap-2">
                                      {m.teamALogo ? (
                                        <img src={m.teamALogo} alt={m.teamAName} className="w-6 h-6 rounded-none bg-black/40 p-0.5 object-contain" />
                                      ) : (
                                        <div className="w-6 h-6 rounded-none bg-neutral-800 flex items-center justify-center font-black text-[9px] text-white uppercase">
                                          {m.teamAName.substring(0, 3)}
                                        </div>
                                      )}
                                      <span className="font-black text-white uppercase">{m.teamAName}</span>
                                    </div>
                                  </td>
                                  <td className="py-5 px-6">
                                    <div className="flex items-center gap-2">
                                      {m.teamBLogo ? (
                                        <img src={m.teamBLogo} alt={m.teamBName} className="w-6 h-6 rounded-none bg-black/40 p-0.5 object-contain" />
                                      ) : (
                                        <div className="w-6 h-6 rounded-none bg-neutral-800 flex items-center justify-center font-black text-[9px] text-white uppercase">
                                          {m.teamBName.substring(0, 3)}
                                        </div>
                                      )}
                                      <span className="font-black text-white uppercase">{m.teamBName}</span>
                                    </div>
                                  </td>
                                  <td className="py-5 px-6">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none bg-[#1C1C1C] border border-white/10 text-[9px] font-mono text-white font-black uppercase">
                                      <Map className="w-3 h-3 text-white" /> {m.map}
                                    </span>
                                  </td>
                                  <td className="py-5 px-6 text-neutral-400 uppercase font-bold text-[11px]">{m.location}</td>
                                  <td className="py-5 px-6">
                                    {isLong ? (
                                      <span className="text-red-400 font-black font-mono flex items-center gap-1 uppercase">
                                        <Clock className="w-3.5 h-3.5 animate-pulse text-red-500" />
                                        hace {m.startedAtMinutesAgo}m (Larga)
                                      </span>
                                    ) : (
                                      <span className="text-neutral-400 font-mono">hace {m.startedAtMinutesAgo}m</span>
                                    )}
                                  </td>
                                  <td className="py-5 px-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <a
                                        href={`https://www.faceit.com/en/cs2/room/${m.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 rounded-none font-mono text-[9px] font-black uppercase transition-colors cursor-pointer whitespace-nowrap border border-white/10 bg-[#1C1C1C] text-neutral-400 hover:text-white flex items-center gap-1"
                                      >
                                        Ver Room <ArrowUpRight className="w-3 h-3" />
                                      </a>
                                      <button
                                        onClick={() => handleCleanupMatch(m.id)}
                                        className={`px-3 py-1.5 rounded-none font-mono text-[9px] font-black uppercase transition-colors cursor-pointer whitespace-nowrap border ${
                                          isLong
                                            ? 'bg-red-950/20 text-red-400 hover:bg-red-600 hover:text-white border-red-500/20'
                                            : 'bg-neutral-800 text-white hover:bg-white hover:text-black border-white/10 md:opacity-50 group-hover:opacity-100'
                                        }`}
                                      >
                                        Forzar Limpieza
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: HISTORIAL DE PARTIDAS */}
              {activeTab === 'match-history' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-[#111] border-2 border-white/10 p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-none">
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-1">HISTORIAL DE PARTIDAS FINALIZADAS</h3>
                      <p className="text-xs text-neutral-400 uppercase tracking-tight font-mono">Registro histórico de partidas completadas en el club.</p>
                    </div>
                  </div>

                  <div className="bg-[#111] border-2 border-white/10 overflow-hidden shadow-[10px_10px_0px_rgba(0,0,0,0.5)] rounded-none font-mono">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-neutral-900 border-b border-white/10 text-neutral-400 font-bold">
                            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest w-40">FECHA/HORA</th>
                            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest w-44">ID PARTIDA</th>
                            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">ENFRENTAMIENTO Y MARCADOR</th>
                            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest w-32">MAPA</th>
                            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest w-36">SERVIDOR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-white/90 font-mono">
                          {matchHistory.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-neutral-500 uppercase tracking-widest text-[10px] font-bold">
                                No hay partidas registradas en el historial.
                              </td>
                            </tr>
                          ) : (
                            matchHistory.map((m: any) => {
                              let dateStr = 'Desconocido';
                              if (m.createdAt && m.createdAt._seconds) {
                                dateStr = new Date(m.createdAt._seconds * 1000).toLocaleString('es-ES');
                              } else if (m.createdAt) {
                                dateStr = new Date(m.createdAt).toLocaleString('es-ES');
                              }
                              
                              const isWinnerA = m.winner === 'faction1';
                              const isWinnerB = m.winner === 'faction2';

                              return (
                                <tr key={m.id} className="hover:bg-white/5 transition-colors">
                                  <td className="py-4 px-6 text-neutral-400">{dateStr}</td>
                                  <td className="py-4 px-6 font-bold text-xs">
                                    {m.id.startsWith('mixton_') || m.id.startsWith('manual_') ? (
                                      <span className="text-neutral-400 font-mono">{m.id}</span>
                                    ) : (
                                      <a href={`https://www.faceit.com/en/cs2/room/${m.id}`} target="_blank" rel="noreferrer" className="text-[#FF5500] hover:underline font-mono">
                                        {m.id}
                                      </a>
                                    )}
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex items-center gap-1">
                                      <span className={isWinnerA ? 'text-green-400 font-bold' : ''}>{m.faction1_name}</span>
                                      <span className="text-neutral-500">({m.faction1_score})</span>
                                      <span className="text-neutral-600 mx-1">vs</span>
                                      <span className={isWinnerB ? 'text-green-400 font-bold' : ''}>{m.faction2_name}</span>
                                      <span className="text-neutral-500">({m.faction2_score})</span>
                                    </div>
                                    <div className="text-[10px] text-neutral-500 mt-1 font-mono">
                                      <div className="flex flex-col gap-0.5">
                                        <div>
                                          <span className="text-neutral-400 font-bold">{m.faction1_name}:</span> {m.faction1_roster?.map((p: any) => p.nickname).join(', ') || 'N/A'}
                                        </div>
                                        <div>
                                          <span className="text-neutral-400 font-bold">{m.faction2_name}:</span> {m.faction2_roster?.map((p: any) => p.nickname).join(', ') || 'N/A'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-6 uppercase">{m.map}</td>
                                  <td className="py-4 px-6 uppercase text-neutral-400">{m.location}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 4: LEADERBOARD */}
              {activeTab === 'leaderboard' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Leaderboard intro */}
                  <div className="bg-[#111] border-2 border-white/10 p-8 rounded-none">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-1">CLASIFICACIÓN GENERAL DEL HUB</h3>
                    <p className="text-xs text-neutral-400 uppercase tracking-tight font-mono">Listado de posiciones basado en el ELO real sincronizado de Faceit.</p>
                  </div>

                  {/* Leaderboard Table */}
                  <div className="bg-[#111] border-2 border-white/10 overflow-hidden shadow-[10px_10px_0px_rgba(0,0,0,0.5)] rounded-none">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-neutral-900 border-b border-white/10">
                          <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400 w-20">Pos</th>
                          <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Discord ID</th>
                          <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Nickname Faceit</th>
                          <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Nivel</th>
                          <th className="py-4 px-6 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">ELO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs font-mono">
                        {leaderboard.map((u, i) => (
  <tr key={u.id} className="hover:bg-white/[0.02] border-b border-white/5 transition-colors">
    <td className="py-4 px-6 font-mono font-black text-xs text-white">
      {i === 0 ? <span className="text-yellow-500">01</span> : 
       i === 1 ? <span className="text-neutral-400">02</span> :
       i === 2 ? <span className="text-red-400">03</span> :
       String(i + 1).padStart(2, '0')}
    </td>
    <td className="py-4 px-6 text-white truncate max-w-[150px]">{u.discord_id || 'N/A'}</td>
    <td className="py-4 px-6 truncate max-w-[150px]">
      <button
        onClick={() => {
          setStatsSearch(u.faceit_nickname);
          setActiveTab('stats');
          setTimeout(() => handlePlayerSearch(undefined, u.faceit_nickname), 100);
        }}
        className="text-[#FF5500] hover:underline font-black text-left cursor-pointer focus:outline-none"
      >
        {u.faceit_nickname}
      </button>
    </td>
    <td className="py-4 px-6">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${u.faceit_level >= 10 ? 'bg-red-500' : u.faceit_level >= 8 ? 'bg-yellow-500' : 'bg-neutral-500'}`}></span>
        <span className="text-white">LVL {u.faceit_level}</span>
      </div>
    </td>
    <td className="py-4 px-6 font-bold text-white">{u.faceit_elo}</td>
  </tr>
))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

                           {/* VIEW 5: STATS ANALYSIS */}
              {activeTab === 'stats' && (
                <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
                  
                  {/* Search Title */}
                  <div className="text-center space-y-3">
                    <span className="text-xs font-mono font-black text-white bg-[#1A1A1A] border border-white/10 px-3 py-1 uppercase tracking-widest inline-block">ENGINE // FACEIT_DATA_STREAM</span>
                    <h3 className="text-3xl font-black tracking-tighter text-white uppercase italic">ANÁLISIS DE ESTADÍSTICAS</h3>
                    <p className="text-xs text-neutral-400 max-w-md mx-auto uppercase tracking-tight font-mono">Ingresa un nickname de Faceit para consultar sus datos en vivo de la base de datos oficial.</p>
                  </div>

                  {/* Search Input Bar */}
                  <form onSubmit={handlePlayerSearch} className="flex gap-2 max-w-md mx-auto">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="EJ: S1MPLE, ZYWOO, M0NESY..."
                        value={statsSearch}
                        onChange={(e) => setStatsSearch(e.target.value)}
                        className="w-full bg-[#111] border-2 border-white/10 text-xs font-mono font-bold text-white placeholder-neutral-500 rounded-none pl-12 pr-4 py-4 outline-none focus:border-white transition-all uppercase tracking-wider"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-4 bg-white hover:bg-neutral-200 text-black text-xs font-black uppercase tracking-tighter rounded-none cursor-pointer transition-colors shrink-0 border border-white"
                    >
                      Consultar
                    </button>
                  </form>

                  {/* Live Stats Display Card */}
                  {activePlayer && (
                  <div className="bg-[#111] border-2 border-white/10 p-8 space-y-8 relative overflow-hidden shadow-[10px_10px_0px_rgba(0,0,0,0.5)] rounded-none">
                    
                    {/* Identity Header */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                      <img
                        src={activePlayer.avatarUrl}
                        alt={activePlayer.nickname}
                        className="w-24 h-24 rounded-none border-2 border-white object-cover bg-neutral-900"
                      />
                      <div className="text-center sm:text-left space-y-2">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                          <h4 className="text-2xl font-black text-white uppercase tracking-tight italic">{activePlayer.nickname}</h4>
                          <span className="text-[10px] bg-[#1C1C1C] px-2.5 py-1 rounded-none border border-white/10 text-white font-mono font-black uppercase tracking-widest">
                            🌍 {activePlayer.country}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                          <span className="bg-white text-black px-3 py-0.5 rounded-none text-[9px] font-mono font-black border border-white uppercase tracking-wider">
                            {activePlayer.role}
                          </span>
                          <span className="bg-[#1C1C1C] border border-white/10 text-[9px] text-neutral-400 font-mono font-black px-2.5 py-0.5 rounded-none uppercase">
                            {activePlayer.membership}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-white/10" />

                    {/* Bento Statistics Breakdown Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                      
                      <div className="bg-neutral-900 border border-white/5 rounded-none p-5 relative overflow-hidden">
                        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block mb-1 font-black">ELO ACTUAL</span>
                        <div className="text-3xl font-mono font-black text-white mb-1">{Number(activePlayer.elo || 0).toLocaleString('es-ES')}</div>
                        <span className="text-[9px] text-white font-black font-mono uppercase tracking-tight">
                          +15 (Última Partida)
                        </span>
                      </div>

                      <div className="bg-neutral-900 border border-white/5 rounded-none p-5 relative overflow-hidden">
                        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block mb-1 font-black">TASA DE VICTORIA</span>
                        <div className="text-3xl font-mono font-black text-white mb-1">{activePlayer.winRate}%</div>
                        <div className="w-full bg-white/5 rounded-none h-1 overflow-hidden">
                          <div className="bg-white h-full" style={{ width: `${activePlayer.winRate}%` }} />
                        </div>
                      </div>

                      <div className="bg-neutral-900 border border-white/5 rounded-none p-5 relative overflow-hidden">
                        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block mb-1 font-black">PROMEDIO K/D</span>
                        <div className="text-3xl font-mono font-black text-white mb-1">{activePlayer.kdRatio}</div>
                        <span className="text-[9px] text-neutral-400 font-black uppercase font-mono">Top 1% Global</span>
                      </div>

                      <div className="bg-neutral-900 border border-white/5 rounded-none p-5 relative overflow-hidden">
                        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block mb-1 font-black">PARTIDAS JUGADAS</span>
                        <div className="text-3xl font-mono font-black text-white mb-1">{Number(activePlayer.totalMatches || 0).toLocaleString('es-ES')}</div>
                        <span className="text-[9px] text-neutral-400 font-black uppercase font-mono">Historial verificado</span>
                      </div>

                    </div>

                    {/* Regional / Global ranks */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 bg-neutral-900 border border-white/5 rounded-none font-mono">
                        <span className="text-[10px] text-neutral-400 font-black uppercase tracking-wider">RANGO GLOBAL</span>
                        <span className="text-xs font-black text-white">{activePlayer.globalRank}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-neutral-900 border border-white/5 rounded-none font-mono">
                        <span className="text-[10px] text-neutral-400 font-black uppercase tracking-wider">RANGO PAÍS</span>
                        <span className="text-xs font-black text-white">{activePlayer.countryRank}</span>
                      </div>
                    </div>

                    {/* Recent Match History Tracker (10 Dots Loop) */}
                    <div className="bg-neutral-900 border border-white/5 rounded-none p-6 space-y-4">
                      <h5 className="text-[10px] font-mono font-black uppercase tracking-wider text-neutral-400">HISTORIAL RECIENTE (ÚLTIMAS 10 PARTIDAS)</h5>
                      
                      <div className="flex flex-wrap items-center gap-4 justify-between">
                        <div className="flex items-center gap-3 overflow-x-auto pb-1">
                          {(activePlayer.recentForm || []).map((result: string, index: number) => {
                            const isWin = result === 'W';
                            const points = (activePlayer.recentPoints && activePlayer.recentPoints[index]) ? activePlayer.recentPoints[index] : 25;
                            return (
                              <div key={index} className="flex flex-col items-center gap-1.5 min-w-[36px]">
                                <div className={`w-8 h-8 rounded-none flex items-center justify-center font-black text-xs border ${
                                  isWin ? 'bg-white text-black border-white' : 'bg-[#0A0A0A] text-neutral-500 border-white/10'
                                }`}>
                                  {result}
                                </div>
                                <span className={`text-[9px] font-mono font-black ${isWin ? 'text-white' : 'text-neutral-500'}`}>
                                  {points > 0 ? `+${points}` : points}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-[9px] text-neutral-500 font-black uppercase">PROMEDIO ELO</span>
                          <p className="text-xs font-black text-white uppercase">+{Math.ceil(((activePlayer.recentPoints || []).reduce((a: number, b: number) => a + b, 0)) / 10 || 25)} POR PARTIDA</p>
                        </div>
                      </div>
                    </div>

                  </div>
                  )}
                </div>
              )}

                     {/* VIEW 6: CONFIG PORTAL */}
              {activeTab === 'config' && (
                <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
                  
                  <div className="bg-[#111] border-2 border-white/10 p-8 rounded-none flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-1">CONFIGURACIÓN MAESTRA DEL BOT</h3>
                      <p className="text-xs text-neutral-400 uppercase tracking-tight font-mono">Los valores guardados aquí modifican el archivo .env del servidor en tiempo real.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveConfig} className="space-y-8">
                    
                    {/* Canales de Discord */}
                    <div className="bg-[#111] border-2 border-[#5865F2]/20 p-8 shadow-[8px_8px_0px_rgba(88,101,242,0.15)] rounded-none relative">
                      <div className="absolute -top-3 -left-3 bg-[#5865F2] text-white text-[10px] font-black px-3 py-1 uppercase tracking-widest border border-white/10">Discord</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                          <label className="text-[10px] font-mono font-black uppercase tracking-widest text-[#5865F2]/80">ID del Servidor de Discord (Guild ID)</label>
                          <input type="text" value={config.discordGuildId || ''} onChange={(e) => setConfig({ ...config, discordGuildId: e.target.value })} className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-[#5865F2]/50 transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono font-black uppercase tracking-widest text-[#5865F2]/80">ID Canal de Vinculación</label>
                          <input type="text" value={config.discordLinkChannelId} onChange={(e) => setConfig({ ...config, discordLinkChannelId: e.target.value })} className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-[#5865F2]/50 transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono font-black uppercase tracking-widest text-[#5865F2]/80">ID Canal de Partidas</label>
                          <input type="text" value={config.discordMatchesChannelId} onChange={(e) => setConfig({ ...config, discordMatchesChannelId: e.target.value })} className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-[#5865F2]/50 transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono font-black uppercase tracking-widest text-[#5865F2]/80">ID Canal Sincronización de Roles</label>
                          <input type="text" value={config.discordRolesChannelId} onChange={(e) => setConfig({ ...config, discordRolesChannelId: e.target.value })} className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-[#5865F2]/50 transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono font-black uppercase tracking-widest text-[#5865F2]/80">ID Canal Historial de Logs</label>
                          <input type="text" value={config.discordStatusChannelId} onChange={(e) => setConfig({ ...config, discordStatusChannelId: e.target.value })} className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-[#5865F2]/50 transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono font-black uppercase tracking-widest text-[#5865F2]/80">Sala de Espera (Voz)</label>
                          <input type="text" value={config.discordWaitingRoomChannelId} onChange={(e) => setConfig({ ...config, discordWaitingRoomChannelId: e.target.value })} className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-[#5865F2]/50 transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono font-black uppercase tracking-widest text-[#5865F2]/80">ID Canal de Alertas de Admin</label>
                          <input type="text" value={config.discordAdminAlertsChannelId || ''} onChange={(e) => setConfig({ ...config, discordAdminAlertsChannelId: e.target.value })} className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-[#5865F2]/50 transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                          <label className="text-[10px] font-mono font-black uppercase tracking-widest text-[#5865F2]/80">ID Canal de Soporte Público (Autodespliegue)</label>
                          <input type="text" value={config.discordSupportChannelId || ''} onChange={(e) => setConfig({ ...config, discordSupportChannelId: e.target.value })} className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-[#5865F2]/50 transition-colors" />
                        </div>
                      </div>
                    </div>

                    {/* Integración Faceit */}
                    <div className="bg-[#111] border-2 border-[#FF5500]/20 p-8 shadow-[8px_8px_0px_rgba(255,85,0,0.15)] rounded-none relative">
                      <div className="absolute -top-3 -left-3 bg-[#FF5500] text-white text-[10px] font-black px-3 py-1 uppercase tracking-widest border border-white/10">Faceit</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono font-black uppercase tracking-widest text-[#FF5500]/80">ID Hub Oficial Faceit</label>
                          <input type="text" value={config.faceitHubId} onChange={(e) => setConfig({ ...config, faceitHubId: e.target.value })} className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-[#FF5500]/50 transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono font-black uppercase tracking-widest text-[#FF5500]/80">ID Cola / Leaderboard</label>
                          <input type="text" value={config.faceitLeaderboardId || ''} onChange={(e) => setConfig({ ...config, faceitLeaderboardId: e.target.value })} className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-[#FF5500]/50 transition-colors" />
                        </div>
                      </div>
                    </div>

                    {/* Sistema */}
                    <div className="bg-[#111] border-2 border-white/10 p-8 shadow-[8px_8px_0px_rgba(255,255,255,0.05)] rounded-none relative">
                      <div className="absolute -top-3 -left-3 bg-white text-black text-[10px] font-black px-3 py-1 uppercase tracking-widest border border-white/10">Sistema</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Nombre Rol Admin</label>
                          <input type="text" value={config.adminRoleName} onChange={(e) => setConfig({ ...config, adminRoleName: e.target.value })} className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-white transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Timeout Partidas (Mins)</label>
                          <input type="number" value={config.matchTimeoutMinutes} onChange={(e) => setConfig({ ...config, matchTimeoutMinutes: parseInt(e.target.value, 10) || 0 })} className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-white transition-colors" />
                        </div>
                      </div>

                      <div className="pt-8 mt-4 border-t border-white/10 flex justify-end">
                        <button type="submit" className="px-8 py-3 bg-white hover:bg-neutral-200 text-black text-xs font-black uppercase tracking-tighter rounded-none transition-colors cursor-pointer border border-white shadow-[4px_4px_0px_rgba(255,255,255,0.2)]">
                          💾 GUARDAR EN .ENV
                        </button>
                      </div>
                    </div>

                  </form>
                </div>
              )}

              {/* VIEW 7: SERVICIOS */}
              {activeTab === 'features' && (
                <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
                  
                  <div className="bg-[#111] border-2 border-white/10 p-8 rounded-none">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-1">SERVICIOS ACTIVOS</h3>
                    <p className="text-xs text-neutral-400 uppercase tracking-tight font-mono">Control maestro en tiempo real de los módulos lógicos activos en el Bot.</p>
                  </div>

                  <div className="bg-[#111] border-2 border-white/10 overflow-hidden shadow-[10px_10px_0px_rgba(0,0,0,0.5)] rounded-none">
                    <div className="divide-y divide-white/5 font-mono">
                      {featureFlags.map(flag => (
                        <div key={flag.key} className="p-6 flex items-center justify-between hover:bg-white/[0.02] border-b border-white/5 transition-colors">
                          <div className="space-y-1 pr-4">
                            <h4 className="text-xs font-black uppercase tracking-tight text-white">{flag.name}</h4>
                            <p className="text-[11px] text-neutral-400 uppercase">{flag.desc}</p>
                          </div>

                          <button
                            onClick={() => handleToggleFeature(flag.key)}
                            className={`px-4 py-2 border text-[9px] font-mono font-black uppercase rounded-none transition-colors cursor-pointer ${
                              flag.enabled 
                                ? 'bg-white text-black border-white' 
                                : 'bg-neutral-800 text-neutral-500 border-white/10 hover:bg-neutral-700'
                            }`}
                          >
                            {flag.enabled ? 'ACTIVO' : 'STANDBY'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* VIEW: MENSAJES MASIVOS */}
              {activeTab === 'messages' && (
                <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">

                  <div className="bg-[#111] border-2 border-white/10 p-8 rounded-none">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-1">DIFUSIÓN MASIVA (DM)</h3>
                    <p className="text-xs text-neutral-400 uppercase tracking-tight font-mono">Selecciona un usuario para enviarle un mensaje individual, o deja en blanco para enviar a todos los verificados.</p>
                  </div>

                  <div className="bg-[#111] border-2 border-white/10 p-8 space-y-6 shadow-[10px_10px_0px_rgba(0,0,0,0.5)] rounded-none">

                    {/* Selector de usuario */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">
                        Destinatario <span className="text-neutral-600 normal-case">(opcional — dejar vacío para envío masivo)</span>
                      </label>

                      {broadcastTarget ? (
                        <div className="flex items-center justify-between bg-[#0A0A0A] border-2 border-[#FF5500]/50 px-4 py-3">
                          <div>
                            <span className="text-xs font-black text-white uppercase font-mono">{broadcastTarget.faceitNickname}</span>
                            <span className="text-[10px] text-neutral-500 font-mono ml-3">{broadcastTarget.discordId}</span>
                          </div>
                          <button onClick={() => { setBroadcastTarget(null); setBroadcastTargetSearch(''); }} className="text-neutral-400 hover:text-red-400 transition-colors text-xs font-black cursor-pointer">
                            QUITAR ×
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type="text"
                            value={broadcastTargetSearch}
                            onChange={(e) => setBroadcastTargetSearch(e.target.value)}
                            placeholder="Buscar usuario por nickname de Faceit..."
                            className="w-full bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono text-white rounded-none px-4 py-3.5 outline-none focus:border-white/30 transition-colors"
                          />
                          {broadcastTargetSearch.trim() && (
                            <div className="absolute top-full left-0 right-0 z-10 bg-[#1A1A1A] border-2 border-white/10 border-t-0 max-h-48 overflow-y-auto">
                              {users
                                .filter(u => u.faceitNickname.toLowerCase().includes(broadcastTargetSearch.toLowerCase()) && u.status === 'Verificado')
                                .slice(0, 8)
                                .map(u => (
                                  <button
                                    key={u.discordId}
                                    onClick={() => { setBroadcastTarget({ discordId: u.discordId, faceitNickname: u.faceitNickname }); setBroadcastTargetSearch(''); }}
                                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
                                  >
                                    <span className="text-xs font-black text-white font-mono uppercase">{u.faceitNickname}</span>
                                    <span className="text-[10px] text-neutral-500 font-mono">{u.discordId}</span>
                                  </button>
                                ))}
                              {users.filter(u => u.faceitNickname.toLowerCase().includes(broadcastTargetSearch.toLowerCase()) && u.status === 'Verificado').length === 0 && (
                                <div className="px-4 py-3 text-xs text-neutral-500 font-mono">No se encontraron usuarios</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Mensaje */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Contenido del Mensaje</label>
                      <textarea
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        placeholder="Escribe el mensaje aquí..."
                        className="bg-[#0A0A0A] border-2 border-white/10 text-sm font-mono text-white rounded-none px-4 py-3.5 outline-none focus:border-white transition-colors h-40 resize-none"
                      />
                    </div>

                    {/* Estado y botón */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        {broadcastStatus.status === 'sending' && (
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">{broadcastStatus.msg}</span>
                          </div>
                        )}
                        {broadcastStatus.status === 'success' && (
                          <span className="text-xs font-mono font-bold text-green-400 uppercase tracking-wider">{broadcastStatus.msg}</span>
                        )}
                        {broadcastStatus.status === 'error' && (
                          <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">{broadcastStatus.msg}</span>
                        )}
                      </div>

                      <button
                        onClick={handleBroadcast}
                        disabled={broadcastStatus.status === 'sending' || !broadcastMessage.trim()}
                        className={`px-8 py-3 font-black uppercase tracking-widest text-xs transition-colors rounded-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                          broadcastTarget
                            ? 'bg-[#5865F2] hover:bg-white text-white hover:text-black'
                            : 'bg-[#FF5500] hover:bg-white text-white hover:text-black'
                        }`}
                      >
                        {broadcastTarget ? `ENVIAR A ${broadcastTarget.faceitNickname.toUpperCase()}` : 'ENVIAR A TODOS'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: SIMULADOR DE WEBHOOKS */}
              {activeTab === 'simulator' && (
                <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
                  <div className="bg-[#111] border-2 border-white/10 p-8 rounded-none">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-1">SIMULADOR DE WEBHOOKS DE FACEIT</h3>
                    <p className="text-xs text-neutral-400 uppercase tracking-tight font-mono">Dispara eventos simulados para probar las notificaciones del bot y los canales de voz.</p>
                  </div>

                  <div className="bg-[#111] border-2 border-white/10 p-8 space-y-6 shadow-[10px_10px_0px_rgba(0,0,0,0.5)] rounded-none font-mono">
                    
                    {/* Select Event Type */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Tipo de Evento Webhook</label>
                      <select
                        value={simulatedEvent}
                        onChange={(e) => setSimulatedEvent(e.target.value)}
                        className="bg-[#0A0A0A] text-xs font-black text-white border-2 border-white/20 rounded-none px-4 py-3 outline-none focus:border-white transition-colors cursor-pointer uppercase tracking-wider"
                      >
                        <option value="match_status_configuring">PARTIDA EN CONFIGURACIÓN (match_status_configuring)</option>
                        <option value="match_status_starting">PARTIDA INICIANDO (match_status_starting)</option>
                        <option value="match_status_finished">PARTIDA FINALIZADA (match_status_finished)</option>
                        <option value="match_status_cancelled">PARTIDA CANCELADA (match_status_cancelled)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">ID de Partida (Match ID)</label>
                        <input
                          type="text"
                          value={simMatchId}
                          onChange={(e) => setSimMatchId(e.target.value)}
                          className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono text-white rounded-none px-4 py-3 outline-none focus:border-white transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Nombre de Mapa (Map)</label>
                        <input
                          type="text"
                          value={simMap}
                          onChange={(e) => setSimMap(e.target.value)}
                          className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono text-white rounded-none px-4 py-3 outline-none focus:border-white transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Nombre Equipo A (Faction 1)</label>
                        <input
                          type="text"
                          value={simTeamA}
                          onChange={(e) => setSimTeamA(e.target.value)}
                          className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono text-white rounded-none px-4 py-3 outline-none focus:border-white transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Nombre Equipo B (Faction 2)</label>
                        <input
                          type="text"
                          value={simTeamB}
                          onChange={(e) => setSimTeamB(e.target.value)}
                          className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono text-white rounded-none px-4 py-3 outline-none focus:border-white transition-colors"
                        />
                      </div>
                    </div>

                    {simulatedEvent === 'match_status_finished' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Ganador (Winner Faction)</label>
                          <select
                            value={simWinner}
                            onChange={(e) => setSimWinner(e.target.value)}
                            className="bg-[#0A0A0A] text-xs font-black text-white border-2 border-white/20 rounded-none px-4 py-3 outline-none focus:border-white transition-colors cursor-pointer"
                          >
                            <option value="faction1">EQUIPO A (faction1)</option>
                            <option value="faction2">EQUIPO B (faction2)</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Rondas Equipo A</label>
                          <input
                            type="number"
                            value={simScoreA}
                            onChange={(e) => setSimScoreA(parseInt(e.target.value, 10) || 0)}
                            className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono text-white rounded-none px-4 py-3 outline-none focus:border-white transition-colors"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Rondas Equipo B</label>
                          <input
                            type="number"
                            value={simScoreB}
                            onChange={(e) => setSimScoreB(parseInt(e.target.value, 10) || 0)}
                            className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono text-white rounded-none px-4 py-3 outline-none focus:border-white transition-colors"
                          />
                        </div>
                      </div>
                    )}

                    {/* Players assignment helper info */}
                    <div className="bg-[#151515] border border-white/5 p-4 text-[11px] text-neutral-400 space-y-2">
                      <p className="font-bold text-white uppercase">ℹ️ INFORMACIÓN DE JUGADORES SIMULADOS:</p>
                      <p>
                        Para hacer las pruebas de traslado de voz y canales, el simulador utilizará automáticamente a los usuarios registrados en tu base de datos y los distribuirá en los rosters de los dos equipos.
                      </p>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleTriggerSimulatedWebhook}
                        disabled={simulatingWebhook}
                        className="px-8 py-3 bg-[#FF5500] hover:bg-white text-white hover:text-black font-black uppercase tracking-widest text-xs transition-colors rounded-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {simulatingWebhook ? 'PROCESANDO EVENTO...' : '🚀 DISPARAR EVENTO SIMULADO'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 8: CONSOLE LOGS */}
              {activeTab === 'logs' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Logs filter bar */}
                  <div className="bg-[#111] border-2 border-white/10 p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-none">
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-1">CONSOLA DE REGISTROS RECIENTES</h3>
                      <p className="text-xs text-neutral-400 uppercase tracking-tight font-mono">Historial detallado de eventos de Discord y Faceit API.</p>
                    </div>

                    {/* Filter buttons */}
                    <div className="flex flex-wrap gap-1.5 p-1 bg-[#0A0A0A] border-2 border-white/10 rounded-none">
                      {['all', 'info', 'warn', 'error', 'success'].map(level => (
                        <button
                          key={level}
                          onClick={() => setLogsFilter(level)}
                          className={`px-3 py-1.5 rounded-none text-[9px] font-mono font-black uppercase cursor-pointer transition-colors border ${
                            logsFilter === level
                              ? 'bg-white text-black border-white'
                              : 'text-neutral-400 border-transparent hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {level === 'all' ? 'TODOS' : level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Log console window layout */}
                  <div className="bg-[#111] border-2 border-white/10 overflow-hidden shadow-[10px_10px_0px_rgba(0,0,0,0.5)] rounded-none">
                    <div className="max-h-[500px] overflow-y-auto">
                      <table className="w-full text-left border-collapse font-mono text-xs">
                        <thead>
                          <tr className="bg-neutral-900 border-b border-white/10 text-neutral-400">
                            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest w-28">NIVEL</th>
                            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">MENSAJE DE REGISTRO</th>
                            <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest w-48 text-right">MARCA DE TIEMPO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredLogs.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="py-8 text-center text-neutral-500 font-mono font-bold uppercase">
                                No hay registros que coincidan con la categoría elegida.
                              </td>
                            </tr>
                          ) : (
                            filteredLogs.map(log => (
                              <tr key={log.id} className="hover:bg-white/[0.02] border-b border-white/5 transition-colors">
                                <td className="py-3 px-6">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[9px] font-mono font-black uppercase border ${
                                    log.level === 'success' ? 'bg-white text-black border-white' :
                                    log.level === 'warn' ? 'bg-yellow-950/20 text-yellow-500 border-yellow-500/20' :
                                    log.level === 'error' ? 'bg-red-950/20 text-red-500 border-red-500/20' :
                                    'bg-[#1C1C1C] text-neutral-400 border-white/10'
                                  }`}>
                                    {log.level}
                                  </span>
                                </td>
                                <td className="py-3 px-6 text-white font-mono break-all uppercase text-[11px] tracking-tight">{log.message}</td>
                                <td className="py-3 px-6 text-neutral-400 text-right font-mono text-[10px] whitespace-nowrap">{log.timestamp}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* VIEW 9: SUPPORT CALLS */}
              {activeTab === 'support' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-[#111] border-2 border-white/10 p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-none">
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-1">SOLICITUDES DE SOPORTE</h3>
                      <p className="text-xs text-neutral-400 uppercase tracking-tight font-mono">Listado de alertas de admin enviadas por jugadores desde Discord.</p>
                    </div>
                  </div>

                  <div className="bg-[#111] border-2 border-white/10 overflow-hidden shadow-[10px_10px_0px_rgba(0,0,0,0.5)] rounded-none">
                    <table className="w-full text-left border-collapse font-mono text-xs">
                      <thead>
                        <tr className="bg-neutral-900 border-b border-white/10 text-neutral-400">
                          <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest w-40">CREADA EN</th>
                          <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest w-40">JUGADOR (NICKNAME)</th>
                          <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">DESCRIPCIÓN DEL PROBLEMA</th>
                          <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest w-44">ENLACE PARTIDA</th>
                          <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest w-32">ESTADO</th>
                          <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest w-40 text-right">ACCIÓN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white/90">
                        {supportCalls.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-neutral-500 uppercase tracking-widest text-[10px] font-bold">
                              No hay solicitudes de soporte registradas.
                            </td>
                          </tr>
                        ) : (
                          supportCalls.map((call: any) => {
                            let createdStr = 'Desconocido';
                            if (call.createdAt && call.createdAt._seconds) {
                              createdStr = new Date(call.createdAt._seconds * 1000).toLocaleString('es-ES');
                            } else if (typeof call.createdAt === 'string') {
                              createdStr = call.createdAt;
                            } else if (call.createdAt) {
                              createdStr = new Date(call.createdAt).toLocaleString('es-ES');
                            }
                            return (
                              <tr key={call.id} className="hover:bg-white/5 transition-colors">
                                <td className="py-4 px-6 font-mono text-neutral-400">{createdStr}</td>
                                 <td className="py-4 px-6 font-bold">
                                  <div className="flex flex-col">
                                    <button
                                      onClick={() => {
                                        setStatsSearch(call.faceit_nickname);
                                        setActiveTab('stats');
                                        setTimeout(() => handlePlayerSearch(undefined, call.faceit_nickname), 100);
                                      }}
                                      className="text-[#FF5500] hover:underline font-bold text-left focus:outline-none cursor-pointer"
                                    >
                                      {call.faceit_nickname}
                                    </button>
                                    <span className="text-[9px] text-neutral-500 font-mono">Discord: {call.discord_id}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6 whitespace-normal max-w-xs">{call.description}</td>
                                <td className="py-4 px-6">
                                  {call.match_url ? (
                                    <a href={call.match_url} target="_blank" rel="noreferrer" className="text-[#FF5500] hover:underline font-bold flex items-center gap-1">
                                      Ver Partida <ArrowUpRight className="w-3.5 h-3.5" />
                                    </a>
                                  ) : (
                                    <span className="text-neutral-500">N/A</span>
                                  )}
                                </td>
                                <td className="py-4 px-6">
                                  {call.status === 'pendiente' ? (
                                    <span className="px-2 py-0.5 text-[9px] bg-red-500/10 border border-red-500/30 text-red-400 font-black uppercase tracking-wider rounded-none">
                                      Pendiente
                                    </span>
                                  ) : (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="px-2 py-0.5 text-[9px] bg-green-500/10 border border-green-500/30 text-green-400 font-black uppercase tracking-wider rounded-none inline-block self-start">
                                        Atendido
                                      </span>
                                      <span className="text-[8px] text-neutral-500 truncate max-w-[120px]">Por: {call.claimedBy}</span>
                                      {(() => {
                                        if (call.claimedAt && call.createdAt) {
                                          const createdMs = call.createdAt._seconds ? call.createdAt._seconds * 1000 : new Date(call.createdAt).getTime();
                                          const claimedMs = typeof call.claimedAt === 'number' ? call.claimedAt : (call.claimedAt._seconds ? call.claimedAt._seconds * 1000 : new Date(call.claimedAt).getTime());
                                          const diffSec = Math.round((claimedMs - createdMs) / 1000);
                                          if (diffSec < 60) {
                                            return <span className="text-[8px] text-neutral-500">⏱️ {diffSec}s</span>;
                                          } else {
                                            return <span className="text-[8px] text-neutral-500">⏱️ {Math.round(diffSec / 60)}m</span>;
                                          }
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  )}
                                </td>
                                <td className="py-4 px-6 text-right">
                                  {call.status === 'pendiente' && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          const res = await apiFetch(`/api/admin/support-calls/${call.id}/resolve`, { method: 'POST' });
                                          if (res.ok) {
                                            showToast('Solicitud marcada como atendida');
                                            loadData();
                                          } else {
                                            showToast('Error al resolver la solicitud', 'error');
                                          }
                                        } catch (e) {
                                          showToast('Error de red al resolver la solicitud', 'error');
                                        }
                                      }}
                                      className="px-3 py-1 bg-white hover:bg-neutral-200 text-black text-[9px] font-black uppercase cursor-pointer rounded-none tracking-tighter"
                                    >
                                      Atender
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW 10: MESSAGE TEMPLATES */}
              {activeTab === 'templates' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-[#111] border-2 border-white/10 p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-none">
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-1">PLANTILLAS DE MENSAJES</h3>
                      <p className="text-xs text-neutral-400 uppercase tracking-tight font-mono">Personaliza los embeds y descripciones que el bot envía.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Welcome Template Form */}
                    <div className="bg-[#111] border-2 border-white/10 p-8 space-y-4 rounded-none">
                      <h4 className="text-md font-black text-white uppercase tracking-wider border-b border-white/10 pb-2">🎉 MENSAJE DE BIENVENIDA (DM)</h4>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Título del Embed</label>
                        <input
                          type="text"
                          value={messageTemplates.welcomeTitle || ''}
                          onChange={(e) => setMessageTemplates(prev => ({ ...prev, welcomeTitle: e.target.value }))}
                          className="bg-[#0A0A0A] border border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3 outline-none focus:border-white transition-colors"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Descripción / Cuerpo del Mensaje</label>
                        <textarea
                          rows={12}
                          value={messageTemplates.welcomeDescription || ''}
                          onChange={(e) => setMessageTemplates(prev => ({ ...prev, welcomeDescription: e.target.value }))}
                          className="bg-[#0A0A0A] border border-white/10 text-xs font-mono text-white rounded-none px-4 py-3 outline-none focus:border-white transition-colors"
                          placeholder="Usa {username}, {clubUrl} y {linkChannelMention} como marcadores de posición dinámicos."
                        />
                        <span className="text-[9px] text-neutral-500 font-mono uppercase">Variables disponibles: &#123;username&#125;, &#123;clubUrl&#125;, &#123;linkChannelMention&#125;</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Color del Embed (HEX)</label>
                        <input
                          type="text"
                          value={messageTemplates.welcomeColor || ''}
                          onChange={(e) => setMessageTemplates(prev => ({ ...prev, welcomeColor: e.target.value }))}
                          className="bg-[#0A0A0A] border border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3 outline-none focus:border-white transition-colors w-32"
                          placeholder="#FF5500"
                        />
                      </div>
                    </div>

                    {/* Support Panel Form */}
                    <div className="bg-[#111] border-2 border-white/10 p-8 space-y-4 rounded-none">
                      <h4 className="text-md font-black text-white uppercase tracking-wider border-b border-white/10 pb-2">🚨 PANEL DE LLAMADO DE ADMIN</h4>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Título del Embed</label>
                        <input
                          type="text"
                          value={messageTemplates.supportTitle || ''}
                          onChange={(e) => setMessageTemplates(prev => ({ ...prev, supportTitle: e.target.value }))}
                          className="bg-[#0A0A0A] border border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3 outline-none focus:border-white transition-colors"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Descripción / Cuerpo del Mensaje</label>
                        <textarea
                          rows={12}
                          value={messageTemplates.supportDescription || ''}
                          onChange={(e) => setMessageTemplates(prev => ({ ...prev, supportDescription: e.target.value }))}
                          className="bg-[#0A0A0A] border border-white/10 text-xs font-mono text-white rounded-none px-4 py-3 outline-none focus:border-white transition-colors"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Color del Embed (HEX)</label>
                        <input
                          type="text"
                          value={messageTemplates.supportColor || ''}
                          onChange={(e) => setMessageTemplates(prev => ({ ...prev, supportColor: e.target.value }))}
                          className="bg-[#0A0A0A] border border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3 outline-none focus:border-white transition-colors w-32"
                          placeholder="#FF0000"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={async () => {
                        try {
                          const res = await apiFetch('/api/admin/messages', {
                            method: 'POST',
                            body: JSON.stringify(messageTemplates)
                          });
                          if (res.ok) {
                            showToast('Mensajes actualizados correctamente');
                            loadData();
                          } else {
                            showToast('Error al guardar las plantillas', 'error');
                          }
                        } catch (e) {
                          showToast('Error de red al guardar las plantillas', 'error');
                        }
                      }}
                      className="px-8 py-3 bg-white hover:bg-neutral-200 text-black font-black uppercase tracking-widest text-xs transition-colors rounded-none cursor-pointer"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              )}

            </main>
          </div>

          {/* Modal 1: VERIFICACIÓN MANUAL */}
          {verifyModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <div onClick={() => setVerifyModalOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
              
              <div className="relative bg-[#111] border-2 border-white p-8 shadow-[10px_10px_0px_rgba(0,0,0,0.5)] rounded-none w-full max-w-md z-10 font-mono">
                <h3 className="text-lg font-black text-white uppercase tracking-tighter italic mb-6 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-white" />
                  <span>AÑADIR VERIFICACIÓN MANUAL</span>
                </h3>

                <form onSubmit={handleManualVerify} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Discord ID del Usuario</label>
                    <input
                      type="text"
                      placeholder="EJ: 1938472918347"
                      value={manualDiscordId}
                      onChange={(e) => setManualDiscordId(e.target.value)}
                      className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-white transition-colors"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Nickname Exacto de Faceit</label>
                    <input
                      type="text"
                      placeholder="EJ: TOXICPLAYER_99"
                      value={manualNickname}
                      onChange={(e) => setManualNickname(e.target.value)}
                      className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-white transition-colors"
                      required
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setVerifyModalOpen(false)}
                      className="flex-1 py-4 px-4 text-xs font-black bg-[#1A1A1A] hover:bg-neutral-800 text-white transition-colors cursor-pointer rounded-none border border-white/10 uppercase tracking-tighter"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-4 px-4 text-xs font-black bg-white hover:bg-neutral-200 text-black transition-colors cursor-pointer rounded-none border border-white uppercase tracking-tighter"
                    >
                      Vincular Cuenta
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal 2: ASIGNAR ROL MANUAL */}
          {roleModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <div onClick={() => setRoleModalOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
              
              <div className="relative bg-[#111] border-2 border-white p-8 shadow-[10px_10px_0px_rgba(0,0,0,0.5)] rounded-none w-full max-w-md z-10 font-mono">
                <h3 className="text-lg font-black text-white mb-6 uppercase tracking-tighter italic">🏷️ ASIGNAR ROL PERSONALIZADO</h3>

                <form onSubmit={handleAssignRoleSubmit} className="space-y-4">
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Tipo de Rol</label>
                    <select
                      value={assignRoleType}
                      onChange={(e) => setAssignRoleType(e.target.value as any)}
                      className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-white transition-colors cursor-pointer uppercase"
                    >
                      <option value="level">Nivel Faceit (1-10)</option>
                      <option value="special">Rol Especial del Club</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Valor o Nombre del Rol</label>
                    <input
                      type="text"
                      placeholder={assignRoleType === 'level' ? 'Ej: 10' : 'Ej: MASTER, EXTREME, GUEST'}
                      value={assignRoleValue}
                      onChange={(e) => setAssignRoleValue(e.target.value)}
                      className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-white transition-colors uppercase"
                      required
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setRoleModalOpen(false)}
                      className="flex-1 py-4 px-4 text-xs font-black bg-[#1A1A1A] hover:bg-neutral-800 text-white transition-colors cursor-pointer rounded-none border border-white/10 uppercase tracking-tighter"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-4 px-4 text-xs font-black bg-white hover:bg-neutral-200 text-black transition-colors cursor-pointer rounded-none border border-white uppercase tracking-tighter"
                    >
                      Asignar Rol
                    </button>
                  </div>

                </form>
              </div>
            </div>
          )}

          {/* Modal 3: ASIGNAR PERMISOS ADMINISTRATIVOS WEB */}
          {adminRoleModalOpen && adminRoleTargetUser && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <div onClick={() => setAdminRoleModalOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
              
              <div className="relative bg-[#111] border-2 border-white p-8 shadow-[10px_10px_0px_rgba(0,0,0,0.5)] rounded-none w-full max-w-md z-10 font-mono">
                <h3 className="text-lg font-black text-white mb-6 uppercase tracking-tighter italic flex items-center gap-2">
                  <span>🔑 GESTIONAR PERMISOS WEB</span>
                </h3>

                <form onSubmit={handleSaveAdminRoleSubmit} className="space-y-4">
                  <div className="text-xs text-neutral-400 mb-4">
                    Asignando rol para: <span className="text-white font-black">{adminRoleTargetUser.faceitNickname}</span> ({adminRoleTargetUser.discordId})
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Rol del Usuario</label>
                    <select
                      value={adminRoleValue}
                      onChange={(e) => setAdminRoleValue(e.target.value as any)}
                      className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-white transition-colors cursor-pointer uppercase"
                    >
                      <option value="usuario">Miembro / Usuario Común</option>
                      <option value="admin">Administrador de Servidor</option>
                      {currentUser?.role === 'global_admin' && (
                        <option value="global_admin">Administrador Global</option>
                      )}
                    </select>
                  </div>

                  {adminRoleValue === 'admin' && (
                    <div className="flex flex-col gap-1.5 animate-fadeIn">
                      <label className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">Servidor a Asignar</label>
                      <select
                        value={adminRoleServer}
                        onChange={(e) => setAdminRoleServer(e.target.value)}
                        className="bg-[#0A0A0A] border-2 border-white/10 text-xs font-mono font-black text-white rounded-none px-4 py-3.5 outline-none focus:border-white transition-colors cursor-pointer uppercase"
                        required
                        disabled={currentUser?.role === 'admin'}
                      >
                        {currentUser?.role === 'admin' ? (
                          <option value={currentUser.servidor}>{guilds.find(g => g.id === currentUser.servidor)?.name || 'Tu Servidor'}</option>
                        ) : (
                          <>
                            <option value="">-- Seleccionar Servidor --</option>
                            {guilds.map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                  )}

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setAdminRoleModalOpen(false)}
                      className="flex-1 py-4 px-4 text-xs font-black bg-[#1A1A1A] hover:bg-neutral-800 text-white transition-colors cursor-pointer rounded-none border border-white/10 uppercase tracking-tighter"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-4 px-4 text-xs font-black bg-white hover:bg-neutral-200 text-black transition-colors cursor-pointer rounded-none border border-white uppercase tracking-tighter"
                    >
                      Guardar Permisos
                    </button>
                  </div>

                </form>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
