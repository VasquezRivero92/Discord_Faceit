export interface LinkedUser {
  discordId: string;
  faceitNickname: string;
  faceitPlayerId: string;
  status: 'Verificado' | 'Pendiente' | 'Baneado';
  linkedAt: string;
  roleType?: 'level' | 'special';
  roleValue?: string;
  faceit_level?: number;
  faceit_level_season?: number;
}

export interface LiveMatch {
  id: string;
  teamAName: string;
  teamALogo?: string;
  teamBName: string;
  teamBLogo?: string;
  map: string;
  location: string;
  startedAtMinutesAgo: number;
}

export interface SystemLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: string;
}

export interface HubQueue {
  id: string;
  queueId: string;
  name: string;
  discordMatchesChannelId: string;
  discordWaitingRoomChannelId: string;
  discordMixtonChannelId?: string;
  discordMatchAccessRoleId?: string;
  hubRoleId?: string;
  discordHubRoleId?: string;
}

export interface BotConfig {
  discordGuildId: string;
  discordLinkChannelId: string;
  discordMatchesChannelId: string;
  discordMixtonChannelId?: string;
  discordRolesChannelId: string;
  discordStatusChannelId: string;
  discordWaitingRoomChannelId: string;
  discordAdminAlertsChannelId: string;
  discordSupportChannelId: string;
  discordMusicChannelId?: string;
  discordSanctionsChannelId?: string;
  discordMatchAccessRoleId?: string;
  hubRoleId?: string;
  discordHubRoleId?: string;
  faceitHubId: string;
  faceitLeaderboardId: string;
  adminRoleId: string;
  matchTimeoutMinutes: number;
  queues?: HubQueue[];
}

export interface FeatureFlag {
  key: string;
  name: string;
  desc: string;
  enabled: boolean;
}

export interface PlayerStats {
  nickname: string;
  country: string;
  countryCode: string;
  level: number;
  elo: number;
  winRate: number;
  kdRatio: number;
  totalMatches: number;
  membership: string;
  recentForm: ('W' | 'L')[];
  recentPoints: number[];
  globalRank: string;
  countryRank: string;
  avatarUrl: string;
}
