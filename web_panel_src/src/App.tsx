import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Gamepad2, 
  Users, 
  Settings, 
  Search, 
  LogOut, 
  ArrowUp, 
  ArrowDown, 
  Shuffle, 
  Play, 
  RotateCcw, 
  ShieldAlert, 
  Award, 
  Plus, 
  Trash2, 
  UserCheck, 
  X,
  Volume2
} from 'lucide-react';
import { Player, Team, LobbyState, CurrentUser, Guild, ToastMessage } from './types';

export default function App() {
  // Authentication & Loading states
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  
  // Guild configurations
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [currentGuildId, setCurrentGuildId] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('guild') || '';
  });
  const [guildName, setGuildName] = useState('Mixton Arena');

  // Lobby States
  const [lobbyState, setLobbyState] = useState<LobbyState>({
    teams: [],
    pickOrder: [],
    currentPickIndex: 0,
    draftStarted: false,
    draftFinished: false
  });
  const [availablePlayers, setAvailablePlayers] = useState<{
    S: Player[];
    A: Player[];
    B: Player[];
    C: Player[];
    [key: string]: Player[];
  }>({ S: [], A: [], B: [], C: [] });
  const [matchHistory, setMatchHistory] = useState<any[]>([]);

  // UI Filters and Modals
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modalTargetTeamId, setModalTargetTeamId] = useState<string | null>(null);
  const [modalTeamName, setModalTeamName] = useState<string>('');
  const [modalHistoryRoster, setModalHistoryRoster] = useState<any[] | null>(null);
  const [modalHistoryTeamName, setModalHistoryTeamName] = useState<string>('');
  const [commandEnabled, setCommandEnabled] = useState(true);
  const [pendingPick, setPendingPick] = useState<Player | null>(null);
  const [numTeamsSelect, setNumTeamsSelect] = useState<number>(4);

  // Match launching selections
  const [matchTeamA, setMatchTeamA] = useState<string>('');
  const [matchTeamB, setMatchTeamB] = useState<string>('');
  const [isLaunchingMatch, setIsLaunchingMatch] = useState(false);

  // Admin pick order editor state
  const [localPickOrder, setLocalPickOrder] = useState<string[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Toast stack state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);

  // Helper: Toast Notifications (Admin-style notifications)
  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  // Helper: fetch wrapper that automatically appends guildId
  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const separator = path.includes('?') ? '&' : '?';
    const url = currentGuildId ? `${path}${separator}guildId=${currentGuildId}` : path;
    return fetch(url, options);
  }, [currentGuildId]);

  // Fetch all guilds for the admin guild-selector
  const loadGuildsSelector = useCallback(async () => {
    try {
      const res = await fetch('/api/lobby/guilds');
      if (!res.ok) return;
      const { guilds: loadedGuilds } = await res.json();
      if (!loadedGuilds || loadedGuilds.length === 0) return;
      
      setGuilds(loadedGuilds);
      
      // If we don't have a currentGuildId, pick the first one
      setCurrentGuildId(prev => {
        if (!prev && loadedGuilds.length > 0) {
          const firstId = loadedGuilds[0].id;
          const url = new URL(window.location.href);
          url.searchParams.set('guild', firstId);
          window.history.replaceState({}, '', url);
          return firstId;
        }
        return prev;
      });
    } catch (err) {
      console.error('Error loading guilds selector:', err);
    }
  }, []);

  // Fetch Lobby State from Server
  const fetchState = useCallback(async (guildIdToUse?: string) => {
    try {
      const targetGuildId = guildIdToUse !== undefined ? guildIdToUse : currentGuildId;
      const path = targetGuildId ? `/api/lobby/mixton-state?guildId=${targetGuildId}` : '/api/lobby/mixton-state';
      
      const res = await fetch(path);
      if (!res.ok) {
        if (res.status === 401) return; // session expired, ignore
        throw new Error('Error al conectar con el servidor.');
      }
      
      const data = await res.json();
      
      if (data.state) setLobbyState(data.state);
      if (data.availablePlayers) setAvailablePlayers(data.availablePlayers);
      if (data.currentUser) setCurrentUser(data.currentUser);
      if (data.commandEnabled !== undefined) setCommandEnabled(data.commandEnabled);
      if (data.guildName) setGuildName(data.guildName);
      
      if (data.guildId && !targetGuildId) {
        setCurrentGuildId(data.guildId);
        const url = new URL(window.location.href);
        url.searchParams.set('guild', data.guildId);
        window.history.replaceState({}, '', url);
      }
    } catch (err) {
      console.error('Error fetching lobby state:', err);
    }
  }, [currentGuildId]);

  // Fetch recent mixton matches history
  const fetchHistory = useCallback(async (guildIdToUse?: string) => {
    try {
      const targetGuildId = guildIdToUse !== undefined ? guildIdToUse : currentGuildId;
      const path = targetGuildId ? `/api/lobby/matches-history?guildId=${targetGuildId}&limit=10` : '/api/lobby/matches-history?limit=10';
      
      const res = await fetch(path);
      if (!res.ok) return;
      const data = await res.json();
      if (data.history) setMatchHistory(data.history);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  }, [currentGuildId]);

  // Load team roster directly from history
  const handleLoadTeamFromHistory = async (teamId: string, roster: any[]) => {
    if (!roster || roster.length === 0) {
      showToast('El equipo no tiene jugadores registrados.', 'error');
      return;
    }
    
    // Check that all players have a discord_id mapped
    const missingDiscordId = roster.some(p => !p.discord_id && !p.id);
    if (missingDiscordId) {
      showToast('No se puede cargar el equipo: algunos jugadores no tienen su cuenta de Discord vinculada.', 'error');
      return;
    }

    try {
      const captain = roster[0];
      const players = roster.slice(1);
      
      const res = await apiFetch('/api/lobby/mixton-load-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          captainDiscordId: captain.discord_id || captain.id,
          playerDiscordIds: players.map((p: any) => p.discord_id || p.id)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar el equipo.');
      
      showToast('Equipo cargado con éxito del historial.', 'success');
      await fetchState();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Open retro flat modal to ask admin which team to assign the history roster to
  const handleAssignHistoryTeamPrompt = (roster: any[], teamNameSource: string) => {
    if (!roster || roster.length === 0) {
      showToast('El equipo no tiene jugadores registrados.', 'error');
      return;
    }
    setModalHistoryRoster(roster);
    setModalHistoryTeamName(teamNameSource);
  };

  // Connect WebSocket for real-time updates
  const connectWebSocket = useCallback((guildId: string) => {
    if (wsRef.current) {
      try {
        wsRef.current.onclose = null;
        wsRef.current.close();
      } catch (e) {}
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/lobby/mixton-ws?guildId=${guildId}`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;
    
    socket.onopen = () => {
      console.log('WebSocket conectado con éxito');
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'state_update') {
          const data = message.data;
          
          if (data.state) setLobbyState(data.state);
          if (data.availablePlayers) setAvailablePlayers(data.availablePlayers);
          if (data.commandEnabled !== undefined) setCommandEnabled(data.commandEnabled);
          if (data.guildName) setGuildName(data.guildName);
          
          if (data.guildId) {
            setCurrentGuildId(prev => {
              if (!prev) {
                const url = new URL(window.location.href);
                url.searchParams.set('guild', data.guildId);
                window.history.replaceState({}, '', url);
                return data.guildId;
              }
              return prev;
            });
          }

          fetchHistory(data.guildId || undefined);
        }
      } catch (err) {
        console.error('Error al procesar mensaje de WebSocket:', err);
      }
    };
    
    socket.onclose = () => {
      console.warn('Conexión WebSocket cerrada, reintentando en 5 segundos...');
      setTimeout(() => connectWebSocket(guildId), 5000);
    };
    
    socket.onerror = (err) => {
      console.error('Error en WebSocket:', err);
      socket.close();
    };
  }, [fetchHistory]);

  // Check Session with Server on Mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/lobby/me');
        if (res.status === 401) {
          window.location.href = `/auth/discord?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          return;
        }
        const data = await res.json();
        setCurrentUser(data.user);
        
        // If user is Admin, load guilds list
        if (data.user?.isAdmin) {
          await loadGuildsSelector();
        }
        
        await fetchState();
        await fetchHistory();
        setAuthChecking(false);
      } catch (err) {
        console.error('Auth check error:', err);
        showToast('Error al verificar sesión con Discord. Recarga la página.', 'error');
      }
    };
    checkAuth();
  }, [fetchState, fetchHistory, loadGuildsSelector, showToast]);

  // Connect WebSocket when currentGuildId is resolved
  useEffect(() => {
    if (currentGuildId) {
      connectWebSocket(currentGuildId);
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [currentGuildId, connectWebSocket]);

  // Clear pendingPick if the turn changes or the draft finishes/resets
  useEffect(() => {
    if (!pendingPick) return;
    
    const currentTeamId = lobbyState.pickOrder[lobbyState.currentPickIndex];
    const currentTeam = lobbyState.teams.find(t => t.id === currentTeamId);
    const isMyTurn = currentTeam?.captain && currentUser && currentTeam.captain.discordId === currentUser.userId;
    
    if (!lobbyState.draftStarted || lobbyState.draftFinished || (!isMyTurn && !currentUser?.isAdmin)) {
      setPendingPick(null);
    } else {
      // Check if pending player is still available
      let found = false;
      Object.keys(availablePlayers).forEach(tier => {
        if (availablePlayers[tier]?.some(p => p.discordId === pendingPick.discordId)) {
          found = true;
        }
      });
      if (!found) {
        setPendingPick(null);
      }
    }
  }, [lobbyState, availablePlayers, pendingPick, currentUser]);

  // Keep localPickOrder in sync with lobbyState teams
  useEffect(() => {
    const teamsWithCaptains = lobbyState.teams.filter(t => t.captain !== null);
    if (!lobbyState.draftStarted && !lobbyState.draftFinished && teamsWithCaptains.length > 0) {
      if (!localPickOrder.length || localPickOrder.length !== teamsWithCaptains.length || 
          !teamsWithCaptains.every(t => localPickOrder.includes(t.id))) {
        if (lobbyState.pickOrder.length === teamsWithCaptains.length) {
          setLocalPickOrder([...lobbyState.pickOrder]);
        } else {
          setLocalPickOrder(teamsWithCaptains.map(t => t.id));
        }
        setIsSavingOrder(false);
      }
    } else {
      setLocalPickOrder([]);
      setIsSavingOrder(false);
    }
  }, [lobbyState, localPickOrder.length]);

  // Sync numTeams Select with state
  useEffect(() => {
    if (lobbyState.teams.length > 0 && !lobbyState.draftStarted && !lobbyState.draftFinished) {
      setNumTeamsSelect(lobbyState.teams.length);
    }
  }, [lobbyState]);

  // Helper: Obtener Tier por defecto para retornar jugadores a disponibles
  const getPlayerDefaultTier = (player: Player): string => {
    const overrideTier = player.mixton_tier_override;
    if (overrideTier === 'S' || overrideTier === 'A' || overrideTier === 'B' || overrideTier === 'C') {
      return overrideTier;
    }
    const lvl = parseInt(player.faceit_level as any) || 1;
    if (lvl === 10) return 'S';
    if (lvl === 8 || lvl === 9) return 'A';
    if (lvl >= 5 && lvl <= 7) return 'B';
    return 'C';
  };

  // Handle Pick Player API Call (Optimistic Update)
  const handlePickPlayer = async (discordId: string) => {
    // 1. Guardar estado actual para rollback
    const prevLobbyState = { ...lobbyState };
    const prevAvailablePlayers = { ...availablePlayers };

    // 2. Encontrar al jugador en availablePlayers
    let playerObj: Player | null = null;
    const nextAvailable = { ...availablePlayers };
    for (const tier of ['S', 'A', 'B', 'C']) {
      if (nextAvailable[tier]) {
        const idx = nextAvailable[tier].findIndex(p => p.discordId === discordId);
        if (idx !== -1) {
          playerObj = nextAvailable[tier][idx];
          nextAvailable[tier] = nextAvailable[tier].filter((_, i) => i !== idx);
          break;
        }
      }
    }

    if (!playerObj) {
      showToast('El jugador no está disponible en la lista.', 'error');
      return;
    }

    // 3. Encontrar equipo activo
    const currentTeamId = lobbyState.pickOrder[lobbyState.currentPickIndex];
    const nextTeams = lobbyState.teams.map(team => {
      if (team.id === currentTeamId) {
        return {
          ...team,
          players: [...(team.players || []), playerObj!]
        };
      }
      return team;
    });

    // 4. Calcular el siguiente pick index
    const nextPickIndex = (lobbyState.currentPickIndex + 1) >= lobbyState.pickOrder.length
      ? lobbyState.currentPickIndex
      : lobbyState.currentPickIndex + 1;

    const draftFinished = (lobbyState.currentPickIndex + 1) >= lobbyState.pickOrder.length;

    // 5. Aplicar cambios locales instantáneamente
    setLobbyState(prev => ({
      ...prev,
      teams: nextTeams,
      currentPickIndex: nextPickIndex,
      draftFinished: prev.draftFinished || draftFinished
    }));
    setAvailablePlayers(nextAvailable);
    setPendingPick(null);

    // 6. Hacer petición en segundo plano
    try {
      const res = await apiFetch('/api/lobby/mixton-pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerDiscordId: discordId })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al elegir jugador.');
      }
      
      showToast('Jugador seleccionado con éxito.', 'success');
      await fetchState();
    } catch (err: any) {
      // Rollback en caso de error
      setLobbyState(prevLobbyState);
      setAvailablePlayers(prevAvailablePlayers);
      showToast(err.message, 'error');
    }
  };

  const handleSelectPendingPlayer = (player: Player) => {
    setPendingPick(player);
  };

  const handleCancelPendingPlayer = () => {
    setPendingPick(null);
  };

  const handleConfirmPendingPlayer = async () => {
    if (!pendingPick) return;
    const pId = pendingPick.discordId;
    setPendingPick(null);
    await handlePickPlayer(pId);
  };

  // Admin: Override Player Tier
  const handleOverridePlayerTier = async (discordId: string, value: string) => {
    const tier = value === '' ? null : value;
    try {
      const res = await apiFetch('/api/lobby/mixton-override-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerDiscordId: discordId, tier })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar el Tier.');
      
      showToast('Tier del jugador actualizado con éxito.', 'success');
      await fetchState();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Admin: Remove Captain (Optimistic Update)
  const handleRemoveCaptain = async (teamId: string) => {
    // 1. Guardar estado actual para rollback
    const prevLobbyState = { ...lobbyState };
    const prevAvailablePlayers = { ...availablePlayers };

    // 2. Encontrar al capitán actual del equipo
    const targetTeam = lobbyState.teams.find(t => t.id === teamId);
    if (!targetTeam || !targetTeam.captain) return;
    const currentCap = targetTeam.captain;

    // 3. Mutar equipos
    const nextTeams = lobbyState.teams.map(team => {
      if (team.id === teamId) {
        return {
          ...team,
          captain: null
        };
      }
      return team;
    });

    // 4. Devolver capitán a disponibles
    const tier = getPlayerDefaultTier(currentCap);
    const nextAvailable = { ...availablePlayers };
    if (!nextAvailable[tier]) nextAvailable[tier] = [];
    if (!nextAvailable[tier].some(p => p.discordId === currentCap.discordId)) {
      nextAvailable[tier] = [...nextAvailable[tier], currentCap];
      nextAvailable[tier].sort((a, b) => (b.faceit_elo || 1000) - (a.faceit_elo || 1000));
    }

    // 5. Aplicar cambios locales
    setLobbyState(prev => ({
      ...prev,
      teams: nextTeams
    }));
    setAvailablePlayers(nextAvailable);

    // 6. Hacer petición en segundo plano
    try {
      const res = await apiFetch('/api/lobby/mixton-assign-captain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, discordId: null })
      });
      if (!res.ok) throw new Error('Error al remover capitán.');
      showToast('Capitán removido con éxito.', 'success');
      await fetchState();
    } catch (err: any) {
      setLobbyState(prevLobbyState);
      setAvailablePlayers(prevAvailablePlayers);
      showToast(err.message, 'error');
    }
  };

  // Admin: Open modal to assign captain
  const handleOpenCaptainModal = (teamId: string, teamName: string) => {
    setModalTargetTeamId(teamId);
    setModalTeamName(teamName);
  };

  // Admin: Assign captain for team (Optimistic Update)
  const handleSelectCaptainForTeam = async (discordId: string) => {
    if (!modalTargetTeamId) return;
    const targetTeamId = modalTargetTeamId;

    // 1. Guardar estado actual para rollback
    const prevLobbyState = { ...lobbyState };
    const prevAvailablePlayers = { ...availablePlayers };

    // 2. Encontrar y remover de disponibles
    let playerObj: Player | null = null;
    const nextAvailable = { ...availablePlayers };
    for (const tier of ['S', 'A', 'B', 'C']) {
      if (nextAvailable[tier]) {
        const idx = nextAvailable[tier].findIndex(p => p.discordId === discordId);
        if (idx !== -1) {
          playerObj = nextAvailable[tier][idx];
          nextAvailable[tier] = nextAvailable[tier].filter((_, i) => i !== idx);
          break;
        }
      }
    }

    if (!playerObj) {
      showToast('El jugador no está disponible en la lista.', 'error');
      return;
    }

    // 3. Mutar el equipo asignándole el capitán
    const nextTeams = lobbyState.teams.map(team => {
      if (team.id === targetTeamId) {
        return {
          ...team,
          captain: playerObj
        };
      }
      return team;
    });

    // 4. Actualizar UI localmente
    setLobbyState(prev => ({
      ...prev,
      teams: nextTeams
    }));
    setAvailablePlayers(nextAvailable);
    setModalTargetTeamId(null);

    // 5. Hacer petición en segundo plano
    try {
      const res = await apiFetch('/api/lobby/mixton-assign-captain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: targetTeamId, discordId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al asignar capitán.');
      
      showToast('Capitán asignado correctamente.', 'success');
      await fetchState();
    } catch (err: any) {
      setLobbyState(prevLobbyState);
      setAvailablePlayers(prevAvailablePlayers);
      showToast(err.message, 'error');
    }
  };

  // Admin: Directly assign player to team (Optimistic Update)
  const handleAssignPlayerToTeam = async (discordId: string, teamId: string) => {
    if (!teamId) return;

    // 1. Guardar estado actual para rollback
    const prevLobbyState = { ...lobbyState };
    const prevAvailablePlayers = { ...availablePlayers };

    // 2. Encontrar y remover de disponibles
    let playerObj: Player | null = null;
    const nextAvailable = { ...availablePlayers };
    for (const tier of ['S', 'A', 'B', 'C']) {
      if (nextAvailable[tier]) {
        const idx = nextAvailable[tier].findIndex(p => p.discordId === discordId);
        if (idx !== -1) {
          playerObj = nextAvailable[tier][idx];
          nextAvailable[tier] = nextAvailable[tier].filter((_, i) => i !== idx);
          break;
        }
      }
    }

    // Buscar si el jugador ya estaba en algún equipo para quitarlo de ahí
    let nextTeams = lobbyState.teams.map(team => {
      const containsPlayer = team.players?.some(p => p.discordId === discordId);
      if (containsPlayer) {
        playerObj = team.players.find(p => p.discordId === discordId) || null;
        return {
          ...team,
          players: team.players.filter(p => p.discordId !== discordId)
        };
      }
      return team;
    });

    if (!playerObj) {
      showToast('El jugador no está disponible ni asignado a otro equipo.', 'error');
      return;
    }

    // 3. Añadir al equipo destino
    nextTeams = nextTeams.map(team => {
      if (team.id === teamId) {
        return {
          ...team,
          players: [...(team.players || []), playerObj!]
        };
      }
      return team;
    });

    // 4. Aplicar cambios locales instantáneamente
    setLobbyState(prev => ({
      ...prev,
      teams: nextTeams
    }));
    setAvailablePlayers(nextAvailable);

    // 5. Hacer petición en segundo plano
    try {
      const res = await apiFetch('/api/lobby/mixton-assign-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, discordId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al asignar jugador.');
      
      showToast('Jugador asignado correctamente.', 'success');
      await fetchState();
    } catch (err: any) {
      setLobbyState(prevLobbyState);
      setAvailablePlayers(prevAvailablePlayers);
      showToast(err.message, 'error');
      await fetchState();
    }
  };

  // Admin: Remove player from team (Optimistic Update)
  const handleRemovePlayerFromTeam = async (teamId: string, discordId: string) => {
    // 1. Guardar estado actual para rollback
    const prevLobbyState = { ...lobbyState };
    const prevAvailablePlayers = { ...availablePlayers };

    // 2. Buscar al jugador en el equipo para removerlo
    let playerObj: Player | null = null;
    const nextTeams = lobbyState.teams.map(team => {
      if (team.id === teamId) {
        playerObj = team.players?.find(p => p.discordId === discordId) || null;
        return {
          ...team,
          players: team.players ? team.players.filter(p => p.discordId !== discordId) : []
        };
      }
      return team;
    });

    if (!playerObj) {
      showToast('El jugador no se encuentra en el equipo.', 'error');
      return;
    }

    // 3. Retornar al jugador a disponibles
    const tier = getPlayerDefaultTier(playerObj);
    const nextAvailable = { ...availablePlayers };
    if (!nextAvailable[tier]) nextAvailable[tier] = [];
    if (!nextAvailable[tier].some(p => p.discordId === playerObj!.discordId)) {
      nextAvailable[tier] = [...nextAvailable[tier], playerObj];
      nextAvailable[tier].sort((a, b) => (b.faceit_elo || 1000) - (a.faceit_elo || 1000));
    }

    // 4. Aplicar cambios locales
    setLobbyState(prev => ({
      ...prev,
      teams: nextTeams
    }));
    setAvailablePlayers(nextAvailable);

    // 5. Hacer petición en segundo plano
    try {
      const res = await apiFetch('/api/lobby/mixton-remove-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, discordId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al remover jugador.');
      
      showToast('Jugador removido correctamente.', 'success');
      await fetchState();
    } catch (err: any) {
      setLobbyState(prevLobbyState);
      setAvailablePlayers(prevAvailablePlayers);
      showToast(err.message, 'error');
    }
  };

  // Admin Action: Setup Teams Count (Optimistic Update)
  const handleSetupTeams = async () => {
    // 1. Guardar estado actual para rollback
    const prevLobbyState = { ...lobbyState };
    const prevAvailablePlayers = { ...availablePlayers };

    // 2. Recolectar todos los jugadores y capitanes ocupados actualmente para regresarlos a disponibles
    let nextAvailable = { ...availablePlayers };
    lobbyState.teams.forEach(team => {
      if (team.captain) {
        const tier = getPlayerDefaultTier(team.captain);
        if (!nextAvailable[tier]) nextAvailable[tier] = [];
        if (!nextAvailable[tier].some(p => p.discordId === team.captain!.discordId)) {
          nextAvailable[tier] = [...nextAvailable[tier], team.captain];
        }
      }
      if (team.players) {
        team.players.forEach(player => {
          const tier = getPlayerDefaultTier(player);
          if (!nextAvailable[tier]) nextAvailable[tier] = [];
          if (!nextAvailable[tier].some(p => p.discordId === player.discordId)) {
            nextAvailable[tier] = [...nextAvailable[tier], player];
          }
        });
      }
    });

    // Ordenar todas las listas de disponibles por ELO descendente
    for (const tier of ['S', 'A', 'B', 'C']) {
      if (nextAvailable[tier]) {
        nextAvailable[tier] = [...nextAvailable[tier]].sort((a, b) => (b.faceit_elo || 1000) - (a.faceit_elo || 1000));
      }
    }

    // 3. Generar la nueva estructura de equipos vacíos
    const newTeams: Team[] = [];
    for (let i = 1; i <= numTeamsSelect; i++) {
      newTeams.push({
        id: `team_${i}`,
        name: `Equipo ${i}`,
        captain: null,
        players: []
      });
    }

    // 4. Aplicar cambios locales instantáneamente
    setLobbyState(prev => ({
      ...prev,
      teams: newTeams,
      pickOrder: [],
      currentPickIndex: 0,
      draftStarted: false,
      draftFinished: false
    }));
    setAvailablePlayers(nextAvailable);
    setLocalPickOrder([]);

    // 5. Hacer petición en segundo plano
    try {
      const res = await apiFetch('/api/lobby/mixton-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numTeams: numTeamsSelect })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al configurar cantidad de equipos.');
      
      showToast(`Equipos configurados correctamente (${numTeamsSelect} equipos).`, 'success');
      await fetchState();
    } catch (err: any) {
      // Rollback en caso de error
      setLobbyState(prevLobbyState);
      setAvailablePlayers(prevAvailablePlayers);
      setLocalPickOrder(prevLobbyState.teams.filter(t => t.captain !== null).map(t => t.id));
      showToast(err.message, 'error');
    }
  };

  // Admin Action: Save Pick Order
  const handleSavePickOrder = async () => {
    try {
      const res = await apiFetch('/api/lobby/mixton-pick-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickOrder: localPickOrder })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar el orden.');
      
      showToast('Orden de elección guardado correctamente.', 'success');
      setIsSavingOrder(false);
      await fetchState();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Admin Action: Randomize Order
  const handleRandomizeOrder = () => {
    const shuffled = [...localPickOrder];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
    setLocalPickOrder(shuffled);
    setIsSavingOrder(true);
    showToast('Orden aleatorizado. Recuerda hacer clic en "Guardar Orden".', 'info');
  };

  // Admin Action: Move Order Arrow
  const handleMoveOrder = (index: number, dir: number) => {
    if (index + dir < 0 || index + dir >= localPickOrder.length) return;
    const newOrder = [...localPickOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + dir];
    newOrder[index + dir] = temp;
    setLocalPickOrder(newOrder);
    setIsSavingOrder(true);
  };

  // Admin Action: Start Draft
  const handleStartDraft = async () => {
    try {
      const res = await apiFetch('/api/lobby/mixton-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar el draft.');
      
      showToast('¡Draft iniciado! Turno de selección activo.', 'success');
      await fetchState();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Admin Action: Reset Lobby
  const handleResetLobby = async () => {
    if (!window.confirm('¿Estás seguro de reiniciar todo el lobby mixton? Se borrarán todos los equipos, capitanes y miembros elegidos.')) {
      return;
    }
    try {
      const res = await apiFetch('/api/lobby/mixton-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reiniciar el lobby.');
      
      showToast('Lobby de mixton reiniciado correctamente.', 'success');
      setLocalPickOrder([]);
      await fetchState();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Admin Action: Reset Players Queue (Todos no listos)
  const handleResetPlayers = async () => {
    if (!window.confirm('¿Estás seguro de vaciar la lista de listos? Todos los jugadores volverán al estado "No Disponible".')) {
      return;
    }
    try {
      const res = await apiFetch('/api/lobby/mixton-reset-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al limpiar la lista de listos.');
      
      showToast(`Cola limpiada con éxito. ${data.count || 0} jugadores marcados como no disponibles.`, 'success');
      await fetchState();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Admin Action: Remove specific player from Queue (No listo)
  const handleRemovePlayerFromQueue = async (discordId: string, playerName: string) => {
    if (!window.confirm(`¿Estás seguro de quitar a ${playerName.toUpperCase()} de la lista de listos?`)) {
      return;
    }
    
    // Optimistic local state update
    const prevAvailablePlayers = { ...availablePlayers };
    const nextAvailable = { ...availablePlayers };
    Object.keys(nextAvailable).forEach(tier => {
      nextAvailable[tier] = nextAvailable[tier].filter(p => p.discordId !== discordId);
    });
    setAvailablePlayers(nextAvailable);

    try {
      const res = await apiFetch('/api/lobby/mixton-remove-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al remover al jugador de la lista.');
      
      showToast(`${playerName} ha sido removido de la lista.`, 'success');
      await fetchState();
    } catch (err: any) {
      setAvailablePlayers(prevAvailablePlayers);
      showToast(err.message, 'error');
    }
  };

  // Admin Action: Clear team (empty captain and players)
  const handleClearTeam = async (teamId: string, teamName: string) => {
    if (!window.confirm(`¿Estás seguro de vaciar el ${teamName.toUpperCase()}? Se removerá al capitán y todos sus integrantes.`)) {
      return;
    }

    // Optimistic local state update
    const prevLobbyState = { ...lobbyState };
    const newTeams = lobbyState.teams.map(t => {
      if (t.id === teamId) {
        return { ...t, captain: null, players: [] };
      }
      return t;
    });
    setLobbyState(prev => ({ ...prev, teams: newTeams }));

    try {
      const res = await apiFetch('/api/lobby/mixton-clear-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al vaciar el equipo.');
      
      showToast(`${teamName} vaciado correctamente.`, 'success');
      await fetchState();
    } catch (err: any) {
      setLobbyState(prevLobbyState);
      showToast(err.message, 'error');
    }
  };

  // Admin Action: Toggle Discord command activation
  const handleToggleMixtonCommand = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    try {
      const res = await apiFetch('/api/lobby/mixton-toggle-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar estado del comando.');
      
      showToast(`Comando de Discord /mixton_listo ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}`, 'success');
      setCommandEnabled(enabled);
    } catch (err: any) {
      e.target.checked = !enabled;
      showToast(err.message, 'error');
    }
  };

  // Admin Action: Launch Match between two selected teams
  const handleLaunchMatch = async () => {
    if (!matchTeamA || !matchTeamB) return;
    
    setIsLaunchingMatch(true);
    try {
      const res = await apiFetch('/api/lobby/mixton-create-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamIdA: matchTeamA, teamIdB: matchTeamB })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al lanzar el encuentro.');

      showToast('¡Encuentro creado con éxito en Discord!', 'success');
      setMatchTeamA('');
      setMatchTeamB('');
      await fetchState();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsLaunchingMatch(false);
    }
  };

  // Admin Action: Change selected guild
  const handleGuildChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const guildId = e.target.value;
    setCurrentGuildId(guildId);
    
    const url = new URL(window.location.href);
    url.searchParams.set('guild', guildId);
    window.history.pushState({}, '', url);
    
    fetchState(guildId);
    fetchHistory(guildId);
  };

  // Average ELO calculation for teams
  const getAverageElo = (team: Team) => {
    let total = team.captain?.faceit_elo || 1000;
    team.players?.forEach(p => total += p.faceit_elo || 1000);
    const count = (team.captain ? 1 : 0) + (team.players?.length || 0);
    return count > 0 ? Math.round(total / count) : 0;
  };

  // Average ELO for Matchmaking list (includes all 5 players)
  const getAvgEloMatch = (team: Team) => {
    let total = team.captain?.faceit_elo || 1000;
    team.players?.forEach(p => total += p.faceit_elo || 1000);
    return Math.round(total / 5);
  };

  // Render Draft Status Banner text & classes
  const getDraftStatusInfo = () => {
    if (lobbyState.draftFinished) {
      return {
        className: 'border-2 border-white bg-[#151515] text-white px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider',
        text: '🏁 DRAFT FINALIZADO. ESPERANDO INICIO EN DISCORD.'
      };
    }

    if (lobbyState.draftStarted) {
      const currentTeamId = lobbyState.pickOrder[lobbyState.currentPickIndex];
      const currentTeam = lobbyState.teams.find(t => t.id === currentTeamId);
      
      if (currentTeam) {
        const captainName = currentTeam.captain ? currentTeam.captain.faceit_nickname : 'DESCONOCIDO';
        const isMyTurn = currentTeam.captain && currentUser && currentTeam.captain.discordId === currentUser.userId;
        
        if (isMyTurn) {
          return {
            className: 'border-2 border-[#FF5500] bg-[#FF5500]/10 text-[#FF5500] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider animate-pulse shadow-[0_0_15px_rgba(255,85,0,0.15)]',
            text: `🌟 ¡ES TU TURNO! ELIGE JUGADOR PARA ${currentTeam.name.toUpperCase()}`
          };
        } else {
          return {
            className: 'border-2 border-neutral-700 bg-neutral-900/50 text-neutral-400 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider',
            text: `⏳ SELECCIÓN EN CURSO: TURNO DE ${currentTeam.name.toUpperCase()} (CAP: ${captainName.toUpperCase()})`
          };
        }
      }
    }

    return {
      className: 'border-2 border-[#FF5500] bg-[#FF5500]/5 text-[#FF5500] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider',
      text: '⚙️ FASE DE PREPARACIÓN. CONFIGURANDO EQUIPOS.'
    };
  };

  const statusInfo = getDraftStatusInfo();

  // Filter ready players by search query and tier
  const getFilteredPlayers = () => {
    const filterTierGroup = (tier: string) => {
      const list = availablePlayers[tier] || [];
      return list.filter(p => {
        const dName = (p.discordUser?.displayName || '').toLowerCase();
        const fNick = (p.faceit_nickname || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        return dName.includes(query) || fNick.includes(query);
      });
    };

    if (selectedTier === 'ALL') {
      const result: { [key: string]: Player[] } = {};
      let totalLength = 0;
      ['S', 'A', 'B', 'C'].forEach(tier => {
        const filtered = filterTierGroup(tier);
        result[tier] = filtered;
        totalLength += filtered.length;
      });
      return { grouped: result, total: totalLength };
    } else {
      const filtered = filterTierGroup(selectedTier);
      return { grouped: { [selectedTier]: filtered }, total: filtered.length };
    }
  };

  const { grouped: filteredGroupedPlayers, total: totalReadyCountVal } = getFilteredPlayers();

  // Check if current user is captain and it's their turn
  const checkIsMyTurn = () => {
    if (!lobbyState.draftStarted || lobbyState.draftFinished) return false;
    const currentTeamId = lobbyState.pickOrder[lobbyState.currentPickIndex];
    const currentTeam = lobbyState.teams.find(t => t.id === currentTeamId);
    return !!(currentTeam?.captain && currentUser && currentTeam.captain.discordId === currentUser.userId);
  };

  const isMyTurn = checkIsMyTurn();
  const canInteract = lobbyState.draftStarted && !lobbyState.draftFinished && (isMyTurn || currentUser?.isAdmin);

  // Teams with captains for the pick order list editor
  const teamsWithCaptains = lobbyState.teams.filter(t => t.captain !== null);
  const hasCaptainsForAll = lobbyState.teams.length >= 2 && lobbyState.teams.every(t => t.captain !== null);
  
  // Teams that are complete (captain + 4 players) to display in the match selectors
  const completedTeams = lobbyState.teams.filter(t => t.captain !== null && (t.players?.length || 0) === 4);

  // Ready players list for Captain assignment (only Tier S and A are allowed to be captains)
  const getCaptainEligiblePlayers = () => {
    const list: Player[] = [];
    if (availablePlayers.S) list.push(...availablePlayers.S);
    if (availablePlayers.A) list.push(...availablePlayers.A);
    return list;
  };

  const captainEligiblePlayers = getCaptainEligiblePlayers();

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        
        <div className="w-full max-w-sm p-10 bg-[#111] rounded-none border-4 border-[#1A1A1A] shadow-2xl text-center relative z-10">
          <div className="w-12 h-12 bg-white text-black mx-auto flex items-center justify-center shadow-lg mb-6 rotate-3">
            <Gamepad2 className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-black italic tracking-tighter uppercase text-white mb-2">AUTENTICANDO</h2>
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono font-bold">Comprobando sesión con Discord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans flex flex-col relative overflow-hidden">
      {/* Subtle tech grid background to match admin web */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Header (Admin Panel Bar style) */}
      <header className="border-b-4 border-[#1A1A1A] bg-[#111] px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white text-black flex items-center justify-center font-bold rotate-3 shadow-md">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-white">
              MIXTÓN <span className="text-[#FF5500]">{guildName.toUpperCase()}</span>
            </h1>
            <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono font-bold">MATCHMAKING DRAFT ARENA // LOBBY LIVE</p>
          </div>
        </div>
        
        {/* Status Banner */}
        <div className="flex-1 max-w-lg md:mx-6">
          <div className={statusInfo.className}>
            <span 
              className="text-[10px] font-mono tracking-wide"
              dangerouslySetInnerHTML={{ __html: statusInfo.text }} 
            />
          </div>
        </div>

        {/* Guild Selector for Admins */}
        {currentUser?.isAdmin && guilds.length > 0 && (
          <div className="flex items-center gap-2">
            <select 
              id="guild-select" 
              className="bg-[#1A1A1A] border-2 border-[#2D2D2D] rounded-none px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-white cursor-pointer"
              value={currentGuildId}
              onChange={handleGuildChange}
            >
              {guilds.map(g => (
                <option key={g.id} value={g.id}>{g.name.toUpperCase()}</option>
              ))}
            </select>
          </div>
        )}

        {currentUser && (
          <div className="flex items-center gap-4 border-l border-[#2D2D2D] pl-4">
            <div className="flex items-center gap-3">
              <img 
                className="w-8 h-8 rounded-none border-2 border-[#2D2D2D]"
                src={currentUser.avatar ? `https://cdn.discordapp.com/avatars/${currentUser.userId}/${currentUser.avatar}.png?size=64` : 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                alt="Avatar" 
              />
              <div className="text-right">
                <p className="text-xs font-bold leading-none font-mono text-white">{currentUser.username}</p>
                <span className={`inline-block mt-0.5 border text-[8px] px-1 font-mono uppercase tracking-wider font-bold ${
                  currentUser.isAdmin ? 'border-white text-white bg-white/5' : 'border-neutral-600 text-neutral-400'
                }`}>
                  {currentUser.isAdmin ? 'ADMINISTRADOR' : 'MIEMBRO'}
                </span>
              </div>
            </div>
            <a 
              href="/auth/logout" 
              className="p-1.5 bg-[#1C1C1C] border border-[#2D2D2D] text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Salir"
            >
              <LogOut className="w-4 h-4" />
            </a>
          </div>
        )}
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 relative z-10 overflow-hidden max-h-[calc(100vh-80px)]">
        
        {/* Left Panel: Available Players */}
        <section className="lg:col-span-1 p-5 bg-[#111] border-4 border-[#1A1A1A] shadow-[8px_8px_0px_rgba(0,0,0,0.5)] flex flex-col max-h-[calc(100vh-140px)] rounded-none">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black italic tracking-tighter uppercase text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-neutral-400" /> DISPONIBLES
              </h2>
              <span className="text-[10px] font-mono bg-[#1A1A1A] border border-[#2D2D2D] px-2 py-0.5 text-neutral-400 font-bold uppercase">
                {totalReadyCountVal} LISTO
              </span>
            </div>
            <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mt-0.5">Usa /mixton_listo en Discord para unirte</p>
          </div>
          
          {/* Tier Filter Tabs */}
          <div className="grid grid-cols-5 gap-1 mb-3">
            {['ALL', 'S', 'A', 'B', 'C'].map(tier => (
              <button 
                key={tier}
                className={`py-1 text-[9px] font-mono font-bold uppercase tracking-tighter border transition-colors ${
                  selectedTier === tier 
                    ? 'bg-white text-black border-white' 
                    : 'bg-transparent text-neutral-400 border-[#2D2D2D] hover:border-neutral-500 hover:text-white'
                }`}
                onClick={() => setSelectedTier(tier)}
              >
                {tier === 'ALL' ? 'TODOS' : `T_${tier}`}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative mb-4">
            <input 
              type="text" 
              className="w-full bg-[#1A1A1A] border-2 border-[#2D2D2D] text-xs font-mono text-white placeholder-neutral-600 px-3 py-2 pl-8 focus:outline-none focus:border-white rounded-none"
              placeholder="BUSCAR JUGADOR..." 
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
          </div>

          {/* Players List Scrollable Area */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 font-mono">
            {Object.keys(filteredGroupedPlayers).some(tier => filteredGroupedPlayers[tier].length > 0) ? (
              Object.keys(filteredGroupedPlayers).map(tier => {
                const players = filteredGroupedPlayers[tier];
                if (players.length === 0) return null;

                return (
                  <div key={tier} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 border ${
                        tier === 'S' ? 'border-red-500 text-red-400 bg-red-950/10' :
                        tier === 'A' ? 'border-[#FF5500] text-[#FF5500] bg-orange-950/10' :
                        tier === 'B' ? 'border-blue-500 text-blue-400 bg-blue-950/10' :
                        'border-neutral-500 text-neutral-400 bg-neutral-900/50'
                      }`}>
                        TIER {tier}
                      </span>
                      <div className="flex-1 h-[1px] bg-[#1A1A1A]" />
                    </div>

                    <div className="space-y-1">
                      {players.map(player => {
                        const isPendingThis = pendingPick && pendingPick.discordId === player.discordId;
                        const avatarURL = player.discordUser?.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';

                        return (
                          <div 
                            key={player.discordId}
                            className={`p-2 bg-[#151515] border border-[#222] flex items-center justify-between gap-2 transition-all ${
                              isPendingThis ? 'border-[#FF5500] bg-[#FF5500]/5' : 'hover:border-neutral-600'
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <img className="w-6 h-6 rounded-none border border-[#2D2D2D] object-cover" src={avatarURL} alt="Avatar" />
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold text-white leading-none truncate">
                                  {player.discordUser?.displayName || player.faceit_nickname}
                                </p>
                                <span className="text-[8px] text-neutral-500 block leading-none mt-0.5">{player.faceit_nickname}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 border ${
                                player.faceit_level === 10 ? 'border-red-500 text-red-500 bg-red-950/10' :
                                player.faceit_level >= 8 ? 'border-orange-500 text-orange-500 bg-orange-950/10' :
                                player.faceit_level >= 5 ? 'border-blue-500 text-blue-500 bg-blue-950/10' :
                                'border-neutral-500 text-neutral-400 bg-neutral-900/50'
                              }`}>
                                L_{player.faceit_level}
                              </span>

                              {currentUser?.isAdmin && (
                                <div className="flex gap-1">
                                  {/* Admin override select */}
                                  <select 
                                    className="bg-[#222] border border-[#333] text-[9px] font-mono text-neutral-400 px-1 py-0.5 focus:outline-none focus:text-white focus:border-white rounded-none cursor-pointer"
                                    value={player.mixton_tier_override || ''}
                                    onChange={(e) => handleOverridePlayerTier(player.discordId, e.target.value)}
                                  >
                                    <option value="">AUTO</option>
                                    <option value="S">S</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                  </select>

                                  {/* Directly assign to team */}
                                  <select 
                                    className="bg-[#222] border border-[#333] text-[9px] font-mono text-neutral-400 px-1 py-0.5 focus:outline-none focus:text-white focus:border-white rounded-none cursor-pointer"
                                    value=""
                                    onChange={(e) => handleAssignPlayerToTeam(player.discordId, e.target.value)}
                                  >
                                    <option value="">ASIG...</option>
                                    {lobbyState.teams.map(t => (
                                      <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>
                                    ))}
                                  </select>

                                  {/* Remove player from queue */}
                                  <button
                                    className="p-1 bg-red-950/40 border border-red-900/60 hover:bg-red-900 hover:text-white text-red-400 transition-colors rounded-none cursor-pointer"
                                    onClick={() => handleRemovePlayerFromQueue(player.discordId, player.discordUser?.displayName || player.faceit_nickname)}
                                    title="Quitar de la Cola"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}

                              {/* Pick actions */}
                              {canInteract && (
                                isPendingThis ? (
                                  <div className="flex gap-1">
                                    <button 
                                      className="bg-white text-black border border-white font-mono text-[9px] font-black px-2 py-0.5 hover:bg-neutral-200 transition-colors"
                                      onClick={handleConfirmPendingPlayer}
                                    >
                                      OK
                                    </button>
                                    <button 
                                      className="bg-red-950 border border-red-500 text-red-400 font-mono text-[9px] font-black px-1.5 py-0.5 hover:bg-red-900 transition-colors"
                                      onClick={handleCancelPendingPlayer}
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    className="bg-transparent hover:bg-white hover:text-black border border-white text-white font-mono text-[9px] font-black tracking-wider px-2 py-0.5 transition-all"
                                    onClick={() => handleSelectPendingPlayer(player)}
                                  >
                                    PICK
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 border border-dashed border-[#222]">
                <p className="text-xs text-neutral-500 font-mono uppercase">SIN JUGADORES DISPONIBLES</p>
              </div>
            )}
          </div>
        </section>

        {/* Center & Right Panel */}
        <section className="lg:col-span-3 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-140px)] pr-2">
          
          {/* Admin Dashboard Section */}
          {currentUser?.isAdmin && (
            <div className="p-5 bg-[#111] border-4 border-[#1A1A1A] shadow-[8px_8px_0px_rgba(0,0,0,0.5)] rounded-none flex flex-col gap-4 relative">
              <div className="border-b border-[#2D2D2D] pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black italic tracking-tighter uppercase text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#FF5500]" /> PANEL DE CONTROL DE ADMINISTRACIÓN
                  </h3>
                  <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mt-0.5">
                    Gestión directa de equipos, cola de jugadores, órdenes de elección y despliegues
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
                {/* 1. Setup Teams Count */}
                <div className="p-3 bg-[#161616] border border-[#222] flex flex-col justify-between gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">CANTIDAD DE EQUIPOS</label>
                    <select 
                      className="w-full bg-[#222] border border-[#333] text-xs font-mono text-white px-2 py-1 focus:outline-none focus:border-white rounded-none cursor-pointer"
                      value={numTeamsSelect}
                      disabled={lobbyState.draftStarted || lobbyState.draftFinished}
                      onChange={(e) => setNumTeamsSelect(parseInt(e.target.value))}
                    >
                      <option value="2">2 EQUIPOS (10 JUGADORES)</option>
                      <option value="3">3 EQUIPOS (15 JUGADORES)</option>
                      <option value="4">4 EQUIPOS (20 JUGADORES)</option>
                      <option value="5">5 EQUIPOS (25 JUGADORES)</option>
                      <option value="6">6 EQUIPOS (30 JUGADORES)</option>
                    </select>
                  </div>
                  <button 
                    className="w-full bg-white text-black font-bold uppercase py-1 border border-white hover:bg-neutral-200 transition-colors disabled:opacity-30 disabled:hover:bg-white"
                    onClick={handleSetupTeams}
                    disabled={lobbyState.draftStarted || lobbyState.draftFinished}
                  >
                    CONFIGURAR EQUIPOS
                  </button>
                </div>

                {/* 2. Reorder Capitanes / Pick Order */}
                <div className="p-3 bg-[#161616] border border-[#222] flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase text-neutral-400 block">ORDEN DE ELECCIÓN</label>
                  <div className="border border-[#222] bg-[#111] max-h-24 overflow-y-auto p-1.5 space-y-1">
                    {!lobbyState.draftStarted && !lobbyState.draftFinished && teamsWithCaptains.length > 0 ? (
                      localPickOrder.map((teamId, index) => {
                        const team = lobbyState.teams.find(t => t.id === teamId);
                        if (!team) return null;
                        return (
                          <div key={teamId} className="flex items-center justify-between text-[9px] bg-[#181818] p-1 border border-[#222]">
                            <span className="font-bold text-white">{index + 1}. {team.name.toUpperCase()}</span>
                            <div className="flex gap-1">
                              <button 
                                className="p-0.5 bg-[#252525] border border-[#333] hover:border-white text-neutral-400 hover:text-white disabled:opacity-20"
                                onClick={() => handleMoveOrder(index, -1)} 
                                disabled={index === 0}
                              >
                                <ArrowUp className="w-2.5 h-2.5" />
                              </button>
                              <button 
                                className="p-0.5 bg-[#252525] border border-[#333] hover:border-white text-neutral-400 hover:text-white disabled:opacity-20"
                                onClick={() => handleMoveOrder(index, 1)} 
                                disabled={index === localPickOrder.length - 1}
                              >
                                <ArrowDown className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      (lobbyState.draftStarted || lobbyState.draftFinished) ? (
                        lobbyState.pickOrder.map((teamId, index) => {
                          const team = lobbyState.teams.find(t => t.id === teamId);
                          if (!team) return null;
                          const isCurrent = lobbyState.draftStarted && lobbyState.currentPickIndex === index;
                          return (
                            <div key={teamId} className={`flex items-center justify-between text-[9px] p-1 border ${
                              isCurrent ? 'border-[#FF5500] bg-[#FF5500]/5 text-[#FF5500]' : 'border-[#222] bg-[#151515] text-neutral-400'
                            }`}>
                              <span>{index + 1}. {team.name.toUpperCase()} ({team.captain ? team.captain.faceit_nickname.toUpperCase() : 'SIN CAP'})</span>
                              {isCurrent && <span className="font-bold animate-pulse text-[8px] bg-[#FF5500] text-black px-1">TURNO</span>}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[9px] text-neutral-600 text-center py-2">ASIGNA CAPITANES PRIMERO</p>
                      )
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      className="bg-transparent border border-neutral-600 hover:border-white text-white font-bold uppercase py-0.5 text-[10px] transition-colors disabled:opacity-30"
                      onClick={handleSavePickOrder}
                      disabled={lobbyState.draftStarted || lobbyState.draftFinished || !isSavingOrder || teamsWithCaptains.length === 0}
                    >
                      GUARDAR ORDEN
                    </button>
                    <button 
                      className="bg-transparent border border-neutral-600 hover:border-white text-white font-bold uppercase py-0.5 text-[10px] transition-colors disabled:opacity-30"
                      onClick={handleRandomizeOrder}
                      disabled={lobbyState.draftStarted || lobbyState.draftFinished || teamsWithCaptains.length === 0}
                    >
                      MEZCLAR
                    </button>
                  </div>
                </div>

                {/* 3. Actions (Start, Reset, Command Toggle) */}
                <div className="p-3 bg-[#161616] border border-[#222] flex flex-col justify-between gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      className="bg-white text-black font-bold uppercase text-[10px] py-1 border border-white hover:bg-neutral-200 transition-colors disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center gap-1.5"
                      onClick={handleStartDraft}
                      disabled={lobbyState.draftStarted || lobbyState.draftFinished || !hasCaptainsForAll}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      {lobbyState.draftStarted ? 'EN CURSO' : 'INICIAR DRAFT'}
                    </button>
                    <button 
                      className="bg-red-950 border border-[#FF3E3E] text-[#FF3E3E] font-bold uppercase text-[10px] py-1 hover:bg-red-900 transition-colors flex items-center justify-center gap-1.5"
                      onClick={handleResetLobby}
                    >
                      <RotateCcw className="w-3 h-3" />
                      REINICIAR
                    </button>
                  </div>
                  
                  <button 
                    className="w-full bg-transparent border border-yellow-600 hover:border-yellow-500 text-yellow-500 font-bold uppercase text-[10px] py-0.5 transition-colors"
                    onClick={handleResetPlayers}
                  >
                    VACIAR COLA (TODOS NO LISTO)
                  </button>

                  <div className="flex items-center justify-between border-t border-[#222] pt-2 mt-1">
                    <span className="text-[10px] font-bold text-neutral-400">COMANDO /mixton_listo</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={commandEnabled}
                        onChange={handleToggleMixtonCommand}
                      />
                      <div className="w-8 h-4 bg-[#2D2D2D] peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-neutral-400 after:border after:h-3 after:w-3.5 after:transition-all peer-checked:bg-[#FF5500] peer-checked:after:bg-white peer-checked:after:border-white" />
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Launch Match Sub-panel */}
              <div className="border-t border-[#2D2D2D] pt-4 mt-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4 font-mono text-xs">
                    <span className="text-[10px] font-black uppercase text-neutral-400 flex-shrink-0 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-neutral-400 animate-pulse" /> CREAR PARTIDA DISCORD
                    </span>
                    <div className="flex items-center gap-2 w-full max-w-lg">
                      <select 
                        className="flex-1 bg-[#1A1A1A] border border-[#2D2D2D] text-xs font-mono text-white px-2 py-1.5 focus:outline-none focus:border-white rounded-none cursor-pointer"
                        value={matchTeamA}
                        onChange={(e) => setMatchTeamA(e.target.value)}
                      >
                        <option value="">-- ELIGE EQUIPO A --</option>
                        {completedTeams.map(t => (
                          <option key={t.id} value={t.id}>{t.name.toUpperCase()} ({getAvgEloMatch(t)} ELO)</option>
                        ))}
                      </select>
                      <span className="text-neutral-500 font-bold uppercase text-[9px]">VS</span>
                      <select 
                        className="flex-1 bg-[#1A1A1A] border border-[#2D2D2D] text-xs font-mono text-white px-2 py-1.5 focus:outline-none focus:border-white rounded-none cursor-pointer"
                        value={matchTeamB}
                        onChange={(e) => setMatchTeamB(e.target.value)}
                      >
                        <option value="">-- ELIGE EQUIPO B --</option>
                        {completedTeams.map(t => (
                          <option key={t.id} value={t.id}>{t.name.toUpperCase()} ({getAvgEloMatch(t)} ELO)</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button 
                    className="bg-[#FF5500] hover:bg-[#FF7733] border border-[#FF5500] hover:border-[#FF7733] text-white font-bold uppercase text-[10px] py-1.5 px-6 rounded-none transition-all disabled:opacity-30"
                    disabled={!matchTeamA || !matchTeamB || matchTeamA === matchTeamB || isLaunchingMatch}
                    onClick={handleLaunchMatch}
                  >
                    {isLaunchingMatch ? 'ENVIANDO A DISCORD...' : 'LANZAR ENCUENTRO'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Teams Grid Title */}
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-black italic tracking-tighter uppercase text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-neutral-400" /> EQUIPOS PARTICIPANTES
            </h2>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
              Fase de Draft interactiva live
            </span>
          </div>

          {/* Teams Grid and History Sidebar (Admin Panel style) */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pb-6 items-start">
            {/* Teams Grid */}
            <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {lobbyState.teams.map((team, tIdx) => {
                const isCurrentTurn = lobbyState.draftStarted && !lobbyState.draftFinished && 
                                      lobbyState.pickOrder[lobbyState.currentPickIndex] === team.id;
                const avgElo = getAverageElo(team);

                // Render Captain Slot
                let captainElement;
                if (team.captain) {
                  const capAvatar = team.captain.discordUser?.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';
                  captainElement = (
                    <div className="p-3 bg-[#1A1A1A] border-2 border-white flex items-center justify-between gap-3 relative overflow-hidden">
                      {/* Retro top corner badge */}
                      <div className="absolute right-0 top-0 bg-white text-black text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wider font-mono">
                        CAPITÁN
                      </div>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img className="w-8 h-8 rounded-none border border-[#2D2D2D] object-cover" src={capAvatar} alt="Avatar" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white leading-none truncate">
                            {team.captain.discordUser?.displayName || team.captain.faceit_nickname}
                          </p>
                          <span className="text-[9px] text-neutral-500 block leading-none mt-1">{team.captain.faceit_nickname}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-extrabold text-[#FF5500] font-mono">
                          L_{team.captain.faceit_level}
                        </span>
                        {currentUser?.isAdmin && (
                          <button 
                            className="p-1 bg-red-950 border border-red-500 hover:bg-red-900 text-red-400 hover:text-white transition-colors"
                            onClick={() => handleRemoveCaptain(team.id)}
                            title="Remover Capitán"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  captainElement = (
                    <div className="p-3 bg-[#121212] border-2 border-dashed border-[#222] flex items-center justify-between gap-3">
                      <span className="text-[10px] text-neutral-600 font-mono font-black uppercase tracking-wider">
                        SIN CAPITÁN ASIGNADO
                      </span>
                      {currentUser?.isAdmin && (
                        <button 
                          className="bg-white hover:bg-neutral-200 text-black font-mono text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 transition-colors cursor-pointer"
                          onClick={() => handleOpenCaptainModal(team.id, team.name)}
                        >
                          + ASIGNAR
                        </button>
                      )}
                    </div>
                  );
                }

                // Render Players Slots (4 slots)
                const playerSlots = [];
                let pendingRendered = false;
                const isThisTeamTurn = isCurrentTurn;

                for (let i = 0; i < 4; i++) {
                  const player = team.players ? team.players[i] : null;
                  if (player) {
                    const avatar = player.discordUser?.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';
                    playerSlots.push(
                      <div key={player.discordId} className="p-2 bg-[#1A1A1A] border border-[#2D2D2D] flex items-center justify-between gap-3 text-xs relative overflow-hidden">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <img className="w-6 h-6 rounded-none border border-[#2D2D2D] object-cover" src={avatar} alt="Avatar" />
                          <div className="min-w-0">
                            <span className="text-[10px] text-neutral-300 font-mono truncate block leading-none">{player.discordUser?.displayName || player.faceit_nickname}</span>
                            <span className="text-[8px] text-neutral-600 font-mono truncate mt-0.5 block leading-none">{player.faceit_nickname}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[9px] font-mono text-neutral-400 font-bold">L_{player.faceit_level}</span>
                          {currentUser?.isAdmin && (
                            <button 
                              className="p-0.5 bg-neutral-900 border border-neutral-700 hover:border-red-500 text-neutral-500 hover:text-red-400 transition-colors"
                              onClick={() => handleRemovePlayerFromTeam(team.id, player.discordId)}
                              title="Remover Jugador"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  } else if (isThisTeamTurn && pendingPick && !pendingRendered) {
                    const playerAvatar = pendingPick.discordUser?.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';
                    playerSlots.push(
                      <div key="pending-slot" className="p-2 bg-[#FF5500]/5 border-2 border-dashed border-[#FF5500]/40 flex items-center justify-between gap-3 text-xs animate-pulse">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <img className="w-6 h-6 rounded-none border border-[#FF5500]/20 object-cover opacity-60" src={playerAvatar} alt="Avatar" />
                          <span className="text-[10px] text-[#FF5500] font-mono truncate">{pendingPick.discordUser?.displayName || pendingPick.faceit_nickname}</span>
                        </div>
                        <span className="text-[8px] font-mono font-black bg-[#FF5500] text-black px-1.5 uppercase">PENDIENTE</span>
                      </div>
                    );
                    pendingRendered = true;
                  } else {
                    // Render empty slot
                    let emptySlotContent = <span className="text-[9px] text-neutral-600 font-mono font-bold uppercase">RANURA VACÍA</span>;
                    if (currentUser?.isAdmin) {
                      const assignablePlayers: Player[] = [];
                      ['S', 'A', 'B', 'C'].forEach(tier => {
                        (availablePlayers[tier] || []).forEach(p => {
                          if (pendingPick && pendingPick.discordId === p.discordId) return;
                          assignablePlayers.push(p);
                        });
                      });

                      emptySlotContent = (
                        <select 
                          className="w-full bg-[#181818] border border-dashed border-[#333] hover:border-white text-[9px] font-mono text-neutral-500 hover:text-white px-2 py-1.5 focus:outline-none focus:border-white rounded-none cursor-pointer text-center"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignPlayerToTeam(e.target.value, team.id);
                            }
                          }}
                        >
                          <option value="">+ ASIGNAR JUGADOR...</option>
                          {assignablePlayers.map(p => (
                            <option key={p.discordId} value={p.discordId}>
                              {(p.discordUser?.displayName || p.faceit_nickname).toUpperCase()} ({p.faceit_level})
                            </option>
                          ))}
                        </select>
                      );
                    }
                    
                    playerSlots.push(
                      <div key={`empty-${i}`} className="p-2 bg-[#121212] border border-[#1A1A1A] flex items-center justify-center">
                        {emptySlotContent}
                      </div>
                    );
                  }
                }

                // Color indicators on card borders depending on the team index
                const borderStyles = [
                  'border-neutral-800', // Default
                  'border-[#FF5500]/60', // Orange theme
                  'border-blue-600/60', // Blue theme
                  'border-green-600/60', // Green theme
                ];
                const borderStyle = isCurrentTurn 
                  ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.15)] bg-[#131313]' 
                  : `${borderStyles[(tIdx + 1) % borderStyles.length]} bg-[#111]`;

                return (
                  <div key={team.id} className={`p-5 border-4 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] rounded-none relative flex flex-col gap-3 transition-all ${borderStyle}`}>
                    <div className="flex justify-between items-center border-b border-[#222] pb-2 font-mono">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black italic tracking-tighter uppercase text-white">{team.name}</h4>
                        {currentUser?.isAdmin && (team.captain || (team.players && team.players.length > 0)) && (
                          <button
                            className="px-1.5 py-0.5 bg-red-950 border border-red-500 hover:bg-red-900 hover:border-red-400 text-red-400 hover:text-white text-[8px] font-black uppercase transition-colors cursor-pointer rounded-none"
                            onClick={() => handleClearTeam(team.id, team.name)}
                            title="Vaciar Equipo"
                          >
                            Vaciar
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400 font-extrabold uppercase bg-[#1C1C1C] border border-[#2D2D2D] px-2 py-0.5">
                        AVG ELO: {avgElo}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      {captainElement}
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold text-neutral-500 font-mono uppercase tracking-wider">
                          MIEMBROS ({team.players ? team.players.length : 0}/4)
                        </span>
                        <div className="flex-1 h-[1px] bg-[#1A1A1A]" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {playerSlots}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Match History Sidebar */}
            <div className="xl:col-span-1 bg-[#111] border-4 border-[#1A1A1A] p-5 shadow-[8px_8px_0px_rgba(0,0,0,0.5)] rounded-none flex flex-col gap-4 max-h-[650px] overflow-y-auto font-mono">
              <div>
                <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5 border-b border-[#222] pb-2">
                  🏆 HISTORIAL MIXTON RECIENTE
                </h3>
              </div>
              <div className="space-y-3">
                {matchHistory.length === 0 ? (
                  <p className="text-[10px] text-neutral-600 text-center py-8 border border-dashed border-[#222]">
                    SIN ENCUENTROS REGISTRADOS
                  </p>
                ) : (
                  matchHistory.map((m: any) => {
                    const isWinner1 = m.winner === 'faction1';
                    const isWinner2 = m.winner === 'faction2';

                    return (
                      <div key={m.id} className="p-3 bg-[#151515] border border-[#222] text-[10px] flex flex-col gap-2 relative">
                        <div className="flex justify-between items-center text-[9px] text-neutral-500 border-b border-[#222]/30 pb-1.5">
                          <span>{m.entity_custom_name || 'Lobby'}</span>
                          <span>{m.map || 'Manual'}</span>
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                          {/* Faction 1 */}
                          <div className="flex justify-between items-center">
                            <span className={`font-bold truncate max-w-[125px] ${isWinner1 ? 'text-green-400' : 'text-neutral-400'}`}>
                              {isWinner1 && '🏆 '}{m.faction1_name}
                            </span>
                            <span className="font-extrabold text-neutral-500">({m.faction1_score})</span>
                          </div>
                          
                          {/* Faction 2 */}
                          <div className="flex justify-between items-center">
                            <span className={`font-bold truncate max-w-[125px] ${isWinner2 ? 'text-green-400' : 'text-neutral-400'}`}>
                              {isWinner2 && '🏆 '}{m.faction2_name}
                            </span>
                            <span className="font-extrabold text-neutral-500">({m.faction2_score})</span>
                          </div>
                        </div>

                        {/* Admin quick load action */}
                        {currentUser?.isAdmin && (
                          <div className="border-t border-[#222]/30 pt-2 mt-1.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[8px] text-neutral-400 font-bold uppercase truncate max-w-[110px]">
                                {isWinner1 && '🏆 '}{m.faction1_name}
                              </span>
                              <button
                                className="bg-[#1C1C1C] hover:bg-white hover:text-black border border-[#2D2D2D] hover:border-white px-2 py-0.5 text-[8px] font-black uppercase transition-all cursor-pointer text-center"
                                onClick={() => handleAssignHistoryTeamPrompt(m.faction1_roster, m.faction1_name)}
                              >
                                Asignar
                              </button>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[8px] text-neutral-400 font-bold uppercase truncate max-w-[110px]">
                                {isWinner2 && '🏆 '}{m.faction2_name}
                              </span>
                              <button
                                className="bg-[#1C1C1C] hover:bg-white hover:text-black border border-[#2D2D2D] hover:border-white px-2 py-0.5 text-[8px] font-black uppercase transition-all cursor-pointer text-center"
                                onClick={() => handleAssignHistoryTeamPrompt(m.faction2_roster, m.faction2_name)}
                              >
                                Asignar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </section>
      </main>

      {/* Captain Selection Modal (Retro flat design) */}
      {modalTargetTeamId && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => setModalTargetTeamId(null)}
        >
          <div 
            className="w-full max-w-md p-6 bg-[#111] border-4 border-[#1A1A1A] shadow-[16px_16px_0px_rgba(0,0,0,0.8)] rounded-none flex flex-col gap-4 relative z-50 font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[#2D2D2D] pb-3 flex justify-between items-center">
              <h4 className="text-sm font-black uppercase text-white">ASIGNAR CAPITÁN</h4>
              <button 
                className="text-neutral-500 hover:text-white font-mono text-xl focus:outline-none"
                onClick={() => setModalTargetTeamId(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 uppercase tracking-wide leading-tight">
              ASIGNA UN CAPITÁN PARA EL <strong className="text-[#FF5500]">{modalTeamName.toUpperCase()}</strong> DE LA LISTA DE JUGADORES LISTOS (SOLO TIER S / A).
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {captainEligiblePlayers.length === 0 ? (
                <p className="text-[10px] text-neutral-600 text-center py-6 border border-dashed border-[#222]">
                  NO HAY JUGADORES DISPONIBLES DE TIER S O A EN LA COLA.
                </p>
              ) : (
                captainEligiblePlayers.map(p => (
                  <button 
                    key={p.discordId}
                    className="w-full text-left p-2.5 bg-[#151515] border border-[#222] hover:border-white flex justify-between items-center transition-all rounded-none group cursor-pointer"
                    onClick={() => handleSelectCaptainForTeam(p.discordId)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img className="w-6 h-6 rounded-none border border-[#2D2D2D]" src={p.discordUser?.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png'} alt="Avatar" />
                      <span className="text-[10px] font-bold text-white group-hover:text-white truncate">
                        {p.discordUser?.displayName || p.faceit_nickname}
                      </span>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 border ${
                      p.faceit_level === 10 ? 'border-red-500 text-red-500 bg-red-950/10' : 'border-neutral-500 text-neutral-400 bg-neutral-900/50'
                    }`}>
                      LVL {p.faceit_level}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Team Assignment Modal (Retro flat design) */}
      {modalHistoryRoster && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => setModalHistoryRoster(null)}
        >
          <div 
            className="w-full max-w-md p-6 bg-[#111] border-4 border-[#1A1A1A] shadow-[16px_16px_0px_rgba(0,0,0,0.8)] rounded-none flex flex-col gap-4 relative z-50 font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[#2D2D2D] pb-3 flex justify-between items-center">
              <h4 className="text-sm font-black uppercase text-white">ASIGNAR EQUIPO</h4>
              <button 
                className="text-neutral-500 hover:text-white font-mono text-xl focus:outline-none"
                onClick={() => setModalHistoryRoster(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 uppercase tracking-wide leading-tight">
              SELECCIONA EL EQUIPO DEL LOBBY AL QUE DESEAS ASIGNAR EL ROSTER DE <strong className="text-[#FF5500]">{modalHistoryTeamName.toUpperCase()}</strong>.
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {lobbyState.teams.map(team => (
                <button 
                  key={team.id}
                  className="w-full text-left p-3 bg-[#151515] border border-[#222] hover:border-white flex justify-between items-center transition-all rounded-none group cursor-pointer text-xs uppercase font-black"
                  onClick={() => {
                    handleLoadTeamFromHistory(team.id, modalHistoryRoster);
                    setModalHistoryRoster(null);
                  }}
                >
                  <span className="text-white group-hover:text-[#FF5500]">{team.name}</span>
                  <span className="text-[9px] text-neutral-500 group-hover:text-white">SELECCIONAR →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast Stack (Admin Style) */}
      <div id="toast-container" className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`px-5 py-3 rounded-none shadow-[8px_8px_0px_rgba(0,0,0,0.8)] flex items-center gap-3 border-2 transition-all animate-slide-in ${
              t.type === 'success' ? 'bg-[#121212] border-white text-white' :
              t.type === 'error' ? 'bg-[#121212] border-red-500 text-red-400' :
              'bg-[#121212] border-blue-500 text-blue-400'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${
              t.type === 'success' ? 'bg-white animate-pulse' :
              t.type === 'error' ? 'bg-red-500 animate-pulse' : 'bg-blue-500 animate-pulse'
            }`} />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider leading-none">{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
