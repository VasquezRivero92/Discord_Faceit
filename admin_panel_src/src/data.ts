import { LinkedUser, LiveMatch, SystemLog, BotConfig, FeatureFlag, PlayerStats } from './types';

export const initialUsers: LinkedUser[] = [
  {
    discordId: '1938472918347',
    faceitNickname: 'ToxicPlayer_99',
    faceitPlayerId: 'fct_88a9s7d6f5g',
    status: 'Verificado',
    linkedAt: 'Oct 24, 2023',
  },
  {
    discordId: '5829104857291',
    faceitNickname: 'NoobMaster',
    faceitPlayerId: 'fct_11b2c3d4e5',
    status: 'Pendiente',
    linkedAt: 'Oct 25, 2023',
  },
  {
    discordId: '7382910485729',
    faceitNickname: 'ProGamer_X',
    faceitPlayerId: 'fct_99x8y7z6w5',
    status: 'Verificado',
    linkedAt: 'Oct 21, 2023',
  },
  {
    discordId: '1122334455667',
    faceitNickname: 'ShadowNinja',
    faceitPlayerId: 'fct_aa11bb22cc',
    status: 'Baneado',
    linkedAt: 'Sep 15, 2023',
  },
];

export const initialMatches: LiveMatch[] = [
  {
    id: '#FCT-9821',
    teamAName: 'NAVI',
    teamALogo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC-T-ArhtmjNY7XWZGrTNyRSbs6dzTSYUG8mTVsB1cc-xMXXgaw-A_Nu4cjf174jExQDOmINOjV8PY9alMDZE_dqpiQul2ijWV0YQWZQgrC7iJduQ81acIXw9v2AxvKG3SnoRkfjp4q0v_ZON39heKHxDAXz_hQpq5k28s8Oi8dUzMWuaL3zg9h8hRr6AJAtU05Lf9kXnTfRbB4VRKm06T022nyuz4R6IQQMigmy42dT0xrL2KLKquDmdA7DbOORzHNvwbd580bEXo',
    teamBName: 'Faze Clan',
    teamBLogo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfrmmYKhxVUoG0tA5zPPKQG3K-0Yz2HYfiYCTrA2uEti-a3oGqCGijpFdJznq_-y4kj2cg-P7Yxtgr7W36dYgThhWVSnaBWcEeKGctwx44Jse6K18ajLmteMLI5FOZd8N45N6Adjcdi_ZEFtotiFFWLTS1nZsdRW8srwGxFawN4egUdDuRlThqA5AtD4rohTaR8xPdyfAInqxC21u86FFAQYlO9S9ClnKQxseloZ9e5MZy6F7mO8gKkgVe8cwA3vtb29XAwaZA1ws',
    map: 'de_mirage',
    location: 'Alemania (FRA)',
    startedAtMinutesAgo: 12,
  },
  {
    id: '#FCT-9822',
    teamAName: 'G2 Esports',
    teamBName: 'Vitality',
    map: 'de_inferno',
    location: 'Reino Unido (LON)',
    startedAtMinutesAgo: 45,
  },
  {
    id: '#FCT-9825',
    teamAName: 'Team Liquid',
    teamBName: 'Complexity',
    map: 'de_nuke',
    location: 'EE. UU. Este (CHI)',
    startedAtMinutesAgo: 2,
  },
  {
    id: '#FCT-9810',
    teamAName: 'MOUZ',
    teamBName: 'ENCE',
    map: 'de_ancient',
    location: 'Suecia (STO)',
    startedAtMinutesAgo: 85, // Flagged as high duration (>60 minutes)
  },
];

export const initialFeatureFlags: FeatureFlag[] = [
  { key: 'autoWelcomeDm', name: 'Welcome DM', desc: 'Enviar mensaje de bienvenida por DM a nuevos miembros', enabled: true },
  { key: 'autoRoleSync', name: 'Role Sync', desc: 'Sincronizar roles de nivel y club automáticamente', enabled: true },
  { key: 'autoNickSync', name: 'Nick Sync', desc: 'Sincronizar apodos de Discord al iniciar partida de Faceit', enabled: true },
  { key: 'autoVoiceChannels', name: 'Voice Channels', desc: 'Crear canales de voz temporales para partidas', enabled: true },
  { key: 'autoMovePlayers', name: 'Auto Move', desc: 'Mover jugadores a sus canales de voz al iniciar partida', enabled: false },
  { key: 'matchAnnouncements', name: 'Match Announcements', desc: 'Anunciar partidas en Discord', enabled: true },
  { key: 'serverStatusAnnouncements', name: 'Server Status', desc: 'Anunciar estado de servidores LATAM', enabled: true },
  { key: 'liveMatchPanel', name: 'Live Panel', desc: 'Panel de partidas en vivo fijado', enabled: true },
  { key: 'webhookValidation', name: 'Webhook Validation', desc: 'Validar firma de webhooks de Faceit', enabled: true },
];

export const initialConfig: BotConfig = {
  discordGuildId: '111222333444555666',
  discordLinkChannelId: '112233445566778899',
  discordMatchesChannelId: '223344556677889900',
  discordMixtonChannelId: '',
  discordRolesChannelId: '334455667788990011',
  discordStatusChannelId: '445566778899001122',
  discordWaitingRoomChannelId: '556677889900112233',
  discordAdminAlertsChannelId: '667788990011223344',
  discordSupportChannelId: '778899001122334455',
  discordMusicChannelId: '',
  discordRechargeChannelId: '',
  discordMatchAccessRoleId: '',
  hubRoleId: '',
  discordHubRoleId: '',
  faceitHubId: 'hub-latam-cs2-pro',
  faceitLeaderboardId: '6a05ea92c18e557389267373',
  adminRoleId: '',
  matchTimeoutMinutes: 120,
};

export const initialLogs: SystemLog[] = [];
