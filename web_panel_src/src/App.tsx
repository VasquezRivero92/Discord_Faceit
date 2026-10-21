import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Volume2,
  Coins,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Check,
  DollarSign,
  Wallet,
  Layers,
  Radio,
  KeyRound,
  User,
  Zap,
  Flame,
  MapPin,
  Map,
  Sparkles,
  Crown,
  Crosshair,
  Trophy,
  Swords,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';
import {
  Player, 
  Team, 
  LobbyState, 
  CurrentUser, 
  Guild, 
  ToastMessage, 
  PlayerBetStatus, 
  BetStatusResponse, 
  MixtonQueue,
  ActiveView,
  MapVetoItem,
  MapVetoHistoryItem,
  MapVetoState,
  MapCatalogItem
} from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingHomeView } from './components/LandingHomeView';
import { UserWalletView } from './components/UserWalletView';
import { LibroReclamacionesView } from './components/LibroReclamacionesView';
import { TerminosCondicionesView } from './components/TerminosCondicionesView';
import { DevolucionesView } from './components/DevolucionesView';
import { ContactoView } from './components/ContactoView';
import { GuiaFaceitView } from './components/GuiaFaceitView';
import { MatchHistoryView } from './components/MatchHistoryView';
import { MixtonLiveStepper } from './components/MixtonLiveStepper';

// Interactive High-Fidelity Simulation Dataset matching the Approved CS2 Concept Mockup
const DEMO_CONCEPT_PLAYERS: Player[] = [
  {
    discordId: 'demo_1',
    faceit_nickname: 'm0NESY_pe',
    faceit_level: 10,
    faceit_elo: 2600,
    mixton_tier: 'S',
    discordUser: {
      displayName: 'm0NESY_pe',
      avatarURL: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=120&auto=format&fit=crop&q=80'
    }
  },
  {
    discordId: 'demo_2',
    faceit_nickname: 'SimpleCS',
    faceit_level: 10,
    faceit_elo: 2520,
    mixton_tier: 'S',
    discordUser: {
      displayName: 'SimpleCS',
      avatarURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'
    }
  },
  {
    discordId: 'demo_3',
    faceit_nickname: 'b1t_latam',
    faceit_level: 9,
    faceit_elo: 2180,
    mixton_tier: 'A',
    discordUser: {
      displayName: 'b1t_latam',
      avatarURL: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80'
    }
  },
  {
    discordId: 'demo_4',
    faceit_nickname: 'FalleN_fan',
    faceit_level: 8,
    faceit_elo: 1950,
    mixton_tier: 'A',
    discordUser: {
      displayName: 'FalleN_fan',
      avatarURL: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&auto=format&fit=crop&q=80'
    }
  },
  {
    discordId: 'demo_5',
    faceit_nickname: 'arT_rush',
    faceit_level: 8,
    faceit_elo: 1910,
    mixton_tier: 'A',
    discordUser: {
      displayName: 'arT_rush',
      avatarURL: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80'
    }
  },
  {
    discordId: 'demo_6',
    faceit_nickname: 'coldzera_99',
    faceit_level: 7,
    faceit_elo: 1720,
    mixton_tier: 'B',
    discordUser: {
      displayName: 'coldzera_99',
      avatarURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
    }
  },
  {
    discordId: 'demo_7',
    faceit_nickname: 'KSCERATO_jr',
    faceit_level: 7,
    faceit_elo: 1680,
    mixton_tier: 'B',
    discordUser: {
      displayName: 'KSCERATO_jr',
      avatarURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80'
    }
  },
  {
    discordId: 'demo_8',
    faceit_nickname: 'yuurih_pe',
    faceit_level: 6,
    faceit_elo: 1540,
    mixton_tier: 'B',
    discordUser: {
      displayName: 'yuurih_pe',
      avatarURL: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&auto=format&fit=crop&q=80'
    }
  },
  {
    discordId: 'demo_9',
    faceit_nickname: 'drop_pe',
    faceit_level: 5,
    faceit_elo: 1420,
    mixton_tier: 'B',
    discordUser: {
      displayName: 'drop_pe',
      avatarURL: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80'
    }
  },
  {
    discordId: 'demo_10',
    faceit_nickname: 'chelo_cs',
    faceit_level: 4,
    faceit_elo: 1250,
    mixton_tier: 'C',
    discordUser: {
      displayName: 'chelo_cs',
      avatarURL: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80'
    }
  }
];

const DEMO_CONCEPT_TEAM_A: Team = {
  id: 'demo_team_1',
  name: 'EQUIPO FÉNIX',
  captain: {
    discordId: 'demo_cap_1',
    faceit_nickname: 's4vitar',
    faceit_level: 10,
    faceit_elo: 2540,
    mixton_tier: 'S',
    discordUser: {
      displayName: 's4vitar',
      avatarURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    }
  },
  players: [
    {
      discordId: 'demo_p_1',
      faceit_nickname: 'EliGE_pe',
      faceit_level: 10,
      faceit_elo: 2480,
      mixton_tier: 'S',
      discordUser: {
        displayName: 'EliGE_pe',
        avatarURL: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80'
      }
    },
    {
      discordId: 'demo_p_2',
      faceit_nickname: 'twistzz_latam',
      faceit_level: 9,
      faceit_elo: 2240,
      mixton_tier: 'A',
      discordUser: {
        displayName: 'twistzz_latam',
        avatarURL: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80'
      }
    },
    {
      discordId: 'demo_p_3',
      faceit_nickname: 'rain_cs2',
      faceit_level: 8,
      faceit_elo: 1980,
      mixton_tier: 'A',
      discordUser: {
        displayName: 'rain_cs2',
        avatarURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80'
      }
    }
  ]
};

const DEMO_CONCEPT_TEAM_B: Team = {
  id: 'demo_team_2',
  name: 'EQUIPO KOBRA',
  captain: {
    discordId: 'demo_cap_2',
    faceit_nickname: 'shadow',
    faceit_level: 10,
    faceit_elo: 2420,
    mixton_tier: 'S',
    discordUser: {
      displayName: 'shadow',
      avatarURL: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80'
    }
  },
  players: [
    {
      discordId: 'demo_p_4',
      faceit_nickname: 'broky_fan',
      faceit_level: 9,
      faceit_elo: 2290,
      mixton_tier: 'A',
      discordUser: {
        displayName: 'broky_fan',
        avatarURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80'
      }
    },
    {
      discordId: 'demo_p_5',
      faceit_nickname: 'ropz_pe',
      faceit_level: 9,
      faceit_elo: 2210,
      mixton_tier: 'A',
      discordUser: {
        displayName: 'ropz_pe',
        avatarURL: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=120&auto=format&fit=crop&q=80'
      }
    }
  ]
};

const DEMO_CONCEPT_MAP_VETO: MapVetoState = {
  active: true,
  completed: false,
  teamIdA: 'demo_team_1',
  teamIdB: 'demo_team_2',
  pool: [
    { id: 'de_mirage', name: 'Mirage', image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_mirage.png', icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_mirage.png' },
    { id: 'de_inferno', name: 'Inferno', image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_inferno.png', icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_inferno.png' },
    { id: 'de_nuke', name: 'Nuke', image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_nuke.png', icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_nuke.png' },
    { id: 'de_anubis', name: 'Anubis', image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_anubis.png', icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_anubis.png' },
    { id: 'de_ancient', name: 'Ancient', image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_ancient.png', icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_ancient.png' },
    { id: 'de_dust2', name: 'Dust II', image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_dust2.png', icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_dust2.png' },
    { id: 'de_vertigo', name: 'Vertigo', image: 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_vertigo.png', icon: 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_vertigo.png' }
  ],
  bannedMaps: ['de_mirage', 'de_nuke', 'de_dust2'],
  banHistory: [
    { mapId: 'de_mirage', mapName: 'Mirage', teamId: 'demo_team_2', teamName: 'EQUIPO KOBRA', timestamp: Date.now() - 60000 },
    { mapId: 'de_nuke', mapName: 'Nuke', teamId: 'demo_team_1', teamName: 'EQUIPO FÉNIX', timestamp: Date.now() - 40000 },
    { mapId: 'de_dust2', mapName: 'Dust II', teamId: 'demo_team_2', teamName: 'EQUIPO KOBRA', timestamp: Date.now() - 20000 }
  ],
  banSequence: ['demo_team_1', 'demo_team_2', 'demo_team_1', 'demo_team_2', 'demo_team_1', 'demo_team_2'],
  currentBanIndex: 3,
  chosenMap: null
};

