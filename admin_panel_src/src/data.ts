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
  discordMatchAccessRoleId: '',
  hubRoleId: '',
  discordHubRoleId: '',
  faceitHubId: 'hub-latam-cs2-pro',
  faceitLeaderboardId: '6a05ea92c18e557389267373',
  adminRoleId: '',
  matchTimeoutMinutes: 120,
};

export const initialLogs: SystemLog[] = [
  { id: '1', level: 'info', message: 'Bot de Discord iniciado correctamente.', timestamp: '30/06/2026, 04:00:15' },
  { id: '2', level: 'success', message: 'Conectado a la pasarela de Discord (Gateway v10).', timestamp: '30/06/2026, 04:00:18' },
  { id: '3', level: 'info', message: 'Servidores de Faceit sincronizados: 14 partidas detectadas en el Hub.', timestamp: '30/06/2026, 04:01:05' },
  { id: '4', level: 'warn', message: 'Carga alta en el nodo central. Latencia de API Faceit: 420ms.', timestamp: '30/06/2026, 04:01:45' },
  { id: '5', level: 'success', message: 'Webhook recibido y verificado para la partida #FCT-9825.', timestamp: '30/06/2026, 04:02:05' },
];

export const proPlayers: Record<string, PlayerStats> = {
  s1mple: {
    nickname: 's1mple',
    country: 'Ucrania',
    countryCode: 'UA',
    level: 10,
    elo: 4285,
    winRate: 65,
    kdRatio: 1.42,
    totalMatches: 3492,
    membership: 'Miembro Premium Faceit',
    recentForm: ['W', 'W', 'L', 'W', 'W', 'W', 'L', 'W', 'L', 'W'],
    recentPoints: [25, 24, -22, 26, 25, 21, -25, 24, -20, 28],
    globalRank: '#1',
    countryRank: '#1',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDI8JNAdsqx0SxKmEBaa_j0Mz0v3AmZ2kjQatggfbT8qSJbZrUqzgg83Qi5XL7Yr4sz9cNYBPtB8NKJFaDUkHOCB68bgOOn25dhKtC5XQyAuqSCguULpJDrFZ9yPVYl3lyj2GZ5-0Uud1Jv21iKNyZeTIL0YZ9sjeOWDTnetSlRlh4MKDaRsCuoZRVVnuWVft2GRNWKSk_KcjPr4_X6cUM-c6xe9Ii2MSOWPIsQrCPo5_X_l4AVvaTT1ppuWjNuL3J2PgT9PkyPQiE',
  },
  zywoo: {
    nickname: 'ZywOo',
    country: 'Francia',
    countryCode: 'FR',
    level: 10,
    elo: 4310,
    winRate: 68,
    kdRatio: 1.48,
    totalMatches: 2984,
    membership: 'Miembro Premium Faceit',
    recentForm: ['W', 'W', 'W', 'L', 'W', 'W', 'W', 'L', 'W', 'W'],
    recentPoints: [25, 26, 25, -20, 24, 25, 26, -18, 25, 25],
    globalRank: '#2',
    countryRank: '#1',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCn_E2nTm_m-4pfYjlOfsYwR2Lb11P_Ro8txOc42AjZzYrop4CUy7d7ZxoOeCVPHpQespaKZ2gkNA6-9T90K6DLDituW_HGwOwoZEG81v5AVgvjKQkgm4MRAlM_DeDOKmak1fvvYkP3a_9tU9DKHfryqMjokHggN9MjmEVZ0Kl9I1VHa2GQk7UXrPbH4yGLjCjaplWXAfMn0Wlwqzvn5TfkNpiNyWugOpJrzVDKvmt9iD_m0F-c3bCY5k9ZvMR1DJGOulXpvh7d5hE',
  },
  m0nesy: {
    nickname: 'm0NESY',
    country: 'Rusia',
    countryCode: 'RU',
    level: 10,
    elo: 4120,
    winRate: 62,
    kdRatio: 1.39,
    totalMatches: 2450,
    membership: 'Miembro Premium Faceit',
    recentForm: ['W', 'L', 'W', 'W', 'L', 'W', 'W', 'W', 'L', 'W'],
    recentPoints: [24, -22, 25, 26, -21, 24, 25, 26, -19, 25],
    globalRank: '#5',
    countryRank: '#2',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCWdsI6G0lzsrCEYypOhhERhmeuZdo-qbDkFt9qmj2vwTe-17l0X6vsWuzegELMulrR7ahGSw0fEa6acCmGtVc7VFkFPdss3eD6beIQRbVACVwut7h6FpsXxUt1pab8WqISCYEXAaMT7rGpOyPSq4zkWlN0F4hGdOM4S_mMRK79rdAMZwjbFozs0wgS_1JM2ovM8LWBkmP78A_NUE5PqLUwT3-mcfBfLJiEvWoy2HRhlxgiUqyr3MyuA4iRnHIur-EtnCihKTH6s4',
  },
  dev1ce: {
    nickname: 'dev1ce',
    country: 'Dinamarca',
    countryCode: 'DK',
    level: 10,
    elo: 3890,
    winRate: 59,
    kdRatio: 1.28,
    totalMatches: 4102,
    membership: 'Miembro Premium Faceit',
    recentForm: ['L', 'W', 'W', 'L', 'W', 'L', 'W', 'W', 'W', 'L'],
    recentPoints: [-21, 25, 24, -22, 25, -20, 24, 25, 26, -23],
    globalRank: '#12',
    countryRank: '#1',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCC27k9qoScwG8qmBkAxjcIFg127P-HrovYEzfOBt6Dql-04LNcOq583FDLCcpXy2Jzq5Z_UxRpbh4b_UO_JbHxhpcauPpoJQbVYYF-X7XRF456tdMUhqnGN2RLPaU84fzsdHSdNJDIKjDhlu2Xk2pgUUBKdUENUQNCUeMJQc257VJwcDYSwZukerOT-THoD9zVoj7GXna7guq6HynjAbhOVMC4ibRXeb5NrZwT-nkGPK4IJ9Ux2xFzj1WfeAvIBTV56BaCJO38ogk',
  },
};