export default function App() {
  // Authentication & Loading states
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Active Navigation View (SPA routing)
  const getInitialView = (): ActiveView => {
    const p = window.location.pathname.toLowerCase();
    if (p.includes('guia') || p.includes('faceit')) return 'guia-faceit';
    if (p.includes('libro-de-reclamaciones') || p.includes('reclamaciones')) return 'libro-de-reclamaciones';
    if (p.includes('terminos')) return 'terminos';
    if (p.includes('devoluciones') || p.includes('reembolsos')) return 'devoluciones';
    if (p.includes('contacto')) return 'contacto';
    if (p.includes('cuenta') || p.includes('saldo') || p.includes('billetera')) return 'cuenta';
    if (p.includes('login') || p.includes('acceso')) return 'login';
    if (p.includes('historial') || p.includes('partidas')) return 'historial';
    if (p.includes('mixton') || p.includes('arena') || p.includes('draft')) return 'mixton';
    return 'inicio';
  };

  const [activeView, setActiveView] = useState<ActiveView>(getInitialView);

  useEffect(() => {
    const handlePopState = () => {
      setActiveView(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Guild configurations
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [currentGuildId, setCurrentGuildId] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('guild') || '1274598531759345674';
  });
  const [guildName, setGuildName] = useState('MachuPeek');

  const getTeamName = (team: any) => {
    if (team && team.name && !/^EQUIPO \d+$/i.test(team.name)) {
      return team.name;
    }
    if (team && team.captain) {
      const capName = team.captain.discordUser?.displayName || team.captain.faceit_nickname;
      return `EQUIPO ${capName.toUpperCase()}`;
    }
    return team ? team.name : '';
  };

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
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedHistoryMatch, setSelectedHistoryMatch] = useState<{ history: any; stats: any | null } | null>(null);
  const [isHistoryDetailLoading, setIsHistoryDetailLoading] = useState(false);

  // UI Filters and Modals
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modalTargetTeamId, setModalTargetTeamId] = useState<string | null>(null);
  const [modalTeamName, setModalTeamName] = useState<string>('');
  const [commandEnabled, setCommandEnabled] = useState(true);
  const [pendingPick, setPendingPick] = useState<Player | null>(null);
  const [numTeamsSelect, setNumTeamsSelect] = useState<number>(4);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [showRouletteModal, setShowRouletteModal] = useState<boolean>(false);
  const [rouletteSpinning, setRouletteSpinning] = useState<boolean>(false);
  const [rouletteWinner, setRouletteWinner] = useState<string | null>(null);
  const [shuffledOrderResult, setShuffledOrderResult] = useState<string[]>([]);
  const [rouletteRemainingTeamIds, setRouletteRemainingTeamIds] = useState<string[]>([]);
  const [rouletteSelectedOrder, setRouletteSelectedOrder] = useState<string[]>([]);
  const [rouletteAngle, setRouletteAngle] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastSliceIdxRef = useRef<number>(-1);
  const sliceColors = ['#FF5500', '#0088FF', '#9900FF', '#00CC66', '#FFCC00', '#FF0077'];

  // Matchup Roulette States
  const [showMatchupModal, setShowMatchupModal] = useState<boolean>(false);
  const [matchupUnpairedIds, setMatchupUnpairedIds] = useState<string[]>([]);
  const [matchupPairs, setMatchupPairs] = useState<{ teamAId: string; teamBId: string }[]>([]);
  const [currentMatchupSubjectId, setCurrentMatchupSubjectId] = useState<string | null>(null);
  const [matchupWinner, setMatchupWinner] = useState<string | null>(null);
  const [matchupSpinning, setMatchupSpinning] = useState<boolean>(false);
  const [matchupAngle, setMatchupAngle] = useState<number>(0);
  const [matchupDrawnTemp, setMatchupDrawnTemp] = useState<string[]>([]);
  const matchupCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const matchupAnimationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Match launching selections
  const [matchTeamA, setMatchTeamA] = useState<string>('');
  const [matchTeamB, setMatchTeamB] = useState<string>('');
  const [isLaunchingMatch, setIsLaunchingMatch] = useState(false);
  const [matchMode, setMatchMode] = useState<'faceit' | 'steam'>('faceit');
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [isStartingVeto, setIsStartingVeto] = useState(false);
  const [isBanningMap, setIsBanningMap] = useState(false);
  const [chosenMapForMatch, setChosenMapForMatch] = useState<MapVetoItem | null>(null);

  // Map Pool Management States in Lobby
  const [isMapManagerOpen, setIsMapManagerOpen] = useState<boolean>(false);
  const [localMapCatalog, setLocalMapCatalog] = useState<MapCatalogItem[]>([]);
  const [isSavingMapCatalog, setIsSavingMapCatalog] = useState<boolean>(false);
  const [newCustomMap, setNewCustomMap] = useState({ id: '', name: '', image: '', icon: '' });
  const [showAddCustomMapModal, setShowAddCustomMapModal] = useState<boolean>(false);

  useEffect(() => {
    if (lobbyState.mapCatalog && Array.isArray(lobbyState.mapCatalog)) {
      setLocalMapCatalog(lobbyState.mapCatalog);
    }
  }, [lobbyState.mapCatalog]);

  // Bet Modal state (Cuota / Apuesta por jugador y verificación de los 10 jugadores)
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [selectedBetAmount, setSelectedBetAmount] = useState<number>(5); // default S/ 5
  const [customBetInput, setCustomBetInput] = useState<string>('');
  const [isCustomBet, setIsCustomBet] = useState(false);
  const [betPlayers, setBetPlayers] = useState<PlayerBetStatus[]>([]);
  const [isLoadingBetStatus, setIsLoadingBetStatus] = useState(false);
  const [manualPaidMap, setManualPaidMap] = useState<{ [discordId: string]: boolean }>({});
  const [quickTopUpUser, setQuickTopUpUser] = useState<{ discordId: string; nickname: string; hasSavedPhone?: boolean } | null>(null);
  const [quickTopUpAmount, setQuickTopUpAmount] = useState<string>('10');
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);
  const [yapePhoneInput, setYapePhoneInput] = useState<string>('');
  const [yapeOperationInput, setYapeOperationInput] = useState<string>('');
  const [topUpTab, setTopUpTab] = useState<'yape_verificado' | 'admin_manual'>('yape_verificado');

  // Queue / Room selection state (Colas / Salas Faceit)
  const [availableQueues, setAvailableQueues] = useState<MixtonQueue[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('auto');
  const [isLoadingQueues, setIsLoadingQueues] = useState<boolean>(false);

  // Admin pick order editor state
  const [localPickOrder, setLocalPickOrder] = useState<string[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Toast stack state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Concept Mockup Preview Modal & Interactive Concept Demo Mode
  const [showMockupModal, setShowMockupModal] = useState<boolean>(false);
  const [selectedMockupTab, setSelectedMockupTab] = useState<'draft' | 'veto'>('draft');
  const [arenaStageTab, setArenaStageTab] = useState<'draft' | 'veto'>('draft');
  const [isConceptDemoMode, setIsConceptDemoMode] = useState<boolean>(true);
  const [isAdminControlsOpen, setIsAdminControlsOpen] = useState<boolean>(false);
  const [demoMapVeto, setDemoMapVeto] = useState<MapVetoState>(DEMO_CONCEPT_MAP_VETO);

  const handleDemoBanMap = (mapId: string) => {
    setDemoMapVeto(prev => {
      if (prev.bannedMaps.includes(mapId)) return prev;
      const map = (prev.pool || []).find(m => m.id === mapId);
      const mapName = map ? map.name : mapId;
      const teamName = prev.currentBanIndex % 2 === 0 ? 'EQUIPO FÉNIX' : 'EQUIPO KOBRA';
      const newBanned = [...prev.bannedMaps, mapId];
      const newHistory: MapVetoHistoryItem[] = [
        ...(prev.banHistory || []), 
        { mapId, mapName, teamId: 'demo', teamName, timestamp: Date.now() }
      ];
      
      const remaining = (prev.pool || []).filter(m => !newBanned.includes(m.id));
      const isDone = remaining.length === 1;
      showToast(`🎯 [Simulación] Mapa ${mapName} descartado por ${teamName}`, 'info');
      return {
        ...prev,
        bannedMaps: newBanned,
        banHistory: newHistory,
        currentBanIndex: prev.currentBanIndex + 1,
        completed: isDone,
        chosenMap: isDone ? remaining[0] : null
      };
    });
  };

  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectTimerRef = useRef<number | null>(null);

  // Helper: Toast Notifications (Admin-style notifications)
  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const handleSelectView = (view: ActiveView) => {
    setActiveView(view);
    const targetPath = view === 'inicio' ? '/' : `/${view}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefreshCurrentUser = async () => {
    try {
      const res = await fetch('/api/lobby/me');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType?.includes('application/json')) {
        const data = await res.json();
        setCurrentUser(data.user || null);
      }
    } catch {
      // Silent fallback
    }
  };

  const handleLogout = () => {
    window.location.href = '/auth/logout';
  };

  const handleLoginSuccess = async (user: CurrentUser) => {
    setCurrentUser(user);
    showToast(`Sesión iniciada con éxito como ${user.username}`, 'success');
    if (user.isAdmin) {
      await loadGuildsSelector();
    }
    setActiveView('cuenta');
  };

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
      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType?.includes('application/json')) return;
      const { guilds: loadedGuilds } = await res.json();
      if (!loadedGuilds || loadedGuilds.length === 0) return;
      
      setGuilds(loadedGuilds);
      
      // If we don't have a currentGuildId, or the current one is not in the loaded guilds list, pick the first one
      setCurrentGuildId(prev => {
        const exists = loadedGuilds.some((g: any) => g.id === prev);
        if ((!prev || !exists) && loadedGuilds.length > 0) {
          const firstId = loadedGuilds[0].id;
          const url = new URL(window.location.href);
          url.searchParams.set('guild', firstId);
          window.history.replaceState({}, '', url);
          localStorage.setItem('mixton_guild_id', firstId);
          return firstId;
        }
        return prev;
      });
    } catch {
      // Ignore background guilds loading error
    }
  }, []);

  // Fetch Lobby State from Server
  const fetchState = useCallback(async (guildIdToUse?: string) => {
    try {
      const targetGuildId = guildIdToUse !== undefined ? guildIdToUse : currentGuildId;
      const path = targetGuildId ? `/api/lobby/mixton-state?guildId=${targetGuildId}` : '/api/lobby/mixton-state';
      
      const res = await fetch(path);
      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType?.includes('application/json')) {
        return; // Session expired or reverse proxy returned HTML/challenge; ignore safely
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
    } catch {
      // Safe fallback if JSON parsing or network connection fails
    }
  }, [currentGuildId]);

  // Fetch recent mixton matches history
  const fetchHistory = useCallback(async (guildIdToUse?: string) => {
    setIsHistoryLoading(true);
    try {
      const targetGuildId = guildIdToUse !== undefined ? guildIdToUse : currentGuildId;
      const path = targetGuildId ? `/api/lobby/matches-history?guildId=${targetGuildId}&limit=10` : '/api/lobby/matches-history?limit=10';
      
      const res = await fetch(path);
      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType?.includes('application/json')) return;
      const data = await res.json();
      if (data.history) setMatchHistory(data.history);
    } catch {
      // Silent error handling for history
    } finally {
      setIsHistoryLoading(false);
    }
  }, [currentGuildId]);

  const handleSelectHistoryMatch = async (matchId: string) => {
    setIsHistoryDetailLoading(true);
    const fallback = matchHistory.find(match => match.id === matchId);
    if (fallback) setSelectedHistoryMatch({ history: fallback, stats: null });
    try {
      const res = await apiFetch(`/api/lobby/matches-history/${matchId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el detalle de la partida.');
      setSelectedHistoryMatch({ history: data.history, stats: data.stats || null });
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsHistoryDetailLoading(false);
    }
  };

  // Connect WebSocket for real-time updates
  const connectWebSocket = useCallback((guildId: string) => {
    if (!guildId) return;
    if (wsReconnectTimerRef.current !== null) {
      window.clearTimeout(wsReconnectTimerRef.current);
      wsReconnectTimerRef.current = null;
    }
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
        } else if (message.type === 'player_balance_update' && message.data) {
          const { discordId, newBalance } = message.data;
          const bal = Number(newBalance || 0);
          setBetPlayers(prev => prev.map(p => {
            if (p.discordId !== discordId) return p;
            return {
              ...p,
              balance: bal,
              hasEnough: effectiveBetAmount === 0 || bal >= effectiveBetAmount,
              deficit: Math.max(0, parseFloat((effectiveBetAmount - bal).toFixed(2)))
            };
          }));
        }
      } catch (err) {
        console.error('Error al procesar mensaje de WebSocket:', err);
      }
    };
    
    socket.onclose = () => {
      // A socket deliberately closed while leaving the arena must not reconnect
      // in the background. That avoids needless server work for the landing page.
      if (wsRef.current !== socket) return;
      console.warn('Conexión WebSocket cerrada, reintentando en 5 segundos...');
      wsReconnectTimerRef.current = window.setTimeout(() => {
        wsReconnectTimerRef.current = null;
        if (wsRef.current === socket) connectWebSocket(guildId);
      }, 5000);
    };
    
    socket.onerror = (err) => {
      console.error('Error en WebSocket:', err);
      socket.close();
    };
  }, []);

  // Check Session with Server on Mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/lobby/me');
        if (res.status === 401) {
          setCurrentUser(null);
          setAuthChecking(false);
          return;
        }
        const contentType = res.headers.get('content-type');
        if (!res.ok || !contentType?.includes('application/json')) {
          setCurrentUser(null);
          setAuthChecking(false);
          return;
        }
        const data = await res.json();
        setCurrentUser(data.user || null);
        
        // If user is Admin, load guilds list
        if (data.user?.isAdmin) {
          await loadGuildsSelector();
        }
        
        setAuthChecking(false);
      } catch {
        setCurrentUser(null);
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, [loadGuildsSelector]);

  // The public pages do not need lobby data. Load it only when a visitor opens
  // the Mixtón, and let the WebSocket supply the initial live lobby state.
  useEffect(() => {
    if (activeView === 'mixton' && currentGuildId) {
      connectWebSocket(currentGuildId);

      return () => {
        if (wsReconnectTimerRef.current !== null) {
          window.clearTimeout(wsReconnectTimerRef.current);
          wsReconnectTimerRef.current = null;
        }
        if (wsRef.current) {
          wsRef.current.onclose = null;
          wsRef.current.close();
          wsRef.current = null;
        }
      };
    }

    // Leaving the arena releases the real-time connection and any pending retry.
    if (wsReconnectTimerRef.current !== null) {
      window.clearTimeout(wsReconnectTimerRef.current);
      wsReconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [currentGuildId, activeView, connectWebSocket]);

  // The history is intentionally isolated from the live draft. Its Firestore
  // read occurs only after the visitor navigates to this dedicated view.
  useEffect(() => {
    if (activeView === 'historial') {
      fetchHistory(currentGuildId);
    }
  }, [activeView, currentGuildId, fetchHistory]);

  // Clear pendingPick if the turn changes or the draft finishes/resets
  useEffect(() => {
    if (!pendingPick) return;
    
    const currentTeamId = lobbyState.pickSequence?.[lobbyState.currentPickIndex] || lobbyState.pickOrder[lobbyState.currentPickIndex % (lobbyState.pickOrder.length || 1)];
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
    const currentTeamId = lobbyState.pickSequence?.[lobbyState.currentPickIndex] || lobbyState.pickOrder[lobbyState.currentPickIndex % (lobbyState.pickOrder.length || 1)];
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
    const totalPicks = lobbyState.pickSequence?.length || (lobbyState.teams.length * 4);
    const nextPickIndex = lobbyState.currentPickIndex + 1;
    const draftFinished = nextPickIndex >= totalPicks || nextTeams.every(t => (t.players || []).length === 4);

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

  // Admin Action: Randomize Order (Abre el Modal de Ruleta con múltiples rondas)
  const handleRandomizeOrder = () => {
    if (localPickOrder.length === 0) return;
    setRouletteWinner(null);
    setRouletteAngle(0);
    setRouletteRemainingTeamIds([...localPickOrder]);
    setRouletteSelectedOrder([]);
    setShowRouletteModal(true);
  };

  // Dibujar rueda de la ruleta en Canvas
  const drawWheel = (ctx: CanvasRenderingContext2D, angle: number, teamsList: Team[]) => {
    const N = teamsList.length;
    if (N === 0) {
      // Limpiar y dibujar texto de finalizado
      ctx.clearRect(0, 0, 480, 480);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.fillText("¡SORTEO COMPLETADO!", 240, 240);
      return;
    }
    const centerX = 240;
    const centerY = 240;
    const radius = 220;
    const sliceAngle = (2 * Math.PI) / N;

    ctx.clearRect(0, 0, 480, 480);

    // Dibujar rebanadas
    for (let i = 0; i < N; i++) {
      const startAngle = i * sliceAngle + angle;
      const endAngle = (i + 1) * sliceAngle + angle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = sliceColors[i % sliceColors.length];
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#111111';
      ctx.stroke();

      // Dibujar texto del nombre del equipo / capitán
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px "JetBrains Mono", monospace';
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 5;
      
      const labelText = teamsList[i].captain 
        ? teamsList[i].captain.faceit_nickname.toUpperCase() 
        : teamsList[i].name.toUpperCase();
      ctx.fillText(labelText, radius - 20, 6);
      ctx.restore();
    }

    // Borde exterior
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Círculo central
    ctx.beginPath();
    ctx.arc(centerX, centerY, 36, 0, 2 * Math.PI);
    ctx.fillStyle = '#1C1C1C';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#FF5500';
    ctx.stroke();

    // Flecha indicador de la ruleta en la parte superior
    ctx.fillStyle = '#FF5500';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius + 24);
    ctx.lineTo(centerX - 18, centerY - radius - 15);
    ctx.lineTo(centerX + 18, centerY - radius - 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // Obtener o inicializar un AudioContext único para evitar límites del navegador
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Sintetizar sonido de tick con Web Audio API (evita depender de archivos estáticos)
  const playTickSound = () => {
    try {
      const audioCtx = getAudioContext();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, audioCtx.currentTime); // Tono de tick
      
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.04);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } catch (e) {
      // Silenciar errores
    }
  };

  // Sintetizar sonido de victoria con Web Audio API (fanfarria de C Mayor)
  const playVictorySound = () => {
    try {
      const audioCtx = getAudioContext();
      const playTone = (freq: number, time: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + time);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime + time);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + time + duration);
        osc.start(audioCtx.currentTime + time);
        osc.stop(audioCtx.currentTime + time + duration);
      };
      playTone(261.63, 0.0, 0.4);   // C4
      playTone(329.63, 0.12, 0.4);  // E4
      playTone(392.00, 0.24, 0.4);  // G4
      playTone(523.25, 0.36, 0.8);  // C5
    } catch (e) {
      // Silenciar errores
    }
  };

  // Girar ruleta con desaceleración progresiva y parada exacta
  const startRouletteSpin = () => {
    if (rouletteSpinning || rouletteRemainingTeamIds.length <= 1) return;
    
    // 1. Elegir un ganador al azar de los que quedan
    const randomIndex = Math.floor(Math.random() * rouletteRemainingTeamIds.length);
    const winnerId = rouletteRemainingTeamIds[randomIndex];
    
    // Mapear los IDs restantes a la lista de equipos correspondientes
    const remainingTeams = lobbyState.teams.filter(t => rouletteRemainingTeamIds.includes(t.id));
    const winnerIndex = remainingTeams.findIndex(t => t.id === winnerId);
    
    if (winnerIndex === -1) return;
    
    setRouletteSpinning(true);
    setRouletteWinner(null);
    lastSliceIdxRef.current = -1;

    const N = remainingTeams.length;
    const sliceAngle = (2 * Math.PI) / N;
    
    // Parada con desfase aleatorio concentrado en los extremos (distribución en forma de U)
    const randVal = Math.random();
    const bias = randVal < 0.5 ? Math.pow(randVal * 2, 2.5) * 0.5 : 1 - Math.pow((1 - randVal) * 2, 2.5) * 0.5;
    const sliceOffset = 0.05 + bias * 0.9; // Restringido entre 0.05 y 0.95
    const targetStopAngle = (3 * Math.PI) / 2 - (winnerIndex + sliceOffset) * sliceAngle;
    const extraTurns = 12;
    const finalAngle = targetStopAngle + extraTurns * 2 * Math.PI;

    let start: number | null = null;
    const duration = 9000; // 9 segundos totales (desaceleración suave y progresiva al final)

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 4.0);
      const currentAngle = easeOut(progress) * finalAngle;
      setRouletteAngle(currentAngle);

      // Reproducción de sonido de tick basado en cambio de división
      const currentSliceIdx = Math.floor(((3 * Math.PI / 2) - currentAngle) / sliceAngle) % N;
      const normalizedSliceIdx = currentSliceIdx >= 0 ? currentSliceIdx : (currentSliceIdx + N) % N;
      if (normalizedSliceIdx !== lastSliceIdxRef.current && progress < 0.99) {
        lastSliceIdxRef.current = normalizedSliceIdx;
        playTickSound();
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        const winningTeam = remainingTeams[winnerIndex];
        setRouletteWinner(winningTeam.name.toUpperCase());
        playVictorySound();
        
        // Agregar al orden seleccionado y remover de los restantes
        const newSelected = [...rouletteSelectedOrder, winnerId];
        const newRemaining = rouletteRemainingTeamIds.filter(id => id !== winnerId);
        
        setRouletteSelectedOrder(newSelected);
        setRouletteRemainingTeamIds(newRemaining);
        
        // Si queda solo 1 equipo al remover este, ese último se coloca de manera definitiva al final
        if (newRemaining.length === 1) {
          const finalSelected = [...newSelected, newRemaining[0]];
          setRouletteSelectedOrder(finalSelected);
          setRouletteRemainingTeamIds([]);
        }

        setRouletteSpinning(false);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const handleApplyRouletteOrder = () => {
    setLocalPickOrder(rouletteSelectedOrder);
    setIsSavingOrder(true);
    setShowRouletteModal(false);
    showToast('¡Nuevo orden de elección aplicado! Recuerda guardarlo.', 'info');
  };

  // Re-dibujar la ruleta en cambios
  useEffect(() => {
    if (!showRouletteModal) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const remainingTeams = lobbyState.teams.filter(t => rouletteRemainingTeamIds.includes(t.id));
    drawWheel(ctx, rouletteAngle, remainingTeams);
  }, [rouletteAngle, showRouletteModal, rouletteRemainingTeamIds, lobbyState.teams]);

  // Abrir sorteo de enfrentamientos (Rival Roulette)
  const handleOpenMatchupRoulette = () => {
    const ids = completedTeams.map(t => t.id);
    if (ids.length < 2) {
      showToast('Se necesitan al menos 2 equipos completos para sortear.', 'error');
      return;
    }
    setMatchupUnpairedIds(ids);
    setMatchupPairs([]);
    setMatchupDrawnTemp([]);
    setMatchupWinner(null);
    setMatchupAngle(0);
    setShowMatchupModal(true);
  };

  // Girar ruleta de enfrentamientos para sacar un equipo al azar
  const startMatchupSpin = () => {
    if (matchupSpinning || matchupUnpairedIds.length === 0) return;

    // Se elije un equipo al azar entre todos los que NO se han sorteado aún
    const randomTeamId = matchupUnpairedIds[Math.floor(Math.random() * matchupUnpairedIds.length)];
    const remainingTeams = lobbyState.teams.filter(t => matchupUnpairedIds.includes(t.id));
    const winnerIndex = remainingTeams.findIndex(t => t.id === randomTeamId);

    if (winnerIndex === -1) return;

    setMatchupSpinning(true);
    setMatchupWinner(null);
    lastSliceIdxRef.current = -1;

    const N = remainingTeams.length;
    const sliceAngle = (2 * Math.PI) / N;

    // Parada con desfase aleatorio concentrado en los extremos (distribución en forma de U)
    const randVal = Math.random();
    const bias = randVal < 0.5 ? Math.pow(randVal * 2, 2.5) * 0.5 : 1 - Math.pow((1 - randVal) * 2, 2.5) * 0.5;
    const sliceOffset = 0.05 + bias * 0.9; // Restringido entre 0.05 y 0.95
    const targetStopAngle = (3 * Math.PI) / 2 - (winnerIndex + sliceOffset) * sliceAngle;
    const extraTurns = 12;
    const finalAngle = targetStopAngle + extraTurns * 2 * Math.PI;

    let start: number | null = null;
    const duration = 9000; // 9 segundos totales (desaceleración suave y progresiva al final)

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);

      const easeOut = (t: number) => 1 - Math.pow(1 - t, 4.0);
      const currentAngle = easeOut(progress) * finalAngle;
      setMatchupAngle(currentAngle);

      // Reproducción de sonido de tick
      const currentSliceIdx = Math.floor(((3 * Math.PI / 2) - currentAngle) / sliceAngle) % N;
      const normalizedSliceIdx = currentSliceIdx >= 0 ? currentSliceIdx : (currentSliceIdx + N) % N;
      if (normalizedSliceIdx !== lastSliceIdxRef.current && progress < 0.99) {
        lastSliceIdxRef.current = normalizedSliceIdx;
        playTickSound();
      }

      if (progress < 1) {
        matchupAnimationFrameRef.current = requestAnimationFrame(animate);
      } else {
        const winningTeam = remainingTeams[winnerIndex];
        setMatchupWinner(winningTeam.name.toUpperCase());
        playVictorySound();

        // Agregar al grupo temporal de sorteados en la ronda actual
        const newDrawn = [...matchupDrawnTemp, randomTeamId];
        const newUnpaired = matchupUnpairedIds.filter(id => id !== randomTeamId);

        setMatchupDrawnTemp(newDrawn);
        setMatchupUnpairedIds(newUnpaired);

        // Si ya tenemos dos equipos en el grupo temporal, formamos la pareja (Encuentro)
        if (newDrawn.length === 2) {
          const newPairs = [...matchupPairs, { teamAId: newDrawn[0], teamBId: newDrawn[1] }];
          setMatchupPairs(newPairs);
          setMatchupDrawnTemp([]);

          // Validar reglas especiales del sobrante de equipos
          if (newUnpaired.length === 1) {
            // El tercer equipo se enfrenta con el ganador del primer encuentro (Winner Match 1)
            const finalPairs = [...newPairs, { teamAId: newUnpaired[0], teamBId: 'winner_match_1' }];
            setMatchupPairs(finalPairs);
            setMatchupUnpairedIds([]);
          } else if (newUnpaired.length === 2) {
            // Si quedan exactamente 2, ellos se enfrentarán automáticamente
            const finalPairs = [...newPairs, { teamAId: newUnpaired[0], teamBId: newUnpaired[1] }];
            setMatchupPairs(finalPairs);
            setMatchupUnpairedIds([]);
          }
        } else {
          // Si es el primer equipo seleccionado y solo quedan 2 en total sin emparejar,
          // se emparejan automáticamente el seleccionado con el único que queda
          if (newUnpaired.length === 1 && newDrawn.length === 1) {
            const newPairs = [...matchupPairs, { teamAId: newDrawn[0], teamBId: newUnpaired[0] }];
            setMatchupPairs(newPairs);
            setMatchupDrawnTemp([]);
            setMatchupUnpairedIds([]);
          }
        }

        setMatchupSpinning(false);
      }
    };

    matchupAnimationFrameRef.current = requestAnimationFrame(animate);
  };

  // Re-dibujar la ruleta de enfrentamientos con todos los equipos que faltan emparejar
  useEffect(() => {
    if (!showMatchupModal) return;
    const canvas = matchupCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const teamsList = lobbyState.teams.filter(t => matchupUnpairedIds.includes(t.id));
    drawWheel(ctx, matchupAngle, teamsList);
  }, [matchupAngle, showMatchupModal, matchupUnpairedIds, lobbyState.teams]);

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

  // Admin Action: Auto-assign and balance players
  const handleAutoAssignPlayers = async () => {
    if (!hasCaptainsForAll) {
      showToast('Debes asignar manualmente los capitanes a todos los equipos primero.', 'error');
      return;
    }
    if (!window.confirm('¿Deseas autocompletar y balancear automáticamente los equipos con los jugadores disponibles de la cola según su Tier/ELO?')) {
      return;
    }
    setIsAutoAssigning(true);
    try {
      const res = await apiFetch('/api/lobby/mixton-auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al auto-asignar jugadores.');
      
      showToast('¡Jugadores auto-asignados y equipos balanceados con éxito!', 'success');
      await fetchState();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsAutoAssigning(false);
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

  // Calculate effective bet amount
  const effectiveBetAmount = isCustomBet 
    ? Math.max(0, parseFloat(customBetInput) || 0)
    : selectedBetAmount;

  // Fetch Bet Status for the 10 players
  const fetchBetStatus = async (amount: number) => {
    if (!matchTeamA || !matchTeamB) return;
    setIsLoadingBetStatus(true);
    try {
      const res = await apiFetch('/api/lobby/mixton-check-bet-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamIdA: matchTeamA,
          teamIdB: matchTeamB,
          betAmount: amount
        })
      });
      const data: BetStatusResponse = await res.json();
      if (!res.ok) throw new Error((data as any).error || 'Error al obtener saldos.');
      setBetPlayers(data.players || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsLoadingBetStatus(false);
    }
  };

  // Fetch Available Faceit Queues
  const fetchQueues = async () => {
    setIsLoadingQueues(true);
    try {
      const res = await apiFetch('/api/lobby/mixton-queues');
      if (res.ok) {
        const data = await res.json();
        setAvailableQueues(data.queues || []);
      }
    } catch (err) {
      console.error('Error al cargar colas de Faceit:', err);
    } finally {
      setIsLoadingQueues(false);
    }
  };

  // Start Map Veto when clicking LANZAR ENCUENTRO
  const handleLaunchEncounterClick = async () => {
    if (!matchTeamA || !matchTeamB) {
      showToast('Debes seleccionar dos equipos.', 'error');
      return;
    }
    const teamA = lobbyState.teams.find(t => t.id === matchTeamA);
    const teamB = lobbyState.teams.find(t => t.id === matchTeamB);
    if (!teamA?.captain || teamA.players.length !== 4 || !teamB?.captain || teamB.players.length !== 4) {
      showToast('Ambos equipos deben estar completos con 5 jugadores (Capitán + 4 compañeros).', 'error');
      return;
    }

    setIsStartingVeto(true);
    try {
      const res = await apiFetch('/api/lobby/mixton-start-veto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamIdA: matchTeamA,
          teamIdB: matchTeamB,
          betAmount: effectiveBetAmount,
          queueId: selectedQueueId,
          matchMode
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar fase de veto.');
      showToast('¡Fase de veto de mapas iniciada! Los capitanes deben banear mapas.', 'success');
      await fetchState();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsStartingVeto(false);
    }
  };

  // Ban Map handler
  const handleBanMap = async (mapId: string) => {
    if (isBanningMap) return;
    setIsBanningMap(true);
    try {
      const res = await apiFetch('/api/lobby/mixton-ban-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al banear mapa.');
      await fetchState();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsBanningMap(false);
    }
  };

  // Cancel Map Veto
  const handleCancelVeto = async () => {
    if (!window.confirm('¿Deseas cancelar la fase de veto de mapas actual?')) return;
    try {
      const res = await apiFetch('/api/lobby/mixton-cancel-veto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Error al cancelar veto.');
      showToast('Veto de mapas cancelado.', 'info');
      await fetchState();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Map Pool Handlers in Lobby
  const handleToggleMapInLobby = (mapId: string) => {
    setLocalMapCatalog(prev => prev.map(m => m.id === mapId ? { ...m, active: !m.active } : m));
  };

  const handleApplyPresetInLobby = (preset: 'premier' | 'all' | 'classics' | 'fast') => {
    if (preset === 'premier') {
      const premierIds = ['de_mirage', 'de_inferno', 'de_dust2', 'de_nuke', 'de_ancient', 'de_anubis', 'de_vertigo'];
      setLocalMapCatalog(prev => prev.map(m => ({ ...m, active: premierIds.includes(m.id) })));
      showToast('Preset: Premier Oficial (7 mapas)', 'info');
    } else if (preset === 'all') {
      setLocalMapCatalog(prev => prev.map(m => ({ ...m, active: true })));
      showToast('Preset: Todos los mapas activos', 'info');
    } else if (preset === 'classics') {
      const classicIds = ['de_mirage', 'de_inferno', 'de_dust2', 'de_nuke', 'de_overpass'];
      setLocalMapCatalog(prev => prev.map(m => ({ ...m, active: classicIds.includes(m.id) })));
      showToast('Preset: 5 Clásicos (Mirage, Inferno, Dust II, Nuke, Overpass)', 'info');
    } else if (preset === 'fast') {
      const fastIds = ['de_mirage', 'de_inferno', 'de_dust2'];
      setLocalMapCatalog(prev => prev.map(m => ({ ...m, active: fastIds.includes(m.id) })));
      showToast('Preset: 3 Mapas Rápidos (Mirage, Inferno, Dust II)', 'info');
    }
  };

  const handleAddCustomMapInLobby = () => {
    if (!newCustomMap.id.trim() || !newCustomMap.name.trim()) {
      showToast('ID y Nombre son obligatorios.', 'error');
      return;
    }
    const cleanId = newCustomMap.id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (localMapCatalog.some(m => m.id === cleanId)) {
      showToast('Ya existe un mapa con ese ID.', 'error');
      return;
    }
    const item: MapCatalogItem = {
      id: cleanId,
      name: newCustomMap.name.trim(),
      image: newCustomMap.image.trim() || 'https://raw.githubusercontent.com/ggMartinez/CS2-Maps-Images/main/maps/de_mirage.png',
      icon: newCustomMap.icon.trim() || 'https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/de_mirage.png',
      active: true,
      isCustom: true
    };
    setLocalMapCatalog(prev => [...prev, item]);
    setNewCustomMap({ id: '', name: '', image: '', icon: '' });
    setShowAddCustomMapModal(false);
    showToast(`Mapa ${item.name} añadido. Guarda para aplicar.`, 'success');
  };

  const handleDeleteCustomMapInLobby = (mapId: string) => {
    setLocalMapCatalog(prev => prev.filter(m => m.id !== mapId));
    showToast('Mapa eliminado.', 'info');
  };

  const handleSaveMapCatalogInLobby = async () => {
    const activeCount = localMapCatalog.filter(m => m.active).length;
    if (activeCount < 2) {
      showToast('Debes mantener al menos 2 mapas activos para el veto.', 'error');
      return;
    }
    setIsSavingMapCatalog(true);
    try {
      const res = await apiFetch('/api/lobby/map-catalog', {
        method: 'POST',
        body: JSON.stringify({ catalog: localMapCatalog })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar mapas.');
      if (Array.isArray(data.catalog)) setLocalMapCatalog(data.catalog);
      showToast('¡Pool de mapas actualizado en tiempo real!', 'success');
      setIsMapManagerOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Error al guardar mapas.', 'error');
    } finally {
      setIsSavingMapCatalog(false);
    }
  };

  // Sincronizar automáticamente el mapa elegido y abrir el modal de saldos/apuestas para el Admin
  useEffect(() => {
    if (lobbyState.mapVeto?.completed && lobbyState.mapVeto.chosenMap) {
      setChosenMapForMatch(lobbyState.mapVeto.chosenMap);
      if (currentUser?.isAdmin && !isBetModalOpen) {
        const timer = setTimeout(() => {
          setMatchTeamA(lobbyState.mapVeto!.teamIdA);
          setMatchTeamB(lobbyState.mapVeto!.teamIdB);
          setIsBetModalOpen(true);
          fetchQueues();
          fetchBetStatus(effectiveBetAmount);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [lobbyState.mapVeto?.completed, lobbyState.mapVeto?.chosenMap, currentUser?.isAdmin, isBetModalOpen]);

  // Open Bet & Quota Verification Modal
  const handleOpenBetModal = async () => {
    if (!matchTeamA || !matchTeamB) {
      showToast('Debes seleccionar dos equipos.', 'error');
      return;
    }
    const teamA = lobbyState.teams.find(t => t.id === matchTeamA);
    const teamB = lobbyState.teams.find(t => t.id === matchTeamB);
    if (!teamA?.captain || teamA.players.length !== 4 || !teamB?.captain || teamB.players.length !== 4) {
      showToast('Ambos equipos deben estar completos con 5 jugadores (Capitán + 4 compañeros).', 'error');
      return;
    }

    setManualPaidMap({});
    setSelectedQueueId('auto');
    setMatchMode('faceit');
    setIsBetModalOpen(true);
    fetchQueues();
    await fetchBetStatus(effectiveBetAmount);
  };

  // Change bet preset amount
  const handleSelectBetAmount = (amount: number) => {
    setIsCustomBet(false);
    setSelectedBetAmount(amount);
  };

  // Change custom bet amount
  const handleCustomBetChange = (val: string) => {
    setCustomBetInput(val);
  };

  // Toggle manual paid override
  const handleToggleManualPaid = (discordId: string) => {
    setManualPaidMap(prev => ({
      ...prev,
      [discordId]: !prev[discordId]
    }));
  };

  // Consultar el saldo actualizado de un solo jugador en la base de datos
  const refreshSinglePlayerBalance = async (discordId: string) => {
    try {
      const res = await apiFetch(`/api/lobby/player-balance/${discordId}`);
      if (res.ok) {
        const data = await res.json();
        const bal = Number(data.balance ?? 0);
        setBetPlayers(prev => prev.map(p => {
          if (p.discordId !== discordId) return p;
          return {
            ...p,
            balance: bal,
            hasEnough: effectiveBetAmount === 0 || bal >= effectiveBetAmount,
            deficit: Math.max(0, parseFloat((effectiveBetAmount - bal).toFixed(2)))
          };
        }));
        showToast('Saldo actualizado desde la base de datos.', 'info');
      }
    } catch (_) {}
  };

  // Quick top-up submit
  const handleQuickTopUpSubmit = async () => {
    if (!quickTopUpUser) return;
    const amount = parseFloat(quickTopUpAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Ingresa un monto válido para recargar.', 'error');
      return;
    }
    setIsSubmittingTopUp(true);
    try {
      const res = await apiFetch('/api/lobby/quick-add-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: quickTopUpUser.discordId,
          amount,
          reason: `Recarga manual por admin desde modal de apuestas`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al recargar saldo.');
      showToast(`¡Recargado S/ ${amount.toFixed(2)} a ${quickTopUpUser.nickname}!`, 'success');
      const targetId = quickTopUpUser.discordId;
      const newBal = Number(data.newBalance ?? ((betPlayers.find(p => p.discordId === targetId)?.balance || 0) + amount));
      setQuickTopUpUser(null);
      // Actualizar solo el saldo de este jugador sin reconsultar a los otros 9
      setBetPlayers(prev => prev.map(p => {
        if (p.discordId !== targetId) return p;
        return {
          ...p,
          balance: newBal,
          hasEnough: effectiveBetAmount === 0 || newBal >= effectiveBetAmount,
          deficit: Math.max(0, parseFloat((effectiveBetAmount - newBal).toFixed(2)))
        };
      }));
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmittingTopUp(false);
    }
  };

  // Process recharge after matching the deposit in the local Yape monitor database.
  const handleYapeVerificationSubmit = async () => {
    if (!quickTopUpUser) return;
    const amount = parseFloat(quickTopUpAmount);
    const cleanPhone = yapePhoneInput.replace(/\D/g, '');
    const operationNumber = yapeOperationInput.trim();
    if (isNaN(amount) || amount < 1) {
      showToast('El monto mínimo para recargar es S/ 1.00', 'error');
      return;
    }
    if (cleanPhone.length !== 9) {
      showToast('Ingresa el celular Yape de 9 dígitos para recibir premios.', 'error');
      return;
    }
    if (operationNumber.length < 4) {
      showToast('Ingresa el código de aprobación Yape.', 'error');
      return;
    }

    setIsSubmittingTopUp(true);
    try {
      const res = await apiFetch('/api/lobby/wallet/recharge-yape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDiscordId: quickTopUpUser.discordId,
          amount,
          phoneNumber: cleanPhone,
          operationNumber
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al verificar el depósito Yape.');
      if (data.pending) {
        showToast(data.message || 'El código quedó reservado. Vuelve a intentarlo en unos segundos.', 'info');
        return;
      }

      showToast(`¡Depósito de S/ ${Number(data.amount || 0).toFixed(2)} acreditado con éxito!`, 'success');
      const targetId = quickTopUpUser.discordId;
      const newBal = Number(data.newBalance ?? ((betPlayers.find(p => p.discordId === targetId)?.balance || 0) + amount));
      setQuickTopUpUser(null);
      setYapePhoneInput('');
      setYapeOperationInput('');
      // Actualizar solo el saldo de este jugador sin reconsultar a los otros 9
      setBetPlayers(prev => prev.map(p => {
        if (p.discordId !== targetId) return p;
        return {
          ...p,
          balance: newBal,
          hasEnough: effectiveBetAmount === 0 || newBal >= effectiveBetAmount,
          deficit: Math.max(0, parseFloat((effectiveBetAmount - newBal).toFixed(2)))
        };
      }));
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmittingTopUp(false);
    }
  };

  // Admin Action: Confirm Launch Match with Bet
  const handleConfirmLaunchMatch = async () => {
    if (!matchTeamA || !matchTeamB) return;

    if (matchMode === 'steam') {
      const missingSteam = betPlayers.filter(p => !p.hasSteam);
      if (missingSteam.length > 0) {
        showToast(`No se puede lanzar la partida. Los siguientes jugadores no tienen vinculado su Steam ID: ${missingSteam.map(p => p.faceit_nickname || p.displayName).join(', ')}.`, 'error');
        return;
      }
    }
    
    setIsLaunchingMatch(true);
    try {
      const manualPaidDiscordIds = Object.keys(manualPaidMap).filter(id => manualPaidMap[id]);
      const res = await apiFetch('/api/lobby/mixton-create-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teamIdA: matchTeamA, 
          teamIdB: matchTeamB,
          betAmount: effectiveBetAmount,
          manualPaidDiscordIds,
          queueId: selectedQueueId,
          matchMode,
          chosenMap: chosenMapForMatch || lobbyState.mapVeto?.chosenMap || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al lanzar el encuentro.');

      const launchMsg = matchMode === 'steam'
        ? `¡Encuentro creado en CS2! Servidor encendido y partido 5v5 cargado.${effectiveBetAmount > 0 ? ` Pozo: S/ ${(effectiveBetAmount * 10).toFixed(2)}` : ''}`
        : `¡Encuentro creado! ${effectiveBetAmount > 0 ? `Pozo Total: S/ ${(effectiveBetAmount * 10).toFixed(2)}` : 'Modo Gratis'}. Canales de voz creados.`;
      showToast(launchMsg, 'success');
      if (matchMode === 'faceit' && data.faceitHubUrl) {
        window.open(data.faceitHubUrl, '_blank');
      }
      setIsBetModalOpen(false);
      setChosenMapForMatch(null);
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
    setMatchHistory([]);
    setSelectedHistoryMatch(null);
    
    const url = new URL(window.location.href);
    url.searchParams.set('guild', guildId);
    window.history.pushState({}, '', url);
    
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
      const currentTeamId = lobbyState.pickSequence?.[lobbyState.currentPickIndex] || lobbyState.pickOrder[lobbyState.currentPickIndex % (lobbyState.pickOrder.length || 1)];
      const currentTeam = lobbyState.teams.find(t => t.id === currentTeamId);
      
      if (currentTeam) {
        const captainName = currentTeam.captain ? currentTeam.captain.faceit_nickname : 'DESCONOCIDO';
        const isMyTurn = currentTeam.captain && currentUser && currentTeam.captain.discordId === currentUser.userId;
        
        let turnPickDetail = '';
        if (lobbyState.pickSequence && lobbyState.pickSequence.length > 0) {
          const seq = lobbyState.pickSequence;
          const idx = lobbyState.currentPickIndex;
          let start = idx;
          while (start > 0 && seq[start - 1] === seq[idx]) start--;
          let end = idx;
          while (end < seq.length - 1 && seq[end + 1] === seq[idx]) end++;
          const blockTotal = end - start + 1;
          const pickInBlock = idx - start + 1;
          if (blockTotal > 1) {
            turnPickDetail = ` (ELECCIÓN ${pickInBlock} DE ${blockTotal})`;
          } else {
            turnPickDetail = ` (1 ELECCIÓN)`;
          }
        }

        if (isMyTurn) {
          return {
            className: 'border-2 border-[#FF5500] bg-[#FF5500]/10 text-[#FF5500] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider animate-pulse shadow-[0_0_15px_rgba(255,85,0,0.15)]',
            text: `🌟 ¡ES TU TURNO! ELIGE JUGADOR PARA ${getTeamName(currentTeam).toUpperCase()}${turnPickDetail}`
          };
        } else {
          return {
            className: 'border-2 border-neutral-700 bg-neutral-900/50 text-neutral-400 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider',
            text: `⏳ SELECCIÓN EN CURSO: TURNO DE ${getTeamName(currentTeam).toUpperCase()} (CAP: ${captainName.toUpperCase()})${turnPickDetail}`
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

  // Concept Demo Mode Data vs Live Discord Database
  const effectiveAvailablePlayers = useMemo(() => {
    if (isConceptDemoMode) {
      return {
        S: DEMO_CONCEPT_PLAYERS.filter(p => p.mixton_tier === 'S'),
        A: DEMO_CONCEPT_PLAYERS.filter(p => p.mixton_tier === 'A'),
        B: DEMO_CONCEPT_PLAYERS.filter(p => p.mixton_tier === 'B'),
        C: DEMO_CONCEPT_PLAYERS.filter(p => p.mixton_tier === 'C'),
      };
    }
    return availablePlayers;
  }, [isConceptDemoMode, availablePlayers]);

  const effectiveLobbyState = useMemo<LobbyState>(() => {
    if (isConceptDemoMode) {
      return {
        teams: [DEMO_CONCEPT_TEAM_A, DEMO_CONCEPT_TEAM_B],
        pickOrder: ['demo_team_1', 'demo_team_2'],
        currentPickIndex: 5,
        pickSequence: ['demo_team_1', 'demo_team_2', 'demo_team_2', 'demo_team_1', 'demo_team_1', 'demo_team_1', 'demo_team_2', 'demo_team_2'],
        draftStarted: true,
        draftFinished: false,
        mapVeto: demoMapVeto
      };
    }
    return lobbyState;
  }, [isConceptDemoMode, lobbyState, demoMapVeto]);

  // Filter ready players by search query and tier
  const getFilteredPlayers = () => {
    const filterTierGroup = (tier: string) => {
      const list = effectiveAvailablePlayers[tier] || [];
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
    if (isConceptDemoMode) return true; // Allows testing interactive pick/ban
    if (!lobbyState.draftStarted || lobbyState.draftFinished) return false;
    const currentTeamId = lobbyState.pickSequence?.[lobbyState.currentPickIndex] || lobbyState.pickOrder[lobbyState.currentPickIndex % (lobbyState.pickOrder.length || 1)];
    const currentTeam = lobbyState.teams.find(t => t.id === currentTeamId);
    return !!(currentTeam?.captain && currentUser && currentTeam.captain.discordId === currentUser.userId);
  };

  const isMyTurn = checkIsMyTurn();
  const canInteract = isConceptDemoMode || (lobbyState.draftStarted && !lobbyState.draftFinished && (isMyTurn || currentUser?.isAdmin));

  // Teams with captains for the pick order list editor
  const teamsWithCaptains = effectiveLobbyState.teams.filter(t => t.captain !== null);
  const hasCaptainsForAll = effectiveLobbyState.teams.length >= 2 && effectiveLobbyState.teams.every(t => t.captain !== null);
  
  // Teams that are complete (captain + 4 players) to display in the match selectors
  const completedTeams = effectiveLobbyState.teams.filter(t => t.captain !== null && (t.players?.length || 0) === 4);

  // Ready players list for Captain assignment (only Tier S and A are allowed to be captains)
  const getCaptainEligiblePlayers = () => {
    const list: Player[] = [];
    if (effectiveAvailablePlayers.S) list.push(...effectiveAvailablePlayers.S);
    if (effectiveAvailablePlayers.A) list.push(...effectiveAvailablePlayers.A);
    return list;
  };

  const captainEligiblePlayers = getCaptainEligiblePlayers();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans flex flex-col relative overflow-y-auto">
      {/* Subtle tech grid background to match admin web */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Global Header */}
      <Header
        activeView={activeView}
        setActiveView={handleSelectView}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Page Routing Views */}
      {activeView === 'inicio' && (
        <LandingHomeView
          setActiveView={handleSelectView}
          currentUser={currentUser}
        />
      )}

      {activeView === 'guia-faceit' && (
        <GuiaFaceitView
          setActiveView={handleSelectView}
          currentUser={currentUser}
        />
      )}

      {(activeView === 'cuenta' || activeView === 'login') && (
        <UserWalletView
          currentUser={currentUser}
          onRefreshUser={handleRefreshCurrentUser}
          setActiveView={handleSelectView}
          onLogout={handleLogout}
          showToast={showToast}
        />
      )}

      {activeView === 'terminos' && (
        <TerminosCondicionesView />
      )}

      {activeView === 'devoluciones' && (
        <DevolucionesView />
      )}

      {activeView === 'libro-de-reclamaciones' && (
        <LibroReclamacionesView />
      )}

      {activeView === 'contacto' && (
        <ContactoView />
      )}

      {activeView === 'historial' && (
        <MatchHistoryView
          history={matchHistory}
          isLoading={isHistoryLoading}
          selectedMatch={selectedHistoryMatch}
          isLoadingDetail={isHistoryDetailLoading}
          onSelectMatch={handleSelectHistoryMatch}
          onCloseDetail={() => setSelectedHistoryMatch(null)}
        />
      )}

      {/* Arena / Mixton View: libre acceso para espectadores y jugadores */}
      {(activeView === 'arena' || activeView === 'mixton') && (
        <>
          {/* Aviso para espectadores no autenticados */}
          {!currentUser && (
            <div className="bg-[#141414] border-b border-[#2C2C2C] px-6 py-2.5 text-xs font-mono text-neutral-300 flex flex-wrap items-center justify-between gap-3 relative z-10 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>
                  <strong className="text-white">Modo Espectador en Vivo:</strong> Estás visualizando la sala del Mixtón y los drafts en tiempo real. Para participar como jugador o recargar saldo, accede a tu cuenta.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('login')}
                className="px-3.5 py-1 bg-[#742284] hover:bg-[#8B2FA0] border border-[#A855F7]/60 text-white text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>Entrar a Mi Cuenta</span>
              </button>
            </div>
          )}

          {/* Arena Subheader Bar with Live Stepper */}
          <div className="border-b border-white/10 bg-[#0B0E14] px-4 sm:px-6 py-3 flex flex-col md:flex-row justify-between items-center gap-3 relative z-10 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF5500] text-black flex items-center justify-center font-black rounded-xl shadow-[0_0_15px_rgba(255,85,0,0.4)] flex-shrink-0">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black italic tracking-tighter uppercase leading-none text-white font-mono flex items-center gap-2">
                  SALA MIXTON: <span className="text-[#FF5500]">MACHUPEEK</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-bold uppercase not-italic tracking-wider animate-pulse">
                    ● EN VIVO
                  </span>
                </h2>
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono font-bold mt-0.5">
                  MATCHMAKING & CS2 COMPETITIVE ARENA
                </p>
              </div>
            </div>

            {/* Arena Stage Switcher (Draft vs Veto) and Mode Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Tab Switcher: Draft Lobby vs Map Veto */}
              <div className="flex items-center gap-1 bg-[#121622] p-1 border border-white/10 rounded-xl">
                <button
                  type="button"
                  onClick={() => setArenaStageTab('draft')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    arenaStageTab === 'draft'
                      ? 'bg-[#FF5500] text-black shadow-[0_0_15px_rgba(255,85,0,0.4)]'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Ver sala de selección de jugadores (Draft)"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>1. Draft Lobby</span>
                </button>
                <button
                  type="button"
                  onClick={() => setArenaStageTab('veto')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    arenaStageTab === 'veto'
                      ? 'bg-[#00A3FF] text-black shadow-[0_0_15px_rgba(0,163,255,0.4)]'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Ver fase de descarte de mapas de torneo (Veto)"
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>2. Veto Mapas</span>
                  <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded font-black">CS2</span>
                </button>
              </div>

              {/* Concept Simulation Mode Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !isConceptDemoMode;
                  setIsConceptDemoMode(next);
                  showToast(next ? '⚡ Simulación del Concepto activada (Fénix vs Kobra)' : '🔴 Cambiado a datos en tiempo real de Discord', 'info');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isConceptDemoMode
                    ? 'bg-gradient-to-r from-amber-500/20 to-[#FF5500]/20 border-[#FF5500]/60 text-[#FF5500] shadow-[0_0_15px_rgba(255,85,0,0.25)]'
                    : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                }`}
                title="Alternar entre la simulación visual idéntica al concepto y la cola real de Discord"
              >
                <span className={`w-2 h-2 rounded-full ${isConceptDemoMode ? 'bg-[#FF5500] animate-pulse' : 'bg-neutral-500'}`} />
                <span>{isConceptDemoMode ? '⚡ Concepto Mockup: ON' : '🔴 Datos Discord: LIVE'}</span>
              </button>

              {/* View Mockup Modal */}
              <button
                type="button"
                onClick={() => setShowMockupModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#FF5500]/15 to-purple-600/15 border border-[#FF5500]/40 hover:border-[#FF5500] text-white hover:text-white transition-all text-xs font-mono font-bold uppercase tracking-wider cursor-pointer rounded-xl shadow-md"
                title="Ver vista previa gráfica de la mejora visual del Mixtón"
              >
                <span>🎨</span>
                <span>Ver Mockups</span>
              </button>

              <a 
                href="https://www.faceit.com/es/hub/52a88f17-1660-42ae-8322-76592f0c6f23/Mixtones"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF5500]/10 border border-[#FF5500]/40 text-[#FF5500] hover:bg-[#FF5500] hover:text-black transition-all text-xs font-mono font-bold uppercase tracking-wider rounded-xl"
                title="Abrir Hub de Faceit en una pestaña nueva"
              >
                <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
                Hub Faceit
              </a>
            </div>
          </div>

          {/* Concept Mode Notification Banner */}
          {isConceptDemoMode && (
            <div className="bg-gradient-to-r from-amber-950/40 via-[#10141E] to-[#FF5500]/15 border-b border-[#FF5500]/30 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-ping" />
                <span className="text-white font-bold">
                  <strong className="text-[#FF5500]">VISTA PREVIA ACTIVA DEL CONCEPTO GRÁFICO:</strong> Mostrando el enfrentamiento <strong>EQUIPO FÉNIX VS EQUIPO KOBRA</strong> con 10 jugadores y veto interactivo idéntico al mockup aprobado.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsConceptDemoMode(false);
                    showToast('🔴 Mostrando cola real del bot de Discord', 'info');
                  }}
                  className="px-2.5 py-1 bg-black/60 hover:bg-neutral-800 border border-white/20 text-neutral-300 hover:text-white text-[10px] uppercase font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Ver datos Discord ({availablePlayers.S?.length || 0} listos)
                </button>
              </div>
            </div>
          )}

          {/* Stepper Banner Container */}
          <div className="px-4 sm:px-6 pt-4 pb-0 bg-[#08090C]">
            <MixtonLiveStepper
              lobbyState={effectiveLobbyState}
              totalReadyCount={totalReadyCountVal}
              requiredPlayers={numTeamsSelect * 5}
              currentUser={currentUser}
              onOpenGuide={() => handleSelectView('guia-faceit')}
              showToast={showToast}
              activeStageTab={arenaStageTab}
            />
          </div>

          {/* Main Content Grid */}
          <main className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 p-4 sm:p-6 relative z-10 lg:overflow-hidden overflow-y-auto lg:max-h-[calc(100vh-140px)]">
        
        {/* Left Panel: Available Players */}
        <section className="lg:col-span-1 p-4 sm:p-5 bg-[#0D1017]/95 border border-white/10 shadow-2xl flex flex-col lg:max-h-[calc(100vh-140px)] rounded-2xl backdrop-blur-md">
          <div className="mb-3.5 pb-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-black italic tracking-tighter uppercase text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#FF5500]" /> JUGADORES LISTOS
              </h2>
              <span className="text-[10px] font-mono bg-[#FF5500]/15 border border-[#FF5500]/40 px-2.5 py-0.5 text-[#FF5500] font-black uppercase tracking-wider rounded-lg shadow-sm">
                {totalReadyCountVal} EN COLA
              </span>
            </div>
            <p className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Escribe <strong className="text-white">/mixton_listo</strong> en Discord</span>
            </p>
          </div>
          
          {/* Tier Filter Tabs */}
          <div className="grid grid-cols-5 gap-1 mb-3">
            {['ALL', 'S', 'A', 'B', 'C'].map(tier => (
              <button 
                key={tier}
                className={`py-1.5 text-[9px] font-mono font-black uppercase tracking-wider border rounded-lg transition-all cursor-pointer ${
                  selectedTier === tier 
                    ? 'bg-[#FF5500] text-black border-[#FF5500] shadow-[0_0_10px_rgba(255,85,0,0.4)]' 
                    : 'bg-[#121622] text-neutral-400 border-white/10 hover:border-white/30 hover:text-white'
                }`}
                onClick={() => setSelectedTier(tier)}
              >
                {tier === 'ALL' ? 'TODOS' : `TIER ${tier}`}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative mb-3.5">
            <input 
              type="text" 
              className="w-full bg-[#121622] border border-white/15 text-xs font-mono text-white placeholder-neutral-500 px-3 py-2 pl-8 focus:outline-none focus:border-[#FF5500] focus:ring-1 focus:ring-[#FF5500] transition-all rounded-xl"
              placeholder="BUSCAR JUGADOR..." 
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
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
                      <span className={`text-[9px] font-black px-2 py-0.5 border rounded ${
                        tier === 'S' ? 'border-red-500/80 text-red-400 bg-red-950/30' :
                        tier === 'A' ? 'border-[#FF5500]/80 text-[#FF5500] bg-orange-950/30' :
                        tier === 'B' ? 'border-blue-500/80 text-blue-400 bg-blue-950/30' :
                        'border-neutral-600 text-neutral-400 bg-neutral-900/60'
                      }`}>
                        TIER {tier}
                      </span>
                      <div className="flex-1 h-[1px] bg-white/10" />
                    </div>

                    <div className="space-y-1.5">
                      {players.map(player => {
                        const isPendingThis = pendingPick && pendingPick.discordId === player.discordId;
                        const avatarURL = player.discordUser?.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';

                        return (
                          <div 
                            key={player.discordId}
                            className={`p-2.5 bg-[#121622]/90 border transition-all flex items-center justify-between gap-2 rounded-xl group ${
                              isPendingThis 
                                ? 'border-[#FF5500] bg-[#FF5500]/15 ring-2 ring-[#FF5500]/50 shadow-[0_0_15px_rgba(255,85,0,0.3)] animate-pulse' 
                                : 'border-white/10 hover:border-[#FF5500]/50 hover:bg-[#161C2C]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <div className="relative flex-shrink-0">
                                <img 
                                  className="w-8 h-8 rounded-full border border-white/20 object-cover" 
                                  src={avatarURL} 
                                  alt="Avatar" 
                                />
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black absolute -bottom-0.5 -right-0.5" title="En línea" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-white leading-tight truncate group-hover:text-[#FF5500] transition-colors">
                                  {player.discordUser?.displayName || player.faceit_nickname}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <a 
                                    href={`https://www.faceit.com/es/players/${player.faceit_nickname}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[9px] text-neutral-400 hover:text-[#FF5500] hover:underline leading-none font-mono truncate"
                                    title="Ver perfil de Faceit"
                                  >
                                    {player.faceit_nickname} ↗
                                  </a>
                                  {player.faceit_elo && (
                                    <span className="text-[8px] text-neutral-400 bg-black/60 px-1 py-0.2 rounded border border-white/10">
                                      {player.faceit_elo} ELO
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 border font-mono rounded ${
                                player.faceit_level === 10 ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                                player.faceit_level >= 8 ? 'bg-gradient-to-r from-[#FF5500] to-amber-600 text-white border-orange-500/80 shadow-[0_0_6px_rgba(255,85,0,0.4)]' :
                                player.faceit_level >= 5 ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-blue-500/80' :
                                'bg-neutral-800 text-neutral-300 border-neutral-700'
                              }`}>
                                LVL {player.faceit_level}
                              </span>

                              {currentUser?.isAdmin && !isConceptDemoMode && (
                                <div className="flex gap-1">
                                  {/* Admin override select */}
                                  <select 
                                    className="bg-[#1A2030] border border-white/20 text-[9px] font-mono text-neutral-300 px-1 py-0.5 focus:outline-none focus:text-white focus:border-[#FF5500] rounded cursor-pointer"
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
                                    className="bg-[#1A2030] border border-white/20 text-[9px] font-mono text-neutral-300 px-1 py-0.5 focus:outline-none focus:text-white focus:border-[#FF5500] rounded cursor-pointer"
                                    value=""
                                    onChange={(e) => handleAssignPlayerToTeam(player.discordId, e.target.value)}
                                  >
                                    <option value="">ASIG...</option>
                                    {effectiveLobbyState.teams.map(t => (
                                      <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>
                                    ))}
                                  </select>

                                  {/* Remove player from queue */}
                                  <button
                                    className="p-1 bg-red-950/60 border border-red-700/60 hover:bg-red-900 hover:text-white text-red-300 transition-colors rounded cursor-pointer"
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
                                      className="bg-emerald-500 text-black border border-emerald-400 font-mono text-[9px] font-black px-2 py-0.5 hover:bg-emerald-400 transition-colors shadow-sm cursor-pointer rounded"
                                      onClick={handleConfirmPendingPlayer}
                                      title="Confirmar elección"
                                    >
                                      ✓ OK
                                    </button>
                                    <button 
                                      className="bg-red-950 border border-red-500 text-red-300 font-mono text-[9px] font-black px-1.5 py-0.5 hover:bg-red-900 transition-colors cursor-pointer rounded"
                                      onClick={handleCancelPendingPlayer}
                                      title="Cancelar"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    className="bg-[#FF5500] hover:bg-[#FF7733] border border-[#FF5500] text-black font-mono text-[9px] font-black tracking-wider px-2.5 py-1 transition-all shadow-[0_0_10px_rgba(255,85,0,0.3)] hover:scale-105 active:scale-95 cursor-pointer rounded-lg"
                                    onClick={() => {
                                      if (isConceptDemoMode) {
                                        showToast(`🎯 [Simulación] Seleccionaste a ${player.faceit_nickname} (Nivel ${player.faceit_level}) para EQUIPO FÉNIX`, 'success');
                                      } else {
                                        handleSelectPendingPlayer(player);
                                      }
                                    }}
                                    title="Elegir para tu equipo"
                                  >
                                    ELEGIR
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
              <div className="text-center py-10 border border-dashed border-white/10 bg-[#121622]/40 rounded-xl p-4">
                <Users className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-xs text-neutral-400 font-mono uppercase font-bold">SIN JUGADORES EN COLA</p>
                <p className="text-[10px] text-neutral-500 font-mono mt-1">Usa /mixton_listo en Discord para sumarte</p>
                <button
                  type="button"
                  onClick={() => setIsConceptDemoMode(true)}
                  className="mt-3 px-3 py-1.5 bg-[#FF5500]/20 hover:bg-[#FF5500]/30 border border-[#FF5500]/50 text-[#FF5500] text-[10px] font-mono font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  ⚡ Activar Simulación Mockup
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Center & Right Panel */}
        <section className="lg:col-span-3 flex flex-col gap-5 lg:overflow-y-auto lg:max-h-[calc(100vh-140px)] pr-2">
          
          {/* TOURNAMENT BROADCAST CS2 MAP VETO STAGE */}
          {arenaStageTab === 'veto' ? (
            <div className="bg-[#0A0D14]/95 border-2 border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6 backdrop-blur-md font-mono flex flex-col gap-4">
              {/* Veto Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-[#FF5500] text-black flex items-center justify-center font-black rounded-xl shadow-[0_0_20px_rgba(255,85,0,0.5)] flex-shrink-0">
                    <Flame className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                      FASE DE VETO DE MAPAS CS2 <span className="text-[#FF5500]">// MACHUPEEK ARENA</span>
                    </h3>
                    <p className="text-[10px] text-neutral-400">
                      Baneo alternado por turnos hasta definir el mapa competitivo oficial
                    </p>
                  </div>
                </div>

                {/* Matchup Badges */}
                <div className="flex items-center gap-2 bg-[#090C12] px-4 py-2 border border-white/15 rounded-xl shadow-md text-xs">
                  <span className="font-black text-[#FF5500] tracking-wider">
                    EQUIPO FÉNIX <span className="text-[9px] font-normal text-neutral-400">(Cap. s4vitar)</span>
                  </span>
                  <span className="text-white font-black text-[10px] px-2 py-0.5 bg-neutral-800 border border-neutral-700 rounded">
                    VS
                  </span>
                  <span className="font-black text-[#00A3FF] tracking-wider">
                    EQUIPO KOBRA <span className="text-[9px] font-normal text-neutral-400">(Cap. shadow)</span>
                  </span>
                </div>

                {/* Veto controls */}
                <div className="flex items-center gap-2">
                  {isConceptDemoMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setDemoMapVeto(DEMO_CONCEPT_MAP_VETO);
                        showToast('↺ Simulación de Veto de Mapas reiniciada', 'info');
                      }}
                      className="text-xs text-neutral-300 hover:text-white border border-white/15 hover:border-white/40 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer bg-white/5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reiniciar Veto</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setArenaStageTab('draft')}
                    className="text-xs text-[#FF5500] hover:text-white border border-[#FF5500]/40 hover:border-[#FF5500] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer bg-[#FF5500]/10"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>Volver a Draft</span>
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              {(() => {
                const veto = effectiveLobbyState.mapVeto || demoMapVeto;
                if (veto.completed && veto.chosenMap) {
                  return (
                    <div className="bg-gradient-to-r from-emerald-950/80 via-emerald-900/40 to-emerald-950/80 border-2 border-emerald-400 rounded-xl p-4 sm:p-5 text-center flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500 text-black font-black flex items-center justify-center text-2xl rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.6)]">
                          <Trophy className="w-6 h-6 text-black fill-current" />
                        </div>
                        <div className="text-left">
                          <span className="text-xs uppercase text-emerald-400 font-black tracking-widest block">
                            🏆 MAPA FINAL DECIDIDO
                          </span>
                          <span className="text-xl font-black text-white uppercase tracking-wider">
                            {veto.chosenMap.name} ({veto.chosenMap.id})
                          </span>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-emerald-300 bg-black/60 px-4 py-2 border border-emerald-500/40 rounded-lg">
                        ¡Veto completado exitosamente! El servidor CS2 cargará este mapa.
                      </div>
                    </div>
                  );
                }

                const teamInTurnName = veto.currentBanIndex % 2 === 0 ? 'EQUIPO FÉNIX' : 'EQUIPO KOBRA';
                return (
                  <div className="bg-gradient-to-r from-[#FF5500]/20 via-[#10141E] to-[#00A3FF]/20 border-2 border-[#FF5500]/70 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_25px_rgba(255,85,0,0.25)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#FF5500] text-black font-black flex items-center justify-center text-xl rounded-lg shadow-md animate-pulse">
                        🎯
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-[#FF5500] tracking-widest bg-[#FF5500]/20 border border-[#FF5500]/40 px-2 py-0.5 rounded">
                            👉 TURNO DE BANEO: {teamInTurnName}
                          </span>
                          <span className="text-[10px] text-neutral-400 bg-black/60 px-2 py-0.5 rounded border border-white/10">
                            BANEO {veto.currentBanIndex + 1} DE 6
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-white mt-1">
                          Haz clic sobre el mapa que deseas descartar para esta partida
                        </p>
                      </div>
                    </div>
                    <div className="text-xs font-mono font-bold text-neutral-300 bg-black/70 px-3.5 py-2 border border-white/10 rounded-lg">
                      {7 - (veto.bannedMaps?.length || 0)} Mapas restantes
                    </div>
                  </div>
                );
              })()}

              {/* 7 Maps Grid */}
              {(() => {
                const veto = effectiveLobbyState.mapVeto || demoMapVeto;
                const pool = (veto.pool && veto.pool.length > 0) ? veto.pool : DEMO_CONCEPT_MAP_VETO.pool;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {pool.map(mapItem => {
                      const isBanned = (veto.bannedMaps || []).includes(mapItem.id);
                      const isChosen = veto.chosenMap?.id === mapItem.id || (veto.completed && !isBanned);
                      const banEntry = (veto.banHistory || []).find(b => b.mapId === mapItem.id);
                      const canBanThis = !veto.completed && !isBanned;

                      return (
                        <div
                          key={mapItem.id}
                          onClick={() => {
                            if (canBanThis) {
                              if (isConceptDemoMode) {
                                handleDemoBanMap(mapItem.id);
                              } else if (lobbyState.mapVeto?.active) {
                                handleBanMap(mapItem.id);
                              }
                            }
                          }}
                          className={`relative group rounded-2xl overflow-hidden h-72 sm:h-80 lg:h-[340px] flex flex-col justify-between p-3 select-none transition-all duration-300 ${
                            isChosen
                              ? 'border-4 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.7)] ring-4 ring-emerald-400/40 scale-[1.03]'
                              : isBanned
                                ? 'border-2 border-red-950/80 opacity-60 cursor-not-allowed'
                                : canBanThis
                                  ? 'border-2 border-white/20 hover:border-[#FF5500] hover:scale-[1.03] hover:shadow-[0_0_25px_rgba(255,85,0,0.5)] cursor-pointer'
                                  : 'border border-white/10 opacity-70'
                          }`}
                        >
                          {/* Background Map Image */}
                          <div 
                            className={`absolute inset-0 bg-cover bg-center transition-transform duration-500 ${
                              isChosen ? 'scale-110 filter saturate-125' : isBanned ? 'filter grayscale contrast-125' : 'group-hover:scale-105'
                            }`}
                            style={{ backgroundImage: `url(${mapItem.image})` }}
                          />

                          {/* Dark Overlay Gradient */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70 pointer-events-none" />

                          {/* Banned Diagonal Red Slash Overlay */}
                          {isBanned && (
                            <div className="absolute inset-0 bg-red-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 text-center z-10 pointer-events-none border-2 border-red-600/70 rounded-2xl">
                              <div className="w-12 h-12 rounded-full bg-red-600/30 border-2 border-red-500 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(239,68,68,0.6)]">
                                <X className="w-8 h-8 text-red-400" />
                              </div>
                              <span className="text-[11px] font-black text-red-300 uppercase tracking-widest bg-red-950/90 px-2 py-0.5 border border-red-500/50 rounded">
                                BANEADO
                              </span>
                              {banEntry && (
                                <span className="text-[9px] text-red-200 uppercase font-mono font-bold mt-1.5 px-1 bg-black/60 rounded">
                                  POR {banEntry.teamName || 'RIVAL'}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Decider Trophy Badge */}
                          {isChosen && (
                            <div className="absolute top-3 left-3 right-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-[10px] py-1 px-2 uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.8)] z-10 rounded-lg">
                              <Trophy className="w-3.5 h-3.5 fill-current" />
                              <span>MAPA DECIDIDO</span>
                            </div>
                          )}

                          {/* Top Pin / Crest */}
                          <div className="relative z-10 flex justify-end">
                            {mapItem.icon ? (
                              <img src={mapItem.icon} alt={mapItem.name} className="w-9 h-9 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]" />
                            ) : (
                              <span className="text-[10px] font-black text-white/60 bg-black/60 px-1.5 py-0.5 rounded border border-white/10">CS2</span>
                            )}
                          </div>

                          {/* Bottom Card Footer */}
                          <div className="relative z-10 flex flex-col gap-1.5">
                            <h4 className="text-base sm:text-lg font-black italic tracking-tighter uppercase text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                              {mapItem.name}
                            </h4>

                            {canBanThis && (
                              <button
                                type="button"
                                className="w-full py-1.5 bg-[#FF5500] hover:bg-[#FF7733] text-black font-black uppercase text-[10px] tracking-wider rounded-lg transition-all shadow-[0_0_15px_rgba(255,85,0,0.4)] flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <span>✕</span> CLIC PARA BANEAR
                              </button>
                            )}

                            {!isBanned && !isChosen && !canBanThis && (
                              <span className="text-[9px] text-center uppercase tracking-widest text-emerald-400 font-bold bg-black/60 py-1 rounded border border-emerald-500/20">
                                DISPONIBLE
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Ban History Breadcrumb */}
              {(() => {
                const veto = effectiveLobbyState.mapVeto || demoMapVeto;
                return (
                  <div className="bg-[#090C12] border border-white/10 rounded-xl p-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-neutral-400 uppercase text-[10px] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#FF5500]" /> HISTORIAL DE BANEOS:
                    </span>
                    {(veto.banHistory && veto.banHistory.length > 0) ? (
                      veto.banHistory.map((h, idx) => (
                        <span key={idx} className="flex items-center gap-1.5 bg-[#141824] px-2.5 py-1 rounded border border-white/10 text-[10px]">
                          <span className="text-[#FF5500] font-black">{idx + 1}.</span>
                          <span className="text-white font-bold">{h.mapName}</span>
                          <span className="text-neutral-400">({h.teamName})</span>
                          {idx < (veto.banHistory?.length || 0) - 1 && <span className="text-neutral-600">➔</span>}
                        </span>
                      ))
                    ) : (
                      <span className="text-neutral-500 text-[10px]">Aún no se han realizado descartes de mapas</span>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <>
              {/* Hero Live Action Status Card */}
              {(() => {
                const currentActiveTeamId = effectiveLobbyState.pickSequence?.[effectiveLobbyState.currentPickIndex] || effectiveLobbyState.pickOrder[effectiveLobbyState.currentPickIndex % (effectiveLobbyState.pickOrder.length || 1)];
                const activeTeam = effectiveLobbyState.teams.find(t => t.id === currentActiveTeamId);
                const isTeamTurn = effectiveLobbyState.draftStarted && !effectiveLobbyState.draftFinished && activeTeam;
                const isVetoActive = effectiveLobbyState.mapVeto && (effectiveLobbyState.mapVeto.active || effectiveLobbyState.mapVeto.completed);

                if (isVetoActive && !isTeamTurn) {
                  return (
                    <div className="p-4 bg-gradient-to-r from-purple-950/40 via-[#10141E] to-[#00A3FF]/20 border border-purple-500/40 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-600 text-white flex items-center justify-center font-black text-xl rounded-xl shadow-md flex-shrink-0">
                          🗺️
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest bg-purple-500/20 border border-purple-500/40 px-2.5 py-0.5 rounded">
                            FASE DE VETO DE MAPAS EN CURSO
                          </span>
                          <p className="text-xs sm:text-sm font-bold text-white mt-1">
                            Los capitanes están descartando mapas competitivos de CS2
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setArenaStageTab('veto')}
                        className="px-4 py-2 bg-[#00A3FF] hover:bg-[#33B5FF] text-black font-black uppercase text-xs rounded-xl shadow-[0_0_15px_rgba(0,163,255,0.4)] transition-all cursor-pointer"
                      >
                        Abrir Veto de Mapas ➔
                      </button>
                    </div>
                  );
                }

                if (isTeamTurn) {
                  const captainNick = activeTeam.captain?.discordUser?.displayName || activeTeam.captain?.faceit_nickname || 'Capitán';
                  const isMyTurn = isConceptDemoMode || (activeTeam.captain && currentUser && activeTeam.captain.discordId === currentUser.userId);
                  const totalPicks = effectiveLobbyState.pickSequence?.length || 8;
                  const currentPickNum = (effectiveLobbyState.currentPickIndex || 0) + 1;

                  return (
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-[#FF5500]/20 via-[#121622] to-[#00A3FF]/20 border-2 border-[#FF5500]/60 shadow-[0_0_30px_rgba(255,85,0,0.25)] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 font-mono relative overflow-hidden">
                      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#FF5500]/10 to-transparent pointer-events-none" />
                      <div className="flex items-center gap-3.5 relative z-10">
                        <div className="w-12 h-12 bg-[#FF5500] text-black font-black flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(255,85,0,0.6)] animate-pulse flex-shrink-0 rounded-xl">
                          🔥
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-[#FF5500] tracking-widest bg-[#FF5500]/20 border border-[#FF5500]/40 px-2.5 py-0.5 rounded-md">
                              DRAFT EN VIVO // TURNO DE ELECCIÓN
                            </span>
                            <span className="text-[10px] font-bold text-neutral-400 bg-black/60 px-2.5 py-0.5 border border-white/10 rounded-md">
                              ELECCIÓN {currentPickNum} DE {totalPicks}
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-white uppercase mt-1">
                            Capitán <span className="text-[#FF5500]">{captainNick}</span> eligiendo para <span className="text-white underline">{getTeamName(activeTeam)}</span>
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 relative z-10">
                        {/* Countdown Badge */}
                        <div className="flex items-center gap-2 bg-black/80 border border-amber-500/50 text-amber-400 px-3.5 py-2 text-xs font-mono font-bold rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                          <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                          <span>00:45s</span>
                        </div>

                        {isMyTurn ? (
                          <div className="flex items-center gap-2 bg-[#FF5500] text-black px-4 py-2 font-black text-xs uppercase tracking-wider animate-bounce shadow-lg rounded-xl">
                            <span>👉</span>
                            <span>¡ES TU TURNO! HAZ CLIC EN "ELEGIR"</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-black/70 border border-white/20 text-neutral-300 px-3.5 py-2 text-xs font-bold rounded-xl">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5500] animate-ping" />
                            <span>Esperando selección de {captainNick}...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                if (effectiveLobbyState.draftFinished) {
                  return (
                    <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-[#10141E] to-emerald-950/40 border border-emerald-500/50 shadow-xl rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 text-black flex items-center justify-center font-black text-xl shadow-[0_0_15px_rgba(16,185,129,0.5)] flex-shrink-0 rounded-xl">
                          ✓
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                              DRAFT COMPLETADO
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              Equipos listos para el Sorteo de Enfrentamientos y Veto de Mapas
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base font-black text-white uppercase mt-0.5">
                            Todas las escuadras están completas con 5 jugadores
                          </h3>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setArenaStageTab('veto')}
                        className="px-4 py-2 bg-[#00A3FF] hover:bg-[#33B5FF] text-black font-black uppercase text-xs rounded-xl shadow-[0_0_15px_rgba(0,163,255,0.4)] transition-all cursor-pointer"
                      >
                        Ir a Veto de Mapas CS2 ➔
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="p-4 bg-[#0D1017]/95 border border-white/10 shadow-lg rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#161C2C] border border-white/15 text-[#FF5500] flex items-center justify-center font-black text-base flex-shrink-0 rounded-xl">
                        <Swords className="w-5 h-5 text-[#FF5500]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-[#FF5500] tracking-widest bg-[#FF5500]/10 border border-[#FF5500]/30 px-2 py-0.5 rounded">
                            SALA PRE-DRAFT
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {totalReadyCountVal} / {numTeamsSelect * 5} JUGADORES LISTOS
                          </span>
                        </div>
                        <span className="text-xs font-bold text-white block mt-0.5">
                          {totalReadyCountVal >= numTeamsSelect * 5 
                            ? '¡Convocatoria completa! Listo para configurar capitanes e iniciar el draft' 
                            : `Faltan ${Math.max(0, numTeamsSelect * 5 - totalReadyCountVal)} jugadores para completar los equipos`}
                        </span>
                      </div>
                    </div>
                    {isConceptDemoMode && (
                      <span className="text-xs font-bold text-amber-400 bg-amber-950/30 border border-amber-500/40 px-3 py-1.5 rounded-lg">
                        ⚡ Mostrando Draft de Simulación (Fénix vs Kobra)
                      </span>
                    )}
                  </div>
                );
              })()}
              
              {/* Collapsible Admin Dashboard Section */}
              {currentUser?.isAdmin && !isConceptDemoMode && (
                <div className="bg-[#0D1017]/95 border border-white/10 shadow-2xl rounded-2xl overflow-hidden font-mono transition-all">
                  <div 
                    className="p-3.5 sm:p-4 bg-[#121622] flex items-center justify-between cursor-pointer hover:bg-[#161C2C] transition-colors border-b border-white/5"
                    onClick={() => setIsAdminControlsOpen(!isAdminControlsOpen)}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-[#FF5500]" />
                      <h3 className="text-xs sm:text-sm font-black italic tracking-tighter uppercase text-white font-mono flex items-center gap-2">
                        PANEL DE CONTROL DE ADMINISTRACIÓN
                        <span className="text-[9px] not-italic font-bold bg-[#FF5500]/15 text-[#FF5500] border border-[#FF5500]/30 px-2 py-0.5 rounded">
                          {isAdminControlsOpen ? 'DESPLEGADO' : 'OCULTO'}
                        </span>
                      </h3>
                    </div>
                    <button 
                      type="button" 
                      className="text-xs font-mono font-bold text-neutral-400 hover:text-white flex items-center gap-1.5 cursor-pointer bg-white/5 px-2.5 py-1 rounded border border-white/10"
                    >
                      {isAdminControlsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>{isAdminControlsOpen ? 'Plegar controles' : 'Desplegar panel admin'}</span>
                    </button>
                  </div>
                  
                  {isAdminControlsOpen && (
                    <div className="p-4 sm:p-5 flex flex-col gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
                        {/* 1. Setup Teams Count */}
                        <div className="p-3 bg-[#161616] border border-[#222] rounded-xl flex flex-col justify-between gap-3">
                          <div>
                            <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">CANTIDAD DE EQUIPOS</label>
                            <select 
                              className="w-full bg-[#222] border border-[#333] text-xs font-mono text-white px-2 py-1 focus:outline-none focus:border-white rounded-lg cursor-pointer"
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
                            className="w-full bg-white text-black font-bold uppercase py-1 border border-white hover:bg-neutral-200 transition-colors disabled:opacity-30 disabled:hover:bg-white rounded-lg"
                            onClick={handleSetupTeams}
                            disabled={lobbyState.draftStarted || lobbyState.draftFinished}
                          >
                            CONFIGURAR EQUIPOS
                          </button>
                        </div>

                        {/* 2. Reorder Capitanes / Pick Order */}
                        <div className="p-3 bg-[#161616] border border-[#222] rounded-xl flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase text-neutral-400 block">ORDEN DE ELECCIÓN</label>
                          <div className="border border-[#222] bg-[#111] max-h-24 overflow-y-auto p-1.5 space-y-1 rounded-lg">
                            {!lobbyState.draftStarted && !lobbyState.draftFinished && teamsWithCaptains.length > 0 ? (
                              localPickOrder.map((teamId, index) => {
                                const team = lobbyState.teams.find(t => t.id === teamId);
                                if (!team) return null;
                                return (
                                  <div 
                                    key={teamId} 
                                    className={`flex items-center justify-between text-[9px] p-1 border rounded transition-all duration-75 ${
                                      isShuffling 
                                        ? 'border-[#FF5500] bg-[#FF5500]/5 text-[#FF5500] scale-[0.98] blur-[0.2px] animate-pulse' 
                                        : 'bg-[#181818] border-[#222] text-white'
                                    }`}
                                  >
                                    <span className="font-bold">{index + 1}. {getTeamName(team).toUpperCase()}</span>
                                    <div className="flex gap-1">
                                      <button 
                                        className="p-0.5 bg-[#252525] border border-[#333] hover:border-white text-neutral-400 hover:text-white disabled:opacity-20 rounded"
                                        onClick={() => handleMoveOrder(index, -1)} 
                                        disabled={index === 0 || isShuffling}
                                      >
                                        <ArrowUp className="w-2.5 h-2.5" />
                                      </button>
                                      <button 
                                        className="p-0.5 bg-[#252525] border border-[#333] hover:border-white text-neutral-400 hover:text-white disabled:opacity-20 rounded"
                                        onClick={() => handleMoveOrder(index, 1)} 
                                        disabled={index === localPickOrder.length - 1 || isShuffling}
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
                                  const currentActiveTeamId = lobbyState.pickSequence?.[lobbyState.currentPickIndex] || lobbyState.pickOrder[lobbyState.currentPickIndex % (lobbyState.pickOrder.length || 1)];
                                  const isCurrent = lobbyState.draftStarted && currentActiveTeamId === teamId;
                                  return (
                                    <div key={teamId} className={`flex items-center justify-between text-[9px] p-1 border rounded ${
                                      isCurrent ? 'border-[#FF5500] bg-[#FF5500]/5 text-[#FF5500]' : 'border-[#222] bg-[#151515] text-neutral-400'
                                    }`}>
                                      <span>{index + 1}. {getTeamName(team).toUpperCase()}</span>
                                      {isCurrent && <span className="font-bold animate-pulse text-[8px] bg-[#FF5500] text-black px-1 rounded">TURNO</span>}
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
                              className="bg-transparent border border-neutral-600 hover:border-white text-white font-bold uppercase py-0.5 text-[10px] transition-colors disabled:opacity-30 rounded"
                              onClick={handleSavePickOrder}
                              disabled={lobbyState.draftStarted || lobbyState.draftFinished || !isSavingOrder || teamsWithCaptains.length === 0 || isShuffling}
                            >
                              GUARDAR ORDEN
                            </button>
                            <button 
                              className="bg-transparent border border-neutral-600 hover:border-white text-white font-bold uppercase py-0.5 text-[10px] transition-colors disabled:opacity-30 rounded"
                              onClick={handleRandomizeOrder}
                              disabled={lobbyState.draftStarted || lobbyState.draftFinished || teamsWithCaptains.length === 0 || isShuffling}
                            >
                              MEZCLAR
                            </button>
                          </div>
                        </div>

                        {/* 3. Actions (Start, Reset, Command Toggle) */}
                        <div className="p-3 bg-[#161616] border border-[#222] rounded-xl flex flex-col justify-between gap-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              className="bg-white text-black font-bold uppercase text-[10px] py-1 border border-white hover:bg-neutral-200 transition-colors disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center gap-1.5 rounded-lg"
                              onClick={handleStartDraft}
                              disabled={lobbyState.draftStarted || lobbyState.draftFinished || !hasCaptainsForAll}
                            >
                              <Play className="w-3 h-3 fill-current" />
                              {lobbyState.draftStarted ? 'EN CURSO' : 'INICIAR DRAFT'}
                            </button>
                            <button 
                              className="bg-red-950 border border-[#FF3E3E] text-[#FF3E3E] font-bold uppercase text-[10px] py-1 hover:bg-red-900 transition-colors flex items-center justify-center gap-1.5 rounded-lg"
                              onClick={handleResetLobby}
                            >
                              <RotateCcw className="w-3 h-3" />
                              REINICIAR
                            </button>
                          </div>

                          {/* Botón de Asignación Automática y Balanceo */}
                          <button 
                            className="w-full bg-[#1B9AAA]/20 hover:bg-[#1B9AAA]/30 border border-[#1B9AAA] text-[#1B9AAA] font-bold uppercase text-[10px] py-1.5 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-30 cursor-pointer shadow-[0_0_10px_rgba(27,154,170,0.15)] rounded-lg"
                            onClick={handleAutoAssignPlayers}
                            disabled={!hasCaptainsForAll || lobbyState.draftFinished || isAutoAssigning}
                            title="Asigna y balancea automáticamente a los jugadores disponibles por Tier / ELO (requiere capitanes asignados)"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            {isAutoAssigning ? 'BALANCEANDO EQUIPOS...' : '⚡ AUTO-ASIGNAR JUGADORES'}
                          </button>
                          
                          <button 
                            className="w-full bg-transparent border border-yellow-600 hover:border-yellow-500 text-yellow-500 font-bold uppercase text-[10px] py-0.5 transition-colors rounded-lg"
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
                              <div className="w-8 h-4 bg-[#2D2D2D] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-neutral-400 after:border after:h-3 after:w-3.5 after:transition-all peer-checked:bg-[#FF5500] peer-checked:after:bg-white peer-checked:after:border-white after:rounded-full" />
                            </label>
                          </div>
                        </div>

                        {/* 4. Map Pool CS2 */}
                        <div className="p-3 bg-[#161616] border border-[#222] rounded-xl flex flex-col justify-between gap-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-black uppercase text-neutral-400 block">POOL DE MAPAS VETO</label>
                              <span className="text-[9px] font-bold text-[#FF5500] bg-[#FF5500]/10 border border-[#FF5500]/30 px-1.5 py-0.5 rounded">
                                {(localMapCatalog.length > 0 ? localMapCatalog : (lobbyState.mapCatalog || [])).filter(m => m.active).length} ACTIVOS
                              </span>
                            </div>
                            <p className="text-[9px] text-neutral-500 uppercase leading-relaxed mb-2">
                              Configura qué mapas y cuántos se jugarán en la fase de veto.
                            </p>
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1.5 bg-[#111] border border-[#222] rounded-lg">
                              {(localMapCatalog.length > 0 ? localMapCatalog : (lobbyState.mapCatalog || [])).filter(m => m.active).map(m => (
                                <span key={m.id} className="text-[8px] bg-neutral-800 text-neutral-300 border border-neutral-700 px-1.5 py-0.5 truncate max-w-[85px] rounded">
                                  {m.name}
                                </span>
                              ))}
                            </div>
                          </div>

                          <button 
                            className="w-full bg-[#FF5500] text-black font-black uppercase text-[10px] py-1.5 hover:bg-[#e04c00] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_8px_rgba(255,85,0,0.2)] rounded-lg"
                            onClick={() => {
                              if (lobbyState.mapCatalog && Array.isArray(lobbyState.mapCatalog)) {
                                setLocalMapCatalog(lobbyState.mapCatalog);
                              }
                              setIsMapManagerOpen(true);
                            }}
                          >
                            <Map className="w-3.5 h-3.5" />
                            CONFIGURAR MAPAS
                          </button>
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
                                className="flex-1 bg-[#1A1A1A] border border-[#2D2D2D] text-xs font-mono text-white px-2 py-1.5 focus:outline-none focus:border-white rounded-lg cursor-pointer"
                                value={matchTeamA}
                                onChange={(e) => setMatchTeamA(e.target.value)}
                              >
                                <option value="">-- ELIGE EQUIPO A --</option>
                                {completedTeams.map(t => (
                                  <option key={t.id} value={t.id}>{getTeamName(t).toUpperCase()} ({getAvgEloMatch(t)} ELO)</option>
                                ))}
                              </select>
                              <span className="text-neutral-500 font-bold uppercase text-[9px]">VS</span>
                              <select 
                                className="flex-1 bg-[#1A1A1A] border border-[#2D2D2D] text-xs font-mono text-white px-2 py-1.5 focus:outline-none focus:border-white rounded-lg cursor-pointer"
                                value={matchTeamB}
                                onChange={(e) => setMatchTeamB(e.target.value)}
                              >
                                <option value="">-- ELIGE EQUIPO B --</option>
                                {completedTeams.map(t => (
                                  <option key={t.id} value={t.id}>{getTeamName(t).toUpperCase()} ({getAvgEloMatch(t)} ELO)</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              className="bg-transparent border border-neutral-600 hover:border-white text-white font-bold uppercase text-[10px] py-1.5 px-4 rounded-lg transition-all disabled:opacity-30 cursor-pointer"
                              disabled={completedTeams.length < 2 || isLaunchingMatch}
                              onClick={handleOpenMatchupRoulette}
                            >
                              🎲 SORTEAR
                            </button>
                            <button 
                              className="bg-[#FF5500] hover:bg-[#FF7733] border border-[#FF5500] hover:border-[#FF7733] text-white font-bold uppercase text-[10px] py-1.5 px-6 rounded-lg transition-all disabled:opacity-30 cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,85,0,0.3)]"
                              disabled={!matchTeamA || !matchTeamB || matchTeamA === matchTeamB || isLaunchingMatch || isStartingVeto}
                              onClick={handleLaunchEncounterClick}
                            >
                              <Coins className="w-3.5 h-3.5" />
                              {isStartingVeto ? 'INICIANDO VETO...' : 'LANZAR ENCUENTRO'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Teams Grid Title & Head-to-Head Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-1">
                <div>
                  <h2 className="text-xl font-black italic tracking-tighter uppercase text-white flex items-center gap-2 font-mono">
                    <Award className="w-5 h-5 text-[#FF5500]" /> ESCUADRAS RIVALES
                  </h2>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                    {effectiveLobbyState.teams.length === 2 ? 'Enfrentamiento directo 5v5 CS2 // Fase de Draft' : `${effectiveLobbyState.teams.length} Equipos Participantes`}
                  </span>
                </div>

                {/* VS Showdown Bar (If 2 Teams) */}
                {effectiveLobbyState.teams.length === 2 && (
                  <div className="flex items-center gap-2 bg-[#0D1017]/95 border border-white/10 px-3.5 py-1.5 font-mono shadow-md text-xs rounded-xl">
                    <span className="text-[#FF5500] font-black tracking-wider">{getTeamName(effectiveLobbyState.teams[0]).toUpperCase()}</span>
                    <span className="text-[10px] font-bold text-neutral-300 bg-black/60 px-2 py-0.5 border border-white/10 rounded">
                      AVG {getAverageElo(effectiveLobbyState.teams[0])} ELO
                    </span>
                    <span className="text-white font-black text-[10px] px-1.5 py-0.5 bg-neutral-900 border border-neutral-700 rounded">
                      VS
                    </span>
                    <span className="text-[10px] font-bold text-neutral-300 bg-black/60 px-2 py-0.5 border border-white/10 rounded">
                      AVG {getAverageElo(effectiveLobbyState.teams[1])} ELO
                    </span>
                    <span className="text-[#00A3FF] font-black tracking-wider">{getTeamName(effectiveLobbyState.teams[1]).toUpperCase()}</span>
                  </div>
                )}
              </div>

              {/* Teams Grid */}
              <div className="pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {effectiveLobbyState.teams.map((team, tIdx) => {
                    const currentActiveTeamId = effectiveLobbyState.pickSequence?.[effectiveLobbyState.currentPickIndex] || effectiveLobbyState.pickOrder[effectiveLobbyState.currentPickIndex % (effectiveLobbyState.pickOrder.length || 1)];
                    const isCurrentTurn = effectiveLobbyState.draftStarted && !effectiveLobbyState.draftFinished && currentActiveTeamId === team.id;
                    const avgElo = getAverageElo(team);
                    const isTeamA = tIdx === 0;
                    const isTeamB = tIdx === 1;

                    // Render Captain Slot
                    let captainElement;
                    if (team.captain) {
                      const capAvatar = team.captain.discordUser?.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';
                      captainElement = (
                        <div className={`p-3 bg-[#131722]/90 border-2 rounded-xl flex items-center justify-between gap-3 relative overflow-hidden transition-all shadow-md ${
                          isTeamA 
                            ? 'border-amber-400/80 bg-gradient-to-r from-amber-950/25 to-[#131722]' 
                            : 'border-cyan-400/80 bg-gradient-to-r from-cyan-950/25 to-[#131722]'
                        }`}>
                          {/* Top corner Captain Badge */}
                          <div className={`absolute right-0 top-0 text-[8px] font-black px-2.5 py-0.5 uppercase tracking-wider font-mono flex items-center gap-1 shadow-sm rounded-bl-lg ${
                            isTeamA ? 'bg-amber-400 text-black' : 'bg-cyan-400 text-black'
                          }`}>
                            <Crown className="w-3 h-3 fill-current" />
                            <span>CAPITÁN</span>
                          </div>

                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="relative flex-shrink-0">
                              <img 
                                className={`w-9 h-9 rounded-full border-2 object-cover ${
                                  isTeamA ? 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]'
                                }`} 
                                src={capAvatar} 
                                alt="Capitán" 
                              />
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black absolute -bottom-0.5 -right-0.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-white leading-tight truncate">
                                {team.captain.discordUser?.displayName || team.captain.faceit_nickname}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <a 
                                  href={`https://www.faceit.com/es/players/${team.captain.faceit_nickname}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] text-neutral-400 hover:text-[#FF5500] hover:underline block leading-none font-mono truncate"
                                  title="Abrir perfil de Faceit"
                                >
                                  {team.captain.faceit_nickname} ↗
                                </a>
                                {team.captain.faceit_elo && (
                                  <span className="text-[8px] text-neutral-400 bg-black/60 px-1 py-0.2 rounded border border-white/10">
                                    {team.captain.faceit_elo} ELO
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-[10px] font-black px-2 py-0.5 border font-mono rounded ${
                              team.captain.faceit_level === 10
                                ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                                : team.captain.faceit_level >= 8
                                  ? 'bg-gradient-to-r from-[#FF5500] to-amber-600 text-white border-orange-500 shadow-[0_0_6px_rgba(255,85,0,0.4)]'
                                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-blue-500'
                            }`}>
                              LVL {team.captain.faceit_level}
                            </span>
                            {currentUser?.isAdmin && !isConceptDemoMode && (
                              <button 
                                className="p-1 bg-red-950/80 border border-red-500/80 hover:bg-red-900 text-red-300 hover:text-white transition-colors cursor-pointer rounded"
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
                        <div className="p-3 bg-[#10141E]/60 border-2 border-dashed border-white/15 rounded-xl flex items-center justify-between gap-3">
                          <span className="text-[10px] text-neutral-500 font-mono font-black uppercase tracking-wider flex items-center gap-1.5">
                            <span>👑</span> ESPERANDO CAPITÁN // {isTeamA ? 'EQUIPO FÉNIX' : 'EQUIPO KOBRA'}
                          </span>
                          {currentUser?.isAdmin && !isConceptDemoMode && (
                            <button 
                              className="bg-white hover:bg-neutral-200 text-black font-mono text-[9px] font-black uppercase tracking-widest px-3 py-1.5 transition-colors cursor-pointer shadow-md rounded-lg"
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
                          <div key={player.discordId || `player-${i}`} className="p-2.5 bg-[#121622]/90 border border-white/10 hover:border-white/25 rounded-xl flex items-center justify-between gap-2.5 text-xs relative overflow-hidden transition-all group">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="relative flex-shrink-0">
                                <img className="w-8 h-8 rounded-full border border-white/20 object-cover" src={avatar} alt="Avatar" />
                                <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 border border-black" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[11px] text-white font-bold font-mono truncate block leading-tight group-hover:text-[#FF5500] transition-colors">
                                  {player.discordUser?.displayName || player.faceit_nickname}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <a 
                                    href={`https://www.faceit.com/es/players/${player.faceit_nickname}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[8px] text-neutral-400 hover:text-[#FF5500] hover:underline font-mono truncate leading-none"
                                    title="Ver perfil de Faceit"
                                  >
                                    {player.faceit_nickname} ↗
                                  </a>
                                  {player.faceit_elo && (
                                    <span className="text-[8px] text-neutral-400 bg-black/60 px-1 py-0.2 rounded border border-white/10">
                                      {player.faceit_elo} ELO
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 border rounded ${
                                player.faceit_level === 10
                                  ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white border-red-500/80 shadow-[0_0_6px_rgba(239,68,68,0.4)]'
                                  : player.faceit_level >= 8
                                    ? 'bg-gradient-to-r from-[#FF5500] to-amber-600 text-white border-orange-500/80'
                                    : player.faceit_level >= 5
                                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-blue-500/80'
                                      : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                              }`}>
                                LVL {player.faceit_level}
                              </span>
                              {currentUser?.isAdmin && !isConceptDemoMode && (
                                <button 
                                  className="p-1 bg-neutral-900 border border-white/10 hover:border-red-500 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer rounded"
                                  onClick={() => handleRemovePlayerFromTeam(team.id, player.discordId)}
                                  title="Remover Jugador"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      } else if (isThisTeamTurn && pendingPick && !pendingRendered) {
                        const playerAvatar = pendingPick.discordUser?.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';
                        playerSlots.push(
                          <div key="pending-slot" className="p-2.5 bg-[#FF5500]/15 border-2 border-dashed border-[#FF5500] rounded-xl flex items-center justify-between gap-2.5 text-xs animate-pulse shadow-[0_0_15px_rgba(255,85,0,0.3)]">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <img className="w-8 h-8 rounded-full border border-[#FF5500] object-cover" src={playerAvatar} alt="Avatar" />
                              <div>
                                <span className="text-[10px] text-white font-black font-mono truncate block">{pendingPick.discordUser?.displayName || pendingPick.faceit_nickname}</span>
                                <span className="text-[8px] text-[#FF5500] font-bold block uppercase">Confirmación pendiente</span>
                              </div>
                            </div>
                            <span className="text-[8px] font-mono font-black bg-[#FF5500] text-black px-2 py-0.5 uppercase tracking-wider rounded">SELECCIÓN</span>
                          </div>
                        );
                        pendingRendered = true;
                      } else if (isThisTeamTurn && !pendingRendered) {
                        // The active picking slot with pulsing animation
                        playerSlots.push(
                          <div key={`active-picking-${i}`} className="p-3 bg-[#FF5500]/15 border-2 border-dashed border-[#FF5500] rounded-xl flex items-center justify-between gap-2 text-xs animate-pulse shadow-[0_0_20px_rgba(255,85,0,0.3)]">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#FF5500]/30 border border-[#FF5500] flex items-center justify-center text-sm font-black text-[#FF5500]">
                                🔥
                              </div>
                              <div>
                                <span className="text-[10px] text-white font-black font-mono block">TURNO ACTUAL // ELIGIENDO COMPAÑERO</span>
                                <span className="text-[8px] text-[#FF5500] font-bold uppercase block">Selecciona un jugador disponible de la izquierda</span>
                              </div>
                            </div>
                            <span className="text-[8px] font-mono font-black bg-[#FF5500] text-black px-2 py-0.5 rounded uppercase tracking-wider">
                              TURNO
                            </span>
                          </div>
                        );
                        pendingRendered = true;
                      } else {
                        // Tactical empty slot
                        let emptySlotContent = (
                          <span className="text-[9px] text-neutral-500 font-mono font-bold uppercase tracking-wider">
                            [ SL-0{i + 1} ] EN ESPERA DE TURNO
                          </span>
                        );

                        if (currentUser?.isAdmin && !isConceptDemoMode) {
                          const assignablePlayers: Player[] = [];
                          ['S', 'A', 'B', 'C'].forEach(tier => {
                            (effectiveAvailablePlayers[tier] || []).forEach(p => {
                              if (pendingPick && pendingPick.discordId === p.discordId) return;
                              assignablePlayers.push(p);
                            });
                          });

                          emptySlotContent = (
                            <select 
                              className="w-full bg-[#141A28] border border-dashed border-white/20 hover:border-white text-[9px] font-mono text-neutral-300 hover:text-white px-2 py-1.5 focus:outline-none focus:border-[#FF5500] rounded-lg cursor-pointer text-center"
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
                          <div key={`empty-${i}`} className="p-2.5 bg-[#0B0E14] border border-dashed border-white/10 rounded-xl flex items-center justify-center">
                            {emptySlotContent}
                          </div>
                        );
                      }
                    }

                    // Team color styling with high-contrast esports theme
                    const teamBg = isCurrentTurn 
                      ? 'bg-gradient-to-b from-[#22140E] via-[#0E121B] to-[#0A0D14] border-[#FF5500] ring-2 ring-[#FF5500]/50 shadow-[0_0_35px_rgba(255,85,0,0.35)]' 
                      : isTeamA 
                        ? 'bg-gradient-to-b from-[#1E120D] via-[#0E121B] to-[#0A0D14] border-[#FF5500]/60 shadow-[0_0_25px_rgba(255,85,0,0.2)]' 
                        : isTeamB 
                          ? 'bg-gradient-to-b from-[#0D182A] via-[#0E121B] to-[#0A0D14] border-[#00A3FF]/60 shadow-[0_0_25px_rgba(0,163,255,0.2)]' 
                          : 'bg-[#0E121B] border-white/10';

                    return (
                      <div key={team.id} className={`p-4 sm:p-5 border-2 shadow-2xl rounded-2xl relative flex flex-col gap-3.5 transition-all ${teamBg}`}>
                        {/* Turn Active Badge */}
                        {isCurrentTurn && (
                          <div className="bg-[#FF5500] text-black font-black font-mono text-[9px] px-3 py-1 uppercase tracking-widest animate-pulse flex items-center gap-1.5 self-start shadow-md -mt-1 mb-1 rounded-md">
                            <Flame className="w-3.5 h-3.5 fill-current" />
                            <span>TURNO DE ELECCIÓN // ELIGE JUGADOR</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center border-b border-white/10 pb-2.5 font-mono">
                          <div className="flex items-center gap-2">
                            <h4 className={`text-base font-black italic tracking-tighter uppercase ${
                              isTeamA ? 'text-[#FF5500]' : isTeamB ? 'text-[#00A3FF]' : 'text-white'
                            }`}>
                              {getTeamName(team)}
                            </h4>
                            {team.players && team.players.length > 0 && (
                              <button
                                className="px-2 py-0.5 bg-black/60 border border-white/20 hover:border-white text-neutral-300 hover:text-white text-[8px] font-black uppercase transition-colors cursor-pointer rounded"
                                onClick={() => {
                                  const nicks = (team.players || []).map(p => p.faceit_nickname).filter(Boolean).join(', ');
                                  navigator.clipboard.writeText(nicks);
                                  showToast(`Nicks copiados: ${nicks}`, 'info');
                                }}
                                title="Copiar nicks de los jugadores para invitarlos en Faceit"
                              >
                                📋 Nicks
                              </button>
                            )}
                            {currentUser?.isAdmin && !isConceptDemoMode && (team.captain || (team.players && team.players.length > 0)) && (
                              <button
                                className="px-2 py-0.5 bg-red-950/80 border border-red-500/80 hover:bg-red-900 text-red-300 hover:text-white text-[8px] font-black uppercase transition-colors cursor-pointer rounded"
                                onClick={() => handleClearTeam(team.id, team.name)}
                                title="Vaciar Equipo"
                              >
                                Vaciar
                              </button>
                            )}
                          </div>
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 border rounded-lg ${
                            isTeamA 
                              ? 'bg-[#FF5500]/15 text-[#FF5500] border-[#FF5500]/40' 
                              : isTeamB 
                                ? 'bg-[#00A3FF]/15 text-[#00A3FF] border-[#00A3FF]/40' 
                                : 'bg-black/60 text-neutral-400 border-white/10'
                          }`}>
                            AVG ELO: {avgElo}
                          </span>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          {captainElement}
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-neutral-400 font-mono uppercase tracking-wider">
                              MIEMBROS ({team.players ? team.players.length : 0}/4)
                            </span>
                            <div className="flex-1 h-[1px] bg-white/10" />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {playerSlots}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

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

      {/* Roulette Decision Wheel Modal (Premium Interactive Style) */}
      {showRouletteModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#111] border-4 border-[#1A1A1A] p-8 shadow-2xl relative font-mono text-center">
            <h3 className="text-sm font-black uppercase text-neutral-400 tracking-wider mb-2 border-b border-[#222] pb-2 flex items-center justify-center gap-1.5">
              🎡 SORTEO DE ORDEN DE ELECCIÓN
            </h3>
            
            {/* Si aún quedan equipos para sortear, dibujamos la ruleta */}
            {rouletteRemainingTeamIds.length > 0 ? (
              <div className="flex flex-col items-center">
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-black mb-2">
                  SORTEANDO EL TURNO Nº {rouletteSelectedOrder.length + 1}
                </p>
                <div className="flex justify-center my-4 relative">
                  <canvas 
                    ref={canvasRef} 
                    width={480} 
                    height={480}
                    className="w-full max-w-[340px] aspect-square h-auto md:max-w-[420px] select-none"
                  />
                </div>
              </div>
            ) : (
              <div className="my-6 p-4 bg-[#161616] border border-[#222] text-left">
                <p className="text-xs font-black text-[#FF5500] uppercase tracking-wider mb-3 text-center border-b border-[#222] pb-2">
                  🎯 ORDEN DE ELECCIÓN FINAL
                </p>
                <div className="space-y-1">
                  {rouletteSelectedOrder.map((teamId, idx) => {
                    const team = lobbyState.teams.find(t => t.id === teamId);
                    return (
                      <div key={teamId} className="flex justify-between items-center text-xs p-1.5 bg-[#1C1C1C] border border-[#222]">
                        <span className="font-bold text-white">{idx + 1}º PUESTO</span>
                        <span className="text-[#FF5500] font-black uppercase">{team?.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Estado e instrucciones */}
            <div className="mt-4 min-h-[50px] flex flex-col items-center justify-center">
              {rouletteWinner ? (
                <div className="space-y-1 animate-bounce">
                  <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold">GANADOR DEL TURNO Nº {rouletteSelectedOrder.length}:</p>
                  <p className="text-base font-black text-[#FF5500] italic tracking-tighter uppercase">{rouletteWinner}</p>
                </div>
              ) : rouletteSpinning ? (
                <p className="text-xs text-neutral-400 animate-pulse font-bold uppercase tracking-wider">¡Girando a velocidad moderada para ver los nombres!</p>
              ) : rouletteRemainingTeamIds.length > 0 ? (
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                  Gira para decidir el Turno Nº {rouletteSelectedOrder.length + 1}
                </p>
              ) : (
                <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest animate-pulse">
                  ¡Sorteo completado con éxito!
                </p>
              )}
            </div>

            {/* Mostrar el progreso acumulado si ya hay equipos sorteados */}
            {rouletteSelectedOrder.length > 0 && rouletteRemainingTeamIds.length > 0 && (
              <div className="mt-4 border-t border-[#222]/40 pt-3 text-left">
                <p className="text-[9px] text-neutral-500 uppercase tracking-wider mb-1 font-bold">ORDEN PARCIAL:</p>
                <div className="flex flex-wrap gap-1.5">
                  {rouletteSelectedOrder.map((teamId, idx) => {
                    const team = lobbyState.teams.find(t => t.id === teamId);
                    return (
                      <span key={teamId} className="text-[8px] font-mono bg-[#1A1A1A] border border-[#2D2D2D] px-1.5 py-0.5 text-neutral-300 font-bold uppercase">
                        {idx + 1}º: {team?.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-4">
              {rouletteRemainingTeamIds.length > 0 ? (
                <button
                  onClick={startRouletteSpin}
                  disabled={rouletteSpinning}
                  className="bg-[#FF5500] hover:bg-[#FF7733] border border-[#FF5500] text-white font-bold uppercase text-[10px] py-2 px-4 rounded-none transition-all disabled:opacity-30 cursor-pointer"
                >
                  {rouletteWinner ? 'GIRAR SIGUIENTE' : '¡GIRAR RULETA!'}
                </button>
              ) : (
                <button
                  onClick={handleApplyRouletteOrder}
                  className="bg-[#FF5500] hover:bg-[#FF7733] border border-[#FF5500] text-white font-bold uppercase text-[10px] py-2 px-4 rounded-none transition-all cursor-pointer"
                >
                  APLICAR ORDEN
                </button>
              )}
              
              <button
                onClick={() => setShowRouletteModal(false)}
                disabled={rouletteSpinning}
                className="bg-transparent border border-neutral-600 hover:border-white text-white font-bold uppercase text-[10px] py-2 px-4 rounded-none transition-all cursor-pointer"
              >
                {rouletteRemainingTeamIds.length === 0 ? 'CERRAR' : 'CANCELAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sorteo de Enfrentamientos Modal (Rival Roulette) */}
      {showMatchupModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#111] border-4 border-[#1A1A1A] p-8 shadow-2xl relative font-mono text-center">
            <h3 className="text-sm font-black uppercase text-neutral-400 tracking-wider mb-2 border-b border-[#222] pb-2 flex items-center justify-center gap-1.5">
              ⚔️ SORTEO DE ENFRENTAMIENTOS
            </h3>

            {matchupUnpairedIds.length > 0 ? (
              <div className="flex flex-col items-center">
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-black mb-1">
                  {matchupDrawnTemp.length === 0 
                    ? `SORTEANDO INTEGRANTE DE LA PARTIDA ${matchupPairs.length + 1}`
                    : `SORTEANDO RIVAL PARA: ${lobbyState.teams.find(t => t.id === matchupDrawnTemp[0])?.name.toUpperCase()}`
                  }
                </p>
                <div className="flex justify-center my-2 relative">
                  <canvas 
                    ref={matchupCanvasRef} 
                    width={480} 
                    height={480}
                    className="w-full max-w-[340px] aspect-square h-auto md:max-w-[420px] select-none"
                  />
                </div>
              </div>
            ) : (
              <div className="my-6 p-4 bg-[#161616] border border-[#222] text-left">
                <p className="text-xs font-black text-[#FF5500] uppercase tracking-wider mb-3 text-center border-b border-[#222] pb-2">
                  ⚔️ ENCUENTROS SORTEADOS
                </p>
                <div className="space-y-1.5">
                  {matchupPairs.map((pair, idx) => {
                    const teamA = lobbyState.teams.find(t => t.id === pair.teamAId);
                    const isWinnerPlaceholder = pair.teamBId === 'winner_match_1';
                    const teamB = isWinnerPlaceholder ? null : lobbyState.teams.find(t => t.id === pair.teamBId);
                    
                    return (
                      <button 
                        key={idx}
                        disabled={isWinnerPlaceholder}
                        onClick={() => {
                          if (isWinnerPlaceholder) return;
                          setMatchTeamA(pair.teamAId);
                          setMatchTeamB(pair.teamBId);
                          setShowMatchupModal(false);
                          showToast(`Cargado en selector: ${teamA?.name} VS ${teamB?.name}`, 'info');
                        }}
                        className={`w-full flex justify-between items-center text-xs p-2 bg-[#1C1C1C] border border-[#222] transition-all text-left ${
                          isWinnerPlaceholder ? 'opacity-80 border-dashed cursor-not-allowed' : 'hover:border-white cursor-pointer'
                        }`}
                      >
                        <span className="font-bold text-white">PARTIDA {idx + 1}</span>
                        <span className="text-neutral-300 font-bold uppercase truncate max-w-[200px]">
                          {teamA?.name} <span className="text-[#FF5500] font-black">VS</span> {isWinnerPlaceholder ? 'GANADOR PARTIDA 1' : teamB?.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[9px] text-neutral-500 text-center mt-3 uppercase">
                  (Haz clic en un encuentro para cargarlo en el panel de lanzador)
                </p>
              </div>
            )}

            {/* Estado e instrucciones */}
            <div className="mt-2 min-h-[45px] flex flex-col items-center justify-center">
              {matchupWinner ? (
                <div className="space-y-0.5 animate-bounce">
                  <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold">EQUIPO SORTEADO:</p>
                  <p className="text-base font-black text-[#FF5500] italic tracking-tighter uppercase">{matchupWinner}</p>
                </div>
              ) : matchupSpinning ? (
                <p className="text-xs text-neutral-400 animate-pulse font-bold uppercase tracking-wider">¡Decidiendo con la ruleta de equipos!</p>
              ) : matchupUnpairedIds.length > 0 ? (
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                  Gira para sortear
                </p>
              ) : (
                <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest animate-pulse">
                  ¡Sorteo finalizado! Selecciona una partida para cargarla
                </p>
              )}
            </div>

            {/* Mostrar el progreso acumulado si ya hay parejas sorteadas */}
            {matchupPairs.length > 0 && matchupUnpairedIds.length > 0 && (
              <div className="mt-3 border-t border-[#222]/40 pt-2 text-left">
                <p className="text-[9px] text-neutral-500 uppercase tracking-wider mb-1 font-bold font-mono">ENCUENTROS LISTOS:</p>
                <div className="flex flex-col gap-1">
                  {matchupPairs.map((pair, idx) => {
                    const teamA = lobbyState.teams.find(t => t.id === pair.teamAId);
                    const isWinnerPlaceholder = pair.teamBId === 'winner_match_1';
                    const teamB = isWinnerPlaceholder ? null : lobbyState.teams.find(t => t.id === pair.teamBId);
                    return (
                      <div key={idx} className="text-[8px] font-mono bg-[#1A1A1A] border border-[#2D2D2D] px-2 py-1 text-neutral-300 font-bold uppercase flex justify-between">
                        <span>PARTIDA {idx + 1}:</span>
                        <span>{teamA?.name} VS {isWinnerPlaceholder ? 'GANADOR PARTIDA 1' : teamB?.name}</span>
                      </div>
                    );
                  })}
                  {matchupDrawnTemp.length === 1 && (
                    <div className="text-[8px] font-mono text-yellow-500 animate-pulse uppercase">
                      ESPERANDO COMPAÑERO PARA: {lobbyState.teams.find(t => t.id === matchupDrawnTemp[0])?.name.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-4">
              {matchupUnpairedIds.length > 0 ? (
                <button
                  onClick={startMatchupSpin}
                  disabled={matchupSpinning}
                  className="bg-[#FF5500] hover:bg-[#FF7733] border border-[#FF5500] text-white font-bold uppercase text-[10px] py-2 px-4 rounded-none transition-all disabled:opacity-30 cursor-pointer"
                >
                  {matchupWinner ? 'SIGUIENTE ENCUENTRO' : '¡GIRAR RULETA!'}
                </button>
              ) : (
                <button
                  onClick={() => setShowMatchupModal(false)}
                  className="bg-[#FF5500] hover:bg-[#FF7733] border border-[#FF5500] text-white font-bold uppercase text-[10px] py-2 px-4 rounded-none transition-all cursor-pointer"
                >
                  ACEPTAR
                </button>
              )}
              
              <button
                onClick={() => setShowMatchupModal(false)}
                disabled={matchupSpinning}
                className="bg-transparent border border-neutral-600 hover:border-white text-white font-bold uppercase text-[10px] py-2 px-4 rounded-none transition-all cursor-pointer"
              >
                {matchupUnpairedIds.length === 0 ? 'CERRAR' : 'CANCELAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAP VETO MODAL (CS2 Competitive Map Ban Phase) */}
      {lobbyState.mapVeto && (lobbyState.mapVeto.active || lobbyState.mapVeto.completed) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/92 backdrop-blur-md overflow-y-auto font-mono">
          <div className="bg-[#0D1017] border-2 border-white/15 w-full max-w-[96vw] 2xl:max-w-[1550px] max-h-[96vh] my-auto flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.9)] rounded-none text-white animate-fade-in overflow-hidden">
            {/* Veto Header */}
            <div className="bg-[#121622] border-b border-white/10 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF5500] text-black flex items-center justify-center font-black shadow-[0_0_15px_rgba(255,85,0,0.5)] flex-shrink-0">
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                    FASE DE VETO DE MAPAS CS2 // TOURNAMENT BROADCAST
                  </h3>
                  <p className="text-[10px] text-neutral-400">
                    Baneo alternado por turnos hasta definir el mapa competitivo oficial
                  </p>
                </div>
              </div>

              {/* Matchup Badges */}
              {(() => {
                const teamA = lobbyState.teams.find(t => t.id === lobbyState.mapVeto?.teamIdA);
                const teamB = lobbyState.teams.find(t => t.id === lobbyState.mapVeto?.teamIdB);
                return (
                  <div className="flex items-center gap-2 bg-[#090C12] px-3.5 py-1.5 border border-white/15 text-xs shadow-md">
                    <span className="font-black text-[#FF5500] tracking-wider">
                      {teamA ? getTeamName(teamA).toUpperCase() : 'EQUIPO A'}
                      <span className="text-[9px] font-normal text-neutral-400 ml-1">
                        ({teamA?.captain?.faceit_nickname || 'Capitán'})
                      </span>
                    </span>
                    <span className="text-white font-black text-[10px] px-1.5 py-0.5 bg-neutral-800 border border-neutral-700">
                      VS
                    </span>
                    <span className="font-black text-[#00A3FF] tracking-wider">
                      {teamB ? getTeamName(teamB).toUpperCase() : 'EQUIPO B'}
                      <span className="text-[9px] font-normal text-neutral-400 ml-1">
                        ({teamB?.captain?.faceit_nickname || 'Capitán'})
                      </span>
                    </span>
                  </div>
                );
              })()}

              {currentUser?.isAdmin && (
                <button 
                  onClick={handleCancelVeto}
                  className="text-neutral-400 hover:text-red-400 text-[10px] uppercase font-bold border border-white/10 hover:border-red-900 px-3 py-1.5 transition-colors cursor-pointer"
                >
                  ✕ CANCELAR VETO
                </button>
              )}
            </div>

            {/* Turn & Status Banner */}
            {(() => {
              const veto = lobbyState.mapVeto!;
              if (veto.completed && veto.chosenMap) {
                return (
                  <div className="bg-gradient-to-r from-emerald-950/60 via-emerald-900/30 to-emerald-950/60 border-b-2 border-emerald-400 p-4 sm:p-5 text-center flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-500 text-black font-black flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(16,185,129,0.6)]">
                        <Trophy className="w-6 h-6 text-black fill-current" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs uppercase text-emerald-400 font-black tracking-widest block">
                          MAPA FINAL DECIDIDO
                        </span>
                        <span className="text-xl font-black text-white uppercase tracking-wider">
                          {veto.chosenMap.name}
                        </span>
                      </div>
                    </div>
                    {currentUser?.isAdmin ? (
                      <button 
                        onClick={() => {
                          setChosenMapForMatch(veto.chosenMap);
                          setMatchTeamA(veto.teamIdA);
                          setMatchTeamB(veto.teamIdB);
                          setIsBetModalOpen(true);
                          fetchQueues();
                          fetchBetStatus(effectiveBetAmount);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-xs px-6 py-2.5 transition-all cursor-pointer shadow-[0_0_20px_rgba(21,194,83,0.5)] hover:scale-105 active:scale-95"
                      >
                        ➡️ CONTINUAR A SALDOS Y LANZAR PARTIDA
                      </button>
                    ) : (
                      <span className="text-xs text-neutral-300 animate-pulse font-bold bg-black/60 px-3 py-1.5 border border-white/10">
                        Esperando a que el Administrador confirme saldos y lance la partida...
                      </span>
                    )}
                  </div>
                );
              }

              const currentTurnTeamId = veto.banSequence[veto.currentBanIndex];
              const teamInTurn = lobbyState.teams.find(t => t.id === currentTurnTeamId);
              const isMyTurn = (teamInTurn?.captain && currentUser && teamInTurn.captain.discordId === currentUser.userId);

              // Compute bans in current block
              let start = veto.currentBanIndex;
              while (start > 0 && veto.banSequence[start - 1] === veto.banSequence[veto.currentBanIndex]) start--;
              let end = veto.currentBanIndex;
              while (end < veto.banSequence.length - 1 && veto.banSequence[end + 1] === veto.banSequence[veto.currentBanIndex]) end++;
              const blockTotal = end - start + 1;
              const pickInBlock = veto.currentBanIndex - start + 1;
              const blockLabel = blockTotal > 1 ? `(BANEO ${pickInBlock} DE ${blockTotal})` : `(1 BANEO)`;

              return (
                <div className={`p-4 border-b text-center flex flex-col sm:flex-row items-center justify-between gap-3 ${
                  isMyTurn 
                    ? 'bg-gradient-to-r from-[#FF5500]/25 via-black/80 to-[#FF5500]/25 border-y-2 border-[#FF5500] shadow-[0_0_20px_rgba(255,85,0,0.35)]' 
                    : 'bg-[#121622] border-white/10'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs uppercase text-neutral-400 font-bold">TURNO DE BANEO:</span>
                    <span className="text-xs font-black uppercase text-white bg-black/70 px-2.5 py-1 border border-white/20">
                      {teamInTurn ? getTeamName(teamInTurn).toUpperCase() : 'EQUIPO'} {blockLabel}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      (Capitán: {teamInTurn?.captain?.faceit_nickname || 'Desconocido'})
                    </span>
                  </div>

                  <div>
                    {isMyTurn ? (
                      <span className="text-xs font-black uppercase text-[#FF5500] animate-pulse flex items-center gap-1.5">
                        <span>👉</span> ¡ES TU TURNO! HAZ CLIC EN EL MAPA QUE DESEAS DESCARTAR
                      </span>
                    ) : (
                      currentUser?.isAdmin ? (
                        <span className="text-[11px] font-bold text-[#1B9AAA] flex items-center gap-1.5">
                          <span>👑</span> Modo Administrador: Puedes banear en nombre del capitán si tarda
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-400 animate-pulse">
                          ⏳ Esperando el baneo de {teamInTurn?.captain?.faceit_nickname || 'Capitán'}...
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Map Cards Grid */}
            <div className="p-3 sm:p-5 md:p-6 overflow-y-auto max-h-[72vh]">
              <div className={`grid gap-3 sm:gap-4 ${
                (lobbyState.mapVeto?.pool?.length || 0) <= 3 
                  ? 'grid-cols-1 sm:grid-cols-3 max-w-3xl mx-auto' 
                  : (lobbyState.mapVeto?.pool?.length || 0) <= 5 
                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5 max-w-5xl mx-auto' 
                    : (lobbyState.mapVeto?.pool?.length || 0) <= 7
                      ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7'
                      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 xl:grid-cols-7'
              }`}>
                {((lobbyState.mapVeto?.pool && lobbyState.mapVeto.pool.length > 0) ? lobbyState.mapVeto.pool : []).map(mapItem => {
                  const veto = lobbyState.mapVeto!;
                  const isBanned = (veto.bannedMaps || []).includes(mapItem.id);
                  const isChosen = veto.chosenMap?.id === mapItem.id;
                  const banInfo = (veto.banHistory || []).find(b => b.mapId === mapItem.id);

                  const currentTurnTeamId = veto.banSequence[veto.currentBanIndex];
                  const teamInTurn = lobbyState.teams.find(t => t.id === currentTurnTeamId);
                  const isMyTurn = (teamInTurn?.captain && currentUser && teamInTurn.captain.discordId === currentUser.userId);
                  const canBan = veto.active && !veto.completed && !isBanned && (isMyTurn || currentUser?.isAdmin);

                  return (
                    <div
                      key={mapItem.id}
                      onClick={() => {
                        if (canBan && !isBanningMap) {
                          handleBanMap(mapItem.id);
                        }
                      }}
                      className={`relative group rounded-none overflow-hidden h-64 sm:h-72 md:h-80 lg:h-[350px] flex flex-col justify-between p-3 select-none transition-all duration-300 ${
                        isChosen
                          ? 'border-4 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.6)] ring-2 ring-emerald-400/50 scale-[1.03]'
                          : isBanned
                            ? 'border-2 border-red-950 opacity-55 cursor-not-allowed'
                            : canBan
                              ? 'border-2 border-white/20 hover:border-[#FF5500] hover:scale-[1.03] hover:shadow-[0_0_25px_rgba(255,85,0,0.5)] cursor-pointer'
                              : 'border-2 border-white/10 opacity-80 cursor-default'
                      }`}
                    >
                      {/* Background Map Screenshot */}
                      <img 
                        src={mapItem.image} 
                        alt={mapItem.name} 
                        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ${
                          canBan ? 'group-hover:scale-110' : ''
                        } ${isBanned ? 'grayscale contrast-125' : ''}`}
                      />

                      {/* Dark Gradient Overlay */}
                      <div className={`absolute inset-0 ${
                        isChosen
                          ? 'bg-gradient-to-t from-emerald-950/90 via-emerald-950/20 to-black/70'
                          : isBanned
                            ? 'bg-red-950/75 backdrop-grayscale'
                            : 'bg-gradient-to-t from-black/95 via-black/40 to-black/60'
                      }`} />

                      {/* Top Bar: CS2 tag & status badge */}
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-wider bg-black/80 px-2 py-0.5 border border-white/20 text-neutral-300">
                          CS2
                        </span>
                        {isChosen && (
                          <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-500 text-black px-2 py-0.5 animate-pulse font-bold shadow-md flex items-center gap-1">
                            <Trophy className="w-3 h-3 fill-current" />
                            <span>MAPA ELEGIDO</span>
                          </span>
                        )}
                        {isBanned && (
                          <span className="text-[8px] font-black uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 shadow-md">
                            BANEADO
                          </span>
                        )}
                      </div>

                      {/* Diagonal Banned Banner Overlay (Matches Mockup) */}
                      {isBanned && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none px-2">
                          <div className="w-[125%] bg-gradient-to-r from-red-700 via-red-600 to-rose-700 text-white font-black uppercase text-[10px] sm:text-xs tracking-widest py-1.5 shadow-[0_0_20px_rgba(220,38,38,0.85)] rotate-[-12deg] border-y-2 border-white/50 text-center">
                            ✖ BANEADO POR {banInfo?.teamName?.toUpperCase() || 'EQUIPO'}
                          </div>
                        </div>
                      )}

                      {/* Center: Official CS2 Pin / Crest Badge */}
                      <div className="relative z-10 my-auto flex flex-col items-center justify-center">
                        <img 
                          src={mapItem.icon} 
                          alt={mapItem.name} 
                          className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.9)] transition-transform duration-300 ${
                            canBan ? 'group-hover:scale-115' : ''
                          } ${isBanned ? 'opacity-30 grayscale' : ''} ${isChosen ? 'filter drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]' : ''}`}
                        />
                      </div>

                      {/* Bottom: Map Name & Ban Action Prompt */}
                      <div className="relative z-10 text-center">
                        <span className={`block font-black uppercase tracking-wider text-sm sm:text-base drop-shadow-md ${
                          isChosen ? 'text-emerald-400 font-extrabold' : isBanned ? 'text-neutral-500 line-through' : 'text-white'
                        }`}>
                          {mapItem.name}
                        </span>
                        {canBan && !isBanned && (
                          <span className="text-[9px] font-black uppercase text-black bg-[#FF5500] px-3 py-1 mt-1.5 inline-flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,85,0,0.5)] opacity-0 group-hover:opacity-100 transition-opacity">
                            <Crosshair className="w-3 h-3" />
                            <span>CLIC PARA BANEAR</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ban History Footer */}
            {lobbyState.mapVeto?.banHistory && lobbyState.mapVeto.banHistory.length > 0 && (
              <div className="bg-[#0A0D14] border-t border-white/10 p-3.5 px-5 flex items-center gap-3 overflow-x-auto text-[10px]">
                <span className="text-neutral-400 font-black uppercase flex-shrink-0 tracking-wider">
                  Historial de Baneos:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {lobbyState.mapVeto.banHistory.map((item, idx) => (
                    <span key={idx} className="bg-[#121622] border border-white/10 px-2.5 py-1 text-neutral-300 flex items-center gap-1.5 shadow-sm">
                      <span className="text-neutral-500 font-bold">{idx + 1}.</span>
                      <span className="text-red-400 line-through font-black">{item.mapName}</span>
                      <span className="text-[9px] text-[#FF5500] font-bold">({item.teamName})</span>
                      {idx < (lobbyState.mapVeto?.banHistory?.length || 0) - 1 && (
                        <span className="text-neutral-600 font-bold ml-1">➔</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map Manager Modal (Admin Lobby) */}
      {isMapManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md overflow-y-auto animate-fade-in font-mono">
          <div className="bg-[#121212] border-2 border-[#FF5500]/50 w-full max-w-[96vw] 2xl:max-w-[1550px] max-h-[96vh] my-auto flex flex-col shadow-2xl rounded-none text-white overflow-hidden">
            {/* Header */}
            <div className="bg-[#181818] border-b border-neutral-800 p-4 sm:p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF5500]/20 border border-[#FF5500] flex items-center justify-center text-[#FF5500]">
                  <Map className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                    CONFIGURAR POOL DE MAPAS PARA EL VETO
                    <span className="text-xs font-mono font-bold bg-[#FF5500]/20 text-[#FF5500] border border-[#FF5500]/40 px-2 py-0.5">
                      {localMapCatalog.filter(m => m.active).length} ACTIVOS
                    </span>
                  </h3>
                  <p className="text-[10px] text-neutral-400 uppercase mt-0.5">
                    Haz clic en cualquier mapa para activarlo o desactivarlo. El veto baneará automáticamente hasta dejar 1 mapa.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMapManagerOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bar Presets */}
            <div className="bg-[#151515] border-b border-neutral-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-neutral-500 uppercase font-black mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPresetInLobby('premier')}
                  className="px-2 py-1 bg-[#202020] hover:bg-[#2a2a2a] border border-neutral-700 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                >
                  🏆 Premier (7)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetInLobby('all')}
                  className="px-2 py-1 bg-[#202020] hover:bg-[#2a2a2a] border border-neutral-700 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                >
                  🗺️ Todos ({localMapCatalog.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetInLobby('classics')}
                  className="px-2 py-1 bg-[#202020] hover:bg-[#2a2a2a] border border-neutral-700 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                >
                  ⚡ Clásicos (5)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetInLobby('fast')}
                  className="px-2 py-1 bg-[#202020] hover:bg-[#2a2a2a] border border-neutral-700 text-[10px] font-bold uppercase transition-colors cursor-pointer"
                >
                  🎯 Rápido (3)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAddCustomMapModal(true)}
                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 uppercase transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Añadir Mapa Custom
              </button>
            </div>

            {/* Grid of maps */}
            <div className="p-4 sm:p-6 max-h-[72vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
                {localMapCatalog.map((mapItem) => {
                  const isActive = mapItem.active;
                  return (
                    <div
                      key={mapItem.id}
                      onClick={() => handleToggleMapInLobby(mapItem.id)}
                      className={`group relative flex flex-col justify-between h-48 sm:h-52 md:h-56 border-2 transition-all cursor-pointer overflow-hidden select-none ${
                        isActive
                          ? 'border-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.25)] bg-[#161616]'
                          : 'border-white/10 opacity-35 hover:opacity-75 bg-[#0C0C0C]'
                      }`}
                    >
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url(${mapItem.image})` }}
                      />
                      <div className={`absolute inset-0 transition-opacity ${isActive ? 'bg-gradient-to-t from-black/95 via-black/40 to-black/60' : 'bg-black/80'}`} />

                      <div className="relative z-10 p-1.5 flex items-center justify-between">
                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 border ${
                          isActive ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                        }`}>
                          {isActive ? '✓ ACTIVO' : '✕ INACTIVO'}
                        </span>
                        {mapItem.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomMapInLobby(mapItem.id);
                            }}
                            className="p-1 bg-red-950/80 hover:bg-red-800 text-red-200 border border-red-500/40"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>

                      <div className="relative z-10 flex items-center justify-center py-1">
                        <img
                          src={mapItem.icon}
                          alt={mapItem.name}
                          className={`w-11 h-11 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] transition-transform group-hover:scale-110 ${
                            !isActive ? 'grayscale' : ''
                          }`}
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      </div>

                      <div className="relative z-10 p-1.5 text-center bg-black/80 border-t border-white/10">
                        <span className={`text-[11px] font-black uppercase tracking-wider block truncate ${isActive ? 'text-white' : 'text-neutral-400'}`}>
                          {mapItem.name}
                        </span>
                        <span className="text-[8px] text-neutral-500 block truncate">
                          {mapItem.id}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#181818] border-t border-neutral-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[10px] text-neutral-400">
                <span className="text-[#FF5500] font-bold">{localMapCatalog.filter(m => m.active).length} mapas</span> configurados para el veto.
                {localMapCatalog.filter(m => m.active).length >= 2 && (
                  <span className="text-neutral-500 ml-1">
                    (Se realizarán {localMapCatalog.filter(m => m.active).length - 1} baneos hasta quedar 1 mapa ganador).
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMapManagerOpen(false)}
                  className="px-4 py-2 border border-neutral-700 text-neutral-400 hover:text-white text-xs uppercase cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleSaveMapCatalogInLobby}
                  disabled={isSavingMapCatalog}
                  className="px-6 py-2 bg-[#FF5500] hover:bg-[#e04c00] text-black text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-40 flex items-center gap-2 cursor-pointer shadow-[2px_2px_0px_rgba(255,85,0,0.3)]"
                >
                  {isSavingMapCatalog ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {isSavingMapCatalog ? 'GUARDANDO...' : 'GUARDAR Y APLICAR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Añadir Mapa Custom en Lobby */}
      {showAddCustomMapModal && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
          <div className="bg-[#141414] border-2 border-neutral-700 p-5 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <h4 className="text-sm font-black uppercase text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" /> Añadir Mapa Personalizado
              </h4>
              <button
                type="button"
                onClick={() => setShowAddCustomMapModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] uppercase text-neutral-400 block mb-1">ID del Mapa (ej: de_tuscan)</label>
                <input
                  type="text"
                  value={newCustomMap.id}
                  onChange={(e) => setNewCustomMap({ ...newCustomMap, id: e.target.value })}
                  placeholder="de_tuscan"
                  className="w-full bg-[#0A0A0A] border border-neutral-700 px-3 py-2 text-white text-xs outline-none focus:border-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-neutral-400 block mb-1">Nombre Visible (ej: Tuscan)</label>
                <input
                  type="text"
                  value={newCustomMap.name}
                  onChange={(e) => setNewCustomMap({ ...newCustomMap, name: e.target.value })}
                  placeholder="Tuscan"
                  className="w-full bg-[#0A0A0A] border border-neutral-700 px-3 py-2 text-white text-xs outline-none focus:border-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-neutral-400 block mb-1">URL Imagen Fondo (Opcional)</label>
                <input
                  type="text"
                  value={newCustomMap.image}
                  onChange={(e) => setNewCustomMap({ ...newCustomMap, image: e.target.value })}
                  placeholder="https://.../map.png"
                  className="w-full bg-[#0A0A0A] border border-neutral-700 px-3 py-2 text-white text-xs outline-none focus:border-white"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-neutral-400 block mb-1">URL Ícono (Opcional)</label>
                <input
                  type="text"
                  value={newCustomMap.icon}
                  onChange={(e) => setNewCustomMap({ ...newCustomMap, icon: e.target.value })}
                  placeholder="https://.../icon.png"
                  className="w-full bg-[#0A0A0A] border border-neutral-700 px-3 py-2 text-white text-xs outline-none focus:border-white"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddCustomMapModal(false)}
                className="px-3 py-1.5 border border-neutral-700 text-neutral-400 hover:text-white text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddCustomMapInLobby}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase"
              >
                Añadir Mapa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bet & Quota Verification Modal (Antes de lanzar el encuentro) */}
      {isBetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md">
          <div className="bg-[#121212] border-2 border-[#2D2D2D] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl rounded-none font-mono text-white animate-fade-in overflow-hidden">
            
            {/* Header */}
            <div className="bg-[#1A1A1A] border-b border-[#2D2D2D] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-none bg-[#FF5500]/20 border border-[#FF5500] flex items-center justify-center text-[#FF5500]">
                  <Coins className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                    CONFIGURAR APUESTA Y VERIFICAR CUOTAS
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-mono">
                    Todos los 10 jugadores deben tener saldo suficiente o estar marcados como pagados para poder lanzar.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsBetModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

              {/* Chosen Map Banner (si viene de veto) */}
              {(() => {
                const mapObj = chosenMapForMatch || lobbyState.mapVeto?.chosenMap;
                if (!mapObj) return null;
                return (
                  <div className="bg-[#181818] border-2 border-neutral-700 p-3 sm:p-4 flex items-center justify-between gap-4 relative overflow-hidden">
                    <img 
                      src={mapObj.image} 
                      alt={mapObj.name} 
                      className="absolute right-0 top-0 h-full w-1/3 object-cover opacity-20 pointer-events-none"
                    />
                    <div className="flex items-center gap-3 relative z-10">
                      <img src={mapObj.icon} alt={mapObj.name} className="w-12 h-12 object-contain drop-shadow" />
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#FF5500] block">
                          MAPA DEFINIDO EN FASE DE VETO
                        </span>
                        <span className="text-base sm:text-lg font-black uppercase text-white tracking-wider flex items-center gap-2">
                          🗺️ {mapObj.name}
                        </span>
                      </div>
                    </div>
                    <div className="hidden sm:block text-right relative z-10">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 bg-black/60 px-2 py-1 border border-neutral-700">
                        Pool Competitivo CS2
                      </span>
                    </div>
                  </div>
                );
              })()}
              
              {/* Section 1: Selector de Apuesta / Cuota */}
              <div className="bg-[#161616] border border-[#2D2D2D] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5 mb-2">
                    <DollarSign className="w-3.5 h-3.5 text-[#FF5500]" /> CUOTA DE APUESTA POR JUGADOR
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[0, 2, 5, 10, 20].map((amt) => {
                      const active = !isCustomBet && selectedBetAmount === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleSelectBetAmount(amt)}
                          className={`px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                            active 
                              ? 'bg-[#FF5500] border-[#FF5500] text-white shadow-md' 
                              : 'bg-[#1F1F1F] border-[#333] hover:border-neutral-500 text-neutral-300'
                          }`}
                        >
                          {amt === 0 ? 'GRATIS (S/ 0)' : `S/ ${amt}.00`}
                        </button>
                      );
                    })}

                    {/* Custom Bet Button / Input */}
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomBet(true);
                          handleCustomBetChange(customBetInput || '15');
                        }}
                        className={`px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                          isCustomBet 
                            ? 'bg-[#FF5500] border-[#FF5500] text-white' 
                            : 'bg-[#1F1F1F] border-[#333] hover:border-neutral-500 text-neutral-300'
                        }`}
                      >
                        OTRO MONTO
                      </button>
                      {isCustomBet && (
                        <div className="flex items-center ml-2 border border-[#FF5500] bg-[#1A1A1A] px-2 py-1">
                          <span className="text-xs text-[#FF5500] font-bold mr-1">S/</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={customBetInput}
                            onChange={(e) => handleCustomBetChange(e.target.value)}
                            className="w-16 bg-transparent text-xs text-white font-mono focus:outline-none"
                            placeholder="0.00"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pot summary Card */}
                <div className="bg-[#1A1A1A] border border-[#333] px-5 py-3 flex items-center gap-6 justify-between lg:justify-end">
                  <div className="text-left">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-bold">Cuota Indiv.</span>
                    <span className="text-sm font-black text-white">S/ {effectiveBetAmount.toFixed(2)}</span>
                  </div>
                  <div className="w-[1px] h-8 bg-[#333]" />
                  <div className="text-left">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 block font-bold">10 Jugadores</span>
                    <span className="text-sm font-black text-neutral-300">10 Cupos</span>
                  </div>
                  <div className="w-[1px] h-8 bg-[#333]" />
                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider text-[#FF5500] block font-bold">🏆 Pozo Acumulado</span>
                    <span className="text-base md:text-lg font-black text-[#FF5500] tracking-tight">
                      S/ {(effectiveBetAmount * 10).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 1.5: Método de inicio */}
              <div className="bg-[#161616] border border-[#2D2D2D] p-4 flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                  MÉTODO PARA INICIAR EL MIXTON
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMatchMode('faceit')}
                    className={`text-left p-3 border transition-all cursor-pointer ${
                      matchMode === 'faceit'
                        ? 'bg-[#FF5500]/15 border-[#FF5500] text-white'
                        : 'bg-[#1F1F1F] border-[#333] hover:border-neutral-500 text-neutral-300'
                    }`}
                  >
                    <span className="block text-xs font-black uppercase">🟠 FACEIT</span>
                    <span className="block mt-1 text-[10px] leading-relaxed text-neutral-400">Asigna una cola del club; los capitanes forman sus parties y juegan desde FACEIT.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchMode('steam')}
                    className={`text-left p-3 border transition-all cursor-pointer ${
                      matchMode === 'steam'
                        ? 'bg-sky-500/15 border-sky-400 text-white'
                        : 'bg-[#1F1F1F] border-[#333] hover:border-neutral-500 text-neutral-300'
                    }`}
                  >
                    <span className="block text-xs font-black uppercase">🔵 SERVIDOR CS2 (IP POR DISCORD)</span>
                    <span className="block mt-1 text-[10px] leading-relaxed text-neutral-400">Enciende el servidor dedicado de CS2, configura el 5v5 con el mapa elegido y envía la IP de conexión (38.25.72.56:27015) por Discord.</span>
                  </button>
                </div>
                {matchMode === 'steam' && (
                  <div className="text-[10px] text-sky-200 bg-sky-950/30 border border-sky-800/60 p-3 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-sky-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Servidor Dedicado CS2 (IP por Discord)
                    </p>
                    <p className="text-neutral-300 leading-relaxed">
                      Al lanzar el encuentro, el servidor se encenderá automáticamente con el mapa elegido. La IP de conexión (<code className="text-white font-mono bg-black/40 px-1 py-0.5 rounded">connect 38.25.72.56:27015</code>) se enviará por Discord mediante el canal oficial y por mensaje directo (DM) a los 10 jugadores. Al acabar la partida, todos serán kickeados y el servidor se apagará automáticamente.
                    </p>
                  </div>
                )}
                {matchMode === 'steam' && betPlayers.some(p => !p.hasSteam) && (
                  <div className="bg-red-500/15 border-2 border-red-500/70 p-4 flex items-start gap-3 text-red-200">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
                    <div className="text-xs flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black uppercase text-red-400 text-sm tracking-wide">
                          ⚠️ BLOQUEADO: FALTA VINCULAR STEAM ID
                        </span>
                        <span className="text-[10px] bg-red-950 border border-red-600 px-2 py-0.5 text-red-300 font-bold uppercase font-mono">
                          {betPlayers.filter(p => !p.hasSteam).length} jugador(es) pendiente(s)
                        </span>
                      </div>
                      <p className="mt-1 leading-relaxed text-neutral-300">
                        Para ingresar al servidor dedicado de CS2, los 10 jugadores deben tener su <strong>SteamID vinculado</strong>. No se puede lanzar el encuentro hasta que todos estén vinculados:
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {betPlayers.filter(p => !p.hasSteam).map(p => (
                          <span key={p.discordId} className="bg-red-950/90 border border-red-500 text-white px-2.5 py-1 text-xs font-bold font-mono flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            <strong>{p.faceit_nickname || p.displayName}</strong>
                            <span className="text-red-300 font-normal">({p.team === 'A' ? 'Equipo 1' : 'Equipo 2'})</span>
                            <span className="text-red-400 text-[10px] uppercase">— Falta Steam ID</span>
                          </span>
                        ))}
                      </div>
                      <p className="mt-2.5 text-[10px] text-neutral-400 leading-normal">
                        👉 Cada jugador debe ingresar a la web con su Discord y vincular su cuenta de Steam en <strong className="text-white">"Mi Billetera & Cuenta"</strong>, o tener su Steam público asociado a su cuenta de FACEIT.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 1.6: Selector de Sala / Cola Faceit */}
              {matchMode === 'faceit' && (() => {
                const autoAssignedQueue = availableQueues.find(q => q.status === 'free') || availableQueues[0];
                const selectedQueueObj = selectedQueueId === 'auto' 
                  ? autoAssignedQueue 
                  : availableQueues.find(q => (q.queueId || q.id) === selectedQueueId);

                return (
                  <div className="bg-[#161616] border border-[#2D2D2D] p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> SALA / COLA ASIGNADA EN FACEIT
                      </label>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {isLoadingQueues ? 'Consultando disponibilidad...' : 'Asignación automática inteligente'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Opción Automática */}
                      <button
                        type="button"
                        onClick={() => setSelectedQueueId('auto')}
                        className={`px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                          selectedQueueId === 'auto'
                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                            : 'bg-[#1F1F1F] border-[#333] hover:border-neutral-500 text-neutral-300'
                        }`}
                      >
                        <span>🤖 AUTOMÁTICA (Siguiente libre)</span>
                        {autoAssignedQueue && (
                          <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-emerald-200">
                            👉 {autoAssignedQueue.name}
                          </span>
                        )}
                      </button>

                      {/* Botones de Colas individuales */}
                      {availableQueues.map((q) => {
                        const isSelected = selectedQueueId === (q.queueId || q.id);
                        const isFree = q.status === 'free';

                        return (
                          <button
                            key={q.queueId || q.id}
                            type="button"
                            onClick={() => setSelectedQueueId(q.queueId || q.id)}
                            className={`px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                              isSelected
                                ? 'bg-[#FF5500] border-[#FF5500] text-white shadow-md'
                                : 'bg-[#1F1F1F] border-[#333] hover:border-neutral-500 text-neutral-300'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isFree ? 'bg-emerald-400' : 'bg-red-500'}`} />
                            <span>{q.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              isFree ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50' : 'bg-red-950/80 text-red-300 border border-red-800/50'
                            }`}>
                              {isFree ? 'LIBRE' : 'EN JUEGO'}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Advertencia si la sala elegida está ocupada */}
                    {selectedQueueObj && selectedQueueObj.status === 'busy' && selectedQueueObj.activeMatch && (
                      <div className="text-[11px] text-amber-300 bg-amber-950/50 border border-amber-800/60 px-3 py-1.5 flex items-center gap-2 font-mono">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          <strong>{selectedQueueObj.name}</strong> tiene una partida en curso: <strong>{selectedQueueObj.activeMatch.teamA} vs {selectedQueueObj.activeMatch.teamB}</strong>. Si lanzas en esta sala, los capitanes compartirán la cola de Faceit.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Section 2: Progress & Status Banner */}
              {(() => {
                const isPlayerReady = (p: PlayerBetStatus) => {
                  if (effectiveBetAmount === 0) return true;
                  if (manualPaidMap[p.discordId]) return true;
                  return p.balance >= effectiveBetAmount;
                };
                const readyCount = betPlayers.filter(isPlayerReady).length;
                const isAllReady = betPlayers.length === 10 && readyCount === 10;

                return (
                  <div className={`p-4 border transition-all ${
                    isAllReady 
                      ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200' 
                      : 'bg-neutral-900 border-neutral-700 text-neutral-300'
                  }`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {isAllReady ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        )}
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {isAllReady 
                            ? '¡LOS 10 JUGADORES ESTÁN LISTOS! Se puede lanzar el encuentro.' 
                            : `FALTAN ${10 - readyCount} JUGADOR(ES) POR COMPLETAR SU CUOTA (${readyCount}/10 LISTOS)`}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-400 font-bold">
                        {readyCount} de 10 Cuotas Listas ({Math.round((readyCount / 10) * 100)}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-neutral-800 h-2 rounded-none overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          isAllReady ? 'bg-emerald-500' : 'bg-[#FF5500]'
                        }`}
                        style={{ width: `${(readyCount / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Section 3: The 10 Players Grid (Team A vs Team B) */}
              {isLoadingBetStatus ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#FF5500]" />
                  <span className="text-xs uppercase font-mono">Consultando saldos en vivo de los 10 jugadores...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Column Team A */}
                  <div className="bg-[#161616] border border-[#2D2D2D] p-3 md:p-4">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#262626]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-white tracking-wider">
                          🔵 EQUIPO A: {lobbyState.teams.find(t => t.id === matchTeamA)?.name.toUpperCase() || 'EQUIPO A'}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {betPlayers.filter(p => p.team === 'A' && (effectiveBetAmount === 0 || manualPaidMap[p.discordId] || p.balance >= effectiveBetAmount)).length}/5 Listos
                      </span>
                    </div>

                    <div className="space-y-2">
                      {betPlayers.filter(p => p.team === 'A').map((p) => {
                        const balanceReady = effectiveBetAmount === 0 || manualPaidMap[p.discordId] || p.balance >= effectiveBetAmount;
                        const steamReady = matchMode !== 'steam' || Boolean(p.hasSteam);
                        const ready = balanceReady && steamReady;
                        const isManual = manualPaidMap[p.discordId];

                        return (
                          <div 
                            key={p.discordId}
                            className={`p-2.5 border transition-all flex items-center justify-between gap-3 ${
                              ready 
                                ? 'bg-[#181F1A] border-emerald-900/40' 
                                : !steamReady
                                  ? 'bg-[#2E1212] border-red-600/60'
                                  : 'bg-[#221818] border-red-900/40'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative flex-shrink-0">
                                {p.avatarURL ? (
                                  <img src={p.avatarURL} alt={p.faceit_nickname} className="w-8 h-8 rounded-none border border-neutral-700 object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded-none bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-400">
                                    {p.faceit_nickname.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                {p.isCaptain && (
                                  <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-amber-500 text-black px-1 font-black leading-tight">
                                    👑
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black text-white truncate max-w-[120px] md:max-w-[150px]">
                                    {p.faceit_nickname}
                                  </span>
                                  {p.displayName && p.displayName !== p.faceit_nickname && (
                                    <span className="text-[10px] text-neutral-500 truncate hidden sm:inline">
                                      ({p.displayName})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                                  <span className="flex items-center gap-1">
                                    <Wallet className="w-2.5 h-2.5 text-neutral-400" />
                                    Saldo: <strong className="text-white">S/ {p.balance.toFixed(2)}</strong>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => refreshSinglePlayerBalance(p.discordId)}
                                    title="Consultar saldo en base de datos si este jugador recargó"
                                    className="text-neutral-500 hover:text-white transition-colors cursor-pointer p-0.5"
                                  >
                                    <RefreshCw className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                                {matchMode === 'steam' && (
                                  <div className="mt-1 flex items-center gap-1 font-mono text-[9px]">
                                    {p.hasSteam ? (
                                      <span className="text-sky-300 font-bold flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                        Steam ID: {p.steam_id_64 ? `${p.steam_id_64.substring(0, 8)}...` : 'Vinculado'}
                                      </span>
                                    ) : (
                                      <span className="text-red-400 font-bold flex items-center gap-1 animate-pulse">
                                        <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                                        FALTA VINCULAR STEAM ID
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              {effectiveBetAmount === 0 ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                  GRATIS
                                </span>
                              ) : isManual ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                  ✓ MANUAL
                                </span>
                              ) : ready ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                  ✓ SALDO OK
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                                  FALTA S/ {Math.max(0, parseFloat((effectiveBetAmount - p.balance).toFixed(2))).toFixed(2)}
                                </span>
                              )}

                              {matchMode === 'steam' && !p.hasSteam && (
                                <span className="px-1.5 py-0.5 text-[8px] font-bold bg-red-600/30 text-red-300 border border-red-500/60 animate-pulse">
                                  FALTA STEAM
                                </span>
                              )}

                              {effectiveBetAmount > 0 && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleManualPaid(p.discordId)}
                                    title={isManual ? 'Quitar marca de pago manual' : 'Marcar como pagado manualmente (Yape directo/efectivo)'}
                                    className={`px-1.5 py-1 text-[9px] font-bold border transition-all cursor-pointer ${
                                      isManual 
                                        ? 'bg-blue-600 border-blue-400 text-white' 
                                        : 'bg-[#222] border-[#444] text-neutral-400 hover:text-white hover:border-neutral-200'
                                    }`}
                                  >
                                    {isManual ? 'PAGADO' : 'MANUAL'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuickTopUpUser({ discordId: p.discordId, nickname: p.faceit_nickname, hasSavedPhone: p.hasSavedPhone });
                                      setQuickTopUpAmount(p.deficit > 0 ? p.deficit.toFixed(2) : '5.00');
                                      setYapePhoneInput('');
                                      setYapeOperationInput('');
                                    }}
                                    title="Recargar saldo a este usuario"
                                    className="px-1.5 py-1 text-[9px] font-bold bg-[#262626] border border-[#444] text-[#FF5500] hover:border-[#FF5500] transition-all cursor-pointer"
                                  >
                                    + RECARGAR
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column Team B */}
                  <div className="bg-[#161616] border border-[#2D2D2D] p-3 md:p-4">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#262626]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-white tracking-wider">
                          🟠 EQUIPO B: {lobbyState.teams.find(t => t.id === matchTeamB)?.name.toUpperCase() || 'EQUIPO B'}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {betPlayers.filter(p => p.team === 'B' && (effectiveBetAmount === 0 || manualPaidMap[p.discordId] || p.balance >= effectiveBetAmount)).length}/5 Listos
                      </span>
                    </div>

                    <div className="space-y-2">
                      {betPlayers.filter(p => p.team === 'B').map((p) => {
                        const balanceReady = effectiveBetAmount === 0 || manualPaidMap[p.discordId] || p.balance >= effectiveBetAmount;
                        const steamReady = matchMode !== 'steam' || Boolean(p.hasSteam);
                        const ready = balanceReady && steamReady;
                        const isManual = manualPaidMap[p.discordId];

                        return (
                          <div 
                            key={p.discordId}
                            className={`p-2.5 border transition-all flex items-center justify-between gap-3 ${
                              ready 
                                ? 'bg-[#181F1A] border-emerald-900/40' 
                                : !steamReady
                                  ? 'bg-[#2E1212] border-red-600/60'
                                  : 'bg-[#221818] border-red-900/40'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative flex-shrink-0">
                                {p.avatarURL ? (
                                  <img src={p.avatarURL} alt={p.faceit_nickname} className="w-8 h-8 rounded-none border border-neutral-700 object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded-none bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-400">
                                    {p.faceit_nickname.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                {p.isCaptain && (
                                  <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-amber-500 text-black px-1 font-black leading-tight">
                                    👑
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black text-white truncate max-w-[120px] md:max-w-[150px]">
                                    {p.faceit_nickname}
                                  </span>
                                  {p.displayName && p.displayName !== p.faceit_nickname && (
                                    <span className="text-[10px] text-neutral-500 truncate hidden sm:inline">
                                      ({p.displayName})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                                  <span className="flex items-center gap-1">
                                    <Wallet className="w-2.5 h-2.5 text-neutral-400" />
                                    Saldo: <strong className="text-white">S/ {p.balance.toFixed(2)}</strong>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => refreshSinglePlayerBalance(p.discordId)}
                                    title="Consultar saldo en base de datos si este jugador recargó"
                                    className="text-neutral-500 hover:text-white transition-colors cursor-pointer p-0.5"
                                  >
                                    <RefreshCw className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                                {matchMode === 'steam' && (
                                  <div className="mt-1 flex items-center gap-1 font-mono text-[9px]">
                                    {p.hasSteam ? (
                                      <span className="text-sky-300 font-bold flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                        Steam ID: {p.steam_id_64 ? `${p.steam_id_64.substring(0, 8)}...` : 'Vinculado'}
                                      </span>
                                    ) : (
                                      <span className="text-red-400 font-bold flex items-center gap-1 animate-pulse">
                                        <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                                        FALTA VINCULAR STEAM ID
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              {effectiveBetAmount === 0 ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                  GRATIS
                                </span>
                              ) : isManual ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                  ✓ MANUAL
                                </span>
                              ) : ready ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                  ✓ SALDO OK
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                                  FALTA S/ {Math.max(0, parseFloat((effectiveBetAmount - p.balance).toFixed(2))).toFixed(2)}
                                </span>
                              )}

                              {matchMode === 'steam' && !p.hasSteam && (
                                <span className="px-1.5 py-0.5 text-[8px] font-bold bg-red-600/30 text-red-300 border border-red-500/60 animate-pulse">
                                  FALTA STEAM
                                </span>
                              )}

                              {effectiveBetAmount > 0 && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleManualPaid(p.discordId)}
                                    title={isManual ? 'Quitar marca de pago manual' : 'Marcar como pagado manualmente (Yape directo/efectivo)'}
                                    className={`px-1.5 py-1 text-[9px] font-bold border transition-all cursor-pointer ${
                                      isManual 
                                        ? 'bg-blue-600 border-blue-400 text-white' 
                                        : 'bg-[#222] border-[#444] text-neutral-400 hover:text-white hover:border-neutral-200'
                                    }`}
                                  >
                                    {isManual ? 'PAGADO' : 'MANUAL'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuickTopUpUser({ discordId: p.discordId, nickname: p.faceit_nickname, hasSavedPhone: p.hasSavedPhone });
                                      setQuickTopUpAmount(p.deficit > 0 ? p.deficit.toFixed(2) : '5.00');
                                      setYapePhoneInput('');
                                      setYapeOperationInput('');
                                    }}
                                    title="Recargar saldo a este usuario"
                                    className="px-1.5 py-1 text-[9px] font-bold bg-[#262626] border border-[#444] text-[#FF5500] hover:border-[#FF5500] transition-all cursor-pointer"
                                  >
                                    + RECARGAR
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {(() => {
              const isPlayerReady = (p: PlayerBetStatus) => {
                if (matchMode === 'steam' && !p.hasSteam) return false;
                if (effectiveBetAmount === 0) return true;
                if (manualPaidMap[p.discordId]) return true;
                return p.balance >= effectiveBetAmount;
              };
              const readyCount = betPlayers.filter(isPlayerReady).length;
              const missingSteamPlayers = matchMode === 'steam' ? betPlayers.filter(p => !p.hasSteam) : [];
              const isAllReady = betPlayers.length === 10 && readyCount === 10 && missingSteamPlayers.length === 0;

              return (
                <div className="bg-[#161616] border-t border-[#2D2D2D] px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => fetchBetStatus(effectiveBetAmount)}
                    disabled={isLoadingBetStatus}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 bg-[#222] hover:bg-[#2A2A2A] border border-[#333] text-xs font-bold text-neutral-300 uppercase transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBetStatus ? 'animate-spin' : ''}`} />
                    Actualizar Estados y Steam
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setIsBetModalOpen(false)}
                      disabled={isLaunchingMatch}
                      className="flex-1 sm:flex-none px-4 py-2 border border-neutral-600 hover:border-white text-xs font-bold text-white uppercase transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmLaunchMatch}
                      disabled={!isAllReady || isLaunchingMatch}
                      className={`flex-1 sm:flex-none px-6 py-2 border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        isAllReady && !isLaunchingMatch
                          ? 'bg-[#FF5500] hover:bg-[#FF7733] border-[#FF5500] text-white shadow-lg shadow-[#FF5500]/20'
                          : 'bg-neutral-800 border-neutral-700 text-neutral-500 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {isLaunchingMatch 
                        ? 'LANZANDO ENCUENTRO...' 
                        : missingSteamPlayers.length > 0
                          ? `BLOQUEADO (${missingSteamPlayers.length} SIN STEAM ID)`
                          : isAllReady 
                            ? `🚀 CONFIRMAR Y LANZAR ${(chosenMapForMatch?.name || lobbyState.mapVeto?.chosenMap?.name) ? `[${chosenMapForMatch?.name || lobbyState.mapVeto?.chosenMap?.name}] ` : ''}(POZO: S/ ${(effectiveBetAmount * 10).toFixed(2)})` 
                            : `BLOQUEADO (${readyCount}/10 LISTOS)`}
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* Modal para recarga por depósito Yape o acreditación manual */}
      {quickTopUpUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
          <div className="bg-[#1A1A1A] border-2 border-[#FF5500] p-5 w-full max-w-md text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2D2D2D] pb-3 mb-3">
              <h4 className="text-xs font-black uppercase text-[#FF5500] flex items-center gap-2">
                <Coins className="w-4 h-4" /> RECARGAR SALDO A JUGADOR
              </h4>
              <button 
                type="button"
                onClick={() => setQuickTopUpUser(null)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-neutral-300 mb-3">
              Jugador: <strong className="text-white">{quickTopUpUser.nickname}</strong>
            </p>

            {/* Tabs */}
            <div className="flex border border-[#333] mb-4 bg-[#141414]">
              <button
                type="button"
                onClick={() => setTopUpTab('yape_verificado')}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  topUpTab === 'yape_verificado'
                    ? 'bg-[#742284] text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                ⚡ Verificar Yape
              </button>
              <button
                type="button"
                onClick={() => setTopUpTab('admin_manual')}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  topUpTab === 'admin_manual'
                    ? 'bg-[#FF5500] text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                🛠️ Acreditar Manual
              </button>
            </div>

            {topUpTab === 'yape_verificado' ? (
              <div className="space-y-3 mb-4">
                <div className="p-2.5 bg-[#25152B] border border-[#742284]/40 text-[10px] text-purple-200">
                  ℹ️ Ingresa monto y <strong>código de aprobación</strong> para validar el depósito. El celular se guarda para enviar premios, pero no se compara con la transacción.
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Monto enviado (S/):</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={quickTopUpAmount}
                    onChange={(e) => setQuickTopUpAmount(e.target.value)}
                    className="w-full bg-[#111] border border-[#333] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#742284]"
                    placeholder="Ej: 5.00"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Celular Yape para recibir premios:</label>
                  <input
                    type="text"
                    maxLength={9}
                    value={yapePhoneInput}
                    onChange={(e) => setYapePhoneInput(e.target.value)}
                    className="w-full bg-[#111] border border-[#333] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#742284]"
                    placeholder="Ej: 987654321"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Código de aprobación Yape:</label>
                  <input
                    type="text"
                    maxLength={64}
                    value={yapeOperationInput}
                    onChange={(e) => setYapeOperationInput(e.target.value)}
                    className="w-full bg-[#111] border border-[#333] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#742284]"
                    placeholder="Ej: 25381004"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">Monto a Acreditar (S/):</label>
                  <div className="flex items-center bg-[#111] border border-[#333] px-3 py-1.5 focus-within:border-[#FF5500]">
                    <span className="text-xs text-[#FF5500] font-bold mr-2">S/</span>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={quickTopUpAmount}
                      onChange={(e) => setQuickTopUpAmount(e.target.value)}
                      className="w-full bg-transparent text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-neutral-400">
                  Usa esta opción si el jugador ya te yapeó a tu celular personal o pagó en efectivo.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-[#2D2D2D] pt-3">
              <button
                type="button"
                onClick={() => setQuickTopUpUser(null)}
                className="px-3 py-1.5 border border-neutral-600 text-xs font-bold text-white uppercase hover:border-white transition-all cursor-pointer"
              >
                Cancelar
              </button>
              {topUpTab === 'yape_verificado' ? (
                <button
                  type="button"
                  onClick={handleYapeVerificationSubmit}
                  disabled={isSubmittingTopUp}
                  className="px-4 py-1.5 bg-[#742284] hover:bg-[#8B2FA0] border border-[#742284] text-xs font-black text-white uppercase transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingTopUp ? 'Verificando...' : 'Verificar y acreditar'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleQuickTopUpSubmit}
                  disabled={isSubmittingTopUp}
                  className="px-4 py-1.5 bg-[#FF5500] hover:bg-[#FF7733] border border-[#FF5500] text-xs font-black text-white uppercase transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingTopUp ? 'Acreditando...' : 'Confirmar Acreditación'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

        {/* Modal de Vista Previa Conceptual CS2 (Mockups de las 3 Skills) */}
        {showMockupModal && (
          <div 
            className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto animate-fade-in font-mono"
            onClick={() => setShowMockupModal(false)}
          >
            <div 
              className="bg-[#0B0E14] border-2 border-[#FF5500]/60 w-full max-w-6xl max-h-[94vh] flex flex-col shadow-[0_0_50px_rgba(255,85,0,0.25)] rounded-none text-white overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-[#121622] border-b border-white/10 p-4 sm:p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FF5500] text-black flex items-center justify-center font-black">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                      DISEÑO Y ARQUITECTURA DE EXPERIENCIA CS2 <span className="text-[#FF5500]">// MACHUPEEK</span>
                    </h3>
                    <p className="text-[10px] text-neutral-400">
                      Concepto generado aplicando las directivas de Taste Skill, UI/UX Pro Max e Impeccable
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMockupModal(false)}
                  className="text-neutral-400 hover:text-white p-1 text-xl cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Tabs */}
              <div className="bg-[#161B28] border-b border-white/10 px-4 py-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMockupTab('draft')}
                  className={`px-4 py-2 text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-2 ${
                    selectedMockupTab === 'draft'
                      ? 'bg-[#FF5500] text-black font-black shadow-md'
                      : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  <span>1. Lobby & Draft en Vivo (5 Fases)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMockupTab('veto')}
                  className={`px-4 py-2 text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-2 ${
                    selectedMockupTab === 'veto'
                      ? 'bg-[#FF5500] text-black font-black shadow-md'
                      : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5'
                  }`}
                >
                  <Map className="w-4 h-4" />
                  <span>2. Veto de Mapas CS2 (BLAST Premier Style)</span>
                </button>
              </div>

              {/* Image & Description View */}
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh] space-y-4">
                {selectedMockupTab === 'draft' ? (
                  <div className="space-y-4">
                    <div className="border-2 border-white/10 bg-black/80 overflow-hidden shadow-2xl relative group">
                      <img 
                        src="/mixton_draft_preview.jpg" 
                        alt="Mockup Draft Lobby CS2 MachuPeek" 
                        className="w-full h-auto object-contain max-h-[60vh] mx-auto"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/80 border border-white/20 px-2.5 py-1 text-[10px] text-neutral-300">
                        HD Concept Preview // Mixton Draft Arena
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-[#111622] border border-white/10">
                        <span className="text-[#FF5500] font-bold block mb-1">1. Pipeline de 5 Fases:</span>
                        <p className="text-neutral-400 text-[11px] leading-relaxed">
                          El usuario sabe exactamente en qué paso está la partida: Convocatoria → Sorteo → Draft → Veto → Servidor en Vivo.
                        </p>
                      </div>
                      <div className="p-3 bg-[#111622] border border-white/10">
                        <span className="text-sky-400 font-bold block mb-1">2. Rivalidad Visual Fénix vs Kobra:</span>
                        <p className="text-neutral-400 text-[11px] leading-relaxed">
                          Colores de equipo de alta distinción (Fénix en Fuego / Naranja y Kobra en Cobalt / Azul), con corona dorada para el capitán.
                        </p>
                      </div>
                      <div className="p-3 bg-[#111622] border border-white/10">
                        <span className="text-emerald-400 font-bold block mb-1">3. Estado de Turno Inmediato:</span>
                        <p className="text-neutral-400 text-[11px] leading-relaxed">
                          El banner superior notifica en tiempo real quién debe elegir y cuánto tiempo queda en el reloj.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-2 border-white/10 bg-black/80 overflow-hidden shadow-2xl relative group">
                      <img 
                        src="/mixton_veto_preview.jpg" 
                        alt="Mockup Veto de Mapas CS2 MachuPeek" 
                        className="w-full h-auto object-contain max-h-[60vh] mx-auto"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/80 border border-white/20 px-2.5 py-1 text-[10px] text-neutral-300">
                        HD Concept Preview // CS2 Map Veto Phase
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-[#111622] border border-white/10">
                        <span className="text-red-400 font-bold block mb-1">1. Mapas Baneados Claros:</span>
                        <p className="text-neutral-400 text-[11px] leading-relaxed">
                          Los mapas descartados quedan sellados con banda roja y el nombre del equipo que realizó el ban, evitando confusiones.
                        </p>
                      </div>
                      <div className="p-3 bg-[#111622] border border-white/10">
                        <span className="text-[#FF5500] font-bold block mb-1">2. Turno Activo Resaltado:</span>
                        <p className="text-neutral-400 text-[11px] leading-relaxed">
                          El mapa en hover muestra borde de neón ardiente con el llamado interactivo "CLIC PARA BANEAR".
                        </p>
                      </div>
                      <div className="p-3 bg-[#111622] border border-white/10">
                        <span className="text-emerald-400 font-bold block mb-1">3. Mapa Ganador con Trofeo:</span>
                        <p className="text-neutral-400 text-[11px] leading-relaxed">
                          El mapa decider se corona con resplandor verde esmeralda y trofeo dorado 🏆 listo para ser enviado al servidor de CS2.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-[#121622] border-t border-white/10 p-3.5 px-6 flex items-center justify-between">
                <span className="text-[10px] text-neutral-400">
                  Concepto visual generado para MachuPeek Esports Perú
                </span>
                <button
                  type="button"
                  onClick={() => setShowMockupModal(false)}
                  className="px-5 py-1.5 bg-[#FF5500] text-black font-black uppercase text-xs hover:bg-[#e04c00] transition-colors cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

        </>
      )}

      {/* Global footer */}
      <Footer setActiveView={handleSelectView} />


      {/* Notification Toast Stack (Admin Style) */}
      <div id="toast-container" className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 z-[9999] flex flex-col gap-3">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`w-full sm:w-auto px-5 py-3 rounded-none shadow-[8px_8px_0px_rgba(0,0,0,0.8)] flex items-center gap-3 border-2 transition-all animate-slide-in ${
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