export function generateMockPlayer(nickname: string): PlayerStats {
  const hash = nickname.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const countryList = [
    { name: 'Ucrania', code: 'UA' },
    { name: 'Francia', code: 'FR' },
    { name: 'Rusia', code: 'RU' },
    { name: 'Dinamarca', code: 'DK' },
    { name: 'España', code: 'ES' },
    { name: 'Alemania', code: 'DE' },
    { name: 'Polonia', code: 'PL' },
    { name: 'Suecia', code: 'SE' },
    { name: 'Estados Unidos', code: 'US' },
    { name: 'Brasil', code: 'BR' },
  ];
  
  const country = countryList[hash % countryList.length];
  const level = (hash % 10) + 1; // 1 to 10
  const elo = 800 + (hash % 30) * 120 + (level * 100);
  const winRate = 45 + (hash % 26); // 45% to 71%
  const kdRatio = parseFloat((0.85 + (hash % 65) * 0.01).toFixed(2)); // 0.85 to 1.50
  const totalMatches = 150 + (hash % 80) * 45;
  const globalRank = `#${100 + (hash % 5000)}`;
  const countryRank = `#${5 + (hash % 120)}`;
  
  const formOptions: ('W' | 'L')[] = ['W', 'L'];
  const recentForm: ('W' | 'L')[] = Array.from({ length: 10 }, (_, i) => formOptions[(hash + i) % 2]);
  const recentPoints = recentForm.map(f => f === 'W' ? 20 + (hash % 7) : -18 - (hash % 7));

  return {
    nickname,
    country: country.name,
    countryCode: country.code,
    level,
    elo,
    winRate,
    kdRatio,
    totalMatches,
    membership: hash % 2 === 0 ? 'Miembro Premium Faceit' : 'Miembro Regular',
    recentForm,
    recentPoints,
    globalRank,
    countryRank,
    avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(nickname)}`,
  };
}
